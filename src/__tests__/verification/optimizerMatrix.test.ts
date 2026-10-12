/** 現在のカードデータでアプリの最適編成を求め、同じ条件の最適性をCP-SATで検証する */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import * as constant from '../../constant'
import { AllCards } from '../../data'
import { initializeCards } from '../../data/card/cards'
import type { ParameterValues, ScoreSettings, SupportCard } from '../../types/card'
import * as enums from '../../types/enums'
import type { UnitSimulatorSettings } from '../../types/unit'
import type { OptimizeInput } from '../../types/unitOptimizer'
import { createCardScoreCalculationContext } from '../../utils/calculator/calculateCardScores'
import { calculateParameterBonus } from '../../utils/calculator/parameterBonus'
import {
  createFixedCandidates,
  createRentalPool,
  prepareCandidates,
} from '../../utils/unitOptimizer/candidatePreparation'
import { getSynergyExtraCount } from '../../utils/unitOptimizer/synergyScore'
import { normalizeScoreSettingsDerived } from '../../utils/scoreSettings'
import { createUnitScoringContext, exhaustiveOptimizeAsync } from '../../utils/unitSimulator'
import { getLockedRentalCardName } from '../../utils/unitCardSelection'

/** 数値設定を検証して読み、誤入力で検証を無制限に実行しない
 *
 * @param name 読み込む環境変数名
 * @param fallback 未指定時に使う既定値
 * @returns 正の安全な整数値
 * @throws 環境変数が正の整数でない場合
 */
function readPositiveIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]
  if (rawValue === undefined || rawValue === '') return fallback
  const value = Number(rawValue)
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`)
  }
  return value
}

/** CP-SAT検証で使う環境変数の共通接頭辞を付ける */
const optimizerEnv = (suffix: string) => `GAKU_NAVI_CP_SAT_${suffix}`

/** 専用検証コマンドから起動された場合だけ、重いマトリクス検証を実行する */
const matrixRunEnabled = process.env.RUN_CP_SAT_VERIFICATION === '1'

/** Solverを呼ばずに候補数だけを記録するプレビューを有効にする */
const candidatePreviewEnabled = process.env[optimizerEnv('PREVIEW')] === '1'

/** 主属性の枚数を3枚と4枚に分けて別ケースで検証する */
const splitMainTypeCounts = process.env[optimizerEnv('SPLIT_MAIN_COUNTS')] === '1'

/** 通常実行では重いマトリクスをスキップする */
const describeOptimizerMatrix = matrixRunEnabled ? describe : describe.skip

/** TypeScriptから起動するCP-SAT検証スクリプト */
const verifierPath = resolve(process.cwd(), 'verification/cp_sat/verify_optimizer.py')

/** マトリクス未実行時は既定値を使う、1ケースあたりのSolver制限時間 */
const verificationTimeoutMs = matrixRunEnabled ? readPositiveIntegerEnv(optimizerEnv('TIMEOUT_MS'), 120_000) : 120_000

/** 同時に検証するケース数の既定値 */
const defaultWorkerLimit = 1

/** マトリクス実行時に指定された並列数を適用する */
const workerLimit = matrixRunEnabled
  ? readPositiveIntegerEnv(optimizerEnv('WORKERS'), defaultWorkerLimit)
  : defaultWorkerLimit

/** シナジー提供数をVerifierの入力形式へ変換するためのアクション順 */
const actionIds = Object.values(enums.ActionIdType)

/** 点数を個別に集計する3属性 */
const parameterTypes = [enums.ParameterType.Vocal, enums.ParameterType.Dance, enums.ParameterType.Visual]

/** マトリクスで比較する3つの育成プラン */
const plans = [
  { label: 'Sense', value: enums.PlanType.Sense },
  { label: 'Logic', value: enums.PlanType.Logic },
  { label: 'Anomaly', value: enums.PlanType.Anomaly },
]

/** レポートへ出す属性の略称 */
const typeLabels: Record<enums.ParameterType, string> = {
  [enums.ParameterType.Vocal]: 'Vo',
  [enums.ParameterType.Dance]: 'Da',
  [enums.ParameterType.Visual]: 'Vi',
}

/** 検証条件と育成プランを組み合わせた総ケース数 */
const matrixCaseCount = buildVariants().length * plans.length

/** ケース数と並列数からVitest全体のタイムアウトを見積もる */
const matrixTestTimeoutMs =
  Math.ceil(matrixCaseCount / Math.min(matrixCaseCount, workerLimit)) * (verificationTimeoutMs + 30_000) + 60_000

/** 1つの検証条件で使うシナリオ、レッスン配分、授業属性 */
interface Variant {
  /** HIFまたは初レジェンドのシナリオ値 */
  scenario: typeof enums.ScenarioType.Hajime | typeof enums.ScenarioType.Hif
  /** レポートとケース絞り込みで使う人向けの条件名 */
  label: string
  /** レッスン回数がもっとも多い属性 */
  mainType: enums.ParameterType
  /** 属性ごとのレッスン回数を記録し、合計をシナリオのレッスン週数に合わせる */
  lessonCounts: Partial<Record<enums.ParameterType, number>>
  /** すべての授業週で選ぶ属性 */
  classType: enums.ParameterType
  /** HIFレッスンで主属性と組にする副属性。混合配分では主属性どうしを相互に組み合わせる */
  hifSubType?: enums.ParameterType
  /** HIFの副属性を残り2属性へ半分ずつ配分するか */
  hifLessonSplitSub?: boolean
}

/** アプリOptimizerが出した基準編成と点数 */
interface OptimizerMatrixResult {
  /** 基準編成を計算したシナリオ */
  scenario: Variant['scenario']
  /** 基準編成を計算したレッスン条件 */
  variant: string
  /** 基準編成を計算した育成プラン */
  plan: string
  /** Verifierで再計算して一致を確認する基準点 */
  score: number
  /** 6枚の編成とレンタル枠のカード */
  members: { name: string; isRental: boolean }[]
}

/** 設定条件を固定する共有fixtureの保存形式 */
interface ExportedSettings {
  /** アプリのエクスポート形式バージョン */
  version: 2
  /** 保存キーごとに格納されたスコア、スケジュール、編成条件 */
  data: {
    /** 育成シナリオ、難易度、アクション回数、スケジュール */
    [constant.SCORE_SETTINGS_STORAGE_KEY]: ScoreSettings
    /** HIF週ごとの予定で、初レジェンドではスコア設定内の予定を使う */
    [constant.SCHEDULE_SELECTIONS_STORAGE_KEY]: { hif: Record<number, enums.ActivityIdType> }
    /** 保存時に省略された項目はアプリ既定値で補う編成条件 */
    [constant.UNIT_SIMULATOR_STORAGE_KEY]: Partial<UnitSimulatorSettings>
    /** カードごとのカスタム所持枚数を表し、未保存なら空の設定として扱う */
    [constant.CARD_COUNT_CUSTOM_KEY]?: OptimizeInput['cardCountCustom']
  }
}

/** レポートで使うシナリオ名 */
const scenarioLabels: Record<typeof enums.ScenarioType.Hajime | typeof enums.ScenarioType.Hif, string> = {
  [enums.ScenarioType.Hajime]: '初レジェンド',
  [enums.ScenarioType.Hif]: 'HIF',
}

/** スケジュールからレッスン週を特定し、指定条件のレッスンへ置き換える */
const lessonActivities = new Set<enums.ActivityIdType>([
  enums.ActivityIdType.VoLesson,
  enums.ActivityIdType.DaLesson,
  enums.ActivityIdType.ViLesson,
  enums.ActivityIdType.VoLessonDa,
  enums.ActivityIdType.VoLessonVi,
  enums.ActivityIdType.DaLessonVo,
  enums.ActivityIdType.DaLessonVi,
  enums.ActivityIdType.ViLessonVo,
  enums.ActivityIdType.ViLessonDa,
])

/** スケジュールから授業週を特定し、指定条件の授業へ置き換える */
const classActivities = new Set<enums.ActivityIdType>([
  enums.ActivityIdType.Class,
  enums.ActivityIdType.ClassVo,
  enums.ActivityIdType.ClassDa,
  enums.ActivityIdType.ClassVi,
])

/** パラメータ属性を、予定表に保存する単属性授業IDへ対応付ける
 *
 * @param type 授業で選択するパラメータ属性
 * @returns 対応する授業予定ID
 */
function classActivity(type: enums.ParameterType): enums.ActivityIdType {
  return {
    [enums.ParameterType.Vocal]: enums.ActivityIdType.ClassVo,
    [enums.ParameterType.Dance]: enums.ActivityIdType.ClassDa,
    [enums.ParameterType.Visual]: enums.ActivityIdType.ClassVi,
  }[type]
}

/** HIFの主属性と副属性を、予定表に保存する複合レッスンIDへ対応付ける
 *
 * @param main レッスンで主に上げる属性
 * @param sub 同じレッスンで追加する副属性
 * @returns 対応する複合レッスン予定ID
 * @throws アプリに存在しない属性の組み合わせの場合
 */
function hifLessonActivity(main: enums.ParameterType, sub: enums.ParameterType): enums.ActivityIdType {
  const activities: Record<enums.ParameterType, Partial<Record<enums.ParameterType, enums.ActivityIdType>>> = {
    [enums.ParameterType.Vocal]: {
      [enums.ParameterType.Dance]: enums.ActivityIdType.VoLessonDa,
      [enums.ParameterType.Visual]: enums.ActivityIdType.VoLessonVi,
    },
    [enums.ParameterType.Dance]: {
      [enums.ParameterType.Vocal]: enums.ActivityIdType.DaLessonVo,
      [enums.ParameterType.Visual]: enums.ActivityIdType.DaLessonVi,
    },
    [enums.ParameterType.Visual]: {
      [enums.ParameterType.Vocal]: enums.ActivityIdType.ViLessonVo,
      [enums.ParameterType.Dance]: enums.ActivityIdType.ViLessonDa,
    },
  }
  const activity = activities[main][sub]
  if (!activity) throw new Error(`HIF lesson pair is not supported: ${main}/${sub}`)
  return activity
}

/** パラメータ属性を、予定表に保存する単属性レッスンIDへ対応付ける
 *
 * @param type レッスンで上げる属性
 * @returns 対応する単属性レッスン予定ID
 */
function singleLessonActivity(type: enums.ParameterType): enums.ActivityIdType {
  return {
    [enums.ParameterType.Vocal]: enums.ActivityIdType.VoLesson,
    [enums.ParameterType.Dance]: enums.ActivityIdType.DaLesson,
    [enums.ParameterType.Visual]: enums.ActivityIdType.ViLesson,
  }[type]
}

/** CLIのケース指定に使われる表示名をシナリオEnum値へ正規化する
 *
 * @param value シナリオ、条件名、プラン名をコロンで区切った文字列
 * @returns Variantと照合できる形式のケース指定
 * @throws シナリオ、条件名、プラン名のいずれかが欠けている場合
 */
function normalizeCaseFilter(value: string): string {
  const [rawScenario, variant, plan] = value.split(':')
  const scenario =
    rawScenario === 'HIF' || rawScenario === enums.ScenarioType.Hif
      ? enums.ScenarioType.Hif
      : rawScenario === '初レジェンド' || rawScenario === enums.ScenarioType.Hajime
        ? enums.ScenarioType.Hajime
        : undefined
  if (!scenario || !variant || !plan) throw new Error(`Invalid optimizer case filter: ${value}`)
  return `${scenario}:${variant}:${plan}`
}

/** HIFと初レジェンドの検証条件を作り、各条件をVariantとして返す
 *
 * HIFは7+1、6+2、8レッスンを全属性方向と2つの副属性モードで作り、初レジェンドは4+1と単属性5レッスンを作る
 *
 * @returns レッスン回数と授業属性の組み合わせ一覧
 */
function buildVariants(): Variant[] {
  const hif: Variant[] = []
  const hifLessonModes = [
    { splitSub: true, label: '半分割' },
    { splitSub: false, label: 'サブ指定' },
  ] as const
  for (const main of parameterTypes) {
    const otherTypes = parameterTypes.filter((type) => type !== main)

    // 7+1と6+2は、主属性と副属性の全方向を同じ条件で比べる
    for (const sub of otherTypes) {
      const classType = otherTypes.find((type) => type !== sub)
      if (!classType) throw new Error(`HIF class type is missing for ${main}/${sub}`)
      for (const mode of hifLessonModes) {
        hif.push({
          scenario: enums.ScenarioType.Hif,
          label: `${typeLabels[main]}7${typeLabels[sub]}1_${mode.label}`,
          mainType: main,
          lessonCounts: { [main]: 7, [sub]: 1 },
          classType,
          hifSubType: sub,
          hifLessonSplitSub: mode.splitSub,
        })
        hif.push({
          scenario: enums.ScenarioType.Hif,
          label: `${typeLabels[main]}6${typeLabels[sub]}2_${mode.label}`,
          mainType: main,
          lessonCounts: { [main]: 6, [sub]: 2 },
          classType,
          hifSubType: sub,
          hifLessonSplitSub: mode.splitSub,
        })
      }
    }

    // 同属性8レッスンは、授業を残り2属性へ振り分けた条件を調べる
    for (const classType of otherTypes) {
      for (const mode of hifLessonModes) {
        hif.push({
          scenario: enums.ScenarioType.Hif,
          label: `${typeLabels[main]}8_授業${typeLabels[classType]}_${mode.label}`,
          mainType: main,
          lessonCounts: { [main]: 8 },
          classType,
          hifSubType: classType,
          hifLessonSplitSub: mode.splitSub,
        })
      }
    }
  }

  const hajime: Variant[] = []
  for (const major of parameterTypes) {
    for (const minor of parameterTypes.filter((type) => type !== major)) {
      const classType = parameterTypes.find((type) => type !== major && type !== minor)!
      hajime.push({
        scenario: enums.ScenarioType.Hajime,
        label: `${typeLabels[major]}4${typeLabels[minor]}1`,
        mainType: major,
        lessonCounts: { [major]: 4, [minor]: 1 },
        classType,
      })
    }
  }
  // 初レジェンドの単属性5レッスンは、主属性ごとに残り2属性の授業条件を調べる
  for (const main of parameterTypes) {
    for (const classType of parameterTypes.filter((type) => type !== main)) {
      hajime.push({
        scenario: enums.ScenarioType.Hajime,
        label: `${typeLabels[main]}5_授業${typeLabels[classType]}`,
        mainType: main,
        lessonCounts: { [main]: 5 },
        classType,
      })
    }
  }
  return [...hif, ...hajime]
}

/** 固定fixtureにあるレッスン週・授業週を、1つのVariantの条件へ置き換える
 *
 * それ以外の週はfixtureのまま保ち、シナリオごとのレッスン週数も確認する
 *
 * @param selections 共有fixtureから読み込んだ週ごとの予定
 * @param variant 適用するシナリオ、レッスン配分、授業属性
 * @returns Variantを反映した週ごとの予定
 * @throws fixtureのレッスン週数やVariantの回数がシナリオ条件と合わない場合
 */
function applyScheduleVariant(
  selections: Record<number, enums.ActivityIdType>,
  variant: Variant,
): Record<number, enums.ActivityIdType> {
  const updated = { ...selections }
  const lessonWeeks = Object.entries(updated)
    .filter(([, activity]) => lessonActivities.has(activity))
    .map(([week]) => week)
  const expectedLessonCount = variant.scenario === enums.ScenarioType.Hif ? 8 : 5
  if (lessonWeeks.length !== expectedLessonCount) {
    throw new Error(`${variant.scenario} schedule expected ${expectedLessonCount} lessons, got ${lessonWeeks.length}`)
  }

  const lessonTypes = Object.entries(variant.lessonCounts).flatMap(([rawType, count]) => {
    const type = parameterTypes.find((parameterType) => parameterType === rawType)
    if (!type) throw new Error(`${variant.label} has unknown lesson type: ${rawType}`)
    return Array.from({ length: count ?? 0 }, () => type)
  })
  if (lessonTypes.length !== expectedLessonCount) {
    throw new Error(`${variant.label} has ${lessonTypes.length} lessons; expected ${expectedLessonCount}`)
  }
  lessonWeeks.forEach((week, index) => {
    const mainType = lessonTypes[index]
    if (!mainType) throw new Error(`${variant.label} is missing lesson type ${index + 1}`)
    if (variant.scenario === enums.ScenarioType.Hif) {
      if (!variant.hifSubType) throw new Error(`${variant.label} is missing an HIF sub type`)
      // 7+1と6+2では主属性どうしを互いの副属性にし、同属性ペアを避ける
      const subType = mainType === variant.hifSubType ? variant.mainType : variant.hifSubType
      updated[Number(week)] = hifLessonActivity(mainType, subType)
      return
    }
    updated[Number(week)] = singleLessonActivity(mainType)
  })
  for (const [week, activity] of Object.entries(updated)) {
    if (classActivities.has(activity)) updated[Number(week)] = classActivity(variant.classType)
  }
  return updated
}

/** 同じ名前でも通常候補とレンタル候補を区別できるSolver用IDを作る
 *
 * @param name 候補カード名
 * @param mode 通常枠、レンタル枠、またはどちらでも使える候補の区分
 * @returns CP-SAT入力で一意になるID
 */
function cardId(name: string, mode: 'normal' | 'rental' | 'shared'): string {
  return `${mode}:${name}`
}

/** 1候補のスコアに関わる値をVerifierのカード情報形式へ変換する
 *
 * @param candidate アプリOptimizerが作った通常またはレンタル候補
 * @returns 型、属性、基礎点、パラボ、提供アクション、シナジー条件
 */
function toModelCardFacts(candidate: ReturnType<typeof prepareCandidates>[number]) {
  const providedActions = Object.fromEntries(
    candidate.providedActionEntries.map(({ actionIdx, count }) => [actionIds[actionIdx], count]),
  )
  const synergyAbilities = candidate.synergyAbilities.map((ability) => ({
    actionId: actionIds[ability.actionIdx],
    parsedValue: ability.parsedValue,
    maxCount: ability.maxCount ?? null,
    usedCount: ability.usedCount,
  }))
  return {
    type: candidate.card.type,
    parameterType: candidate.card.parameter_type,
    spCategory: candidate.spCategory,
    baseScoreWithoutParamBonus: candidate.baseScoreWithoutParamBonus,
    paramBonusPercent: candidate.paramBonusPercent,
    providedActions,
    synergyAbilities,
  }
}

/** 共通スコア情報に所有状態と編成枠の可否を加え、Verifier用カードにする
 *
 * @param candidate スコア情報へ変換するアプリ候補
 * @param id 通常・レンタルの区分を含む一意な候補ID
 * @param normalAllowed 通常枠で選べる候補か
 * @param rentalAllowed レンタル枠で選べる候補か
 * @returns CP-SATが選択可否と枠の制約に使うカード情報
 */
function toModelCard(
  candidate: ReturnType<typeof prepareCandidates>[number],
  id: string,
  normalAllowed: boolean,
  rentalAllowed: boolean,
) {
  return {
    id,
    name: candidate.card.name,
    ...toModelCardFacts(candidate),
    normalAllowed,
    rentalAllowed,
  }
}

/** 候補1枚に許される最大のシナジーとパラボを見積もり、枝刈り用の楽観上限を作る
 *
 * 残り5枚が提供回数を最大化すると仮定し、負のシナジーや丸め前のパラボも上限を下げないよう扱う
 *
 * @param candidate 上限点を見積もる候補
 * @param candidates シナジー提供数の最大値を探す候補全体
 * @param parameterBonusRows パラボ加点が発生する各上昇機会
 * @returns 属性ごとのサポート点とパラボ点の上限寄与
 */
function getCandidatePotential(
  candidate: ReturnType<typeof prepareCandidates>[number],
  candidates: ReturnType<typeof prepareCandidates>,
  parameterBonusRows: ReturnType<typeof createCardScoreCalculationContext>['parameterBonusRows'],
): { support: ParameterValues; parameterBonus: ParameterValues } {
  // 残り5枚が提供回数を最大化した点を見積もり、負のシナジー値は0点として扱う
  let maximumSynergy = 0
  for (const ability of candidate.synergyAbilities) {
    const actionId = actionIds[ability.actionIdx]
    if (actionId === undefined) throw new Error(`Unknown action index ${ability.actionIdx}`)
    const actionProviders = new Map<string, number>()
    for (const other of candidates) {
      if (other.card.name === candidate.card.name) continue
      actionProviders.set(
        other.card.name,
        Math.max(actionProviders.get(other.card.name) ?? 0, other.providedActionsVec[ability.actionIdx]),
      )
    }
    const maximumOtherCount = [...actionProviders.values()]
      .sort((left, right) => right - left)
      .slice(0, constant.UNIT_SIZE - 1)
      .reduce((sum, count) => sum + count, 0)
    const remainingCount =
      ability.maxCount === null || ability.maxCount === undefined
        ? maximumOtherCount
        : Math.max(0, ability.maxCount - ability.usedCount)
    maximumSynergy += Math.max(0, Math.floor(ability.parsedValue * Math.min(maximumOtherCount, remainingCount)))
  }

  const support: ParameterValues = {
    [enums.ParameterType.Vocal]: 0,
    [enums.ParameterType.Dance]: 0,
    [enums.ParameterType.Visual]: 0,
  }
  support[candidate.card.parameter_type] = candidate.baseScoreWithoutParamBonus + maximumSynergy
  const parameterBonus: ParameterValues = {
    [enums.ParameterType.Vocal]: 0,
    [enums.ParameterType.Dance]: 0,
    [enums.ParameterType.Visual]: 0,
  }
  for (const type of parameterTypes) {
    // パラボは上昇機会ごとに丸めず、候補上限が低くならないよう寄与を合算する
    parameterBonus[type] = parameterBonusRows.reduce(
      (sum, row) => sum + (row[type] * candidate.paramBonusPercent[type]) / 100,
      0,
    )
  }
  return { support, parameterBonus }
}

/** アプリの基準編成と全カード候補から、CP-SATへ渡す検証問題を作る
 *
 * 基準点、タイプ上限、固定枠を確認し、基準点を超えられない候補だけを安全に除外する
 *
 * @param input 対象カード、所持状態、スコア条件、編成条件
 * @param result アプリOptimizerが同じ条件で計算した基準編成
 * @returns Solverの問題、候補カード、基準編成、候補数
 * @throws 基準編成が候補一覧にない、または編成制約を満たさない場合
 */
function makePayload(input: OptimizeInput, result: OptimizerMatrixResult) {
  const schedule = createCardScoreCalculationContext(input.scoreSettings)
  // アプリと同じ候補準備処理から、通常枠・固定枠・レンタル枠をそろえる
  const normalCandidates = prepareCandidates(input, schedule)
  const fixedRentalName = getLockedRentalCardName(input.settings)
  const fixedNormalCandidates = normalCandidates.filter(
    (candidate) => input.settings.lockedCards.includes(candidate.card.name) && candidate.card.name !== fixedRentalName,
  )
  const fixedTypeCounts = Object.fromEntries(
    parameterTypes.map((type) => [
      type,
      fixedNormalCandidates.filter((candidate) => candidate.card.type === type).length +
        (fixedRentalName && input.cardByName.get(fixedRentalName)?.type === type ? 1 : 0),
    ]),
  ) as Record<enums.ParameterType, number>
  const adjustedTypeCountMax = Object.fromEntries(
    parameterTypes.map((type) => [type, Math.max(input.settings.typeCountMax[type], fixedTypeCounts[type])]),
  ) as UnitSimulatorSettings['typeCountMax']
  const adjustedInput: OptimizeInput = {
    ...input,
    settings: { ...input.settings, typeCountMax: adjustedTypeCountMax },
  }
  // 固定済み通常カードをレンタル候補から外し、アプリと同じ貸出候補を作る
  const fixedNormalNames = new Set(fixedNormalCandidates.map((candidate) => candidate.card.name))
  const rentalCandidates = createRentalPool(
    adjustedInput,
    schedule,
    fixedNormalNames,
    input.allCards.length + 1,
    normalCandidates,
  )
  const fixedCandidates = createFixedCandidates(adjustedInput, normalCandidates, rentalCandidates)
  // 同じカードの通常枠・レンタル枠をそれぞれ用意し、Solverにどちらで使うか選ばせる
  const allModeCandidates = [
    ...normalCandidates.map((candidate) => ({ candidate, isRental: false })),
    ...rentalCandidates.map((candidate) => ({ candidate, isRental: true })),
  ]
  const scoringContext = createUnitScoringContext(adjustedInput)
  const normalCandidatesByName = new Map(normalCandidates.map((candidate) => [candidate.card.name, candidate]))
  const rentalCandidatesByName = new Map(rentalCandidates.map((candidate) => [candidate.card.name, candidate]))
  // 基準編成の各カードを、通常枠かレンタル枠かに合わせて候補一覧から引き直す
  const baselineCandidates = result.members.flatMap((member) => {
    const candidate = member.isRental
      ? rentalCandidatesByName.get(member.name)
      : normalCandidatesByName.get(member.name)
    return candidate ? [candidate] : []
  })
  if (baselineCandidates.length !== result.members.length)
    throw new Error('Optimizer result is missing from the full candidate pool')
  const baselineTypeCounts = new Map<SupportCard['type'], number>()
  for (const candidate of baselineCandidates) {
    baselineTypeCounts.set(candidate.card.type, (baselineTypeCounts.get(candidate.card.type) ?? 0) + 1)
  }
  for (const type of parameterTypes) {
    const count = baselineTypeCounts.get(type) ?? 0
    if (count < adjustedInput.settings.typeCountMin[type] || count > adjustedInput.settings.typeCountMax[type]) {
      throw new Error(
        `Optimizer result has ${count} ${type} cards; expected ${adjustedInput.settings.typeCountMin[type]}–${adjustedInput.settings.typeCountMax[type]}`,
      )
    }
  }
  // 基礎点、パラボ、提供数を先に集計し、全カードの提供数がそろってからシナジーを計算する
  const totalProvided = new Float64Array(actionIds.length)
  const baselineSupport: ParameterValues = {
    [enums.ParameterType.Vocal]: 0,
    [enums.ParameterType.Dance]: 0,
    [enums.ParameterType.Visual]: 0,
  }
  const baselinePercent: ParameterValues = { ...adjustedInput.settings.paramBonusPercent }
  for (const candidate of baselineCandidates) {
    for (const entry of candidate.providedActionEntries) totalProvided[entry.actionIdx] += entry.count
    baselineSupport[candidate.card.parameter_type] += candidate.baseScoreWithoutParamBonus
    for (const type of parameterTypes) baselinePercent[type] += candidate.paramBonusPercent[type]
  }
  // 1巡目の提供数から、各カードが他の選出カードから受けるシナジー点を加算する
  for (const candidate of baselineCandidates) {
    for (const ability of candidate.synergyAbilities) {
      const otherCount = totalProvided[ability.actionIdx] - candidate.providedActionsVec[ability.actionIdx]
      const extraCount = getSynergyExtraCount(ability, otherCount)
      baselineSupport[candidate.card.parameter_type] += Math.floor(ability.parsedValue * extraCount)
    }
  }
  const baselineParameterBonus = calculateParameterBonus(schedule.parameterBonusRows, baselinePercent)
  // 属性ごとに初期値、サポート点、パラボ点を足し、基準編成の上限到達状態を調べる
  const baselineParameters: ParameterValues = {
    [enums.ParameterType.Vocal]:
      scoringContext.nonSupportParams.vocal + baselineSupport.vocal + baselineParameterBonus.vocal,
    [enums.ParameterType.Dance]:
      scoringContext.nonSupportParams.dance + baselineSupport.dance + baselineParameterBonus.dance,
    [enums.ParameterType.Visual]:
      scoringContext.nonSupportParams.visual + baselineSupport.visual + baselineParameterBonus.visual,
  }
  // 基準編成ですでに上限へ達した軸は候補寄与を加えず、未到達の軸だけを候補上限へ加える
  const scoreWeights: ParameterValues = {
    vocal: scoringContext.paramCap !== null && baselineParameters.vocal + 0.000001 >= scoringContext.paramCap ? 0 : 1,
    dance: scoringContext.paramCap !== null && baselineParameters.dance + 0.000001 >= scoringContext.paramCap ? 0 : 1,
    visual: scoringContext.paramCap !== null && baselineParameters.visual + 0.000001 >= scoringContext.paramCap ? 0 : 1,
  }
  const outsideBonus: ParameterValues = {
    [enums.ParameterType.Vocal]: 0,
    [enums.ParameterType.Dance]: 0,
    [enums.ParameterType.Visual]: 0,
  }
  for (const type of parameterTypes) {
    outsideBonus[type] = schedule.parameterBonusRows.reduce(
      (sum, row) => sum + (row[type] * adjustedInput.settings.paramBonusPercent[type]) / 100,
      0,
    )
  }
  // カード以外から得る点を固定分として数え、各カードの候補上限と合算する
  const fixedScoreUpperBound = parameterTypes.reduce(
    (sum, type) =>
      sum +
      (scoreWeights[type] === 0
        ? (scoringContext.paramCap ?? 0)
        : scoringContext.nonSupportParams[type] + outsideBonus[type]),
    0,
  )
  // 各候補単体の上限寄与を先に作り、後で6枚分の上限へ組み合わせる
  const allCandidateFacts = allModeCandidates.map(({ candidate }) => candidate)
  const potentialParts = allModeCandidates.map(({ candidate }) =>
    getCandidatePotential(candidate, allCandidateFacts, schedule.parameterBonusRows),
  )
  const potentials = potentialParts.map(({ support, parameterBonus }) =>
    parameterTypes.reduce((sum, type) => sum + scoreWeights[type] * (support[type] + parameterBonus[type]), 0),
  )
  const baselineModes = new Set(
    result.members.map((member) => `${member.isRental ? 'rental' : 'normal'}:${member.name}`),
  )
  const modeIndexByKey = new Map(
    allModeCandidates.map(({ candidate, isRental }, index) => [
      `${isRental ? 'rental' : 'normal'}:${candidate.card.name}`,
      index,
    ]),
  )
  const fixedModes = new Set(
    fixedCandidates.map((candidate) => {
      const isRental = candidate.card.name === fixedRentalName
      return `${isRental ? 'rental' : 'normal'}:${candidate.card.name}`
    }),
  )
  // 同名カードは通常・レンタルのどちらか一方だけ選べるため、高い方を上限候補に使う
  const potentialByName = new Map<string, { type: SupportCard['type']; potential: number }>()
  allModeCandidates.forEach(({ candidate }, index) => {
    const previous = potentialByName.get(candidate.card.name)
    if (!previous || potentials[index] > previous.potential) {
      potentialByName.set(candidate.card.name, { type: candidate.card.type, potential: potentials[index] })
    }
  })
  // この候補を含む6枚を仮定し、条件を満たす編成になり得ない場合は候補を除く
  const maximumTeamScoreWithCandidate = (candidateIndex: number): number => {
    const { candidate, isRental } = allModeCandidates[candidateIndex]
    const modeKey = `${isRental ? 'rental' : 'normal'}:${candidate.card.name}`
    const fixedModeForCandidate = [...fixedModes].find((fixedMode) => fixedMode.endsWith(`:${candidate.card.name}`))
    if (fixedModeForCandidate && fixedModeForCandidate !== modeKey) return Number.NEGATIVE_INFINITY

    const selectedNames = new Set<string>()
    const typeCounts = new Map<SupportCard['type'], number>()
    let scoreBound = fixedScoreUpperBound
    const addName = (name: string, type: SupportCard['type'], potential: number) => {
      selectedNames.add(name)
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1)
      scoreBound += potential
    }
    const typeLimit = (type: SupportCard['type']) =>
      type === enums.CardType.Assist ? constant.UNIT_SIZE : adjustedInput.settings.typeCountMax[type]
    addName(candidate.card.name, candidate.card.type, potentials[candidateIndex])
    for (const fixedCandidate of fixedCandidates) {
      if (fixedCandidate.card.name === candidate.card.name) continue
      const fixedIsRental = fixedCandidate.card.name === fixedRentalName
      const fixedModeKey = `${fixedIsRental ? 'rental' : 'normal'}:${fixedCandidate.card.name}`
      const fixedIndex = modeIndexByKey.get(fixedModeKey)
      if (fixedIndex === undefined) return Number.NEGATIVE_INFINITY
      addName(fixedCandidate.card.name, fixedCandidate.card.type, potentials[fixedIndex])
    }
    if (selectedNames.size > constant.UNIT_SIZE) return Number.NEGATIVE_INFINITY
    for (const [type, count] of typeCounts) {
      if (count > typeLimit(type)) return Number.NEGATIVE_INFINITY
    }

    const availableByType = new Map<SupportCard['type'], [string, { type: SupportCard['type']; potential: number }][]>()
    for (const entry of potentialByName.entries()) {
      const [name, { type }] = entry
      if (selectedNames.has(name)) continue
      const available = availableByType.get(type) ?? []
      available.push(entry)
      availableByType.set(type, available)
    }
    for (const available of availableByType.values()) {
      available.sort((left, right) => right[1].potential - left[1].potential)
    }

    // タイプ下限を先に満たし、タイプ上限を守りながら残り枠を上限点順で埋める
    for (const type of parameterTypes) {
      const minimum = adjustedInput.settings.typeCountMin[type]
      const currentCount = typeCounts.get(type) ?? 0
      const requiredCount = Math.max(0, minimum - currentCount)
      const available = availableByType.get(type) ?? []
      if (requiredCount > typeLimit(type) - currentCount || available.length < requiredCount) {
        return Number.NEGATIVE_INFINITY
      }
      for (const [name, { potential }] of available.slice(0, requiredCount)) {
        addName(name, type, potential)
      }
    }

    const remainingSlots = constant.UNIT_SIZE - selectedNames.size
    const optionalCandidates = [...availableByType.values()]
      .flat()
      .filter(([name]) => !selectedNames.has(name))
      .sort((left, right) => right[1].potential - left[1].potential)
    let addedCount = 0
    for (const [name, { type, potential }] of optionalCandidates) {
      if (addedCount >= remainingSlots) break
      if ((typeCounts.get(type) ?? 0) >= typeLimit(type)) continue
      addName(name, type, potential)
      addedCount++
    }
    if (selectedNames.size !== constant.UNIT_SIZE) return Number.NEGATIVE_INFINITY
    return scoreBound
  }
  // 全カード・レンタル候補のうち、最良でも基準点を超えない候補だけを除外する
  // 残った候補の中から実際の6枚編成を選び、最大点をCP-SATに証明させる
  const retainedCandidates = allModeCandidates.filter(({ candidate, isRental }, index) => {
    const modeKey = `${isRental ? 'rental' : 'normal'}:${candidate.card.name}`
    if (baselineModes.has(modeKey)) return true
    const optimisticScore = maximumTeamScoreWithCandidate(index)
    return Math.floor(optimisticScore + 0.000001) > result.score
  })
  // 枝刈り後の候補を同名カードごとにまとめ、同一カードの通常・レンタル両方を残す
  const normalByName = new Map(
    retainedCandidates.filter((entry) => !entry.isRental).map(({ candidate }) => [candidate.card.name, candidate]),
  )
  const rentalByName = new Map(
    retainedCandidates.filter((entry) => entry.isRental).map(({ candidate }) => [candidate.card.name, candidate]),
  )
  const modeIds = new Map<string, { normal?: string; rental?: string }>()
  const cards: ReturnType<typeof toModelCard>[] = []
  const candidateNames = new Set([...normalByName.keys(), ...rentalByName.keys()])

  // スコア情報が同じ通常候補とレンタル候補は1枚にまとめ、Solverが枠だけを選べるようにする
  for (const name of candidateNames) {
    const normal = normalByName.get(name)
    const rental = rentalByName.get(name)
    if (normal && rental && JSON.stringify(toModelCardFacts(normal)) === JSON.stringify(toModelCardFacts(rental))) {
      const id = cardId(name, 'shared')
      cards.push(toModelCard(normal, id, true, true))
      modeIds.set(name, { normal: id, rental: id })
      continue
    }
    if (normal) {
      const id = cardId(name, 'normal')
      cards.push(toModelCard(normal, id, true, false))
      modeIds.set(name, { normal: id })
    }
    if (rental) {
      const id = cardId(name, 'rental')
      cards.push(toModelCard(rental, id, false, true))
      modeIds.set(name, { ...modeIds.get(name), rental: id })
    }
  }

  const candidateIds = result.members.map((member) => {
    const id = modeIds.get(member.name)?.[member.isRental ? 'rental' : 'normal']
    if (!id) throw new Error(`Optimizer result card is missing from the full candidate pool: ${member.name}`)
    return id
  })
  const rentalMember = result.members.find((member) => member.isRental)
  if (!rentalMember) throw new Error('Optimizer result does not contain a rental card')
  const candidateRentalCardId = modeIds.get(rentalMember.name)?.rental
  if (!candidateRentalCardId) throw new Error(`Optimizer rental card is missing from the full candidate pool`)

  // 基準編成と条件を含め、Python側がそのまま読めるJSON構造にする
  return {
    payloadVersion: 1,
    problem: {
      unitSize: constant.UNIT_SIZE,
      typeCountMin: adjustedInput.settings.typeCountMin,
      typeCountMax: adjustedInput.settings.typeCountMax,
      spConstraint: adjustedInput.settings.spConstraint,
      outsideParamBonusPercent: adjustedInput.settings.paramBonusPercent,
      parameterBonusRows: schedule.parameterBonusRows,
      nonSupportParams: scoringContext.nonSupportParams,
      paramCap: scoringContext.paramCap,
      fixedCardIds: fixedCandidates.map((candidate) => {
        const mode = candidate.card.name === fixedRentalName ? 'rental' : 'normal'
        const id = modeIds.get(candidate.card.name)?.[mode]
        if (!id) throw new Error(`Fixed card is missing from the full candidate pool: ${candidate.card.name}`)
        return id
      }),
      fixedRentalCardIds: fixedRentalName
        ? [modeIds.get(fixedRentalName)?.rental].filter((id): id is string => id !== undefined)
        : [],
    },
    cards,
    candidate: { cardIds: candidateIds, rentalCardId: candidateRentalCardId, score: result.score },
    candidatePool: { beforeSafePruning: allModeCandidates.length, afterSafePruning: retainedCandidates.length },
    timeoutMs: verificationTimeoutMs,
  }
}

/** JSON入力をPythonのVerifierへ送り、標準出力の判定結果を返す
 *
 * Python環境は明示指定、リポジトリ内venv、PATH上のpython3の順で選び、制限時間を超えたら終了する
 *
 * @param payload CP-SATの編成条件、カード候補、アプリ基準編成
 * @returns VerifierがJSONで返す最適性判定
 * @throws Python起動、タイムアウト、またはVerifier出力をJSONとして読めない場合
 */
function runVerifier(payload: ReturnType<typeof makePayload>): Promise<Record<string, unknown>> {
  const localPython = resolve(
    process.cwd(),
    process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python',
  )
  const python = process.env.PYTHON_BIN ?? (existsSync(localPython) ? localPython : 'python3')
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(python, [verifierPath], { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, verificationTimeoutMs + 30_000)

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk
      if (stdout.length > 5 * 1024 * 1024) child.kill('SIGKILL')
    })
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk
    })
    child.on('error', (error) => {
      clearTimeout(timeout)
      rejectPromise(error)
    })
    child.on('close', (exitCode, signal) => {
      clearTimeout(timeout)
      if (timedOut) {
        rejectPromise(new Error(`CP-SAT verifier process exceeded ${verificationTimeoutMs + 30_000} ms`))
        return
      }
      if (!stdout.trim()) {
        rejectPromise(new Error(stderr || `CP-SAT verifier produced no output (exit=${exitCode}, signal=${signal})`))
        return
      }
      try {
        resolvePromise(JSON.parse(stdout) as Record<string, unknown>)
      } catch (error) {
        rejectPromise(new Error(`Unable to parse CP-SAT verifier output: ${String(error)}\n${stderr}`))
      }
    })
    child.stdin.on('error', (error) => {
      if ((error as NodeJS.ErrnoException).code !== 'EPIPE') rejectPromise(error)
    })
    child.stdin.end(JSON.stringify(payload))
  })
}

/** 実カード全件からアプリ基準を生成し、各条件の最適性をCP-SATで検証する */
describeOptimizerMatrix('実データの最適編成をCP-SATで検証', () => {
  it(
    candidatePreviewEnabled
      ? `${matrixCaseCount}件の候補プールを集計する`
      : `全カードから計算した${matrixCaseCount}件のアプリ最適編成が最適であることを証明する`,
    async () => {
      // 固定fixtureからスコア、予定、編成条件を読み、アプリ既定値で省略項目を補う
      const exported = JSON.parse(
        readFileSync(resolve(process.cwd(), 'tests/fixtures/testScoreSettings.json'), 'utf8'),
      ) as ExportedSettings
      if (exported.version !== 2) throw new Error(`Expected exported settings version 2, got ${exported.version}`)
      const caseFilter = process.env[optimizerEnv('CASE_FILTER')]
      if (splitMainTypeCounts && !caseFilter) {
        throw new Error(`${optimizerEnv('SPLIT_MAIN_COUNTS')} requires ${optimizerEnv('CASE_FILTER')}`)
      }
      const normalizedCaseFilter = caseFilter ? normalizeCaseFilter(caseFilter) : undefined
      // 設定fixtureは固定し、カードはcheckout中の最新マスタから読み込む
      initializeCards(
        JSON.parse(readFileSync(resolve(process.cwd(), 'src/data/json/cards.json'), 'utf8')) as SupportCard[],
      )
      const storedScore = exported.data[constant.SCORE_SETTINGS_STORAGE_KEY]
      const storedSchedule = exported.data[constant.SCHEDULE_SELECTIONS_STORAGE_KEY]
      const storedUnit: UnitSimulatorSettings = {
        ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
        ...exported.data[constant.UNIT_SIMULATOR_STORAGE_KEY],
      }
      const customCounts = exported.data[constant.CARD_COUNT_CUSTOM_KEY] ?? {}
      // 条件表と育成プランの直積を作り、ケース指定があれば対象を絞る
      const variants = buildVariants()
      const matrixCases = variants.flatMap((variant) => plans.map((plan) => ({ variant, plan })))
      const selectedCases = normalizedCaseFilter
        ? matrixCases.filter(
            ({ variant, plan }) => `${variant.scenario}:${variant.label}:${plan.label}` === normalizedCaseFilter,
          )
        : matrixCases
      if (selectedCases.length === 0) throw new Error(`No optimizer case matches ${caseFilter ?? 'the matrix'}`)
      const resultKeys = new Set<string>()
      const reportPath = resolve(
        process.env[optimizerEnv('REPORT_PATH')] ?? 'tmp/optimizer-validation/cp-sat-optimizer-matrix-results.json',
      )
      const failures: string[] = []
      const branchCounts: (3 | 4 | undefined)[] = splitMainTypeCounts ? [3, 4] : [undefined]
      // 主属性枚数を分割するときは、同じ条件を3枚固定と4枚固定のジョブに分ける
      const jobs = selectedCases.flatMap(({ variant, plan }, caseIndex) => {
        const key = `${variant.scenario}:${variant.label}`
        return branchCounts.map((mainTypeCount, branchIndex) => {
          const resultKey = `${key}:${plan.label}${mainTypeCount === undefined ? '' : `:main-${mainTypeCount}`}`
          if (resultKeys.has(resultKey)) throw new Error(`Duplicate optimizer result: ${resultKey}`)
          resultKeys.add(resultKey)
          return {
            index: caseIndex * branchCounts.length + branchIndex,
            resultKey,
            variant,
            plan,
            mainTypeCount,
          }
        })
      })
      const caseResults: (Record<string, unknown> | undefined)[] = new Array(jobs.length)
      const workerCount = Math.min(workerLimit, jobs.length)
      let nextJobIndex = 0
      let completedCount = 0

      // ケースごとの結果を都度保存し、途中終了しても完了分を確認できるようにする
      function writeReport() {
        mkdirSync(dirname(reportPath), { recursive: true })
        writeFileSync(
          reportPath,
          JSON.stringify(
            { cases: caseResults.filter((entry): entry is Record<string, unknown> => entry !== undefined) },
            null,
            2,
          ),
        )
      }
      writeReport()

      /** 1ケースのTypeScript基準を作り、同じ入力でCP-SATの最適性を調べる */
      async function verifyJob(job: (typeof jobs)[number]) {
        const { index, resultKey, variant, plan, mainTypeCount } = job
        try {
          const scheduleSelections = applyScheduleVariant(
            variant.scenario === enums.ScenarioType.Hif ? storedSchedule.hif : storedScore.scheduleSelections,
            variant,
          )
          const scoreSettings = normalizeScoreSettingsDerived({
            ...storedScore,
            scenario: variant.scenario,
            hifLessonSplitSub: variant.hifLessonSplitSub ?? storedScore.hifLessonSplitSub,
            difficulty:
              variant.scenario === enums.ScenarioType.Hif ? enums.DifficultyType.None : enums.DifficultyType.Legend,
            actionCounts: {
              ...storedScore.actionCounts,
              [enums.ActionIdType.PDrinkAcquire]:
                variant.scenario === enums.ScenarioType.Hif
                  ? storedScore.actionCounts[enums.ActionIdType.PDrinkAcquire]
                  : 20,
            },
            scheduleSelections,
          })
          // HIFは初期値300・パラボ30%、初レジェンドは初期値200・パラボ20%で計算する
          const initialValue = variant.scenario === enums.ScenarioType.Hif ? 300 : 200
          const paramBonusValue = variant.scenario === enums.ScenarioType.Hif ? 30 : 20
          // 既定の3〜4枚条件を使い、分割実行時だけ主属性の枚数を固定する
          const typeCountMin = { ...storedUnit.typeCountMin }
          const typeCountMax = { ...storedUnit.typeCountMax }
          typeCountMin[variant.mainType] = mainTypeCount ?? 3
          typeCountMax[variant.mainType] = mainTypeCount ?? 4
          const settings: UnitSimulatorSettings = {
            ...storedUnit,
            plan: plan.value,
            typeCountMin,
            typeCountMax,
            initialParams: { vocal: initialValue, dance: initialValue, visual: initialValue },
            paramBonusPercent: { vocal: paramBonusValue, dance: paramBonusValue, visual: paramBonusValue },
          }
          const input: OptimizeInput = {
            settings,
            scoreSettings,
            // 検証条件では全カードを4凸にし、fixtureのカスタム所持枚数はそのまま渡す
            cardUncaps: Object.fromEntries(AllCards.map(({ name }) => [name, enums.UncapType.Four])),
            cardCountCustom: customCounts,
            allCards: AllCards,
            cardByName: new Map(AllCards.map((card) => [card.name, card])),
            excludedCardNames: settings.excludedCardNames,
          }
          // 全カードからTypeScript側の最適編成を求め、その編成を比較基準にする
          let evaluatedCombos = 0
          const optimized = await exhaustiveOptimizeAsync(
            input,
            () => {},
            () => false,
            undefined,
            { onStats: (stats) => (evaluatedCombos = stats.evaluatedCombos) },
          )
          if (!optimized) {
            const countLabel = mainTypeCount === undefined ? '3–4' : String(mainTypeCount)
            throw new Error(`No legal optimizer result with ${typeLabels[variant.mainType]}${countLabel} cards`)
          }
          const verificationResult: OptimizerMatrixResult = {
            scenario: variant.scenario,
            variant: variant.label,
            plan: plan.label,
            score: optimized.totalScore,
            members: optimized.members.map(({ card, isRental }) => ({ name: card.name, isRental })),
          }
          // 候補プールを作り、プレビューでなければPython側のCP-SAT Solverを実行する
          const payload = makePayload(input, verificationResult)
          const output = candidatePreviewEnabled ? { status: 'preview' } : await runVerifier(payload)
          const status = String(output.status)
          caseResults[index] = {
            scenario: scenarioLabels[variant.scenario],
            variant: variant.label,
            plan: plan.label,
            mainType: variant.mainType,
            mainTypeCount: mainTypeCount ?? null,
            candidateScore: verificationResult.score,
            appOptimizerEvaluatedCombos: evaluatedCombos,
            ...payload.candidatePool,
            typeCountMin: payload.problem.typeCountMin,
            typeCountMax: payload.problem.typeCountMax,
            ...output,
          }
          if (!candidatePreviewEnabled && status !== 'optimal') failures.push(`${resultKey}: ${JSON.stringify(output)}`)
          // 条件、点数、探索規模を記録し、ケース単位の進捗を表示する
          console.log(
            `${completedCount + 1}/${jobs.length} ${scenarioLabels[variant.scenario]} ${variant.label} ${plan.label}: ${status}` +
              ` (app combinations=${evaluatedCombos}, ` +
              `${payload.candidatePool.afterSafePruning}/${payload.candidatePool.beforeSafePruning} CP-SAT candidates)`,
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          failures.push(`${resultKey}: ${message}`)
          caseResults[index] = {
            scenario: scenarioLabels[variant.scenario],
            variant: variant.label,
            plan: plan.label,
            status: 'error',
            message,
          }
        }
        completedCount += 1
        writeReport()
      }

      /** workerLimitを超えない数のワーカーで、未処理ケースを順に実行する */
      async function runWorker() {
        while (nextJobIndex < jobs.length) {
          const job = jobs[nextJobIndex]
          nextJobIndex += 1
          await verifyJob(job)
        }
      }

      // 全ケースを処理し、最適性未証明や計算エラーをテスト失敗として返す
      await Promise.all(Array.from({ length: workerCount }, () => runWorker()))
      if (!caseFilter) expect(selectedCases).toHaveLength(variants.length * plans.length)
      expect(resultKeys.size).toBe(jobs.length)
      expect(failures, `${failures.join('\n')}\nSee ${reportPath}`).toEqual([])
    },
    matrixTestTimeoutMs,
  )
})

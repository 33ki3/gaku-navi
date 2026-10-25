/** 現在のカードデータでアプリの最適編成を求め、同じ条件の最適性をCP-SATで検証する */
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import * as constant from '../../constant'
import {
  ABILITY_MAX_COUNT,
  ActionCategoryList,
  AllCards,
  LinkedActionGroups,
  ScheduleControlledIds,
  getScheduleData,
  isScheduleActivityAllowed,
} from '../../data'
import { initializeCards } from '../../data/card/cards'
import type { ActionCounts, ParameterValues, ScoreSettings, SupportCard } from '../../types/card'
import * as enums from '../../types/enums'
import type { UnitSimulatorSettings } from '../../types/unit'
import type { OptimizeInput } from '../../types/unitOptimizer'
import { createCardScoreCalculationContext } from '../../utils/calculator/calculateCardScores'
import { calculateParameterBonus } from '../../utils/calculator/parameterBonus'
import { mergeScheduleCounts, normalizeScoreSettingsDerived } from '../../utils/scoreSettings'
import { getLockedRentalCardName } from '../../utils/unitCardSelection'
import {
  createFixedCandidates,
  createRentalPool,
  prepareCandidates,
} from '../../utils/unitOptimizer/candidatePreparation'
import { getSynergyExtraCount } from '../../utils/unitOptimizer/synergyScore'
import { createUnitScoringContext, exhaustiveOptimizeAsync } from '../../utils/unitSimulator'

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

/** 主属性の枚数を固定して別ケースで検証する */
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

/** Verifierごとの制限時間を超えてプロセスを終了するまでの猶予 */
const verifierProcessGracePeriodMs = 30_000

/** マトリクス全体の起動・終了処理に見込む猶予 */
const matrixSetupGracePeriodMs = 60_000

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

/** GitHub Actionsで独立実行する検証マトリクスの分割単位 */
const optimizerShards = ['hajime-4-1', 'hajime-5', 'hif-6-2', 'hif-7-1', 'hif-8'] as const
type OptimizerShard = (typeof optimizerShards)[number]
const matrixShardValue = process.env[optimizerEnv('SHARD')]
if (matrixShardValue !== undefined && !optimizerShards.includes(matrixShardValue as OptimizerShard)) {
  throw new Error(`${optimizerEnv('SHARD')} must be one of: ${optimizerShards.join(', ')}`)
}
const matrixShard = matrixShardValue as OptimizerShard | undefined

/** 同じActions実行内で全shardを再現できるseed。ローカル実行では毎回新しいseedを作る */
const matrixRunSeed = process.env[optimizerEnv('SEED')] ?? randomUUID()

/** レポートへ出す属性の略称 */
const typeLabels: Record<enums.ParameterType, string> = {
  [enums.ParameterType.Vocal]: 'Vo',
  [enums.ParameterType.Dance]: 'Da',
  [enums.ParameterType.Visual]: 'Vi',
}

/** 初レジェンドで候補不足が見つかった条件に使う候補上限 */
const hajimeExpandedCandidateLimit = 45

/** 候補上限30でも最適性を確認できなかった初レジェンドの条件 */
const hajimeExpandedCandidateLimitCases = new Set([
  'Vo5_授業Da:Sense',
  'Vo5_授業Da:Anomaly',
  'Vo5_授業Vi:Sense',
  'Vo5_授業Vi:Anomaly',
])

/** 整数値のランダム範囲 */
interface IntegerRange {
  min: number
  max: number
}

/** アビリティ上限を必須値として読み、上限定義の不足を設定ミスとして検出する */
function getAbilityMaximumCount(abilityName: enums.AbilityNameKeyType): number {
  const maximum = ABILITY_MAX_COUNT[abilityName]
  if (maximum === undefined) throw new Error(`Missing ability maximum count for ${abilityName}`)
  return maximum
}

/** シナリオ別に持つVo・Da・Viの基準値 */
type ScenarioParameterValues = Record<Variant['scenario'], ParameterValues>

/** CP-SATのランダム条件で使う値の範囲。値を散らす幅はここだけを編集する */
const randomCaseValueRanges: {
  randomizeOtherScheduleActivities: boolean
  manualActionCounts: {
    byAction: Partial<Record<enums.ActionIdType, IntegerRange>>
  }
  initialParams: {
    baselineByScenario: ScenarioParameterValues
    variation: number
  }
  paramBonusPercent: { baselineByScenario: ScenarioParameterValues; variationPercentagePoints: number; step: number }
} = {
  /** レッスン・授業以外の変更可能な週を、その週の候補からseed付きで選び直す */
  randomizeOtherScheduleActivities: true,
  /** スケジュールで自動調整されない点数設定の回数範囲。各項目を個別に指定する */
  manualActionCounts: {
    byAction: {
      [enums.ActionIdType.SpLesson20]: {
        min: 0,
        max: getAbilityMaximumCount(enums.AbilityNameKeyType.SpLesson20),
      },
      [enums.ActionIdType.Exam15]: { min: 0, max: getAbilityMaximumCount(enums.AbilityNameKeyType.Exam15) },
      [enums.ActionIdType.SkillAcquire]: { min: 15, max: 20 },
      [enums.ActionIdType.ASkillAcquire]: { min: 5, max: 10 },
      [enums.ActionIdType.MSkillAcquire]: { min: 10, max: 15 },
      [enums.ActionIdType.SsrCardAcquire]: { min: 0, max: 8 },
      [enums.ActionIdType.DrowsyAcquire]: { min: 0, max: 4 },
      [enums.ActionIdType.VitalityCardAcquire]: { min: 4, max: 10 },
      [enums.ActionIdType.VitalityCardAcquire8]: {
        min: 0,
        max: getAbilityMaximumCount(enums.AbilityNameKeyType.VitalityCardAcquire8),
      },
      [enums.ActionIdType.GoodConditionCardAcquire]: { min: 4, max: 10 },
      [enums.ActionIdType.GoodConditionCardAcquire8]: {
        min: 0,
        max: getAbilityMaximumCount(enums.AbilityNameKeyType.GoodConditionCardAcquire8),
      },
      [enums.ActionIdType.ConcentrationCardAcquire]: { min: 4, max: 10 },
      [enums.ActionIdType.ConcentrationCardAcquire8]: {
        min: 0,
        max: getAbilityMaximumCount(enums.AbilityNameKeyType.ConcentrationCardAcquire8),
      },
      [enums.ActionIdType.GoodImpressionCardAcquire]: { min: 4, max: 10 },
      [enums.ActionIdType.GoodImpressionCardAcquire8]: {
        min: 0,
        max: getAbilityMaximumCount(enums.AbilityNameKeyType.GoodImpressionCardAcquire8),
      },
      [enums.ActionIdType.MotivationCardAcquire]: { min: 4, max: 10 },
      [enums.ActionIdType.MotivationCardAcquire8]: {
        min: 0,
        max: getAbilityMaximumCount(enums.AbilityNameKeyType.MotivationCardAcquire8),
      },
      [enums.ActionIdType.AggressiveCardAcquire]: { min: 4, max: 10 },
      [enums.ActionIdType.AggressiveCardAcquire8]: {
        min: 0,
        max: getAbilityMaximumCount(enums.AbilityNameKeyType.AggressiveCardAcquire8),
      },
      [enums.ActionIdType.ReserveCardAcquire]: { min: 4, max: 10 },
      [enums.ActionIdType.ReserveCardAcquire8]: {
        min: 0,
        max: getAbilityMaximumCount(enums.AbilityNameKeyType.ReserveCardAcquire8),
      },
      [enums.ActionIdType.FullPowerCardAcquire]: { min: 4, max: 10 },
      [enums.ActionIdType.FullPowerCardAcquire8]: {
        min: 0,
        max: getAbilityMaximumCount(enums.AbilityNameKeyType.FullPowerCardAcquire8),
      },
      [enums.ActionIdType.ConsultSkillCardAcquire]: {
        min: 0,
        max: getAbilityMaximumCount(enums.AbilityNameKeyType.ConsultSkillCardAcquire),
      },
      [enums.ActionIdType.SkillEnhance]: { min: 0, max: 8 },
      [enums.ActionIdType.ASkillEnhance]: { min: 0, max: 8 },
      [enums.ActionIdType.MSkillEnhance]: { min: 0, max: 8 },
      [enums.ActionIdType.Delete]: { min: 0, max: 8 },
      [enums.ActionIdType.ASkillDelete]: {
        min: 0,
        max: getAbilityMaximumCount(enums.AbilityNameKeyType.ASkillDelete),
      },
      [enums.ActionIdType.MSkillDelete]: {
        min: 0,
        max: getAbilityMaximumCount(enums.AbilityNameKeyType.MSkillDelete),
      },
      [enums.ActionIdType.TroubleDelete]: { min: 0, max: 8 },
      [enums.ActionIdType.PDrinkAcquire]: { min: 10, max: 30 },
      [enums.ActionIdType.PDrinkExchange]: { min: 0, max: 15 },
      [enums.ActionIdType.Change]: { min: 0, max: getAbilityMaximumCount(enums.AbilityNameKeyType.Change) },
      [enums.ActionIdType.BasicCardChange]: {
        min: 0,
        max: getAbilityMaximumCount(enums.AbilityNameKeyType.BasicCardChange),
      },
      [enums.ActionIdType.Customize]: { min: 0, max: getAbilityMaximumCount(enums.AbilityNameKeyType.Customize) },
      [enums.ActionIdType.PItemAcquire]: {
        min: 0,
        max: getAbilityMaximumCount(enums.AbilityNameKeyType.PItemAcquire),
      },
    },
  },
  /** 初期パラメータの基準値と、前後に散らす幅 */
  initialParams: {
    baselineByScenario: {
      [enums.ScenarioType.Hif]: { vocal: 300, dance: 300, visual: 300 },
      [enums.ScenarioType.Hajime]: { vocal: 200, dance: 200, visual: 200 },
    },
    variation: 100,
  },
  /** 初期パラメータボーナスの基準値と、前後に散らすポイント数 */
  paramBonusPercent: {
    baselineByScenario: {
      [enums.ScenarioType.Hif]: { vocal: 30, dance: 30, visual: 30 },
      [enums.ScenarioType.Hajime]: { vocal: 20, dance: 20, visual: 20 },
    },
    variationPercentagePoints: 10,
    step: constant.PARAMETER_BONUS_PERCENT_STEP,
  },
}

/** Variantのスケジュールでレッスン週を数えるため、通常レッスンの内訳は追加しない */
const normalLessonActionIds = new Set<enums.ActionIdType>([
  enums.ActionIdType.NormalLessonVo,
  enums.ActionIdType.NormalLessonDa,
  enums.ActionIdType.NormalLessonVi,
])

/** スケジュール連動項目と通常レッスン内訳以外は、個別範囲を必須にする */
for (const { id } of ActionCategoryList) {
  if (ScheduleControlledIds.has(id) || normalLessonActionIds.has(id)) continue
  if (!randomCaseValueRanges.manualActionCounts.byAction[id]) {
    throw new Error(`Missing random range for actionCounts.${id}`)
  }
}

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

/** Variantが属するActions shardを返す。matrixShardはこの値と比較する実行側の指定 */
function getOptimizerShard(variant: Variant): OptimizerShard {
  if (variant.scenario === enums.ScenarioType.Hajime) {
    const lessonCounts = Object.values(variant.lessonCounts)
    if (lessonCounts.includes(4)) return 'hajime-4-1'
    if (lessonCounts.includes(5)) return 'hajime-5'
    throw new Error(`No CP-SAT shard matches Hajime variant ${variant.label}`)
  }

  const lessonCounts = Object.values(variant.lessonCounts)
  if (lessonCounts.includes(6)) return 'hif-6-2'
  if (lessonCounts.includes(7)) return 'hif-7-1'
  if (lessonCounts.includes(8)) return 'hif-8'
  throw new Error(`No CP-SAT shard matches HIF variant ${variant.label}`)
}

type OptimizerCaseKind = 'all-four-control' | 'randomized'

interface OptimizerMatrixCase {
  /** シナリオ、レッスン配分、授業属性の組み合わせ */
  variant: Variant
  /** 同じ条件を検証する育成プラン */
  plan: (typeof plans)[number]
  /** 固定4凸対照か、凸数なども散らすランダム条件か */
  kind: OptimizerCaseKind
}

/** HIFの全レッスン配分方向と初の各条件を固定対照で検証し、各shardにランダム条件も加える */
function buildOptimizerMatrixCases(seed: string): OptimizerMatrixCase[] {
  const variants = buildVariants()
  return optimizerShards.flatMap((shard) => {
    // 全shard候補には固定対照に使う条件と、ランダム条件だけで使うサブ指定条件の両方がある
    const allShardVariants = variants.filter((variant) => getOptimizerShard(variant) === shard)
    if (allShardVariants.length === 0) throw new Error(`No variant matches ${shard}`)

    // HIFの固定対照は半分割モードの全方向。初レジェンドはshard内の全条件が固定対照になる
    const fixedControlVariants = allShardVariants.filter(
      (variant) => variant.scenario === enums.ScenarioType.Hajime || variant.hifLessonSplitSub === true,
    )
    if (fixedControlVariants.length === 0) throw new Error(`No 4凸 control variants match ${shard}`)

    // shard内のレッスン配分・授業属性から1条件を選び、同じ条件を3プランへ使う
    const nextRandom = createSeededRandom(`${seed}:${shard}:variant`)
    const randomizedVariantIndex = Math.floor(nextRandom() * allShardVariants.length)
    const randomizedVariant = allShardVariants[randomizedVariantIndex]
    if (!randomizedVariant) throw new Error(`No randomized variant was selected for ${shard}`)

    const cases: OptimizerMatrixCase[] = [
      ...fixedControlVariants.flatMap((variant) =>
        plans.map((plan) => ({ variant, plan, kind: 'all-four-control' as const })),
      ),
      ...plans.map((plan) => ({ variant: randomizedVariant, plan, kind: 'randomized' as const })),
    ]
    const expectedCaseCount = (fixedControlVariants.length + 1) * plans.length
    if (cases.length !== expectedCaseCount) {
      throw new Error(`Expected ${expectedCaseCount} cases in ${shard}, got ${cases.length}`)
    }
    return cases
  })
}

/** 実行seedで作った全shardのケース一覧 */
const optimizerMatrixCases = buildOptimizerMatrixCases(matrixRunSeed)
/** この実行が担当するケース数。shard未指定のローカル実行では全shardを数える */
const matrixCaseCount = optimizerMatrixCases.filter(
  ({ variant }) => !matrixShard || getOptimizerShard(variant) === matrixShard,
).length

/** ケースごとに設定したVerifier timeoutと30秒の終了猶予を見込み、全体に60秒を足す */
const matrixTestTimeoutMs =
  Math.ceil(matrixCaseCount / Math.min(matrixCaseCount, workerLimit)) *
    (verificationTimeoutMs + verifierProcessGracePeriodMs) +
  matrixSetupGracePeriodMs

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

/** Actionsログに載せる編成名を、Verifierとアプリの両方の形式から整形する */
function formatLineup(value: unknown): string {
  if (!Array.isArray(value)) return '未記録'
  const names = value.flatMap((member): string[] => {
    if (typeof member !== 'object' || member === null || !('name' in member) || typeof member.name !== 'string')
      return []
    const rentalLabel = 'isRental' in member && member.isRental === true ? '（レンタル）' : ''
    return [`${member.name}${rentalLabel}`]
  })
  return names.length > 0 ? names.join('、') : '未記録'
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

/** seedの文字列から、呼び出すたびに次の再現可能な乱数を作る */
function createSeededRandom(seed: string): () => number {
  // FNV-1aの初期値から始め、seedの全文字を32bitの状態へ畳み込む
  let state = 2166136261
  for (const character of seed) {
    // 文字コードを現在のハッシュへ混ぜ、FNV素数との積で次の状態へ進める
    state ^= character.charCodeAt(0)
    state = Math.imul(state, 16777619)
  }

  return () => {
    // Mulberry32の定数を加えて、この呼び出し専用の状態を作る
    state += 0x6d2b79f5
    // 後続のビット演算で次回用の状態を壊さないよう作業値へコピーする
    let value = state
    // 15bit右へずらした値をXORし、奇数との乗算でビットを拡散する
    value = Math.imul(value ^ (value >>> 15), value | 1)
    // 7bit右シフト後の値をXORし、61とのORで乗算用の値を作る
    const shiftedValue = value ^ (value >>> 7)
    const multiplier = value | 61
    // 混合値との積を元の値へ加算してからXORし、さらにビットを拡散する
    value ^= value + Math.imul(shiftedValue, multiplier)
    // 最後に14bit右シフト値をXORし、符号なし整数を0以上1未満へ変換する
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/** 範囲の欠落や逆転を拒否し、両端を含む整数をseed付きで選ぶ */
function randomIntegerInRange(range: IntegerRange, nextRandom: () => number, label: string): number {
  if (!Number.isSafeInteger(range.min) || !Number.isSafeInteger(range.max) || range.min < 0 || range.max < range.min) {
    throw new Error(`${label} range must have non-negative safe integer bounds`)
  }
  return range.min + Math.floor(nextRandom() * (range.max - range.min + 1))
}

/** 設定範囲を、アビリティ上限とスケジュール上限の範囲に収める */
function getRandomActionRange(
  id: enums.ActionIdType,
  scheduleMaximumCounts: Partial<Record<enums.ActionIdType, number>>,
): IntegerRange {
  const range = randomCaseValueRanges.manualActionCounts.byAction[id]
  if (!range) throw new Error(`Missing random range for actionCounts.${id}`)
  if (
    !Number.isSafeInteger(range.min) ||
    !Number.isSafeInteger(range.max) ||
    range.min < 0 ||
    range.max < range.min ||
    range.max > constant.ACTION_COUNT_MAX
  ) {
    throw new Error(`actionCounts.${id} range must be integers from 0 to ${constant.ACTION_COUNT_MAX}`)
  }

  // スケジュール上限がある項目だけ個別範囲をさらに狭める
  const scheduleMaximum = scheduleMaximumCounts[id]
  const maximum = scheduleMaximum === undefined ? range.max : Math.min(range.max, scheduleMaximum)
  if (range.min > maximum) {
    throw new Error(`actionCounts.${id} minimum ${range.min} exceeds its maximum ${maximum}`)
  }
  return { min: range.min, max: Math.min(range.max, maximum) }
}

/** 親合計を一様に選び、その合計になる子配分も一様に選ぶ
 *
 * 子の範囲が同じなら、属性を入れ替えた配分は同じ確率になる
 */
function createRandomizedLinkedActionGroup(
  parentId: enums.ActionIdType,
  childIds: enums.ActionIdType[],
  nextRandom: () => number,
  actionCounts: ActionCounts,
  scheduleMaximumCounts: Partial<Record<enums.ActionIdType, number>>,
): void {
  const parentRange = getRandomActionRange(parentId, scheduleMaximumCounts)
  const childRanges = childIds.map((id) => getRandomActionRange(id, scheduleMaximumCounts))
  // 親の回数は、親自身と子の合計範囲の両方に入る値から選ぶ
  // 子のminが全て0なら親も0から選べる。子にminを設定した場合は、その合計が親の下限になる
  const minimumTotal = Math.max(
    parentRange.min,
    childRanges.reduce((total, range) => total + range.min, 0),
  )
  const maximumTotal = Math.min(
    parentRange.max,
    childRanges.reduce((total, range) => total + range.max, 0),
  )
  if (minimumTotal > maximumTotal) {
    throw new Error(`actionCounts.${parentId} range cannot match its subtype ranges`)
  }

  const parentTotal = randomIntegerInRange(
    { min: minimumTotal, max: maximumTotal },
    nextRandom,
    `actionCounts.${parentId}`,
  )

  const distributions: number[][] = []
  const currentDistribution: number[] = []

  // 選んだ親合計に一致する子の配分だけを、子の指定範囲内で再帰的に列挙する
  function enumerateDistributions(childIndex: number, remainingTotal: number) {
    if (childIndex === childRanges.length) {
      // 全ての子を割り当て終わり、合計も一致した配分を候補に残す
      if (remainingTotal === 0) distributions.push([...currentDistribution])
      return
    }

    const childRange = childRanges[childIndex]
    if (!childRange) throw new Error(`Missing range for actionCounts.${childIds[childIndex]}`)
    const remainingRanges = childRanges.slice(childIndex + 1)
    const remainingMinimum = remainingRanges.reduce((total, range) => total + range.min, 0)
    const remainingMaximum = remainingRanges.reduce((total, range) => total + range.max, 0)
    // 残りの子が各min/maxを守れるように、現在の子へ割り当てられる範囲を絞る
    const feasibleRange = {
      min: Math.max(childRange.min, remainingTotal - remainingMaximum),
      max: Math.min(childRange.max, remainingTotal - remainingMinimum),
    }
    for (let childCount = feasibleRange.min; childCount <= feasibleRange.max; childCount += 1) {
      currentDistribution.push(childCount)
      enumerateDistributions(childIndex + 1, remainingTotal - childCount)
      currentDistribution.pop()
    }
  }

  enumerateDistributions(0, parentTotal)
  if (distributions.length === 0) {
    throw new Error(`actionCounts.${parentId} has no subtype distribution for total ${parentTotal}`)
  }
  const selectedDistribution = distributions[Math.floor(nextRandom() * distributions.length)]
  if (!selectedDistribution) throw new Error(`No subtype distribution was selected for actionCounts.${parentId}`)
  childIds.forEach((childId, index) => {
    const childCount = selectedDistribution[index]
    if (childCount === undefined) throw new Error(`Missing generated count for actionCounts.${childId}`)
    actionCounts[childId] = childCount
  })
  actionCounts[parentId] = parentTotal
}

/** スケジュールで自動調整されない点数設定を、条件に合う回数で作る */
function createRandomizedManualActionCounts(nextRandom: () => number, scheduleCounts: ActionCounts): ActionCounts {
  const actionCounts: ActionCounts = {}
  const scheduleMaximumCounts: Partial<Record<enums.ActionIdType, number>> = {
    [enums.ActionIdType.Exam15]: scheduleCounts[enums.ActionIdType.ExamEnd] ?? 0,
    [enums.ActionIdType.SpLesson20]: scheduleCounts[enums.ActionIdType.SpLesson] ?? 0,
  }

  for (const { id } of ActionCategoryList) {
    if (ScheduleControlledIds.has(id)) continue
    if (normalLessonActionIds.has(id)) {
      actionCounts[id] = 0
      continue
    }
    // LinkedActionGroupsは親=子の合計を表す。BasicCardChangeはChange以下という別制約なので後で処理する
    if (LinkedActionGroups.some((group) => group.includes(id)) || id === enums.ActionIdType.BasicCardChange) continue
    const range = getRandomActionRange(id, scheduleMaximumCounts)
    actionCounts[id] = randomIntegerInRange(range, nextRandom, `actionCounts.${id}`)
  }

  for (const [parentId, ...childIds] of LinkedActionGroups) {
    createRandomizedLinkedActionGroup(parentId, childIds, nextRandom, actionCounts, scheduleMaximumCounts)
  }

  // 基本カード変更だけは通常Changeを超えない範囲で抽選する
  const changeCount = actionCounts[enums.ActionIdType.Change]
  if (changeCount === undefined) throw new Error('Missing generated count for actionCounts.change')
  const basicCardChangeRange = getRandomActionRange(enums.ActionIdType.BasicCardChange, scheduleMaximumCounts)
  const basicCardChangeMaximum = Math.min(basicCardChangeRange.max, changeCount)
  if (basicCardChangeRange.min > basicCardChangeMaximum) {
    throw new Error('actionCounts.basic_card_change minimum exceeds the generated change count')
  }
  actionCounts[enums.ActionIdType.BasicCardChange] = randomIntegerInRange(
    { min: basicCardChangeRange.min, max: basicCardChangeMaximum },
    nextRandom,
    `actionCounts.${enums.ActionIdType.BasicCardChange}`,
  )

  return actionCounts
}

/** 3属性ごとの初期パラメータを、個別に指定した整数範囲から作る */
function createRandomizedInitialParams(nextRandom: () => number, scenario: Variant['scenario']): ParameterValues {
  const baseline = randomCaseValueRanges.initialParams.baselineByScenario[scenario]
  const variation = randomCaseValueRanges.initialParams.variation
  if (!Number.isSafeInteger(variation) || variation < 0) {
    throw new Error('initialParams.variation must be a non-negative integer')
  }

  return {
    [enums.ParameterType.Vocal]: randomIntegerInRange(
      {
        min: Math.max(0, baseline.vocal - variation),
        max: Math.min(constant.INITIAL_PARAMETER_MAX, baseline.vocal + variation),
      },
      nextRandom,
      `initialParams.${enums.ParameterType.Vocal}`,
    ),
    [enums.ParameterType.Dance]: randomIntegerInRange(
      {
        min: Math.max(0, baseline.dance - variation),
        max: Math.min(constant.INITIAL_PARAMETER_MAX, baseline.dance + variation),
      },
      nextRandom,
      `initialParams.${enums.ParameterType.Dance}`,
    ),
    [enums.ParameterType.Visual]: randomIntegerInRange(
      {
        min: Math.max(0, baseline.visual - variation),
        max: Math.min(constant.INITIAL_PARAMETER_MAX, baseline.visual + variation),
      },
      nextRandom,
      `initialParams.${enums.ParameterType.Visual}`,
    ),
  }
}

/** 3属性ごとの初期パラメータボーナスを、設定した刻み幅で作る */
function createRandomizedParamBonusPercent(nextRandom: () => number, scenario: Variant['scenario']): ParameterValues {
  const baseline = randomCaseValueRanges.paramBonusPercent.baselineByScenario[scenario]
  const variation = randomCaseValueRanges.paramBonusPercent.variationPercentagePoints
  const step = randomCaseValueRanges.paramBonusPercent.step
  if (!Number.isFinite(variation) || variation < 0) {
    throw new Error('paramBonusPercent.variationPercentagePoints must be non-negative')
  }

  const randomValue = (type: enums.ParameterType) => {
    const baselineValue = baseline[type]
    const minimum = Math.max(0, baselineValue - variation)
    const maximum = Math.min(constant.PARAMETER_BONUS_PERCENT_MAX, baselineValue + variation)
    const stepCount = (maximum - minimum) / step
    const firstStep = minimum / step
    if (
      !Number.isFinite(minimum) ||
      !Number.isFinite(maximum) ||
      !Number.isFinite(step) ||
      minimum < 0 ||
      maximum < minimum ||
      maximum > constant.PARAMETER_BONUS_PERCENT_MAX ||
      step < constant.PARAMETER_BONUS_PERCENT_STEP ||
      Math.abs(stepCount - Math.round(stepCount)) > 1e-8 ||
      Math.abs(firstStep - Math.round(firstStep)) > 1e-8
    ) {
      throw new Error(`paramBonusPercent.${type} range must fit the supported step and bounds`)
    }
    const stepIndex = randomIntegerInRange(
      { min: 0, max: Math.round(stepCount) },
      nextRandom,
      `paramBonusPercent.${type}`,
    )
    return Number((minimum + stepIndex * step).toPrecision(12))
  }

  return {
    [enums.ParameterType.Vocal]: randomValue(enums.ParameterType.Vocal),
    [enums.ParameterType.Dance]: randomValue(enums.ParameterType.Dance),
    [enums.ParameterType.Visual]: randomValue(enums.ParameterType.Visual),
  }
}

/** 変更可能なレッスン・授業以外の週から、候補内の活動をseed付きで選ぶ */
function randomizeOtherScheduleActivities(
  selections: Record<number, enums.ActivityIdType>,
  scenario: Variant['scenario'],
  difficulty: enums.DifficultyType,
  hifLessonSplitSub: boolean,
  nextRandom: () => number,
): Record<number, enums.ActivityIdType> {
  const updated = { ...selections }
  for (const week of getScheduleData(scenario, difficulty)) {
    const current = updated[week.week]
    const isSelectionFixed = week.fixed && !week.canRest
    if (isSelectionFixed || current === undefined || lessonActivities.has(current) || classActivities.has(current))
      continue

    const candidates = [
      ...week.activities.map(({ id }) => id),
      ...(week.canRest ? [enums.ActivityIdType.Rest] : []),
    ].filter(
      (activity) =>
        !lessonActivities.has(activity) &&
        !classActivities.has(activity) &&
        isScheduleActivityAllowed(week, activity, scenario, hifLessonSplitSub),
    )
    if (candidates.length === 0) throw new Error(`No random activity is available for week ${week.week}`)
    const selected = candidates[Math.floor(nextRandom() * candidates.length)]
    if (selected === undefined) throw new Error(`No random activity was selected for week ${week.week}`)
    updated[week.week] = selected
  }
  return updated
}

/** seedからカードごとの凸数を再現可能に割り当てる */
function createSeededCardUncaps(seed: string): Record<string, enums.UncapType> {
  const nextRandom = createSeededRandom(seed)
  const uncapTypes = [
    enums.UncapType.NotOwned,
    enums.UncapType.Zero,
    enums.UncapType.One,
    enums.UncapType.Two,
    enums.UncapType.Three,
    enums.UncapType.Four,
  ]
  const sortedCards = [...AllCards].sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  )
  return Object.fromEntries(
    sortedCards.map(({ name }) => {
      const uncapType = uncapTypes[Math.floor(nextRandom() * uncapTypes.length)]
      if (uncapType === undefined) throw new Error(`No uncap level was generated for ${name}`)
      return [name, uncapType]
    }),
  )
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
      // ケース絞り込み時に、seed付きマトリクス外の任意条件も指定できるよう全Variantを用意する
      const variants = buildVariants()
      // 例: variant.label=Vo7Da1_半分割 (scenario=HIF, lessonCounts={vocal:7,dance:1}, classType=visual), plan=Sense, kind=all-four-control。
      // hif-7-1はこの形式で固定18件+seedで選ぶVariantの3プラン=21件。凸数・点数・予定の値はverifyJobで別に作る。
      // CASE_FILTERを指定した場合は、variant名とplanが一致する行だけを選ぶ。
      const selectedCases = optimizerMatrixCases.filter(({ variant, plan }) => {
        if (matrixShard && getOptimizerShard(variant) !== matrixShard) return false
        return !normalizedCaseFilter || `${variant.scenario}:${variant.label}:${plan.label}` === normalizedCaseFilter
      })
      if (normalizedCaseFilter && selectedCases.length === 0) {
        // CASE_FILTER未指定ならこの分岐には入らず、このshardの固定ケースとseedで選んだVariantの3プランを実行する
        // 例: HIF:Vo7Da1_サブ指定:Senseがseed抽選に含まれない場合も、指定されたVariantとSenseを1件追加する
        const [scenario, variantLabel, planLabel] = normalizedCaseFilter.split(':')
        const requestedVariant = variants.find(
          (variant) => variant.scenario === scenario && variant.label === variantLabel,
        )
        const requestedPlan = plans.find((plan) => plan.label === planLabel)
        if (
          requestedVariant &&
          requestedPlan &&
          (!matrixShard || getOptimizerShard(requestedVariant) === matrixShard)
        ) {
          selectedCases.push({ variant: requestedVariant, plan: requestedPlan, kind: 'randomized' })
        }
      }
      if (selectedCases.length === 0) throw new Error(`No optimizer case matches ${caseFilter ?? 'the matrix'}`)
      if (!normalizedCaseFilter) expect(selectedCases).toHaveLength(matrixCaseCount)
      const resultKeys = new Set<string>()
      const reportPath = resolve(
        process.env[optimizerEnv('REPORT_PATH')] ??
          `tmp/optimizer-validation/cp-sat-optimizer-matrix-results${matrixShard ? `-${matrixShard}` : ''}.json`,
      )
      const failures: string[] = []
      const jobs = selectedCases.flatMap(({ variant, plan, kind }, caseIndex) => {
        const key = `${variant.scenario}:${variant.label}`
        const branchCounts: (2 | 3 | 4 | undefined)[] = splitMainTypeCounts
          ? variant.mainType === enums.ParameterType.Visual
            ? [2, 3, 4]
            : [3, 4]
          : [undefined]
        // Vi主属性だけ2枚固定も含め、それ以外は3枚・4枚固定で比較する
        return branchCounts.map((mainTypeCount, branchIndex) => {
          const resultKey = `${key}:${plan.label}:${kind}${mainTypeCount === undefined ? '' : `:main-${mainTypeCount}`}`
          if (resultKeys.has(resultKey)) throw new Error(`Duplicate optimizer result: ${resultKey}`)
          resultKeys.add(resultKey)
          return {
            index: caseIndex * branchCounts.length + branchIndex,
            resultKey,
            variant,
            plan,
            kind,
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
            {
              runSeed: matrixRunSeed,
              cases: caseResults.filter((entry): entry is Record<string, unknown> => entry !== undefined),
            },
            null,
            2,
          ),
        )
      }
      writeReport()

      /** 1ケースのTypeScript基準を作り、同じ入力でCP-SATの最適性を調べる */
      async function verifyJob(job: (typeof jobs)[number]) {
        const { index, resultKey, variant, plan, kind, mainTypeCount } = job
        const isAllFourControl = kind === 'all-four-control'
        const conditionKey = `${variant.scenario}:${variant.label}:${mainTypeCount ?? 'flexible'}`
        const uncapSeed = isAllFourControl ? undefined : `${matrixRunSeed}:${conditionKey}:uncaps`
        const randomizedSettingsSeed = isAllFourControl ? undefined : `${matrixRunSeed}:${conditionKey}:settings`
        const nextRandom = randomizedSettingsSeed ? createSeededRandom(randomizedSettingsSeed) : undefined
        const cardUncaps = uncapSeed
          ? createSeededCardUncaps(uncapSeed)
          : Object.fromEntries(AllCards.map(({ name }) => [name, enums.UncapType.Four]))
        let randomizedSettings: Record<string, unknown> | null = null
        try {
          const variantScheduleSelections = applyScheduleVariant(
            variant.scenario === enums.ScenarioType.Hif ? storedSchedule.hif : storedScore.scheduleSelections,
            variant,
          )
          const difficulty =
            variant.scenario === enums.ScenarioType.Hif ? enums.DifficultyType.None : enums.DifficultyType.Legend
          const scheduleSelections =
            nextRandom && randomCaseValueRanges.randomizeOtherScheduleActivities
              ? randomizeOtherScheduleActivities(
                  variantScheduleSelections,
                  variant.scenario,
                  difficulty,
                  variant.hifLessonSplitSub ?? storedScore.hifLessonSplitSub,
                  nextRandom,
                )
              : variantScheduleSelections
          const baseScoreSettings = normalizeScoreSettingsDerived({
            ...storedScore,
            scenario: variant.scenario,
            hifLessonSplitSub: variant.hifLessonSplitSub ?? storedScore.hifLessonSplitSub,
            difficulty,
            scheduleSelections,
          })
          const scheduleCounts = mergeScheduleCounts(
            { ...baseScoreSettings, useScheduleLimits: true },
            getScheduleData(variant.scenario, difficulty),
          )
          const actionCounts = nextRandom
            ? { ...storedScore.actionCounts, ...createRandomizedManualActionCounts(nextRandom, scheduleCounts) }
            : {
                ...storedScore.actionCounts,
                [enums.ActionIdType.PDrinkAcquire]:
                  variant.scenario === enums.ScenarioType.Hif
                    ? storedScore.actionCounts[enums.ActionIdType.PDrinkAcquire]
                    : 20,
              }
          const scoreSettings = normalizeScoreSettingsDerived({ ...baseScoreSettings, actionCounts })
          // Vi主属性は2〜4枚、それ以外は従来の3〜4枚で探索し、指定時だけ枚数を固定する
          const typeCountMin = { ...storedUnit.typeCountMin }
          const typeCountMax = { ...storedUnit.typeCountMax }
          const mainTypeMinimum = variant.mainType === enums.ParameterType.Visual ? 2 : 3
          typeCountMin[variant.mainType] = mainTypeCount ?? mainTypeMinimum
          typeCountMax[variant.mainType] = mainTypeCount ?? 4
          const needsExpandedCandidateLimit = hajimeExpandedCandidateLimitCases.has(`${variant.label}:${plan.label}`)
          const settings: UnitSimulatorSettings = {
            ...storedUnit,
            exhaustiveCandidateLimit:
              variant.scenario === enums.ScenarioType.Hajime && needsExpandedCandidateLimit
                ? Math.max(
                    storedUnit.exhaustiveCandidateLimit ?? constant.EXHAUSTIVE_CANDIDATE_LIMIT,
                    hajimeExpandedCandidateLimit,
                  )
                : storedUnit.exhaustiveCandidateLimit,
            plan: plan.value,
            typeCountMin,
            typeCountMax,
            initialParams: nextRandom
              ? createRandomizedInitialParams(nextRandom, variant.scenario)
              : { ...randomCaseValueRanges.initialParams.baselineByScenario[variant.scenario] },
            paramBonusPercent: nextRandom
              ? createRandomizedParamBonusPercent(nextRandom, variant.scenario)
              : { ...randomCaseValueRanges.paramBonusPercent.baselineByScenario[variant.scenario] },
          }
          const input: OptimizeInput = {
            settings,
            scoreSettings,
            // 凸数をseedで変え、各ケースで同じ所持状態を再現できるようにする
            cardUncaps,
            cardCountCustom: customCounts,
            allCards: AllCards,
            cardByName: new Map(AllCards.map((card) => [card.name, card])),
            excludedCardNames: settings.excludedCardNames,
          }
          randomizedSettings = nextRandom
            ? {
                scheduleSelections: scoreSettings.scheduleSelections,
                actionCounts: mergeScheduleCounts(scoreSettings, getScheduleData(variant.scenario, difficulty)),
                parameterBonusBase: scoreSettings.parameterBonusBase,
                initialParams: settings.initialParams,
                paramBonusPercent: settings.paramBonusPercent,
              }
            : null
          if (randomizedSettings) {
            console.log(
              `CP-SAT randomized settings ${scenarioLabels[variant.scenario]} ${variant.label} ${plan.label}: ${JSON.stringify(randomizedSettings)}`,
            )
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
            const countLabel = mainTypeCount === undefined ? `${mainTypeMinimum}–4` : String(mainTypeCount)
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
            kind,
            runSeed: matrixRunSeed,
            scenario: scenarioLabels[variant.scenario],
            variant: variant.label,
            plan: plan.label,
            uncapProfile: uncapSeed ? 'seeded-random-not-owned-to-4' : 'all-four-control',
            uncapSeed: uncapSeed ?? null,
            randomizedSettingsSeed: randomizedSettingsSeed ?? null,
            randomizedSettings,
            mainType: variant.mainType,
            mainTypeCount: mainTypeCount ?? null,
            candidateScore: verificationResult.score,
            appOptimizerLineup: optimized.members.map(({ card, isRental }) => ({
              name: card.name,
              parameterType: card.parameter_type,
              isRental,
            })),
            appOptimizerEvaluatedCombos: evaluatedCombos,
            ...payload.candidatePool,
            typeCountMin: payload.problem.typeCountMin,
            typeCountMax: payload.problem.typeCountMax,
            ...output,
          }
          if (!candidatePreviewEnabled && status !== 'optimal') failures.push(`${resultKey}: ${JSON.stringify(output)}`)
          const verifiedScore = [output.optimalScore, output.bestKnownScore].find(
            (value): value is number => typeof value === 'number',
          )
          const appLineup = formatLineup(verificationResult.members)
          const verifiedLineup = formatLineup(output.bestLineup)
          // ケースごとの条件、点数、両方の編成をActionsログへ残す
          console.log(
            `${completedCount + 1}/${jobs.length} ${kind === 'all-four-control' ? '4凸対照' : 'ランダム'} ` +
              `${scenarioLabels[variant.scenario]} ${variant.label} ${plan.label}: ${status}; ` +
              `${uncapSeed ? `凸数seed=${uncapSeed}` : '全カード4凸'}; ` +
              `${randomizedSettingsSeed ? `設定seed=${randomizedSettingsSeed}; ` : ''}` +
              `アプリ ${verificationResult.score}点 [${appLineup}]; ` +
              `CP-SAT ${verifiedScore === undefined ? '未確定' : `${verifiedScore}点`} [${verifiedLineup}] ` +
              `(app combinations=${evaluatedCombos}, ` +
              `${payload.candidatePool.afterSafePruning}/${payload.candidatePool.beforeSafePruning} CP-SAT candidates)`,
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          failures.push(`${resultKey}: ${message}`)
          caseResults[index] = {
            scenario: scenarioLabels[variant.scenario],
            variant: variant.label,
            plan: plan.label,
            uncapProfile: uncapSeed ? 'seeded-random-not-owned-to-4' : 'all-four-control',
            uncapSeed: uncapSeed ?? null,
            randomizedSettingsSeed: randomizedSettingsSeed ?? null,
            randomizedSettings,
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
      expect(resultKeys.size).toBe(jobs.length)
      expect(failures, `${failures.join('\n')}\nSee ${reportPath}`).toEqual([])
    },
    matrixTestTimeoutMs,
  )
})

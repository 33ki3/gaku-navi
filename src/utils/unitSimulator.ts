/**
 * 編成最適化アルゴリズム
 *
 * 総当たり探索でSP・タイプ条件を満たす組み合わせを評価し、
 * 最もスコアの高い6枚編成を求める
 */
import * as constant from '../constant'
import * as data from '../data'
import * as scoreData from '../data/score'
import * as paramCapData from '../data/score/paramCap'
import type { ParameterValues, PerLessonParameterValues, ScoreSettings } from '../types/card'
import * as enums from '../types/enums'
import type { SupportSynergyDetail, TypeCountValues, UnitMember, UnitResult } from '../types/unit'
import type { OptimizeInput } from '../types/unitOptimizer'
import { parseAbility } from './calculator/helpers'
import { getPerLessonParameterValues } from './calculator/parameterBonus'
import { customRowsToPerLessonValues, mergeScheduleCounts } from './scoreSettings'
import { computeUnitSupportSynergy } from './supportSynergy'
import type { CandidateCard } from './unitOptimizer/candidatePreparation'
import {
  createCandidateCard,
  createCategorizedCandidatePools,
  createRentalBranchContexts,
  createRentalPool,
  prepareCandidates,
  selectSynergyAwareCandidates,
} from './unitOptimizer/candidatePreparation'
import { countSpTypeConstrainedCombos, spTypeConstrainedCombos } from './unitOptimizer/combinatorics'
import { createEvaluatorSeed, evaluateUnitScoreWithSeed } from './unitOptimizer/evaluator'

/** 3種類のパラメータを繰り返し使うため、アプリ起動時に一度だけ作る一覧 */
const PARAMETER_TYPES = Object.values(enums.ParameterType)

export type { OptimizeInput } from '../types/unitOptimizer'

/** 総当たり最適化オプション */
interface ExhaustiveOptimizeOptions {
  onStats?: (stats: ExhaustiveOptimizeStats) => void
}

/** 総当たり最適化の統計 */
interface ExhaustiveOptimizeStats {
  /** 実際に点数を比較した組み合わせ数 */
  evaluatedCombos: number
  /** レンタル枝として訪問した件数 */
  rentalBranchesVisited: number
}

/** スケジュールから取り出すアクション回数とレッスン値 */
interface ResolvedSchedule {
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>
  perLessonValues: PerLessonParameterValues | undefined
}

/** パラメータ上限を考慮するための事前計算値 */
interface ParameterContext {
  /** サポート以外のパラメータ上昇量（初期値・SPレッスン・試験など） */
  nonSupportParams: ParameterValues
  /** パラメータ上限（null = 上限なし） */
  paramCap: number | null
}

/** 手動・自動レンタルの最適化結果 */
interface OptimizeBranchResult {
  /** 最高スコア */
  bestScore: number
  /** 最高スコアを達成したメンバー配列 */
  bestMembers: CandidateCard[] | null
  /** 計算結果として選ばれたレンタル名（手動指定時は指定名） */
  bestRentalName: string | null
  /** 実際に点数を比較した組み合わせ数 */
  evaluatedCombos: number
  /** 自動レンタルで確認した候補数 */
  rentalBranchesVisited: number
}

/**
 * 総組み合わせ数に応じた進捗のまとめ方を計算する
 *
 * 画面更新回数をおおむね一定に保ちながら、
 * 小規模探索では更新を細かく、大規模探索では更新オーバーヘッドを抑える
 *
 * @param totalCombos - 総組み合わせ数
 * @returns バッチサイズ
 */
function resolveExhaustiveBatchSize(totalCombos: number): number {
  // 少ない組み合わせでも進捗を細かく知らせられるよう、切り上げて間隔を決める
  const estimated = Math.ceil(totalCombos / constant.EXHAUSTIVE_PROGRESS_TARGET_UPDATES)
  return Math.max(
    constant.EXHAUSTIVE_PROGRESS_MIN_BATCH_SIZE,
    Math.min(constant.EXHAUSTIVE_PROGRESS_MAX_BATCH_SIZE, estimated),
  )
}

/**
 * パラメータ上限を考慮するための計算条件を作る
 *
 * 初期パラメータ・SPレッスン・試験などサポート以外のパラメータ上昇量を
 * 事前計算し、パラメータ上限と合わせてまとめる
 *
 * @param input - 最適化入力
 * @returns パラメータキャップ最適化コンテキスト
 */
function buildParameterContext(input: OptimizeInput): ParameterContext {
  const { settings, scoreSettings } = input
  const { scenario, scheduleSelections } = scoreSettings

  // SPレッスンによる上昇量を求める
  // HIFの表示設定も渡し、点数設定画面と最適編成結果で同じ週条件を使う
  const spLesson = scoreData.getSpLessonTotal(
    scenario,
    scoreSettings.difficulty,
    scheduleSelections,
    scoreSettings.hifLessonSplitSub,
  )

  // 授業上昇量（通常モードのみ）
  const classTotalGain = scoreSettings.useCustomMode
    ? { vocal: 0, dance: 0, visual: 0 }
    : scoreData.getClassParameterTotal(scenario, scoreSettings.difficulty, scheduleSelections)

  // 試験上昇量
  const examTotalGain = scoreSettings.useCustomMode
    ? { vocal: 0, dance: 0, visual: 0 }
    : scoreSettings.scenario === enums.ScenarioType.Hif
      ? scoreData.getHifExamTotalData(scoreSettings.hifExamRatios)
      : scoreData.getExamTotalData(scoreSettings.scenario, scoreSettings.difficulty)

  const customTargetGain = scoreSettings.useCustomMode
    ? scoreSettings.parameterBonusBase
    : { vocal: 0, dance: 0, visual: 0 }

  // カスタムモードでは、授業や試験などパラメータボーナス対象外の入力値も合計する
  const customNonBonusGain = scoreSettings.useCustomMode
    ? {
        vocal: scoreSettings.customClassBonus.vocal + scoreSettings.customNonBonusGain.vocal,
        dance: scoreSettings.customClassBonus.dance + scoreSettings.customNonBonusGain.dance,
        visual: scoreSettings.customClassBonus.visual + scoreSettings.customNonBonusGain.visual,
      }
    : { vocal: 0, dance: 0, visual: 0 }

  // サポート以外のパラメータ上昇量を合算する
  const nonSupportParams: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  for (const key of PARAMETER_TYPES) {
    nonSupportParams[key] =
      settings.initialParams[key] +
      spLesson[key] +
      classTotalGain[key] +
      customTargetGain[key] +
      examTotalGain[key] +
      customNonBonusGain[key]
  }

  return {
    nonSupportParams,
    paramCap: paramCapData.resolveParamCap(scenario, scoreSettings.difficulty, settings.paramCapOverride),
  }
}

/**
 * スケジュールからアクション回数とレッスン別パラメータを導出する
 *
 * 共通の計算で使うスケジュールの読み替えをここに集約する
 * 試験中のPアイテム取得回数を、Pアイテム取得回数へ合算する処理も含む
 *
 * @param scoreSettings - 点数設定
 * @returns アクション別の発動回数とレッスン別のパラメータ値
 */
function resolveSchedule(scoreSettings: ScoreSettings): ResolvedSchedule {
  // シナリオ・難易度からスケジュールデータを取得する
  const schedule = data.getScheduleData(scoreSettings.scenario, scoreSettings.difficulty)
  // カスタムモード時はスケジュール自動計算を無効にしてすべて手動入力値を使う
  const settingsForCount = scoreSettings.useCustomMode ? { ...scoreSettings, useScheduleLimits: false } : scoreSettings
  // スケジュールからアクション別の発動回数の対応表を作る
  const mergedCounts = mergeScheduleCounts(settingsForCount, schedule)
  // 試験後Pアイテムの回数を合算する
  // 元の対応表を変更しないよう、常に新しいオブジェクトを作る
  const examPItemCount = mergedCounts[enums.ActionIdType.ExamPItemAcquire] ?? 0
  const effectiveCounts =
    examPItemCount > 0
      ? {
          ...mergedCounts,
          [enums.ActionIdType.PItemAcquire]: (mergedCounts[enums.ActionIdType.PItemAcquire] ?? 0) + examPItemCount,
        }
      : { ...mergedCounts }
  // スケジュール上限あり設定の場合はレッスン別パラメータ値を取得する
  // カスタムモード時は customParamBonusRows から per-lesson 値を導出する
  const perLessonValues = scoreSettings.useCustomMode
    ? customRowsToPerLessonValues(scoreSettings.customParamBonusRows)
    : scoreSettings.useScheduleLimits
      ? getPerLessonParameterValues(
          scoreSettings.scheduleSelections,
          scoreSettings.scenario,
          scoreSettings.difficulty,
          scoreSettings.hifLessonSplitSub,
          scoreSettings.hifExamRatios,
        )
      : undefined
  return { effectiveCounts, perLessonValues }
}

/**
 * 最適化結果から編成結果を作る
 *
 * @param members - 最適化されたサポート配列
 * @param input - 最適化入力
 * @param effectiveCounts - スケジュールから導出されたアクション別発動回数の対応表
 * @param autoRentalName - 自動選出されたレンタルサポート名
 * @returns 編成結果
 */
function buildResult(
  members: CandidateCard[],
  input: OptimizeInput,
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>,
  autoRentalName?: string,
): UnitResult {
  const { settings, scoreSettings } = input
  const cards = members.map((m) => m.card)
  // 選ばれたサポートが互いに提供する効果を、同じ回数条件で算出する
  const { bonusMap: synergyMap, providerMap: synergyProviderMap } = computeUnitSupportSynergy(
    cards,
    input.cardCountCustom,
    {
      includeSelfTrigger: scoreSettings.includeSelfTrigger,
      includePItem: scoreSettings.includePItem,
      actionCounts: effectiveCounts,
    },
  )

  // サポートカードのパラボ%を合計する
  const supportPercent: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  for (const m of members) {
    for (const key of PARAMETER_TYPES) {
      supportPercent[key] += m.paramBonusPercent[key]
    }
  }

  // 入力値はサポート外パラボ%なので、そのまま合計へ加える
  const outsidePercent: ParameterValues = { ...settings.paramBonusPercent }

  // パラメータボーナス%: サポートのパラボ% + サポート外のパラボ%
  const totalParamBonusPercent: ParameterValues = {
    vocal: supportPercent.vocal + outsidePercent.vocal,
    dance: supportPercent.dance + outsidePercent.dance,
    visual: supportPercent.visual + outsidePercent.visual,
  }

  // パラメータボーナスの実数値を計算する
  const parameterBonus: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  const base = scoreSettings.parameterBonusBase
  for (const key of PARAMETER_TYPES) {
    parameterBonus[key] = Math.floor((base[key] * totalParamBonusPercent[key]) / constant.PERCENT_DIVISOR)
  }

  // 各メンバーの結果を構築する
  const unitMembers: UnitMember[] = members.map((m) => {
    const synergyExtra = synergyMap.get(m.card.name) ?? {}
    let supportSynergy = 0
    const supportSynergyDetail: SupportSynergyDetail = {}

    // すでに使った回数を記録し、サポート間の追加分にも発動回数の上限を適用する
    const usedCounts = new Map<enums.TriggerKeyType, number>()
    for (const detail of m.baseResult.allAbilityDetails) {
      if (detail.nameKey) {
        // アビリティの発動条件を、回数表で使うアクションIDへ対応づける
        const ability = m.card.abilities.find((a) => a.name_key === detail.nameKey && a.trigger_key)
        if (ability?.trigger_key) {
          usedCounts.set(ability.trigger_key, detail.count)
        }
      }
    }

    for (const ability of m.card.abilities) {
      if (
        ability.skip_calculation ||
        ability.is_percentage ||
        ability.is_event_boost ||
        ability.is_parameter_bonus ||
        ability.is_initial_stat
      )
        continue
      if (!ability.trigger_key) continue
      const actionId = data.TriggerActionMap[ability.trigger_key]
      let extraCount = synergyExtra[actionId] ?? 0
      if (extraCount > 0) {
        // すでに使った回数を差し引き、サポート間連携で上限を超えないようにする
        if (ability.max_count !== undefined) {
          const usedCount = usedCounts.get(ability.trigger_key) ?? 0
          extraCount = Math.max(0, Math.min(extraCount, ability.max_count - usedCount))
        }
        const parsed = parseAbility(ability, m.uncap)
        supportSynergy += Math.floor(parsed.numericValue * extraCount)
        supportSynergyDetail[ability.trigger_key] = (supportSynergyDetail[ability.trigger_key] ?? 0) + extraCount
      }
    }

    // 手動指定または自動選出のレンタル枠を結果へ反映する
    const isRental =
      (settings.manualRental && settings.rentalCardName === m.card.name) ||
      (!settings.manualRental && autoRentalName === m.card.name)

    return {
      card: m.card,
      uncap: m.uncap,
      isRental,
      result: m.baseResult,
      supportSynergy,
      supportSynergyDetail,
      synergyProviders: synergyProviderMap.get(m.card.name) ?? [],
      paramBonusPercent: m.paramBonusPercent,
    }
  })

  // サポート点数をタイプ別に集計する
  // 個別パラボは除外し、ユニット全体のパラボを後で別に加算する
  const supportScore: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  for (const m of unitMembers) {
    const paramKey = m.card.parameter_type as keyof ParameterValues
    if (paramKey in supportScore) {
      supportScore[paramKey] += m.result.totalIncrease - m.result.parameterBonus + m.supportSynergy
    }
  }

  // パラメータキャップを適用した合計パラメータを算出する
  const paramCtx = buildParameterContext(input)
  let totalScore = 0
  for (const key of PARAMETER_TYPES) {
    const raw = paramCtx.nonSupportParams[key] + supportScore[key] + parameterBonus[key]
    totalScore += paramCtx.paramCap !== null ? Math.min(raw, paramCtx.paramCap) : raw
  }

  return {
    members: unitMembers,
    totalScore,
    totalParamBonusPercent,
    parameterBonus,
    parameterBonusBase: { ...base },
    outsideParamBonusPercent: outsidePercent,
  }
}

/**
 * 手動指定レンタルの最適化ロジック
 *
 * 手動でレンタルカードを指定している場合、
 * 自由枠の候補プールから SP+タイプ制約を満たす組み合わせを総当たり列挙する
 *
 * @param fixedRentalName - 固定されたレンタルサポート名
 * @param fixedCandidates - 固定カードと手動レンタルを含むメンバー一覧
 * @param freePool - 自由枠へ入れられる候補一覧（点数の高い順）
 * @param freeSlots - 自由枠のスロット数
 * @param forcedTypeCount - 固定カードが占有するタイプ数
 * @param adjustedTypeCountMax - 固定カードを考慮したタイプ別上限
 * @param adjustedInput - 固定条件を反映した最適化入力
 * @param paramCtx - パラメータ上限を計算するための条件
 * @param fixedVoSp - 固定カードが提供するVocalSP数
 * @param fixedDaSp - 固定カードが提供するDanceSP数
 * @param fixedViSp - 固定カードが提供するVisualSP数
 * @param effectiveCounts - スケジュールから導出されたアクション別発動回数の対応表
 * @param onProgress - 計算の進捗を受け取る操作
 * @param isCancelled - キャンセル判定関数
 * @param onBetterResult - より高い結果が見つかったときに呼ぶ操作
 * @returns 最適化ブランチ結果
 */
async function optimizeManualRental(
  fixedRentalName: string,
  fixedCandidates: CandidateCard[],
  freePool: CandidateCard[],
  freeSlots: number,
  forcedTypeCount: Record<enums.ParameterType, number>,
  adjustedTypeCountMax: TypeCountValues,
  adjustedInput: OptimizeInput,
  paramCtx: ParameterContext,
  fixedVoSp: number,
  fixedDaSp: number,
  fixedViSp: number,
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
  onBetterResult?: (result: UnitResult) => void,
): Promise<OptimizeBranchResult> {
  const settings = adjustedInput.settings
  const neededVo = Math.max(0, settings.spConstraint.vocal - fixedVoSp)
  const neededDa = Math.max(0, settings.spConstraint.dance - fixedDaSp)
  const neededVi = Math.max(0, settings.spConstraint.visual - fixedViSp)
  const categorizedPools = createCategorizedCandidatePools(freePool)

  // 固定カードのタイプ数を引いた残りを、自由枠の上限・下限として使う
  const typeVoMax = Math.max(
    0,
    adjustedTypeCountMax[enums.ParameterType.Vocal] - forcedTypeCount[enums.ParameterType.Vocal],
  )
  const typeDaMax = Math.max(
    0,
    adjustedTypeCountMax[enums.ParameterType.Dance] - forcedTypeCount[enums.ParameterType.Dance],
  )
  const typeViMax = Math.max(
    0,
    adjustedTypeCountMax[enums.ParameterType.Visual] - forcedTypeCount[enums.ParameterType.Visual],
  )
  const typeVoMin = Math.max(
    0,
    settings.typeCountMin[enums.ParameterType.Vocal] - forcedTypeCount[enums.ParameterType.Vocal],
  )
  const typeDaMin = Math.max(
    0,
    settings.typeCountMin[enums.ParameterType.Dance] - forcedTypeCount[enums.ParameterType.Dance],
  )
  const typeViMin = Math.max(
    0,
    settings.typeCountMin[enums.ParameterType.Visual] - forcedTypeCount[enums.ParameterType.Visual],
  )

  // SP条件とタイプ条件を、この後の候補選出へまとめて渡す
  const constraintInput = {
    voSpPool: categorizedPools.voSpPool,
    daSpPool: categorizedPools.daSpPool,
    viSpPool: categorizedPools.viSpPool,
    allSpPool: categorizedPools.allSpPool,
    genVoCount: categorizedPools.genVoPool.length,
    genDaCount: categorizedPools.genDaPool.length,
    genViCount: categorizedPools.genViPool.length,
    genAsCount: categorizedPools.genAsPool.length,
    neededVo,
    neededDa,
    neededVi,
    typeVoMin,
    typeDaMin,
    typeViMin,
    typeVoMax,
    typeDaMax,
    typeViMax,
    totalSlots: freeSlots,
  }
  const total = countSpTypeConstrainedCombos(constraintInput)
  // 条件を満たす組み合わせがなければ、探索せずに候補なしを返す
  if (total === 0) {
    return {
      bestScore: -Infinity,
      bestMembers: null,
      bestRentalName: null,
      evaluatedCombos: 0,
      rentalBranchesVisited: 0,
    }
  }

  onProgress(0, total)
  const batchSize = resolveExhaustiveBatchSize(total)
  let done = 0
  let bestScore = -Infinity
  let bestMembers: CandidateCard[] | null = null
  const manualRentalSeed = createEvaluatorSeed(fixedCandidates)

  // SP条件ごとの組み合わせ数と、実際に評価する組み合わせを同じ条件でそろえる
  const enumerateInput = {
    voSpPool: categorizedPools.voSpPool,
    daSpPool: categorizedPools.daSpPool,
    viSpPool: categorizedPools.viSpPool,
    allSpPool: categorizedPools.allSpPool,
    genVoPool: categorizedPools.genVoPool,
    genDaPool: categorizedPools.genDaPool,
    genViPool: categorizedPools.genViPool,
    genAsPool: categorizedPools.genAsPool,
    neededVo,
    neededDa,
    neededVi,
    typeVoMin,
    typeDaMin,
    typeViMin,
    typeVoMax,
    typeDaMax,
    typeViMax,
    totalSlots: freeSlots,
  }
  for (const combo of spTypeConstrainedCombos(enumerateInput)) {
    if (done % batchSize === 0 && done > 0) {
      if (isCancelled()) {
        return {
          bestScore,
          bestMembers,
          bestRentalName: fixedRentalName,
          evaluatedCombos: done,
          rentalBranchesVisited: 0,
        }
      }
      onProgress(done, total)
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    done++

    // SP条件とタイプ条件を満たす組み合わせだけを評価する
    const score = evaluateUnitScoreWithSeed(
      manualRentalSeed,
      combo,
      adjustedInput.scoreSettings.parameterBonusBase,
      adjustedInput.settings.paramBonusPercent,
      paramCtx,
    )
    if (score > bestScore) {
      bestScore = score
      bestMembers = [...fixedCandidates, ...combo]
      if (onBetterResult) onBetterResult(buildResult(bestMembers, adjustedInput, effectiveCounts, fixedRentalName))
    }
  }

  if (!isCancelled()) onProgress(total, total)

  return {
    bestScore,
    bestMembers,
    bestRentalName: fixedRentalName,
    evaluatedCombos: done,
    rentalBranchesVisited: 0,
  }
}

/**
 * 自動レンタル選出の最適化ロジック
 *
 * 手動でレンタルカードを指定していない場合、
 * 全レンタル候補を列挙し、各レンタルカードに対して
 * 自由枠の SP+タイプ制約満足組み合わせを総当たり列挙する
 *
 * @param fixedCandidates - 固定カードのメンバー一覧（レンタルなし）
 * @param freePool - 自由枠へ入れられる候補一覧（点数の高い順）
 * @param freeSlots - 自由枠のスロット数（レンタル枠を除く）
 * @param forcedTypeCount - 固定カードが占有するタイプ数
 * @param adjustedInput - 固定条件を反映した最適化入力
 * @param schedule - スケジュール解析結果
 * @param paramCtx - パラメータ上限を計算するための条件
 * @param fixedVoSp - 固定カードが提供するVocalSP数
 * @param fixedDaSp - 固定カードが提供するDanceSP数
 * @param fixedViSp - 固定カードが提供するVisualSP数
 * @param fixedNames - 通常枠として固定するカード名の集合
 * @param effectiveCounts - スケジュールから導出されたアクション別発動回数の対応表
 * @param onProgress - 計算の進捗を受け取る操作
 * @param isCancelled - 中断を確認する関数
 * @param onBetterResult - より高い結果が見つかったときに呼ぶ操作
 * @returns この条件での最適化結果
 */
async function optimizeAutoRental(
  fixedCandidates: CandidateCard[],
  freePool: CandidateCard[],
  freeSlots: number,
  forcedTypeCount: Record<enums.ParameterType, number>,
  adjustedInput: OptimizeInput,
  schedule: ResolvedSchedule,
  paramCtx: ParameterContext,
  fixedVoSp: number,
  fixedDaSp: number,
  fixedViSp: number,
  fixedNames: Set<string>,
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
  onBetterResult?: (result: UnitResult) => void,
): Promise<OptimizeBranchResult> {
  const settings = adjustedInput.settings
  // 候補上限は最低10枚にする
  // ユーザー設定がない場合は既定の候補上限を使う
  const candidateLimit = Math.max(10, settings.exhaustiveCandidateLimit ?? constant.EXHAUSTIVE_CANDIDATE_LIMIT)
  const rentalPool = createRentalPool(adjustedInput, schedule, fixedNames, candidateLimit)
  const rentalContexts = createRentalBranchContexts(
    rentalPool,
    freePool,
    adjustedInput,
    settings,
    forcedTypeCount,
    fixedVoSp,
    fixedDaSp,
    fixedViSp,
  )

  // 総組み合わせ数を事前計算し、SP・タイプ条件を反映した進捗を報告する
  let total = 0
  let rentalBranchesVisited = 0
  for (const branch of rentalContexts) {
    rentalBranchesVisited++
    const branchTotal = countSpTypeConstrainedCombos({
      voSpPool: branch.pools.voSpPool,
      daSpPool: branch.pools.daSpPool,
      viSpPool: branch.pools.viSpPool,
      allSpPool: branch.pools.allSpPool,
      genVoCount: branch.pools.genVoPool.length,
      genDaCount: branch.pools.genDaPool.length,
      genViCount: branch.pools.genViPool.length,
      genAsCount: branch.pools.genAsPool.length,
      neededVo: branch.neededVo,
      neededDa: branch.neededDa,
      neededVi: branch.neededVi,
      typeVoMin: branch.typeVoMin,
      typeDaMin: branch.typeDaMin,
      typeViMin: branch.typeViMin,
      typeVoMax: branch.typeVoMax,
      typeDaMax: branch.typeDaMax,
      typeViMax: branch.typeViMax,
      totalSlots: freeSlots - 1,
    })
    branch.totalCombos = branchTotal
    total += branchTotal
  }
  // 条件を満たす組み合わせがなければ、探索せずに候補なしを返す
  if (total === 0) {
    return { bestScore: -Infinity, bestMembers: null, bestRentalName: null, evaluatedCombos: 0, rentalBranchesVisited }
  }

  onProgress(0, total)
  const batchSize = resolveExhaustiveBatchSize(total)
  let done = 0
  let bestScore = -Infinity
  let bestMembers: CandidateCard[] | null = null
  let bestRentalName: string | null = null

  for (const branch of rentalContexts) {
    const branchSeed = createEvaluatorSeed([...fixedCandidates, branch.rental])
    for (const combo of spTypeConstrainedCombos({
      voSpPool: branch.pools.voSpPool,
      daSpPool: branch.pools.daSpPool,
      viSpPool: branch.pools.viSpPool,
      allSpPool: branch.pools.allSpPool,
      genVoPool: branch.pools.genVoPool,
      genDaPool: branch.pools.genDaPool,
      genViPool: branch.pools.genViPool,
      genAsPool: branch.pools.genAsPool,
      neededVo: branch.neededVo,
      neededDa: branch.neededDa,
      neededVi: branch.neededVi,
      typeVoMin: branch.typeVoMin,
      typeDaMin: branch.typeDaMin,
      typeViMin: branch.typeViMin,
      typeVoMax: branch.typeVoMax,
      typeDaMax: branch.typeDaMax,
      typeViMax: branch.typeViMax,
      totalSlots: freeSlots - 1,
    })) {
      if (done % batchSize === 0 && done > 0) {
        if (isCancelled()) {
          return { bestScore, bestMembers, bestRentalName, evaluatedCombos: done, rentalBranchesVisited }
        }
        onProgress(done, total)
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
      }
      done++

      // SP条件とタイプ条件を満たす組み合わせだけを評価する
      const score = evaluateUnitScoreWithSeed(
        branchSeed,
        combo,
        branch.rentalInput.scoreSettings.parameterBonusBase,
        branch.rentalInput.settings.paramBonusPercent,
        paramCtx,
      )
      if (score > bestScore) {
        bestScore = score
        bestMembers = [...fixedCandidates, branch.rental, ...combo]
        bestRentalName = branch.rental.card.name
        if (onBetterResult) onBetterResult(buildResult(bestMembers, adjustedInput, effectiveCounts, bestRentalName))
      }
    }
  }

  if (!isCancelled()) onProgress(total, total)

  return {
    bestScore,
    bestMembers,
    bestRentalName,
    evaluatedCombos: done,
    rentalBranchesVisited,
  }
}

/**
 * 組み合わせ数を事前計算する
 *
 * @param input - 最適編成の条件
 * @param allCandidates - 条件に合うサポート候補一覧
 * @param schedule - 計算に使うスケジュール情報
 * @returns 組み合わせ数
 */
function calculateTotalCombos(
  input: OptimizeInput,
  allCandidates: CandidateCard[],
  schedule: ResolvedSchedule,
): number {
  const { settings, scoreSettings } = input
  const { effectiveCounts, perLessonValues } = schedule

  // 固定候補（固定カード）を抽出する
  const lockedNames = new Set(settings.lockedCards)
  const fixedCandidates: CandidateCard[] = allCandidates.filter((c) => lockedNames.has(c.card.name))

  // 手動指定レンタルを固定候補に追加する（4凸固定・未所持でも可）
  let fixedRentalName: string | null = null
  if (settings.manualRental && settings.rentalCardName) {
    fixedRentalName = settings.rentalCardName
    const alreadyFixed = fixedCandidates.some((c) => c.card.name === fixedRentalName)
    if (!alreadyFixed) {
      const card = input.cardByName.get(settings.rentalCardName)
      if (card) {
        fixedCandidates.push(
          createCandidateCard({
            card,
            uncap: enums.UncapType.Four,
            scoreSettings,
            effectiveCounts,
            perLessonValues,
            customData: input.cardCountCustom?.[card.name],
          }),
        )
      }
    }
  }

  // 固定カードの枚数を下回らないよう、タイプごとの上限を調整する
  const forcedTypeCount: Record<enums.ParameterType, number> = {
    [enums.ParameterType.Vocal]: 0,
    [enums.ParameterType.Dance]: 0,
    [enums.ParameterType.Visual]: 0,
  }
  for (const c of fixedCandidates) {
    if (PARAMETER_TYPES.includes(c.card.type as enums.ParameterType)) {
      forcedTypeCount[c.card.type as enums.ParameterType]++
    }
  }
  const adjustedTypeCountMax: TypeCountValues = {
    [enums.ParameterType.Vocal]: Math.max(
      settings.typeCountMax[enums.ParameterType.Vocal],
      forcedTypeCount[enums.ParameterType.Vocal],
    ),
    [enums.ParameterType.Dance]: Math.max(
      settings.typeCountMax[enums.ParameterType.Dance],
      forcedTypeCount[enums.ParameterType.Dance],
    ),
    [enums.ParameterType.Visual]: Math.max(
      settings.typeCountMax[enums.ParameterType.Visual],
      forcedTypeCount[enums.ParameterType.Visual],
    ),
  }
  const adjustedInput: OptimizeInput = { ...input, settings: { ...settings, typeCountMax: adjustedTypeCountMax } }

  // 自由枠の候補プールを構築する（所持カードのみ・固定カード除く）
  const fixedNames = new Set(fixedCandidates.map((c) => c.card.name))
  const scoredFree: CandidateCard[] = []
  // 候補上限は最低10枚にする
  // ユーザー設定がない場合は既定の候補上限を使う
  const candidateLimit = Math.max(10, settings.exhaustiveCandidateLimit ?? constant.EXHAUSTIVE_CANDIDATE_LIMIT)
  for (const c of allCandidates) {
    if (fixedNames.has(c.card.name)) continue
    scoredFree.push(c)
  }

  // 実際の回数で点数が高い候補に加え、
  // Pアイテムで他カードへ貢献する候補も残す
  const freePoolMap = new Map(
    selectSynergyAwareCandidates(scoredFree, candidateLimit).map((candidate) => [candidate.card.name, candidate]),
  )

  // SP制約を満たすために必要な SP カードをプールに補充する
  // レンタル候補の多くがSP属性でも、自由枠から候補がなくならないよう余分に確保する
  // 既に十分な枚数があれば補充しない
  for (const [spCat, needed] of [
    [enums.SpCategoryType.Vocal, settings.spConstraint.vocal] as const,
    [enums.SpCategoryType.Dance, settings.spConstraint.dance] as const,
    [enums.SpCategoryType.Visual, settings.spConstraint.visual] as const,
  ]) {
    if (needed <= 0) continue
    const alreadySpCount = [...freePoolMap.values()].filter(
      (c) => c.spCategory === spCat || c.spCategory === enums.SpCategoryType.All,
    ).length
    if (alreadySpCount >= needed + constant.UNIT_SIZE) continue
    const topSpCards = [...scoredFree]
      .filter((c) => c.spCategory === spCat || c.spCategory === enums.SpCategoryType.All)
      .sort((a, b) => b.baseScore - a.baseScore)
      .slice(0, needed + constant.UNIT_SIZE)
    for (const c of topSpCards) freePoolMap.set(c.card.name, c)
  }

  // タイプ最小数制約を満たすために必要なタイプ別カードをプールに補充する
  // 既に十分な枚数があれば補充しない
  for (const paramType of [enums.ParameterType.Vocal, enums.ParameterType.Dance, enums.ParameterType.Visual]) {
    const minNeeded = settings.typeCountMin[paramType]
    if (minNeeded <= 0) continue
    const alreadyTypeCount = [...freePoolMap.values()].filter((c) => c.card.type === paramType).length
    if (alreadyTypeCount >= minNeeded + constant.UNIT_SIZE) continue
    const topTypeCards = [...scoredFree]
      .filter((c) => c.card.type === paramType)
      .sort((a, b) => b.baseScore - a.baseScore)
      .slice(0, minNeeded + constant.UNIT_SIZE)
    for (const c of topTypeCards) freePoolMap.set(c.card.name, c)
  }

  const freePool = [...freePoolMap.values()].sort((a, b) => b.baseScore - a.baseScore)

  const freeSlots = constant.UNIT_SIZE - fixedCandidates.length
  // 固定カードだけで6枠を超える設定は成立しない
  if (freeSlots < 0) return 0

  // 固定カードと手動レンタルが提供するSP枚数を計算する
  let fixedVoSp = 0
  let fixedDaSp = 0
  let fixedViSp = 0
  for (const c of fixedCandidates) {
    if (c.spCategory === enums.SpCategoryType.Vocal) fixedVoSp++
    else if (c.spCategory === enums.SpCategoryType.Dance) fixedDaSp++
    else if (c.spCategory === enums.SpCategoryType.Visual) fixedViSp++
    else if (c.spCategory === enums.SpCategoryType.All) {
      fixedVoSp++
      fixedDaSp++
      fixedViSp++
    }
  }

  if (fixedRentalName) {
    const neededVo = Math.max(0, settings.spConstraint.vocal - fixedVoSp)
    const neededDa = Math.max(0, settings.spConstraint.dance - fixedDaSp)
    const neededVi = Math.max(0, settings.spConstraint.visual - fixedViSp)
    const categorizedPools = createCategorizedCandidatePools(freePool)

    const typeVoMax = Math.max(
      0,
      adjustedTypeCountMax[enums.ParameterType.Vocal] - forcedTypeCount[enums.ParameterType.Vocal],
    )
    const typeDaMax = Math.max(
      0,
      adjustedTypeCountMax[enums.ParameterType.Dance] - forcedTypeCount[enums.ParameterType.Dance],
    )
    const typeViMax = Math.max(
      0,
      adjustedTypeCountMax[enums.ParameterType.Visual] - forcedTypeCount[enums.ParameterType.Visual],
    )
    const typeVoMin = Math.max(
      0,
      settings.typeCountMin[enums.ParameterType.Vocal] - forcedTypeCount[enums.ParameterType.Vocal],
    )
    const typeDaMin = Math.max(
      0,
      settings.typeCountMin[enums.ParameterType.Dance] - forcedTypeCount[enums.ParameterType.Dance],
    )
    const typeViMin = Math.max(
      0,
      settings.typeCountMin[enums.ParameterType.Visual] - forcedTypeCount[enums.ParameterType.Visual],
    )

    const constraintInput = {
      voSpPool: categorizedPools.voSpPool,
      daSpPool: categorizedPools.daSpPool,
      viSpPool: categorizedPools.viSpPool,
      allSpPool: categorizedPools.allSpPool,
      genVoCount: categorizedPools.genVoPool.length,
      genDaCount: categorizedPools.genDaPool.length,
      genViCount: categorizedPools.genViPool.length,
      genAsCount: categorizedPools.genAsPool.length,
      neededVo,
      neededDa,
      neededVi,
      typeVoMin,
      typeDaMin,
      typeViMin,
      typeVoMax,
      typeDaMax,
      typeViMax,
      totalSlots: freeSlots,
    }
    return countSpTypeConstrainedCombos(constraintInput)
  } else {
    const candidateLimit = Math.max(10, settings.exhaustiveCandidateLimit ?? constant.EXHAUSTIVE_CANDIDATE_LIMIT)
    const rentalPool = createRentalPool(adjustedInput, schedule, fixedNames, candidateLimit)
    const rentalContexts = createRentalBranchContexts(
      rentalPool,
      freePool,
      adjustedInput,
      settings,
      forcedTypeCount,
      fixedVoSp,
      fixedDaSp,
      fixedViSp,
    )

    let total = 0
    for (const branch of rentalContexts) {
      const branchTotal = countSpTypeConstrainedCombos({
        voSpPool: branch.pools.voSpPool,
        daSpPool: branch.pools.daSpPool,
        viSpPool: branch.pools.viSpPool,
        allSpPool: branch.pools.allSpPool,
        genVoCount: branch.pools.genVoPool.length,
        genDaCount: branch.pools.genDaPool.length,
        genViCount: branch.pools.genViPool.length,
        genAsCount: branch.pools.genAsPool.length,
        neededVo: branch.neededVo,
        neededDa: branch.neededDa,
        neededVi: branch.neededVi,
        typeVoMin: branch.typeVoMin,
        typeDaMin: branch.typeDaMin,
        typeViMin: branch.typeViMin,
        typeVoMax: branch.typeVoMax,
        typeDaMax: branch.typeDaMax,
        typeViMax: branch.typeViMax,
        totalSlots: freeSlots - 1,
      })
      total += branchTotal
    }
    return total
  }
}

/**
 * レンタル枠の固定方法をそろえる設定が有効なとき、比較する探索経路を作る
 *
 * @param input - 最適化入力パラメータ
 * @returns 比較する最適編成条件（現状維持を含む）
 */
function buildUnifyRentalPathConfigs(input: OptimizeInput): OptimizeInput[] {
  const { settings, scoreSettings } = input
  const origRental = settings.rentalCardName

  // レンタル枠・通常枠の固定がなければ、比較する固定方法はない
  if (!origRental && settings.lockedCards.length === 0) return []

  // ロックを統合する場合は、現状維持・通常ロックのレンタル昇格・完全自動レンタルを比較する
  // 通常ロックのレンタル昇格は、所持済みカードだけを対象にする
  const configs: OptimizeInput[] = [
    {
      ...input,
      settings: { ...settings, unifyRentalLock: false },
    },
  ]

  for (const lockedName of settings.lockedCards) {
    const isOwned =
      !!scoreSettings.useFixedUncap ||
      (input.cardUncaps[lockedName] !== undefined && input.cardUncaps[lockedName] !== enums.UncapType.NotOwned)
    if (!isOwned) continue

    // 通常枠の固定カードをレンタル枠へ移し、元のレンタルカードがあれば通常枠へ入れ替える
    const nextLockedCards = settings.lockedCards.filter((n) => n !== lockedName)
    const lockedCards = origRental ? [...nextLockedCards, origRental] : nextLockedCards

    configs.push({
      ...input,
      settings: {
        ...settings,
        manualRental: true,
        rentalCardName: lockedName,
        lockedCards,
        unifyRentalLock: false,
      },
    })
  }

  if (origRental) {
    configs.push({
      ...input,
      settings: {
        ...settings,
        manualRental: false,
        rentalCardName: null,
        lockedCards: [...settings.lockedCards, origRental],
        unifyRentalLock: false,
      },
    })
  }

  return configs
}

/**
 * 総当たり最適化を非同期で実行する
 *
 * 実際のアクション回数で点数が高い候補と、SP条件を満たすための補充候補を対象に、
 * SP条件とタイプ条件を満たす組み合わせを全探索する
 * 候補を絞って計算量を抑えながら、通常の探索で取りこぼした組み合わせを確認する
 *
 * @param input - 最適化入力
 * @param onProgress - 進捗を受け取る操作（done: 評価済み数、total: 総組み合わせ数）
 * @param isCancelled - 中断を確認する関数（trueなら中断）
 * @param onBetterResult - より高い結果を受け取る操作
 * @param options - 探索統計を受け取るオプション
 * @returns 最適ユニット結果、候補不足時は null
 */
export async function exhaustiveOptimizeAsync(
  input: OptimizeInput,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
  onBetterResult?: (result: UnitResult) => void,
  options?: ExhaustiveOptimizeOptions,
): Promise<UnitResult | null> {
  const { settings, scoreSettings } = input

  // 探索を始める前に、編成枚数とSP条件が成立する設定か確認する
  const spTotal = settings.spConstraint.vocal + settings.spConstraint.dance + settings.spConstraint.visual
  if (spTotal > constant.SP_TOTAL_MAX) return null
  const typeMinTotal = PARAMETER_TYPES.reduce((s, t) => s + settings.typeCountMin[t], 0)
  const typeMaxTotal = PARAMETER_TYPES.reduce((s, t) => s + settings.typeCountMax[t], 0)
  if (typeMinTotal > constant.UNIT_SIZE) return null
  if (typeMaxTotal < constant.UNIT_SIZE) return null

  const schedule = resolveSchedule(scoreSettings)
  const paramCtx = buildParameterContext(input)
  const { effectiveCounts, perLessonValues } = schedule

  // 固定カードを含む候補一覧を作る
  const allCandidates = prepareCandidates(input, schedule)

  // ロック統合が有効で、所持済みの固定対象がある場合だけ別の固定方法も比較する
  // レンタルロックが所持済みカードかを確認する（未所持カードは昇格対象外）
  const isRentalLockOwned =
    settings.manualRental &&
    settings.rentalCardName !== null &&
    (!!scoreSettings.useFixedUncap ||
      (input.cardUncaps[settings.rentalCardName] !== undefined &&
        input.cardUncaps[settings.rentalCardName] !== enums.UncapType.NotOwned))
  // 通常ロックの中に所持済みカードが1枚でもあるかを確認する
  const hasOwnedLockedCard = settings.lockedCards.some(
    (n) =>
      !!scoreSettings.useFixedUncap ||
      (input.cardUncaps[n] !== undefined && input.cardUncaps[n] !== enums.UncapType.NotOwned),
  )
  // どちらかの条件を満たす場合に限り、複数の固定方法を比較する
  const shouldTryUnifyPaths = !!settings.unifyRentalLock && (isRentalLockOwned || hasOwnedLockedCard)

  if (shouldTryUnifyPaths) {
    // 現状維持・昇格・降格などの固定方法を作る
    const configs = buildUnifyRentalPathConfigs(input)

    // 各固定方法の組み合わせ数を事前に計算し、進捗表示へ配分する
    const comboCounts: number[] = []
    let grandTotal = 0
    for (const config of configs) {
      const candidates = prepareCandidates(config, schedule)
      const total = calculateTotalCombos(config, candidates, schedule)
      comboCounts.push(total)
      grandTotal += total
    }

    // すべての固定方法で組み合わせが0件なら、編成なしで終了する
    if (grandTotal === 0) return null

    // すべての固定方法を通じた最高結果と累積統計を初期化する
    let bestResult: UnitResult | null = null
    let bestTotalScore = -Infinity

    let totalEvaluated = 0
    let totalBranches = 0
    let doneAccumulated = 0

    // 各固定方法を順番に評価し、最も点数の高い結果を更新する
    for (let i = 0; i < configs.length; i++) {
      if (isCancelled()) return bestResult
      const config = configs[i]
      const totalForThis = comboCounts[i]

      // この固定方法の進捗を、全体の進捗へ換算して報告する
      const onProgressThis = (done: number) => {
        onProgress(doneAccumulated + done, grandTotal)
      }

      // この固定方法で暫定ベストを上回る結果が出たら、全体の結果をすぐに更新する
      const onBetterResultWrapper = (res: UnitResult) => {
        if (res.totalScore > bestTotalScore) {
          bestTotalScore = res.totalScore
          bestResult = res
          if (onBetterResult) onBetterResult(res)
        }
      }

      // 各固定方法の統計を合算し、呼び出し元へ報告する
      const optionsThis: ExhaustiveOptimizeOptions = {
        ...options,
        onStats: (st) => {
          totalEvaluated += st.evaluatedCombos
          totalBranches += st.rentalBranchesVisited
          options?.onStats?.({
            evaluatedCombos: totalEvaluated,
            rentalBranchesVisited: totalBranches,
          })
        },
      }

      // この固定方法で最適編成を計算する
      const res = await exhaustiveOptimizeAsync(config, onProgressThis, isCancelled, onBetterResultWrapper, optionsThis)

      // この固定方法の最終結果を確認して、全体の結果を更新する
      if (res && res.totalScore > bestTotalScore) {
        bestTotalScore = res.totalScore
        bestResult = res
      }

      doneAccumulated += totalForThis
    }

    return bestResult
  }

  // 固定候補（固定カード）を抽出する
  const lockedNames = new Set(settings.lockedCards)
  const fixedCandidates: CandidateCard[] = allCandidates.filter((c) => lockedNames.has(c.card.name))

  // 手動指定レンタルを固定候補に追加する（4凸固定・未所持でも可）
  let fixedRentalName: string | null = null
  if (settings.manualRental && settings.rentalCardName) {
    fixedRentalName = settings.rentalCardName
    const alreadyFixed = fixedCandidates.some((c) => c.card.name === fixedRentalName)
    if (!alreadyFixed) {
      const card = input.cardByName.get(settings.rentalCardName)
      if (card) {
        fixedCandidates.push(
          createCandidateCard({
            card,
            uncap: enums.UncapType.Four,
            scoreSettings,
            effectiveCounts,
            perLessonValues,
            customData: input.cardCountCustom?.[card.name],
          }),
        )
      }
    }
  }

  // 固定カードの枚数を下回らないよう、タイプごとの上限を調整する
  const forcedTypeCount: Record<enums.ParameterType, number> = {
    [enums.ParameterType.Vocal]: 0,
    [enums.ParameterType.Dance]: 0,
    [enums.ParameterType.Visual]: 0,
  }
  for (const c of fixedCandidates) {
    if (PARAMETER_TYPES.includes(c.card.type as enums.ParameterType)) {
      forcedTypeCount[c.card.type as enums.ParameterType]++
    }
  }
  const adjustedTypeCountMax: TypeCountValues = {
    [enums.ParameterType.Vocal]: Math.max(
      settings.typeCountMax[enums.ParameterType.Vocal],
      forcedTypeCount[enums.ParameterType.Vocal],
    ),
    [enums.ParameterType.Dance]: Math.max(
      settings.typeCountMax[enums.ParameterType.Dance],
      forcedTypeCount[enums.ParameterType.Dance],
    ),
    [enums.ParameterType.Visual]: Math.max(
      settings.typeCountMax[enums.ParameterType.Visual],
      forcedTypeCount[enums.ParameterType.Visual],
    ),
  }
  const adjustedInput: OptimizeInput = { ...input, settings: { ...settings, typeCountMax: adjustedTypeCountMax } }

  // 自由枠の候補プールを構築する（所持カードのみ・固定カード除く）
  const fixedNames = new Set(fixedCandidates.map((c) => c.card.name))
  const scoredFree: CandidateCard[] = []
  const candidateLimit = Math.max(10, settings.exhaustiveCandidateLimit ?? constant.EXHAUSTIVE_CANDIDATE_LIMIT)
  for (const c of allCandidates) {
    if (fixedNames.has(c.card.name)) continue
    scoredFree.push(c)
  }

  // 実際の回数で点数が高い候補に加え、Pアイテムで他カードへ貢献する候補も残す
  const freePoolMap = new Map(
    selectSynergyAwareCandidates(scoredFree, candidateLimit).map((candidate) => [candidate.card.name, candidate]),
  )

  // SP制約を満たすために必要な SP カードをプールに補充する
  // レンタル候補の多くがSP属性でも、自由枠から候補がなくならないよう余分に確保する
  // 既に十分な枚数があれば補充しない
  for (const [spCat, needed] of [
    [enums.SpCategoryType.Vocal, settings.spConstraint.vocal] as const,
    [enums.SpCategoryType.Dance, settings.spConstraint.dance] as const,
    [enums.SpCategoryType.Visual, settings.spConstraint.visual] as const,
  ]) {
    if (needed <= 0) continue
    const alreadySpCount = [...freePoolMap.values()].filter(
      (c) => c.spCategory === spCat || c.spCategory === enums.SpCategoryType.All,
    ).length
    if (alreadySpCount >= needed + constant.UNIT_SIZE) continue
    const topSpCards = [...scoredFree]
      .filter((c) => c.spCategory === spCat || c.spCategory === enums.SpCategoryType.All)
      .sort((a, b) => b.baseScore - a.baseScore)
      .slice(0, needed + constant.UNIT_SIZE)
    for (const c of topSpCards) freePoolMap.set(c.card.name, c)
  }

  // タイプ最小数制約を満たすために必要なタイプ別カードをプールに補充する
  // 既に十分な枚数があれば補充しない
  for (const paramType of [enums.ParameterType.Vocal, enums.ParameterType.Dance, enums.ParameterType.Visual]) {
    const minNeeded = settings.typeCountMin[paramType]
    if (minNeeded <= 0) continue
    const alreadyTypeCount = [...freePoolMap.values()].filter((c) => c.card.type === paramType).length
    if (alreadyTypeCount >= minNeeded + constant.UNIT_SIZE) continue
    const topTypeCards = [...scoredFree]
      .filter((c) => c.card.type === paramType)
      .sort((a, b) => b.baseScore - a.baseScore)
      .slice(0, minNeeded + constant.UNIT_SIZE)
    for (const c of topTypeCards) freePoolMap.set(c.card.name, c)
  }

  const freePool = [...freePoolMap.values()].sort((a, b) => b.baseScore - a.baseScore)

  const freeSlots = constant.UNIT_SIZE - fixedCandidates.length
  // 固定カードだけで6枠を超える設定は成立しない
  if (freeSlots < 0) return null

  // ロックカードと手動レンタルが提供するSP枚数を計算する
  // 手動レンタルと自動レンタルの両方で使う
  let fixedVoSp = 0
  let fixedDaSp = 0
  let fixedViSp = 0
  for (const c of fixedCandidates) {
    if (c.spCategory === enums.SpCategoryType.Vocal) fixedVoSp++
    else if (c.spCategory === enums.SpCategoryType.Dance) fixedDaSp++
    else if (c.spCategory === enums.SpCategoryType.Visual) fixedViSp++
    else if (c.spCategory === enums.SpCategoryType.All) {
      fixedVoSp++
      fixedDaSp++
      fixedViSp++
    }
  }

  // 手動レンタル指定の有無に応じて最適化を実行する
  const branchResult = fixedRentalName
    ? await optimizeManualRental(
        fixedRentalName,
        fixedCandidates,
        freePool,
        freeSlots,
        forcedTypeCount,
        adjustedTypeCountMax,
        adjustedInput,
        paramCtx,
        fixedVoSp,
        fixedDaSp,
        fixedViSp,
        effectiveCounts,
        onProgress,
        isCancelled,
        onBetterResult,
      )
    : await optimizeAutoRental(
        fixedCandidates,
        freePool,
        freeSlots,
        forcedTypeCount,
        adjustedInput,
        schedule,
        paramCtx,
        fixedVoSp,
        fixedDaSp,
        fixedViSp,
        fixedNames,
        effectiveCounts,
        onProgress,
        isCancelled,
        onBetterResult,
      )

  // 探索した組み合わせ数を呼び出し元へ報告する
  const stats: ExhaustiveOptimizeStats = {
    evaluatedCombos: branchResult.evaluatedCombos,
    rentalBranchesVisited: branchResult.rentalBranchesVisited,
  }
  options?.onStats?.(stats)

  // 最も点数の高かった編成を返す
  if (!branchResult.bestMembers) return null
  return buildResult(branchResult.bestMembers, adjustedInput, effectiveCounts, branchResult.bestRentalName ?? undefined)
}

/**
 * 手動選択ユニットを評価する
 *
 * 指定されたサポート名リストからユニットの合計スコアを計算する
 * 6枚未満でも計算可能（部分ユニット）
 *
 * @param input - 手動編成に指定したカード名を含む最適化入力
 * @returns 計算結果（サポートが0枚の場合は null）
 */
export function evaluateManualUnit(input: OptimizeInput): UnitResult | null {
  const { settings, scoreSettings, cardUncaps } = input

  if (settings.manualCards.length === 0) return null

  // 空き枠を除外して、手動編成に指定したサポート名を取得する
  const cardNames = settings.manualCards.filter((n): n is string => n !== null)
  if (cardNames.length === 0) return null

  // レンタル枠は末尾スロット（6枠目）のカードから決める
  // 手動指定の有無に関わらず、末尾スロットをレンタルとして扱う
  const padded = [...settings.manualCards]
  while (padded.length < constant.UNIT_SIZE) padded.push(null)
  let derivedRentalName = padded[constant.UNIT_SIZE - 1]
  // 6枚未満では末尾スロットが空になる
  // 設定したレンタルカードが一覧に含まれていれば、それをレンタルとして引き継ぐ
  if (derivedRentalName === null && settings.rentalCardName && cardNames.includes(settings.rentalCardName)) {
    derivedRentalName = settings.rentalCardName
  }

  // スケジュールからアクション回数を導出する
  const schedule = resolveSchedule(scoreSettings)
  const { effectiveCounts, perLessonValues } = schedule

  // レンタル名を導出値で上書きした入力を作成する
  const evalInput: OptimizeInput = {
    ...input,
    settings: { ...settings, rentalCardName: derivedRentalName },
  }

  // サポート名からサポートを検索して計算する
  const candidates: CandidateCard[] = []
  for (const cardName of cardNames) {
    const card = input.cardByName.get(cardName)
    if (!card) continue

    // 4凸固定モードまたはレンタル枠は4凸で計算する
    // それ以外はカードごとに設定された凸数を使う
    const isRentalSlot = derivedRentalName === cardName
    const uncap =
      scoreSettings.useFixedUncap || isRentalSlot
        ? enums.UncapType.Four
        : (cardUncaps[card.name] ?? constant.DEFAULT_UNCAP)
    candidates.push(
      createCandidateCard({
        card,
        uncap,
        scoreSettings,
        effectiveCounts,
        perLessonValues,
        customData: input.cardCountCustom?.[card.name],
      }),
    )
  }

  // 指定名のカードを1枚も見つけられなければ、評価結果を作れない
  if (candidates.length === 0) return null

  // 末尾スロットのカードをレンタルとして結果へ渡す
  // 手動指定の有無に関わらず、末尾スロットのカードをレンタル表示にする
  return buildResult(candidates, evalInput, effectiveCounts, derivedRentalName ?? undefined)
}

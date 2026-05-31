/**
 * 編成最適化アルゴリズム
 *
 * 総当たり探索（Exhaustive）でSP/タイプ制約を満たす全組み合わせを評価し、
 * 最もスコアの高い6枚編成を求める。
 */
import type { SupportCard, ScoreSettings, ParameterValues, PerLessonParameterValues } from '../types/card'
import type { UncapType } from '../types/enums'
import * as enums from '../types/enums'
import type { UnitSimulatorSettings, UnitMember, UnitResult, TypeCountValues } from '../types/unit'
import type { CardCountCustom } from '../hooks/useCardCountCustom'
import { mergeScheduleCounts } from './scoreSettings'
import { getPerLessonParameterValues } from './calculator/parameterBonus'
import { customRowsToPerLessonValues } from './scoreSettings'
import { computeUnitSupportSynergy } from './supportSynergy'
import { countSpTypeConstrainedCombos, spTypeConstrainedCombos } from './unitOptimizer/combinatorics'
import { createEvaluatorSeed, evaluateUnitScoreWithSeed } from './unitOptimizer/evaluator'
import { parseAbility } from './calculator/helpers'
import type { CandidateCard } from './unitOptimizer/candidatePreparation'
import {
  createCategorizedCandidatePools,
  createCandidateCard,
  createRentalBranchContexts,
  createRentalPool,
  prepareCandidates,
} from './unitOptimizer/candidatePreparation'
import { resolveParamCap } from '../data/score/paramCap'
import { getSpLessonTotal } from '../data/score/lesson'
import { getExamTotalData, getHifExamTotalData } from '../data/score/exam'
import { getClassParameterTotal } from '../data/score/class'
import * as data from '../data'
import * as constant from '../constant'

/** ParameterType の値配列（ホットパスで Object.values() の再生成を避ける） */
const PARAMETER_TYPES = Object.values(enums.ParameterType)

/** 最適化の入力パラメータ */
export interface OptimizeInput {
  settings: UnitSimulatorSettings
  scoreSettings: ScoreSettings
  cardUncaps: Record<string, UncapType>
  cardCountCustom?: CardCountCustom
  /** 全サポート一覧（ユーザー追加カード含む） */
  allCards: SupportCard[]
  /** サポート名→サポートのマップ（ユーザー追加カード含む） */
  cardByName: Map<string, SupportCard>
}

/** 総当たり最適化オプション */
interface ExhaustiveOptimizeOptions {
  onStats?: (stats: ExhaustiveOptimizeStats) => void
}

/** 総当たり最適化の統計 */
interface ExhaustiveOptimizeStats {
  /** 実際に評価した組み合わせ数 */
  evaluatedCombos: number
  /** レンタル枝として訪問した件数 */
  rentalBranchesVisited: number
}

/** resolveSchedule の戻り値型 */
interface ResolvedSchedule {
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>
  perLessonValues: PerLessonParameterValues | undefined
}

/** パラメータキャップ最適化用の事前計算済み値 */
interface ParameterContext {
  /** サポート以外のパラメータ上昇量（初期パラ + SPレッスン + 試験 + カスタム対象外上昇） */
  nonSupportParams: ParameterValues
  /** パラメータ上限（null = 上限なし） */
  paramCap: number | null
}

/** optimizeManualRental と optimizeAutoRental の戻り値型 */
interface OptimizeBranchResult {
  /** 最高スコア */
  bestScore: number
  /** 最高スコアを達成したメンバー配列 */
  bestMembers: CandidateCard[] | null
  /** 自動選出されたレンタル名（autoRental の場合は設定、manualRental の場合は固定値） */
  bestRentalName: string | null
  /** 実際に評価した組み合わせ数 */
  evaluatedCombos: number
  /** レンタル枝として訪問した件数（autoRental のみ） */
  rentalBranchesVisited: number
}

/**
 * 総通数に応じた進捗更新バッチサイズを計算する
 *
 * UI更新回数をおおむね一定に保ちながら、
 * 小規模探索では更新を細かく、大規模探索では更新オーバーヘッドを抑える。
 *
 * @param totalCombos - 総組み合わせ数
 * @returns バッチサイズ
 */
function resolveExhaustiveBatchSize(totalCombos: number): number {
  const estimated = Math.floor(totalCombos / constant.EXHAUSTIVE_PROGRESS_TARGET_UPDATES)
  return Math.max(
    constant.EXHAUSTIVE_PROGRESS_MIN_BATCH_SIZE,
    Math.min(constant.EXHAUSTIVE_PROGRESS_MAX_BATCH_SIZE, estimated || constant.EXHAUSTIVE_PROGRESS_MIN_BATCH_SIZE),
  )
}

/**
 * パラメータキャップ最適化コンテキストを構築する
 *
 * 初期パラメータ・SPレッスン・試験などサポート以外のパラメータ上昇量を
 * 事前計算し、パラメータ上限と合わせてコンテキストにまとめる。
 *
 * @param input - 最適化入力
 * @returns パラメータキャップ最適化コンテキスト
 */
function buildParameterContext(input: OptimizeInput): ParameterContext {
  const { settings, scoreSettings } = input
  const { scenario, scheduleSelections } = scoreSettings

  // SPレッスン上昇量
  const spLesson = getSpLessonTotal(scenario, scoreSettings.difficulty, scheduleSelections)

  // 授業上昇量（通常モードのみ）
  const classTotalGain = scoreSettings.useCustomMode
    ? { vocal: 0, dance: 0, visual: 0 }
    : getClassParameterTotal(scenario, scoreSettings.difficulty, scheduleSelections)

  // 試験上昇量
  const examTotalGain = scoreSettings.useCustomMode
    ? { vocal: 0, dance: 0, visual: 0 }
    : scoreSettings.scenario === enums.ScenarioType.Hif
      ? getHifExamTotalData(scoreSettings.hifExamRatios)
      : getExamTotalData(scoreSettings.scenario, scoreSettings.difficulty)

  const customTargetGain = scoreSettings.useCustomMode
    ? scoreSettings.parameterBonusBase
    : { vocal: 0, dance: 0, visual: 0 }

  // カスタムモード時は、授業や試験などパラボ対象外の入力値も合計へ加算する
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
    paramCap: resolveParamCap(scenario, scoreSettings.difficulty, settings.paramCapOverride),
  }
}

/**
 * スケジュールからアクション回数とレッスン別パラメータを導出する
 *
 * 複数の関数で共通して行うスケジュール解析処理を共通化したヘルパー。
 * 試験中Pアイテム取得回数をPアイテム取得回数に合算する処理も含む。
 *
 * @param scoreSettings - 点数設定
 * @returns スケジュール解析結果（アクション別発動回数マップ + レッスン別パラメータ値）
 */
function resolveSchedule(scoreSettings: ScoreSettings): ResolvedSchedule {
  // シナリオ・難易度からスケジュールデータを取得する
  const schedule = data.getScheduleData(scoreSettings.scenario, scoreSettings.difficulty)
  // カスタムモード時はスケジュール自動計算を無効にしてすべて手動入力値を使う
  const settingsForCount = scoreSettings.useCustomMode ? { ...scoreSettings, useScheduleLimits: false } : scoreSettings
  // スケジュールからアクション別の発動回数マップを構築する
  const mergedCounts = mergeScheduleCounts(settingsForCount, schedule)
  // 試験後Pアイテム回数を合算する際に元オブジェクトを変更しないよう、常に新しいオブジェクトを構築する
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
 * 最適化結果から UnitResult を構築する
 *
 * @param members - 最適化されたサポート配列
 * @param input - 最適化入力
 * @param effectiveCounts - スケジュールから導出されたアクション別発動回数マップ
 * @param autoRentalName - 自動選出されたレンタルサポート名
 * @returns UnitResult
 */
function buildResult(
  members: CandidateCard[],
  input: OptimizeInput,
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>,
  autoRentalName?: string,
): UnitResult {
  const { settings, scoreSettings } = input
  const cards = members.map((m) => m.card)
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

  // 入力値はサポート外パラボ%なのでそのまま使用する
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
    const supportSynergyDetail: Record<string, number> = {}

    // baseResult から各アクションIDの使用済み回数を取得する（max_count 制限をサポート間連携にも適用するため）
    const usedCounts = new Map<string, number>()
    for (const detail of m.baseResult.allAbilityDetails) {
      if (detail.nameKey) {
        // trigger_key → actionId の対応を探す
        const ability = m.card.abilities.find((a) => a.name_key === detail.nameKey && a.trigger_key)
        if (ability?.trigger_key) {
          usedCounts.set(`${ability.trigger_key}`, detail.count)
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
        // max_count がある場合、baseResult で使用済みの回数との合計が上限を超えないよう制限する
        if (ability.max_count !== undefined) {
          const usedCount = usedCounts.get(ability.trigger_key) ?? 0
          extraCount = Math.max(0, Math.min(extraCount, ability.max_count - usedCount))
        }
        const parsed = parseAbility(ability, m.uncap)
        supportSynergy += Math.floor(parsed.numericValue * extraCount)
        supportSynergyDetail[ability.trigger_key] = (supportSynergyDetail[ability.trigger_key] ?? 0) + extraCount
      }
    }

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

  // サポート点数合計をパラメータタイプ別に集計する（キャップ適用のため）
  // 個別パラボは除外し、ユニット全体のパラボはparameterBonusで別途加算する
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
 * 固定レンタルカード（settings.manualRental=true & fixedRentalName 設定）がある場合、
 * 自由枠の候補プールから SP+タイプ制約を満たす組み合わせを総当たり列挙する。
 *
 * @param fixedRentalName - 固定されたレンタルサポート名
 * @param fixedCandidates - ロックカード+固定レンタルを含むメンバー配列
 * @param freePool - 自由枠の候補プール（スコアで降順ソート済み）
 * @param freeSlots - 自由枠のスロット数
 * @param forcedTypeCount - 固定カードが占有するタイプ数
 * @param adjustedTypeCountMax - 固定カードを考慮した調整済みタイプ上限
 * @param adjustedInput - 調整済み最適化入力
 * @param paramCtx - パラメータキャップコンテキスト
 * @param fixedVoSp - 固定カードが提供するVocalSP数
 * @param fixedDaSp - 固定カードが提供するDanceSP数
 * @param fixedViSp - 固定カードが提供するVisualSP数
 * @param effectiveCounts - スケジュールから導出されたアクション別発動回数マップ
 * @param onProgress - 進捗コールバック
 * @param isCancelled - キャンセル判定関数
 * @param onBetterResult - より良い結果が見つかったときのコールバック
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

  // タイプ自由枠の上限/下限（fixedCandidates のタイプ分を差し引く）
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

  // 制約入力をまとめ、引数の意味を明示する
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

  // 列挙入力も同じ構造に寄せ、count/iterate の対応関係を追いやすくする
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

    // SP・タイプ制約は spTypeConstrainedCombos の列挙により保証済み
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
 * 手動レンタル指定がない場合（settings.manualRental=false），
 * 全レンタル候補を列挙し、各レンタルカードに対して
 * 自由枠の SP+タイプ制約満足組み合わせを総当たり列挙する。
 *
 * @param fixedCandidates - ロックカードのメンバー配列（レンタルなし）
 * @param freePool - 自由枠の候補プール（スコアで降順ソート済み）
 * @param freeSlots - 自由枠のスロット数（フリースロット-1, レンタル枠用）
 * @param forcedTypeCount - 固定カードが占有するタイプ数
 * @param adjustedInput - 調整済み最適化入力
 * @param schedule - スケジュール解析結果
 * @param paramCtx - パラメータキャップコンテキスト
 * @param fixedVoSp - 固定カードが提供するVocalSP数
 * @param fixedDaSp - 固定カードが提供するDanceSP数
 * @param fixedViSp - 固定カードが提供するVisualSP数
 * @param fixedNames - 固定カード名の Set
 * @param effectiveCounts - スケジュールから導出されたアクション別発動回数マップ
 * @param onProgress - 進捗コールバック
 * @param isCancelled - キャンセル判定関数
 * @param onBetterResult - より良い結果が見つかったときのコールバック
 * @returns 最適化ブランチ結果
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
  // 候補上限は最低10枚を保証する。EXHAUSTIVE_CANDIDATE_LIMIT はユーザー設定がない場合のデフォルト値。
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

  // 総組み合わせ数を事前計算してプログレス報告に使用する（SP+タイプ制約後の実数）
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

      // SP・タイプ制約は spTypeConstrainedCombos の列挙により保証済み
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
 * @param input - 最適化入力
 * @param allCandidates - 全候補サポート
 * @param schedule - 解析済みスケジュールデータ
 * @returns 組み合わせ数
 */
function calculateTotalCombos(
  input: OptimizeInput,
  allCandidates: CandidateCard[],
  schedule: ResolvedSchedule,
): number {
  const { settings, scoreSettings } = input
  const { effectiveCounts, perLessonValues } = schedule

  // 固定候補（ロックカード）を抽出する
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

  // adjustedTypeCountMax を計算する（固定カードのタイプを考慮）
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
  // 候補上限は最低10枚を保証する。EXHAUSTIVE_CANDIDATE_LIMIT はユーザー設定がない場合のデフォルト値。
  const candidateLimit = Math.max(10, settings.exhaustiveCandidateLimit ?? constant.EXHAUSTIVE_CANDIDATE_LIMIT)
  for (const c of allCandidates) {
    if (fixedNames.has(c.card.name)) continue
    scoredFree.push(c)
  }

  // 実アクション回数スコア上位 candidateLimit 枚を採用する
  const byActual = [...scoredFree].sort((a, b) => b.baseScore - a.baseScore)
  const freePoolMap = new Map<string, CandidateCard>()
  for (const c of byActual.slice(0, candidateLimit)) freePoolMap.set(c.card.name, c)

  // SP制約を満たすために必要な SP カードをプールに補充する
  // レンタル候補の多くがSP属性のとき freePool から除外されても残るよう UNIT_SIZE 枚分確保する
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
  if (freeSlots < 0) return 0

  // fixedCandidates（ロックカード+手動レンタル）が提供する SP 枚数を計算する
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
 * unifyRentalLock 有効時に比較する探索パス一覧を構築して返す。
 *
 * @param input - 最適化入力パラメータ
 * @returns 比較対象の OptimizeInput 配列（現状維持パス含む）
 */
function buildUnifyRentalPathConfigs(input: OptimizeInput): OptimizeInput[] {
  const { settings, scoreSettings } = input
  const origRental = settings.rentalCardName

  // レンタルロック・通常ロックどちらもない場合はパスなし
  if (!origRental && settings.lockedCards.length === 0) return []

  // unifyRentalLock 有効時は「現状維持」「通常ロックカードをレンタルに昇格（所有済みのみ）」
  // 「完全自動レンタル（origRental がある場合のみ）」の各パターンを並列で比較して最高スコアを選ぶ。
  const configs: OptimizeInput[] = [
    {
      ...input,
      scoreSettings: { ...scoreSettings, unifyRentalLock: false },
    },
  ]

  for (const lockedName of settings.lockedCards) {
    const isOwned =
      !!scoreSettings.useFixedUncap ||
      (input.cardUncaps[lockedName] !== undefined && input.cardUncaps[lockedName] !== enums.UncapType.NotOwned)
    if (!isOwned) continue

    // lockedName をレンタルに昇格し、origRental があれば通常ロックに追加（入れ替え）
    const nextLockedCards = settings.lockedCards.filter((n) => n !== lockedName)
    const lockedCards = origRental ? [...nextLockedCards, origRental] : nextLockedCards

    configs.push({
      ...input,
      settings: {
        ...settings,
        manualRental: true,
        rentalCardName: lockedName,
        lockedCards,
      },
      scoreSettings: { ...scoreSettings, unifyRentalLock: false },
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
      },
      scoreSettings: { ...scoreSettings, unifyRentalLock: false },
    })
  }

  return configs
}

/**
 * 総当たり最適化を非同期で実行する
 *
 * 実アクション回数スコア上位 EXHAUSTIVE_CANDIDATE_LIMIT 枚 + SP補充の候補プールから
 * SP制約を満たす部分空間のみを列挙（spConstrainedCombos）することで効率よく全探索する。
 * SP制約が強いほど評価対象が少なくなり大幅に高速化される。
 * ローカルサーチが局所解に陥った場合の補完として使用する。
 *
 * @param input - 最適化入力
 * @param onProgress - 進捗コールバック（done: 評価済み数, total: 総組み合わせ数）
 * @param isCancelled - キャンセル判定関数（true を返したら中断）
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

  // バリデーション（optimizeUnit と同じ）
  const spTotal = settings.spConstraint.vocal + settings.spConstraint.dance + settings.spConstraint.visual
  if (spTotal > constant.SP_TOTAL_MAX) return null
  const typeMinTotal = PARAMETER_TYPES.reduce((s, t) => s + settings.typeCountMin[t], 0)
  const typeMaxTotal = PARAMETER_TYPES.reduce((s, t) => s + settings.typeCountMax[t], 0)
  if (typeMinTotal > constant.UNIT_SIZE) return null
  if (typeMaxTotal < constant.UNIT_SIZE) return null

  const schedule = resolveSchedule(scoreSettings)
  const paramCtx = buildParameterContext(input)
  const { effectiveCounts, perLessonValues } = schedule

  // 全候補を prepareCandidates で取得する（ロックカード含む）
  const allCandidates = prepareCandidates(input, schedule)

  // unifyRentalLock オプション対応:
  // レンタルロックまたは通常ロックがあり、unifyRentalLock が有効な場合は
  // 現在の条件と代替パスを比較して最大スコアの編成を選ぶ

  // レンタルロックが「所持済みカード」かどうかを確認する（未所持・NotOwned は昇格対象外）
  const isRentalLockOwned =
    settings.manualRental &&
    settings.rentalCardName !== null &&
    (!!scoreSettings.useFixedUncap ||
      (input.cardUncaps[settings.rentalCardName] !== undefined &&
        input.cardUncaps[settings.rentalCardName] !== enums.UncapType.NotOwned))
  // 通常ロックの中に所持済みカードが 1 枚でもあるかどうかを確認する
  const hasOwnedLockedCard = settings.lockedCards.some(
    (n) =>
      !!scoreSettings.useFixedUncap ||
      (input.cardUncaps[n] !== undefined && input.cardUncaps[n] !== enums.UncapType.NotOwned),
  )
  // どちらかの条件を満たす場合に限り、複数パスの比較探索を行う
  const shouldTryUnifyPaths = !!scoreSettings.unifyRentalLock && (isRentalLockOwned || hasOwnedLockedCard)

  if (shouldTryUnifyPaths) {
    // 現状維持・昇格・降格などの各パスを構築する
    const configs = buildUnifyRentalPathConfigs(input)

    // 各パスの組み合わせ数を事前に計算してプログレスバーの配分に使う
    const comboCounts: number[] = []
    let grandTotal = 0
    for (const config of configs) {
      const candidates = prepareCandidates(config, schedule)
      const total = calculateTotalCombos(config, candidates, schedule)
      comboCounts.push(total)
      grandTotal += total
    }

    // 全パスで組み合わせが 0 件なら解なしで終了する
    if (grandTotal === 0) return null

    // 全パスを通じたベスト結果と累積統計を初期化する
    let bestResult: UnitResult | null = null
    let bestTotalScore = -Infinity

    let totalEvaluated = 0
    let totalBranches = 0
    let doneAccumulated = 0

    // 各パスを順番に評価し、スコア最大の結果をベストとして更新する
    for (let i = 0; i < configs.length; i++) {
      if (isCancelled()) return bestResult
      const config = configs[i]
      const totalForThis = comboCounts[i]

      // このパスの進捗を全体進捗の一部として報告するラッパー
      const onProgressThis = (done: number) => {
        onProgress(doneAccumulated + done, grandTotal)
      }

      // このパスで暫定ベストを上回る結果が出たら全体ベストを即時更新するラッパー
      const onBetterResultWrapper = (res: UnitResult) => {
        if (res.totalScore > bestTotalScore) {
          bestTotalScore = res.totalScore
          bestResult = res
          if (onBetterResult) onBetterResult(res)
        }
      }

      // 統計情報を全パス合算して外部コールバックに報告するオプションを組み立てる
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

      // このパスの最適化を実行する
      const res = await exhaustiveOptimizeAsync(config, onProgressThis, isCancelled, onBetterResultWrapper, optionsThis)

      // パスの最終結果を確認して全体ベストを更新する
      if (res && res.totalScore > bestTotalScore) {
        bestTotalScore = res.totalScore
        bestResult = res
      }

      doneAccumulated += totalForThis
    }

    return bestResult
  }

  // 固定候補（ロックカード）を抽出する
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

  // adjustedTypeCountMax を計算する（固定カードのタイプを考慮）
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

  // 実アクション回数スコア上位 candidateLimit 枚を採用する
  const byActual = [...scoredFree].sort((a, b) => b.baseScore - a.baseScore)
  const freePoolMap = new Map<string, CandidateCard>()
  for (const c of byActual.slice(0, candidateLimit)) freePoolMap.set(c.card.name, c)

  // SP制約を満たすために必要な SP カードをプールに補充する
  // レンタル候補の多くがSP属性のとき freePool から除外されても残るよう UNIT_SIZE 枚分確保する
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
  if (freeSlots < 0) return null

  // fixedCandidates（ロックカード+手動レンタル）が提供する SP 枚数を計算する（両パスで使用）
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

  // 最適化の実行（手動レンタル指定の有無で分岐）
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

  // 統計情報を報告する
  const stats: ExhaustiveOptimizeStats = {
    evaluatedCombos: branchResult.evaluatedCombos,
    rentalBranchesVisited: branchResult.rentalBranchesVisited,
  }
  options?.onStats?.(stats)

  // 結果を返す
  if (!branchResult.bestMembers) return null
  return buildResult(branchResult.bestMembers, adjustedInput, effectiveCounts, branchResult.bestRentalName ?? undefined)
}

/**
 * 手動選択ユニットを評価する
 *
 * 指定されたサポート名リストからユニットの合計スコアを計算する。
 * 6枚未満でも計算可能（部分ユニット）。
 *
 * @param input - 最適化入力（settings.manualCards を使用）
 * @returns 計算結果（サポートが0枚の場合は null）
 */
export function evaluateManualUnit(input: OptimizeInput): UnitResult | null {
  const { settings, scoreSettings, cardUncaps } = input

  if (settings.manualCards.length === 0) return null

  // null スロットを除外してサポート名リストを取得する
  const cardNames = settings.manualCards.filter((n): n is string => n !== null)
  if (cardNames.length === 0) return null

  // レンタル枠は末尾スロット（6枠目）のカードから導出する（manualRental に関わらず常に末尾スロットをレンタルとして扱う）
  const padded = [...settings.manualCards]
  while (padded.length < constant.UNIT_SIZE) padded.push(null)
  let derivedRentalName = padded[constant.UNIT_SIZE - 1]
  // 6枚未満のとき末尾スロットが null になるため、settings.rentalCardName が現在のカードリストに含まれていれば
  // それをレンタルとして引き継ぐ（バッジ表示・4凸強制・パラボ計算を正しく保つ）
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

    // 凸数: 4凸固定モード or 末尾スロット（レンタル枠）なら4凸、それ以外は設定された凸数
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

  if (candidates.length === 0) return null

  // derivedRentalName を autoRentalName として渡し、末尾スロットのカードに isRental: true をセットする
  // manualRental の状態に関わらず末尾スロットのカードは常にレンタルとして表示する
  return buildResult(candidates, evalInput, effectiveCounts, derivedRentalName ?? undefined)
}

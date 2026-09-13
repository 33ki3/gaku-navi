/**
 * 編成最適化の候補準備ユーティリティ
 *
 * 候補の事前計算、SP/タイプ別分類、レンタル枝の前計算をまとめる。
 * 最適化本体から候補準備の責務を分離し、探索ロジックを読みやすくする。
 */
import * as constant from '../../constant'
import * as data from '../../data'
import type { CardCustomData } from '../../hooks/useCardCountCustom'
import type {
  CardCalculationResult,
  ParameterValues,
  PerLessonParameterValues,
  ScoreSettings,
  SupportCard,
} from '../../types/card'
import type { OptimizeInput } from '../../types/unitOptimizer'
import type { UncapType } from '../../types/enums'
import * as enums from '../../types/enums'
import type { TypeCountValues, UnitSimulatorSettings } from '../../types/unit'
import { calculateCardParameter } from '../calculator/calculateCard'
import { parseAbility } from '../calculator/helpers'
import { isActionId } from '../domainValueValidation'
import { getPItemBodyActionCounts, getProvidedActions } from '../supportSynergy'

/** ActionIdType の全値（インデックス参照用） */
const ACTION_ID_VALUES = Object.values(enums.ActionIdType) as enums.ActionIdType[]
/** ActionIdType のエントリ数 */
const ACTION_ID_COUNT = ACTION_ID_VALUES.length
/** ActionIdType → インデックスのマップ */
const ACTION_ID_TO_IDX: Partial<Record<enums.ActionIdType, number>> = {}
for (let i = 0; i < ACTION_ID_COUNT; i++) {
  ACTION_ID_TO_IDX[ACTION_ID_VALUES[i]] = i
}

/** 候補サポート情報（事前計算済み） */
export interface CandidateCard {
  card: SupportCard
  uncap: UncapType
  baseScore: number
  baseScoreWithoutParamBonus: number
  baseResult: CardCalculationResult
  spCategory: enums.SpCategoryType
  paramIndex: number
  paramBonusPercent: ParameterValues
  /** 提供アクションベクトル（ACTION_ID_COUNT 要素、evaluateUnit 高速化用） */
  providedActionsVec: Float64Array
  /** 非ゼロ提供アクション一覧（evaluateUnit 高速化用） */
  providedActionEntries: { actionIdx: number; count: number }[]
  /** シナジー対象アビリティ情報（evaluateUnit 高速化用） */
  synergyAbilities: SynergyAbilityInfo[]
}

/** Pアイテムの行動提供を持つ候補か判定する */
function isPItemActionProvider(candidate: CandidateCard): boolean {
  if ((candidate.card.p_item?.actions?.length ?? 0) > 0) return true
  if (Object.keys(candidate.card.p_item?.provided_action_ids ?? {}).length > 0) return true
  if (!candidate.card.p_item?.effect) return false
  return Object.keys(getPItemBodyActionCounts(candidate.card.p_item.effect)).length > 0
}

/**
 * 候補が実際の編成枠で他カードへ提供するアクションの相乗効果を概算する。
 * 自身の baseScore は含めず、候補に残すべき提供元を決める補助スコアとして使う。
 */
function calculateReceiverSynergyPotential(provider: CandidateCard, receivers: readonly CandidateCard[]): number {
  const receiverScores: number[] = []
  for (const receiver of receivers) {
    if (receiver.card.name === provider.card.name) continue
    let receiverTotal = 0
    for (const ability of receiver.synergyAbilities) {
      const providedCount = provider.providedActionsVec[ability.actionIdx]
      const availableCount =
        ability.maxCount === undefined
          ? providedCount
          : Math.min(providedCount, Math.max(0, ability.maxCount - ability.usedCount))
      if (availableCount > 0 && ability.parsedValue > 0) {
        receiverTotal += ability.parsedValue * availableCount
      }
    }
    if (receiverTotal > 0) receiverScores.push(receiverTotal)
  }

  // 候補30枚全体ではなく、提供元を除く最大5枠の受け手だけを上限評価する
  receiverScores.sort((a, b) => b - a)
  return receiverScores.slice(0, Math.max(0, constant.UNIT_SIZE - 1)).reduce((total, score) => total + score, 0)
}

/**
 * Pアイテム行動提供元のうち、他カードへの寄与が大きい候補を取得する。
 * 最終編成を決める処理ではなく、候補プールから落とさないカードを選ぶ処理。
 */
function getTopPItemActionProviders(candidates: readonly CandidateCard[], candidateLimit: number): CandidateCard[] {
  const providerLimit = Math.min(candidateLimit, constant.P_ITEM_ACTION_PROVIDER_LIMIT)
  if (providerLimit <= 0) return []

  const potentialByName = new Map(
    candidates.map((candidate) => [candidate.card.name, calculateReceiverSynergyPotential(candidate, candidates)]),
  )
  return [...candidates]
    .filter(isPItemActionProvider)
    .sort(
      (a, b) =>
        (potentialByName.get(b.card.name) ?? 0) - (potentialByName.get(a.card.name) ?? 0) || b.baseScore - a.baseScore,
    )
    .slice(0, providerLimit)
}

/** 保護候補を残しながら基礎点順で候補上限に収める */
function trimCandidatePool(
  candidates: readonly CandidateCard[],
  candidateLimit: number,
  protectedCandidates: readonly CandidateCard[] = [],
): CandidateCard[] {
  if (candidateLimit <= 0) return []

  const selected = new Map<string, CandidateCard>()
  for (const candidate of [...candidates].sort((a, b) => b.baseScore - a.baseScore).slice(0, candidateLimit)) {
    selected.set(candidate.card.name, candidate)
  }
  for (const candidate of protectedCandidates) selected.set(candidate.card.name, candidate)

  if (selected.size > candidateLimit) {
    const protectedNames = new Set(protectedCandidates.map((candidate) => candidate.card.name))
    const removable = [...selected.values()]
      .filter((candidate) => !protectedNames.has(candidate.card.name))
      .sort((a, b) => a.baseScore - b.baseScore)
    while (selected.size > candidateLimit && removable.length > 0) {
      selected.delete(removable.shift()!.card.name)
    }
  }

  return [...selected.values()].sort((a, b) => b.baseScore - a.baseScore)
}

/**
 * 基礎点上位に加えて、Pアイテム行動の相乗効果が大きい候補を残す。
 * 保護候補は最終編成に確定採用されず、後続の実スコア評価で選別される。
 */
export function selectSynergyAwareCandidates(
  candidates: readonly CandidateCard[],
  candidateLimit: number,
): CandidateCard[] {
  const providers = getTopPItemActionProviders(candidates, candidateLimit)
  return trimCandidatePool(candidates, candidateLimit, providers)
}

/** SP/タイプ別に分類した候補プール */
interface CategorizedCandidatePools {
  voSpPool: CandidateCard[]
  daSpPool: CandidateCard[]
  viSpPool: CandidateCard[]
  allSpPool: CandidateCard[]
  genVoPool: CandidateCard[]
  genDaPool: CandidateCard[]
  genViPool: CandidateCard[]
  genAsPool: CandidateCard[]
}

/** manualRental=false のレンタル枝ごとの前計算結果 */
interface RentalBranchContext {
  rental: CandidateCard
  rentalInput: OptimizeInput
  pools: CategorizedCandidatePools
  totalCombos: number
  neededVo: number
  neededDa: number
  neededVi: number
  typeVoMin: number
  typeDaMin: number
  typeViMin: number
  typeVoMax: number
  typeDaMax: number
  typeViMax: number
}

/**
 * コンテスト編成で避けたい獲得物を持つサポートか判定する
 *
 * スキルカードとメモリ化Pアイテムは個別に除外できる。
 *
 * @param settings - 現在のユニット設定
 * @param card - 判定するサポート
 * @returns 設定に応じた除外対象なら true
 */
function shouldExcludeForContest(settings: UnitSimulatorSettings, card: SupportCard): boolean {
  const excludeSkillCards = !!settings.excludeContestSkillCards
  const excludePItems = !!settings.excludeContestPItems
  return (
    (excludeSkillCards && card.skill_card !== null) ||
    (excludePItems && card.p_item?.memory === enums.PItemMemoryType.Memorizable)
  )
}

/** evaluateUnit 高速化用のアビリティシナジー情報 */
interface SynergyAbilityInfo {
  /** アクションインデックス（ACTION_ID_TO_IDX でのインデックス） */
  actionIdx: number
  /** アビリティ発動 1 回あたりのスコア */
  parsedValue: number
  /** アビリティの max_count（undefined = 無制限） */
  maxCount: number | undefined
  /** ベース計算での使用済み回数 */
  usedCount: number
}

/** 候補準備で参照するスケジュール情報 */
interface ResolvedScheduleLike {
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>
  perLessonValues: PerLessonParameterValues | undefined
}

/** 候補カード生成に必要な追加データ */
interface CandidateCardInput {
  card: SupportCard
  uncap: UncapType
  scoreSettings: ScoreSettings
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>
  perLessonValues: PerLessonParameterValues | undefined
  customData?: CardCustomData
}

/** 評価用インデックスの対応表 */
const PARAMETER_TYPE_TO_INDEX: Record<enums.ParameterType, number> = {
  [enums.ParameterType.Vocal]: 0,
  [enums.ParameterType.Dance]: 1,
  [enums.ParameterType.Visual]: 2,
}

/**
 * サポートのSP種別を判定する
 *
 * VoSP / DaSP / ViSP / AllSP / なし を分類する。
 *
 * @param card - 対象のサポート
 * @returns SP種別（vocal / dance / visual / none）
 */
function getSpCategory(card: SupportCard): enums.SpCategoryType {
  for (const ability of card.abilities) {
    if (ability.trigger_key === enums.TriggerKeyType.VoSpLessonRate) return enums.SpCategoryType.Vocal
    if (ability.trigger_key === enums.TriggerKeyType.DaSpLessonRate) return enums.SpCategoryType.Dance
    if (ability.trigger_key === enums.TriggerKeyType.ViSpLessonRate) return enums.SpCategoryType.Visual
    if (ability.trigger_key === enums.TriggerKeyType.SpLessonRateAll) return enums.SpCategoryType.All
  }
  return enums.SpCategoryType.None
}

/**
 * サポートのパラメータボーナス%をタイプ別に取得する
 *
 * @param card - 対象のサポート
 * @param uncap - 凸数
 * @returns VoDaVi別のパラメータボーナス%値
 */
function getParamBonusPercent(card: SupportCard, uncap: UncapType): ParameterValues {
  const result: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  for (const ability of card.abilities) {
    if (ability.is_parameter_bonus) {
      const parsed = parseAbility(ability, uncap)
      const key = parsed.parameterType
      if (key && key in result) {
        result[key as keyof ParameterValues] = parsed.numericValue
      }
    }
  }
  return result
}

/**
 * parameter_type を評価用インデックスへ変換する
 *
 * @param parameterType - サポートの parameter_type
 * @returns vocal=0, dance=1, visual=2, 対象外=-1
 */
function toParamIndex(parameterType: enums.ParameterType): number {
  return PARAMETER_TYPE_TO_INDEX[parameterType]
}

/**
 * サポートの提供アクションベクトルを構築する
 *
 * getProvidedActions の出力と cardCountCustom による調整を
 * ACTION_ID_COUNT サイズの Float64Array に変換する。
 *
 * @param card - 対象サポート
 * @param scoreSettings - 点数設定（includeSelfTrigger / includePItem 参照用）
 * @param effectiveCounts - アクション別発動回数マップ
 * @param customSelfTrigger - 回数調整（cardCountCustom[card.name].selfTrigger）
 * @returns 提供アクションベクトル
 */
function buildProvidedActionsVec(
  card: SupportCard,
  scoreSettings: ScoreSettings,
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>,
  customSelfTrigger?: Partial<Record<enums.ActionIdType, number>>,
): Float64Array {
  // まずカード単体の提供アクション回数を算出する
  const provided = getProvidedActions(card, {
    includeSelfTrigger: scoreSettings.includeSelfTrigger,
    includePItem: scoreSettings.includePItem,
    actionCounts: effectiveCounts,
  })

  // ユーザー調整値があれば、同一連動グループの兄弟アクションへ差分を反映する
  if (customSelfTrigger) {
    for (const [actionId, customCount] of Object.entries(customSelfTrigger)) {
      if (!isActionId(actionId)) continue
      const aid = actionId
      const autoCount = provided[aid] ?? 0
      const diff = customCount - autoCount
      if (diff !== 0) {
        provided[aid] = Math.max(0, customCount)
        const group = data.LinkedActionGroups.find((g) => g.includes(aid))
        if (group) {
          for (const sibling of group) {
            if (sibling !== aid && provided[sibling] !== undefined) {
              provided[sibling] = Math.max(0, (provided[sibling] ?? 0) + diff)
            }
          }
        }
      }
    }
  }

  // 最後に疎なマップ形式を固定長ベクトルへ詰め直して評価処理を高速化する
  const vec = new Float64Array(ACTION_ID_COUNT)
  for (const [actionId, count] of Object.entries(provided)) {
    if (!isActionId(actionId)) continue
    const idx = ACTION_ID_TO_IDX[actionId]
    if (idx !== undefined && count) vec[idx] = count
  }
  return vec
}

/**
 * 非ゼロの提供アクションを列挙する
 *
 * @param providedActionsVec - 提供アクションベクトル
 * @returns 非ゼロの提供アクション一覧
 */
function buildProvidedActionEntries(providedActionsVec: Float64Array): { actionIdx: number; count: number }[] {
  // ベクトルをそのまま全走査するより、非ゼロ成分だけを持つ配列を作って以降のループを軽くする
  const entries: { actionIdx: number; count: number }[] = []
  for (let i = 0; i < providedActionsVec.length; i++) {
    const count = providedActionsVec[i]
    if (count !== 0) entries.push({ actionIdx: i, count })
  }
  return entries
}

/**
 * シナジー対象アビリティを事前解析する
 *
 * @param card - 対象サポート
 * @param uncap - 凸数
 * @param baseResult - カード計算結果（usedCount 参照用）
 * @returns シナジー対象アビリティ情報の配列
 */
function buildSynergyAbilities(
  card: SupportCard,
  uncap: UncapType,
  baseResult: CardCalculationResult,
): SynergyAbilityInfo[] {
  // スコア加算に関与するトリガー付きアビリティのみ抽出し、必要値を事前計算する
  const synergyAbilities: SynergyAbilityInfo[] = []
  for (const ability of card.abilities) {
    // 連携対象外の能力はこの段階で除外して、評価時の分岐を減らす
    if (
      ability.skip_calculation ||
      ability.is_percentage ||
      ability.is_event_boost ||
      ability.is_parameter_bonus ||
      ability.is_initial_stat
    )
      continue
    if (!ability.trigger_key) continue
    const synActionId = data.TriggerActionMap[ability.trigger_key]
    if (!synActionId || synActionId === enums.ActionIdType.Nothing) continue
    const actionIdx = ACTION_ID_TO_IDX[synActionId]
    if (actionIdx === undefined) continue
    // 発動値・max_count・使用済み回数をまとめ、評価時に再計算しないようにする
    const parsed = parseAbility(ability, uncap)
    const usedDetail = baseResult.allAbilityDetails.find((d) => d.nameKey === ability.name_key)
    synergyAbilities.push({
      actionIdx,
      parsedValue: parsed.numericValue,
      maxCount: ability.max_count,
      usedCount: usedDetail?.count ?? 0,
    })
  }
  return synergyAbilities
}

/**
 * 候補カードを 1 枚分だけ事前計算する
 *
 * @param input - 候補カード生成に必要な入力
 * @returns 事前計算済み候補カード
 */
export function createCandidateCard(input: CandidateCardInput): CandidateCard {
  const { card, uncap, scoreSettings, effectiveCounts, perLessonValues, customData } = input
  // カード固有スコアと詳細を先に確定し、候補生成後の重複計算を避ける
  const baseResult = calculateCardParameter(
    card,
    uncap,
    effectiveCounts,
    {},
    scoreSettings.parameterBonusBase,
    scoreSettings.includeSelfTrigger,
    scoreSettings.includePItem,
    perLessonValues,
    customData?.selfTrigger,
    customData?.pItemCount,
  )
  // 提供アクションはベクトル化して、組み合わせ評価を線形走査で済ませる
  const providedActionsVec = buildProvidedActionsVec(card, scoreSettings, effectiveCounts, customData?.selfTrigger)

  return {
    card,
    uncap,
    baseScore: baseResult.totalIncrease,
    baseScoreWithoutParamBonus: baseResult.totalIncrease - baseResult.parameterBonus,
    baseResult,
    spCategory: getSpCategory(card),
    paramIndex: toParamIndex(card.parameter_type),
    paramBonusPercent: getParamBonusPercent(card, uncap),
    providedActionsVec,
    providedActionEntries: buildProvidedActionEntries(providedActionsVec),
    synergyAbilities: buildSynergyAbilities(card, uncap, baseResult),
  }
}

/**
 * 候補配列をSP/タイプ別のプールへ一度で分類する
 *
 * @param pool - 分類対象の候補配列
 * @param excludedName - 除外するカード名
 * @returns 分類済みプール
 */
function categorizeCandidatePools(pool: CandidateCard[], excludedName?: string): CategorizedCandidatePools {
  const categorized: CategorizedCandidatePools = {
    voSpPool: [],
    daSpPool: [],
    viSpPool: [],
    allSpPool: [],
    genVoPool: [],
    genDaPool: [],
    genViPool: [],
    genAsPool: [],
  }

  for (const candidate of pool) {
    if (excludedName && candidate.card.name === excludedName) continue
    if (candidate.spCategory === enums.SpCategoryType.Vocal) {
      categorized.voSpPool.push(candidate)
      continue
    }
    if (candidate.spCategory === enums.SpCategoryType.Dance) {
      categorized.daSpPool.push(candidate)
      continue
    }
    if (candidate.spCategory === enums.SpCategoryType.Visual) {
      categorized.viSpPool.push(candidate)
      continue
    }
    if (candidate.spCategory === enums.SpCategoryType.All) {
      categorized.allSpPool.push(candidate)
      continue
    }
    if (candidate.card.type === enums.ParameterType.Vocal) {
      categorized.genVoPool.push(candidate)
      continue
    }
    if (candidate.card.type === enums.ParameterType.Dance) {
      categorized.genDaPool.push(candidate)
      continue
    }
    if (candidate.card.type === enums.ParameterType.Visual) {
      categorized.genViPool.push(candidate)
      continue
    }
    categorized.genAsPool.push(candidate)
  }

  return categorized
}

/**
 * 全サポートから 4凸レンタル候補を最大 candidateLimit 枚取得する
 *
 * 実アクション回数でのスコア上位と、カウントゼロでのスコア上位に加えて、
 * Pアイテムの行動提供による相乗効果が大きい候補を返す。
 * これにより、アクション回数依存型（m_skill_enhance 等）と非依存型のどちらも
 * 漏れなく候補に含め、Phase 0 マルチスタートでの評価バイアスを解消する。
 *
 * @param input - 最適化入力
 * @param schedule - スケジュール解析結果
 * @param excludedNames - 除外するサポート名（固定カード等）
 * @param candidateLimit - 候補上限枚数（exhaustiveCandidateLimit と統一）
 * @returns 4凸レンタル候補配列（baseScore降順・最大 candidateLimit 枚）
 */
function buildRentalPool(
  input: OptimizeInput,
  schedule: ResolvedScheduleLike,
  excludedNames: Set<string>,
  candidateLimit: number,
): CandidateCard[] {
  const { scoreSettings } = input
  const { effectiveCounts, perLessonValues } = schedule
  const allExcludedNames = new Set([...excludedNames, ...input.excludedCardNames])
  const scoredCards: { candidate: CandidateCard; zeroCountScore: number }[] = []

  // ロックされているカードのタイプ数を集計する
  const lockedConfigCount: Record<enums.CardType, number> = {
    vocal: 0,
    dance: 0,
    visual: 0,
    assist: 0,
  }

  // ロック済みカードのタイプ別枚数を集計する（typeCountMax と比較して除外判定に使用）
  for (const lockedName of input.settings.lockedCards) {
    const card = input.cardByName.get(lockedName)
    if (card) {
      lockedConfigCount[card.type]++
    }
  }

  // すでに特定タイプが最大編成枠に達している場合、そのタイプは追加できないためフラグを立てる
  const isTypeFull = {
    vocal: lockedConfigCount.vocal >= (input.settings.typeCountMax.vocal ?? 6),
    dance: lockedConfigCount.dance >= (input.settings.typeCountMax.dance ?? 6),
    visual: lockedConfigCount.visual >= (input.settings.typeCountMax.visual ?? 6),
    assist: false,
  }

  for (const card of input.allCards) {
    if (allExcludedNames.has(card.name)) continue
    if (shouldExcludeForContest(input.settings, card)) continue
    if (card.plan !== input.settings.plan && card.plan !== enums.PlanType.Free) continue
    if (input.settings.allowedTypes.length > 0 && !input.settings.allowedTypes.includes(card.type)) continue

    // typeCountMax に達したタイプは除外する（候補が偏っても typeCountMin 保険補充で必要タイプは確保される）
    // 編成可能な枠に空きがないタイプは候補から除外する（ただし、ロック済みの現物カード自体は除く）
    if (isTypeFull[card.type] && !input.settings.lockedCards.includes(card.name)) {
      continue
    }

    const customData = input.cardCountCustom?.[card.name]

    const actualResult = calculateCardParameter(
      card,
      enums.UncapType.Four,
      effectiveCounts,
      {},
      scoreSettings.parameterBonusBase,
      scoreSettings.includeSelfTrigger,
      scoreSettings.includePItem,
      perLessonValues,
      customData?.selfTrigger,
      customData?.pItemCount,
    )
    const zeroResult = calculateCardParameter(
      card,
      enums.UncapType.Four,
      {},
      {},
      scoreSettings.parameterBonusBase,
      scoreSettings.includeSelfTrigger,
      scoreSettings.includePItem,
      perLessonValues,
      customData?.selfTrigger,
      customData?.pItemCount,
    )

    const providedActionsVec = buildProvidedActionsVec(card, scoreSettings, effectiveCounts, customData?.selfTrigger)
    const uncap = enums.UncapType.Four
    scoredCards.push({
      candidate: {
        card,
        uncap,
        baseScore: actualResult.totalIncrease,
        baseScoreWithoutParamBonus: actualResult.totalIncrease - actualResult.parameterBonus,
        baseResult: actualResult,
        spCategory: getSpCategory(card),
        paramIndex: toParamIndex(card.parameter_type),
        paramBonusPercent: getParamBonusPercent(card, uncap),
        providedActionsVec,
        providedActionEntries: buildProvidedActionEntries(providedActionsVec),
        synergyAbilities: buildSynergyAbilities(card, uncap, actualResult),
      },
      zeroCountScore: zeroResult.totalIncrease,
    })
  }

  // byActual/byZero を candidateLimit 枚ずつ取り Map で重複をマージする
  const byActual = [...scoredCards].sort((a, b) => b.candidate.baseScore - a.candidate.baseScore)
  const byZero = [...scoredCards].sort((a, b) => b.zeroCountScore - a.zeroCountScore)

  const poolMap = new Map<string, CandidateCard>()
  for (const { candidate } of byActual.slice(0, candidateLimit)) {
    poolMap.set(candidate.card.name, candidate)
  }
  for (const { candidate } of byZero.slice(0, candidateLimit)) {
    poolMap.set(candidate.card.name, candidate)
  }

  // SP制約を満たすために必要なSPカードをプールに補充する
  // 自由枠とレンタル枠の計算は別関数で独立して行うため、このプールは自由枠専用（所持凸で評価済み）
  for (const [spCat, needed] of [
    [enums.SpCategoryType.Vocal, input.settings.spConstraint.vocal] as const,
    [enums.SpCategoryType.Dance, input.settings.spConstraint.dance] as const,
    [enums.SpCategoryType.Visual, input.settings.spConstraint.visual] as const,
  ]) {
    if (needed <= 0) continue
    const alreadySpCount = [...poolMap.values()].filter(
      (c) => c.spCategory === spCat || c.spCategory === enums.SpCategoryType.All,
    ).length
    if (alreadySpCount >= Math.max(5, needed)) continue
    const satisfying = scoredCards
      .filter((item) => item.candidate.spCategory === spCat || item.candidate.spCategory === enums.SpCategoryType.All)
      .sort((a, b) => b.candidate.baseScore - a.candidate.baseScore)
      .slice(0, Math.max(5, needed))

    for (const item of satisfying) {
      poolMap.set(item.candidate.card.name, item.candidate)
    }
  }

  // 各タイプ最小数制約を満たすために必要な枚数（minNeeded）分だけタイプ別カードを補充する
  for (const paramType of [enums.ParameterType.Vocal, enums.ParameterType.Dance, enums.ParameterType.Visual]) {
    const minNeeded = input.settings.typeCountMin[paramType]
    if (minNeeded <= 0) continue
    const alreadyTypeCount = [...poolMap.values()].filter((c) => c.card.type === paramType).length
    if (alreadyTypeCount >= Math.max(3, minNeeded)) continue
    const satisfying = scoredCards
      .filter((item) => item.candidate.card.type === paramType)
      .sort((a, b) => b.candidate.baseScore - a.candidate.baseScore)
      .slice(0, Math.max(3, minNeeded))

    for (const item of satisfying) {
      poolMap.set(item.candidate.card.name, item.candidate)
    }
  }

  // 基礎点だけでは落ちるPアイテム行動提供元を候補上限内で保護する
  const pItemActionProviders = getTopPItemActionProviders(
    scoredCards.map(({ candidate }) => candidate),
    candidateLimit,
  )
  for (const candidate of pItemActionProviders) poolMap.set(candidate.card.name, candidate)

  return trimCandidatePool([...poolMap.values()], candidateLimit, pItemActionProviders)
}

/**
 * レンタル枝ごとの列挙条件を事前計算する
 *
 * @param rentalPool - レンタル候補一覧
 * @param freePool - 自由枠候補一覧
 * @param input - 最適化入力
 * @param settings - 現在のユニット設定
 * @param forcedTypeCount - 固定カードのタイプ枚数
 * @param fixedVoSp - 固定カードのVoSP枚数
 * @param fixedDaSp - 固定カードのDaSP枚数
 * @param fixedViSp - 固定カードのViSP枚数
 * @returns 評価対象のレンタル枝前計算結果
 */
function buildRentalBranchContexts(
  rentalPool: CandidateCard[],
  freePool: CandidateCard[],
  input: OptimizeInput,
  settings: UnitSimulatorSettings,
  forcedTypeCount: Record<enums.ParameterType, number>,
  fixedVoSp: number,
  fixedDaSp: number,
  fixedViSp: number,
): RentalBranchContext[] {
  const contexts: RentalBranchContext[] = []

  for (const rental of rentalPool) {
    const rentalType = rental.card.type as enums.ParameterType
    if (
      Object.values(enums.ParameterType).includes(rentalType) &&
      forcedTypeCount[rentalType] >= settings.typeCountMax[rentalType]
    ) {
      continue
    }

    const rentalForcedTypeCount = { ...forcedTypeCount }
    if (Object.values(enums.ParameterType).includes(rentalType)) rentalForcedTypeCount[rentalType]++
    const rentalAdjMax: TypeCountValues = {
      [enums.ParameterType.Vocal]: Math.max(
        settings.typeCountMax[enums.ParameterType.Vocal],
        rentalForcedTypeCount[enums.ParameterType.Vocal],
      ),
      [enums.ParameterType.Dance]: Math.max(
        settings.typeCountMax[enums.ParameterType.Dance],
        rentalForcedTypeCount[enums.ParameterType.Dance],
      ),
      [enums.ParameterType.Visual]: Math.max(
        settings.typeCountMax[enums.ParameterType.Visual],
        rentalForcedTypeCount[enums.ParameterType.Visual],
      ),
    }

    const rentalVoAdd =
      rental.spCategory === enums.SpCategoryType.Vocal || rental.spCategory === enums.SpCategoryType.All ? 1 : 0
    const rentalDaAdd =
      rental.spCategory === enums.SpCategoryType.Dance || rental.spCategory === enums.SpCategoryType.All ? 1 : 0
    const rentalViAdd =
      rental.spCategory === enums.SpCategoryType.Visual || rental.spCategory === enums.SpCategoryType.All ? 1 : 0
    const neededVo = Math.max(0, settings.spConstraint.vocal - fixedVoSp - rentalVoAdd)
    const neededDa = Math.max(0, settings.spConstraint.dance - fixedDaSp - rentalDaAdd)
    const neededVi = Math.max(0, settings.spConstraint.visual - fixedViSp - rentalViAdd)

    const pools = categorizeCandidatePools(freePool, rental.card.name)
    if (pools.voSpPool.length < neededVo || pools.daSpPool.length < neededDa || pools.viSpPool.length < neededVi) {
      continue
    }

    contexts.push({
      rental,
      rentalInput: { ...input, settings: { ...settings, typeCountMax: rentalAdjMax } },
      pools,
      totalCombos: 0,
      neededVo,
      neededDa,
      neededVi,
      typeVoMax: Math.max(
        0,
        rentalAdjMax[enums.ParameterType.Vocal] - rentalForcedTypeCount[enums.ParameterType.Vocal],
      ),
      typeDaMax: Math.max(
        0,
        rentalAdjMax[enums.ParameterType.Dance] - rentalForcedTypeCount[enums.ParameterType.Dance],
      ),
      typeViMax: Math.max(
        0,
        rentalAdjMax[enums.ParameterType.Visual] - rentalForcedTypeCount[enums.ParameterType.Visual],
      ),
      typeVoMin: Math.max(
        0,
        settings.typeCountMin[enums.ParameterType.Vocal] - rentalForcedTypeCount[enums.ParameterType.Vocal],
      ),
      typeDaMin: Math.max(
        0,
        settings.typeCountMin[enums.ParameterType.Dance] - rentalForcedTypeCount[enums.ParameterType.Dance],
      ),
      typeViMin: Math.max(
        0,
        settings.typeCountMin[enums.ParameterType.Visual] - rentalForcedTypeCount[enums.ParameterType.Visual],
      ),
    })
  }

  return contexts
}

/**
 * 候補サポートをフィルタリング・事前計算する
 *
 * @param input - 最適化入力
 * @param schedule - スケジュール解析結果（resolveSchedule の戻り値）
 * @returns 候補サポート配列
 */
export function prepareCandidates(input: OptimizeInput, schedule: ResolvedScheduleLike): CandidateCard[] {
  const { settings, scoreSettings, cardUncaps, cardCountCustom, allCards } = input
  const { effectiveCounts, perLessonValues } = schedule
  const candidates: CandidateCard[] = []
  const lockedNameSet = new Set(settings.lockedCards)
  const excludedNameSet = new Set(input.excludedCardNames)

  for (const card of allCards) {
    const isLocked = lockedNameSet.has(card.name)
    const effectiveLocked = isLocked && (card.plan === settings.plan || card.plan === enums.PlanType.Free)
    if (!effectiveLocked && excludedNameSet.has(card.name)) continue
    if (!effectiveLocked && card.plan !== settings.plan && card.plan !== enums.PlanType.Free) continue
    if (!effectiveLocked && settings.allowedTypes.length > 0 && !settings.allowedTypes.includes(card.type)) continue
    if (!effectiveLocked && shouldExcludeForContest(settings, card)) continue

    let uncap = scoreSettings.useFixedUncap ? enums.UncapType.Four : (cardUncaps[card.name] ?? constant.DEFAULT_UNCAP)
    if (effectiveLocked && uncap === enums.UncapType.NotOwned) {
      uncap = enums.UncapType.Four
    }
    if (!scoreSettings.useFixedUncap && uncap === enums.UncapType.NotOwned) continue

    const customData = cardCountCustom?.[card.name]
    const baseResult = calculateCardParameter(
      card,
      uncap,
      effectiveCounts,
      {},
      scoreSettings.parameterBonusBase,
      scoreSettings.includeSelfTrigger,
      scoreSettings.includePItem,
      perLessonValues,
      customData?.selfTrigger,
      customData?.pItemCount,
    )

    const providedActionsVec = buildProvidedActionsVec(card, scoreSettings, effectiveCounts, customData?.selfTrigger)
    const providedActionEntries = buildProvidedActionEntries(providedActionsVec)
    const synergyAbilities = buildSynergyAbilities(card, uncap, baseResult)

    candidates.push({
      card,
      uncap,
      baseScore: baseResult.totalIncrease,
      baseScoreWithoutParamBonus: baseResult.totalIncrease - baseResult.parameterBonus,
      baseResult,
      spCategory: getSpCategory(card),
      paramIndex: toParamIndex(card.parameter_type),
      paramBonusPercent: getParamBonusPercent(card, uncap),
      providedActionsVec,
      providedActionEntries,
      synergyAbilities,
    })
  }

  candidates.sort((a, b) => b.baseScore - a.baseScore)
  return candidates
}

/**
 * 4凸レンタル候補のプールを作成する
 *
 * @param input - 最適化入力
 * @param schedule - スケジュール解析結果
 * @param excludedNames - 除外するサポート名
 * @param candidateLimit - 候補上限枚数（exhaustiveCandidateLimit と統一）
 * @returns レンタル候補配列
 */
export function createRentalPool(
  input: OptimizeInput,
  schedule: ResolvedScheduleLike,
  excludedNames: Set<string>,
  candidateLimit: number,
): CandidateCard[] {
  return buildRentalPool(input, schedule, excludedNames, candidateLimit)
}

/**
 * 候補配列をSP/タイプ別に分類する
 *
 * @param pool - 分類対象の候補配列
 * @param excludedName - 除外するカード名
 * @returns 分類済みプール
 */
export function createCategorizedCandidatePools(
  pool: CandidateCard[],
  excludedName?: string,
): CategorizedCandidatePools {
  return categorizeCandidatePools(pool, excludedName)
}

/**
 * レンタル枝ごとの前計算コンテキストを構築する
 *
 * @param rentalPool - レンタル候補一覧
 * @param freePool - 自由枠候補一覧
 * @param input - 最適化入力
 * @param settings - 現在のユニット設定
 * @param forcedTypeCount - 固定カードのタイプ枚数
 * @param fixedVoSp - 固定カードのVoSP枚数
 * @param fixedDaSp - 固定カードのDaSP枚数
 * @param fixedViSp - 固定カードのViSP枚数
 * @returns レンタル枝コンテキスト
 */
export function createRentalBranchContexts(
  rentalPool: CandidateCard[],
  freePool: CandidateCard[],
  input: OptimizeInput,
  settings: UnitSimulatorSettings,
  forcedTypeCount: Record<enums.ParameterType, number>,
  fixedVoSp: number,
  fixedDaSp: number,
  fixedViSp: number,
): RentalBranchContext[] {
  return buildRentalBranchContexts(
    rentalPool,
    freePool,
    input,
    settings,
    forcedTypeCount,
    fixedVoSp,
    fixedDaSp,
    fixedViSp,
  )
}

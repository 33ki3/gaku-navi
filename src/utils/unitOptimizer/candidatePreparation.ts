/**
 * 編成最適化の候補準備ユーティリティ
 *
 * 候補の事前計算、SP/タイプ別分類、レンタル枝の前計算をまとめる
 * 最適化本体から候補準備の責務を分離し、探索ロジックを読みやすくする
 */
import * as constant from '../../constant'
import * as data from '../../data'
import type {
  CardCalculationResult,
  CardCustomData,
  ParameterValues,
  PerLessonParameterValues,
  ScoreSettings,
  SupportCard,
} from '../../types/card'
import type { UncapType } from '../../types/enums'
import * as enums from '../../types/enums'
import type { TypeCountValues, UnitSimulatorSettings } from '../../types/unit'
import type { OptimizeInput } from '../../types/unitOptimizer'
import { calculateCardParameter } from '../calculator/calculateCard'
import { parseAbility } from '../calculator/helpers'
import { isActionId } from '../domainValueValidation'
import { getPItemBodyActionCounts, getProvidedActions } from '../supportSynergy'

/** アクション種別を配列位置で参照するための一覧 */
const ACTION_ID_VALUES = Object.values(enums.ActionIdType) as enums.ActionIdType[]
/** アクション種別の総数 */
const ACTION_ID_COUNT = ACTION_ID_VALUES.length
/** アクション種別から配列位置を引く表 */
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
  /** 編成全体の計算で使う、アクション種別ごとの提供回数 */
  providedActionsVec: Float64Array
  /** 提供回数が0より大きいアクションの一覧 */
  providedActionEntries: { actionIdx: number; count: number }[]
  /** 他のカードから回数を受け取れるアビリティの情報 */
  synergyAbilities: SynergyAbilityInfo[]
}

function isPItemActionProvider(candidate: CandidateCard): boolean {
  if ((candidate.card.p_item?.actions?.length ?? 0) > 0) return true
  if (Object.keys(candidate.card.p_item?.provided_action_ids ?? {}).length > 0) return true
  if (!candidate.card.p_item?.effect) return false
  return Object.keys(getPItemBodyActionCounts(candidate.card.p_item.effect)).length > 0
}

/**
 * 候補が実際の編成枠で他カードへ提供するアクションの相乗効果を概算する
 * 自身の baseScore は含めず、候補に残すべき提供元を決める補助スコアとして使う
 *
 * @param provider - 提供元として評価する候補
 * @param receivers - 提供先として評価する候補一覧
 * @returns 最大5枚の受け手へ与える相乗効果の概算値
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

  // 候補30枚全体ではなく、提供元を除く最大5枠の受け手だけを上限として評価する
  receiverScores.sort((a, b) => b - a)
  return receiverScores.slice(0, Math.max(0, constant.UNIT_SIZE - 1)).reduce((total, score) => total + score, 0)
}

/**
 * Pアイテム行動提供元のうち、他カードへの寄与が大きい候補を取得する
 * 最終編成を決める処理ではなく、候補プールから落とさないカードを選ぶ処理
 *
 * @param candidates - 基礎点順に作られた候補一覧
 * @param candidateLimit - 残す候補数の上限
 * @returns 保護対象にするPアイテム行動提供元
 */
function getTopPItemActionProviders(candidates: readonly CandidateCard[], candidateLimit: number): CandidateCard[] {
  const providerLimit = Math.min(candidateLimit, constant.P_ITEM_ACTION_PROVIDER_LIMIT)
  if (providerLimit <= 0) return []

  // 各候補が他カードへ与えられる相乗効果を先に見積もる
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

/**
 * 保護候補を残しながら基礎点順で候補上限に収める
 *
 * @param candidates - 元の候補一覧
 * @param candidateLimit - 残す候補数の上限
 * @param protectedCandidates - 上限を超えても優先して残す候補
 * @returns 上限内へ整理した候補一覧
 */
function trimCandidatePool(
  candidates: readonly CandidateCard[],
  candidateLimit: number,
  protectedCandidates: readonly CandidateCard[] = [],
): CandidateCard[] {
  if (candidateLimit <= 0) return []

  // まず基礎点の上位候補を残し、保護候補を追加する
  const selected = new Map<string, CandidateCard>()
  for (const candidate of [...candidates].sort((a, b) => b.baseScore - a.baseScore).slice(0, candidateLimit)) {
    selected.set(candidate.card.name, candidate)
  }
  for (const candidate of protectedCandidates) selected.set(candidate.card.name, candidate)

  // 上限を超えた場合は保護対象でない点数の低い候補から外す
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
 * 基礎点上位に加えて、Pアイテム行動の相乗効果が大きい候補を残す
 * 保護候補は最終編成に確定採用されず、後続の実スコア評価で選別される
 *
 * @param candidates - 基礎点順に作られた候補一覧
 * @param candidateLimit - 残す候補数の上限
 * @returns 相乗効果の候補を含めた候補一覧
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

/** 自動レンタルの各探索枝で使う前計算結果 */
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
 * スキルカードとメモリ化Pアイテムは個別に除外できる
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

/** サポート間連携の計算で使うアビリティ情報 */
interface SynergyAbilityInfo {
  /** 提供アクションの配列位置 */
  actionIdx: number
  /** アビリティ1回あたりの点数 */
  parsedValue: number
  /** アビリティの発動回数上限 */
  maxCount: number | undefined
  /** 通常計算で使った発動回数 */
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
 * VoSP / DaSP / ViSP / AllSP / なし を分類する
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
 * サポートの得意パラメータを提供回数配列の位置へ変換する
 *
 * Vo・Da・Viを固定位置へ対応づけ、組み合わせ計算で同じ位置を参照できるようにする
 *
 * @param parameterType - サポートの得意パラメータ
 * @returns 対応する配列位置
 */
function toParamIndex(parameterType: enums.ParameterType): number {
  return PARAMETER_TYPE_TO_INDEX[parameterType]
}

/**
 * サポートの提供回数と回数調整を、共通の配列へ変換する
 *
 * すべてのアクションを同じ順番で保持し、組み合わせ計算で再検索しない
 *
 * @param card - 対象サポート
 * @param scoreSettings - 自身の効果とPアイテムを点数へ含めるかの設定
 * @param effectiveCounts - アクション別発動回数の対応表
 * @param customSelfTrigger - サポート自身が提供するアクションの回数調整
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

  // アクションIDを決まった位置に置き、組み合わせ計算で
  // 同じ場所を参照できる配列へ変換する
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
  // 0回のアクションを後続の探索で調べずに済むよう、提供されるものだけを記録する
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
 * 全サポートから4凸レンタル候補を作る
 *
 * 実際のアクション回数を使った点数と、回数を0にした点数の両方を確認する
 * Pアイテムが他のカードへ与える回数も、候補に残す判断へ加える
 * 回数に依存するカードと依存しないカードのどちらも、
 * レンタル候補から落としにくくする
 *
 * @param input - 最適化入力
 * @param schedule - スケジュール解析結果
 * @param excludedNames - 除外するサポート名（固定カード等）
 * @param candidateLimit - 候補として残す最大枚数
 * @returns 点数と他カードへの貢献を考慮したレンタル候補配列
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

  // ロック済みカードのタイプ別枚数を集計し、追加できるタイプかを判断する
  for (const lockedName of input.settings.lockedCards) {
    const card = input.cardByName.get(lockedName)
    if (card) {
      lockedConfigCount[card.type]++
    }
  }

  // ロック済みカードだけでタイプ別上限に達した場合は、
  // そのタイプの追加候補を除外する
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

    // 追加枠のないタイプを除外する
    // ロック済みのカード自身は候補から消さない
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

  // 実際の回数あり・回数ゼロの2通りで点数順の候補を作る
  // どちらかで上位に入ったカードを、重複なく1つの候補一覧へまとめる
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
  // 自由枠とレンタル枠は別に計算するため、このプールは自由枠専用にする
  // 候補の点数は所持状況の凸数で評価済み
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

  // 各タイプの最低枚数を満たせるよう、必要なタイプのカードを補充する
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
    // レンタル候補を1枚ずつ仮採用し、SP・タイプ条件が成立する枝だけを残す
    const rentalType = rental.card.type as enums.ParameterType
    if (
      Object.values(enums.ParameterType).includes(rentalType) &&
      forcedTypeCount[rentalType] >= settings.typeCountMax[rentalType]
    ) {
      continue
    }

    const rentalForcedTypeCount = { ...forcedTypeCount }
    if (Object.values(enums.ParameterType).includes(rentalType)) rentalForcedTypeCount[rentalType]++
    // 固定カードとレンタルを含むタイプ数を数え、追加後の上限を決める
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
    // 固定カードとレンタルで足りないSP枚数を、自由枠へ求める
    const neededVo = Math.max(0, settings.spConstraint.vocal - fixedVoSp - rentalVoAdd)
    const neededDa = Math.max(0, settings.spConstraint.dance - fixedDaSp - rentalDaAdd)
    const neededVi = Math.max(0, settings.spConstraint.visual - fixedViSp - rentalViAdd)

    // レンタルを除いた自由枠から、必要なSP枚数を満たせない枝は除外する
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
 * @param schedule - スケジュール解析結果
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
    // 有効な固定カードは候補から外さず、
    // それ以外には除外・プラン・タイプ・オプション条件を適用する
    if (!effectiveLocked && excludedNameSet.has(card.name)) continue
    if (!effectiveLocked && card.plan !== settings.plan && card.plan !== enums.PlanType.Free) continue
    if (!effectiveLocked && settings.allowedTypes.length > 0 && !settings.allowedTypes.includes(card.type)) continue
    if (!effectiveLocked && shouldExcludeForContest(settings, card)) continue

    // 固定カードは未所持でも4凸として残し、それ以外は設定凸数で未所持を除外する
    let uncap = scoreSettings.useFixedUncap ? enums.UncapType.Four : (cardUncaps[card.name] ?? constant.DEFAULT_UNCAP)
    if (effectiveLocked && uncap === enums.UncapType.NotOwned) {
      uncap = enums.UncapType.Four
    }
    if (!scoreSettings.useFixedUncap && uncap === enums.UncapType.NotOwned) continue

    const customData = cardCountCustom?.[card.name]
    // 各候補の点数と、編成条件で使うSP・提供回数の情報を先に計算する
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
 * @param candidateLimit - 候補として残す最大枚数
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

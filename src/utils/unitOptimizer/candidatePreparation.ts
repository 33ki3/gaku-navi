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
  ScoreSettings,
  SupportCard,
} from '../../types/card'
import type { UncapType } from '../../types/enums'
import * as enums from '../../types/enums'
import type { UnitSimulatorSettings } from '../../types/unit'
import type { OptimizeInput } from '../../types/unitOptimizer'
import { calculateCardParameter } from '../calculator/calculateCard'
import { parseAbility } from '../calculator/helpers'
import { isActionId } from '../domainValueValidation'
import { getProvidedActions } from '../supportSynergy'
import { getLockedRentalCardName } from '../unitCardSelection'
import type { SpTypeEnumerateInput } from './combinatorics'
import { countSpTypeConstrainedCombos } from './combinatorics'
import type { SynergyAbility } from './synergyScore'
import { compareCandidateBaseScores, selectSynergyCandidates } from './synergySelection'

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

/** レンタルを決めた後に共用する、固定メンバーと自由枠の探索条件 */
export interface SearchBranch {
  fixedCandidates: CandidateCard[]
  rentalName: string
  enumeration: SpTypeEnumerateInput<CandidateCard>
  totalCombos: number
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
interface SynergyAbilityInfo extends SynergyAbility {
  /** 結果表示の連携回数をアビリティの発動条件別にまとめるためのキー */
  triggerKey: enums.TriggerKeyType
}

/** 候補準備で参照するスケジュール情報 */
interface ResolvedScheduleLike {
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>
  parameterBonusRows: ParameterValues[]
}

/** 候補カード生成に必要な追加データ */
interface CandidateCardInput {
  card: SupportCard
  uncap: UncapType
  scoreSettings: ScoreSettings
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>
  parameterBonusRows: ParameterValues[]
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
      triggerKey: ability.trigger_key,
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
  const { card, uncap, scoreSettings, effectiveCounts, parameterBonusRows, customData } = input
  // カード固有スコアと詳細を先に確定し、候補生成後の重複計算を避ける
  const baseResult = calculateCardParameter(
    card,
    uncap,
    effectiveCounts,
    {},
    parameterBonusRows,
    scoreSettings.includeSelfTrigger,
    scoreSettings.includePItem,
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
 * 通常枠の固定カードと固定レンタルをまとめ、候補選定・探索で同じ固定枠を使う
 *
 * @param input - 固定カードと固定レンタルの設定を含む最適化入力
 * @param candidates - 通常枠の事前計算済み候補
 * @param rentalCandidates - 共通の候補作成処理で4凸評価済みのレンタル候補
 * @returns 固定レンタルを重複なく含む固定候補
 */
export function createFixedCandidates(
  input: OptimizeInput,
  candidates: readonly CandidateCard[],
  rentalCandidates: readonly CandidateCard[],
): CandidateCard[] {
  // 通常枠で固定されたカードは、計算済みの所持凸数を引き継ぐ
  const lockedCardNames = new Set(input.settings.lockedCards)
  const rentalName = getLockedRentalCardName(input.settings)
  const fixed = candidates.filter(
    (candidate) => lockedCardNames.has(candidate.card.name) && candidate.card.name !== rentalName,
  )
  const rental = rentalCandidates.find((candidate) => candidate.card.name === rentalName)
  if (rental) fixed.push(rental)
  return fixed
}

/**
 * 候補配列をSP/タイプ別のプールへ一度で分類する
 *
 * @param pool - 分類対象の候補配列
 * @param excludedName - 除外するカード名
 * @returns 分類済みプール
 */
function createCategorizedCandidatePools(pool: CandidateCard[], excludedName?: string): CategorizedCandidatePools {
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
 * 実回数・4凸でレンタル候補を作り、通常枠との連携を共通評価点へ反映する。
 *
 * @param input - 最適化入力
 * @param schedule - スケジュール解析結果
 * @param excludedNames - 固定カード等の除外名
 * @param candidateLimit - 候補上限
 * @param normalCandidates - 計算済みの通常候補。未指定ならこの条件で生成する
 * @returns タイプ別最低候補数を考慮したレンタル候補
 */
export function createRentalPool(
  input: OptimizeInput,
  schedule: ResolvedScheduleLike,
  excludedNames: Set<string>,
  candidateLimit: number,
  normalCandidates: readonly CandidateCard[] = prepareCandidates(input, schedule),
): CandidateCard[] {
  const fixedRentalName = getLockedRentalCardName(input.settings)
  const fixedRentalCard = fixedRentalName ? input.cardByName.get(fixedRentalName) : undefined
  const rentalCards = fixedRentalName ? (fixedRentalCard ? [fixedRentalCard] : []) : input.allCards
  const allExcludedNames = new Set([...excludedNames, ...input.excludedCardNames])
  const scoredCards: CandidateCard[] = []

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

  for (const card of rentalCards) {
    // 固定レンタルは必須枠なので、未固定候補の除外条件やタイプ上限では落とさない
    if (!fixedRentalName) {
      if (allExcludedNames.has(card.name)) continue
      if (shouldExcludeForContest(input.settings, card)) continue
      if (card.plan !== input.settings.plan && card.plan !== enums.PlanType.Free) continue
      if (input.settings.allowedTypes.length > 0 && !input.settings.allowedTypes.includes(card.type)) continue
      if (isTypeFull[card.type] && !input.settings.lockedCards.includes(card.name)) continue
    }

    // レンタルの4凸評価は固定・未固定ともこの段階で一度だけ作り、後段は評価済み候補を使う
    scoredCards.push(
      createCandidateCard({
        card,
        uncap: enums.UncapType.Four,
        scoreSettings: input.scoreSettings,
        effectiveCounts: schedule.effectiveCounts,
        parameterBonusRows: schedule.parameterBonusRows,
        customData: input.cardCountCustom?.[card.name],
      }),
    )
  }

  // 固定なら選び直さず、その1枚を後段の固定一覧へ渡す
  if (fixedRentalName) return scoredCards

  const fixedCandidates = createFixedCandidates(input, normalCandidates, scoredCards)
  const fixedNames = new Set(fixedCandidates.map((candidate) => candidate.card.name))
  return selectSynergyCandidates(scoredCards, candidateLimit, {
    settings: input.settings,
    fixedCandidates,
    normalCandidates: normalCandidates.filter((candidate) => !fixedNames.has(candidate.card.name)),
    rentalCandidates: scoredCards,
    rentalSelection: true,
  })
}

/**
 * 固定レンタルは1枝、自動選出はレンタル候補ごとに1枝を作り、以後の探索条件を揃える
 *
 * @param fixedCandidates - 通常枠と固定レンタルを含む固定カード
 * @param freePool - 通常枠の探索候補
 * @param rentalPool - 自動選出時のレンタル候補
 * @param settings - 固定カード数を反映した編成設定
 * @returns 件数計算と列挙で同じ条件を使う探索枝
 */
export function createSearchBranches(
  fixedCandidates: CandidateCard[],
  freePool: CandidateCard[],
  rentalPool: CandidateCard[],
  settings: UnitSimulatorSettings,
): SearchBranch[] {
  const types = Object.values(enums.ParameterType)
  const fixedRentalName = getLockedRentalCardName(settings)
  // レンタルが固定済みなら固定カードをそのまま使い、自動なら候補を1枚ずつ仮採用する
  const choices = fixedRentalName
    ? [{ fixed: fixedCandidates, rentalName: fixedRentalName }]
    : rentalPool
        .filter((rental) => {
          // 通常固定だけでタイプ上限に達している場合、そのタイプのレンタルは追加できない
          const type = types.find((type) => type === rental.card.type)
          return (
            type === undefined ||
            fixedCandidates.filter((candidate) => candidate.card.type === type).length < settings.typeCountMax[type]
          )
        })
        .map((rental) => ({ fixed: [...fixedCandidates, rental], rentalName: rental.card.name }))
  const branches: SearchBranch[] = []
  for (const { fixed, rentalName } of choices) {
    // 同名カードを通常枠でも採用しないよう、選んだレンタルを自由枠候補から外す
    const pools = createCategorizedCandidatePools(freePool, rentalName)
    // 固定分のタイプ数とSP充足数を数え、自由枠へ求める不足分だけを残す
    const typeCounts = { vocal: 0, dance: 0, visual: 0 }
    const spNeeds = { vocal: 0, dance: 0, visual: 0 }
    for (const type of types) {
      typeCounts[type] = fixed.filter((candidate) => candidate.card.type === type).length
      const fixedSp = fixed.filter(
        (candidate) => candidate.spCategory === type || candidate.spCategory === enums.SpCategoryType.All,
      ).length
      // AllSPは各タイプの必要枚数を同時に満たす
      spNeeds[type] = Math.max(0, settings.spConstraint[type] - fixedSp)
    }
    // 自動レンタル枝では、自由枠のSP候補が不足する枝を事前に除外する
    if (
      !fixedRentalName &&
      (pools.voSpPool.length < spNeeds.vocal ||
        pools.daSpPool.length < spNeeds.dance ||
        pools.viSpPool.length < spNeeds.visual)
    )
      continue

    // 残り枠数・SP不足・タイプ上下限は固定カードから一度だけ導出する
    const enumeration: SpTypeEnumerateInput<CandidateCard> = {
      ...pools,
      totalSlots: constant.UNIT_SIZE - fixed.length,
      neededVo: spNeeds.vocal,
      neededDa: spNeeds.dance,
      neededVi: spNeeds.visual,
      typeVoMin: Math.max(0, settings.typeCountMin.vocal - typeCounts.vocal),
      typeDaMin: Math.max(0, settings.typeCountMin.dance - typeCounts.dance),
      typeViMin: Math.max(0, settings.typeCountMin.visual - typeCounts.visual),
      typeVoMax: Math.max(0, settings.typeCountMax.vocal - typeCounts.vocal),
      typeDaMax: Math.max(0, settings.typeCountMax.dance - typeCounts.dance),
      typeViMax: Math.max(0, settings.typeCountMax.visual - typeCounts.visual),
    }
    // 列挙条件から通数用の枚数だけを取り出し、条件の二重定義を避ける
    const totalCombos = countSpTypeConstrainedCombos({
      ...enumeration,
      genVoCount: pools.genVoPool.length,
      genDaCount: pools.genDaPool.length,
      genViCount: pools.genViPool.length,
      genAsCount: pools.genAsPool.length,
    })
    branches.push({ fixedCandidates: fixed, rentalName, enumeration, totalCombos })
  }
  return branches
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
  const { effectiveCounts, parameterBonusRows } = schedule
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

    // 通常枠もレンタル枠も同じ生成処理で、単体点・提供回数・受け手のアビリティを揃える
    candidates.push(
      createCandidateCard({
        card,
        uncap,
        scoreSettings,
        effectiveCounts,
        parameterBonusRows,
        customData: cardCountCustom?.[card.name],
      }),
    )
  }

  candidates.sort(compareCandidateBaseScores)
  return candidates
}

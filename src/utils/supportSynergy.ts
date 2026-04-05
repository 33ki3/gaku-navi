/**
 * サポート間相互作用（サポート間連携）の計算
 *
 * サポートAのイベント効果が、同じ編成内のサポートBのアビリティ発動回数に
 * +1 する効果を計算する。既存の getSelfAcquisitionBonus と同じルールを
 * 「他サポート → 自サポート」に拡張したもの。
 */
import type { SupportCard, SupportEvent } from '../types/card'
import type { ActionIdType } from '../types/enums'
import type { SynergyProviderDetail } from '../types/unit'
import type { CardCountCustom } from '../hooks/useCardCountCustom'
import * as enums from '../types/enums'
import { TriggerActionMap, LinkedActionGroups } from '../data/score'

/** getProvidedActions のオプション */
interface ProvidedActionsOptions {
  /** サポート自身のイベントによるアクション提供を含めるか（デフォルト: true） */
  includeSelfTrigger?: boolean
  /** P-itemによるアクション提供を含めるか（デフォルト: true） */
  includePItem?: boolean
}

/**
 * サポートAが編成内にいることで提供するアクション回数増加を返す
 *
 * サポートAのイベント・Pアイテムが何を提供/操作するかを判定し、
 * 対応するアクションIDごとの追加回数マップを返す。
 *
 * @param card - 提供元のサポート
 * @param options - 設定オプション（省略時はすべて含む）
 * @returns アクションID → 追加回数
 */
export function getProvidedActions(
  card: SupportCard,
  options?: ProvidedActionsOptions,
): Partial<Record<ActionIdType, number>> {
  const { includeSelfTrigger = true, includePItem = true } = options ?? {}
  const provided: Partial<Record<ActionIdType, number>> = {}

  // イベントのフラグを判定する
  const givesSkillCard =
    includeSelfTrigger && card.events.some((e: SupportEvent) => e.effect_type === enums.EventEffectType.SkillCard)
  const givesPItem =
    includeSelfTrigger && card.events.some((e: SupportEvent) => e.effect_type === enums.EventEffectType.PItem)
  const hasEventEffectType = (...types: enums.EventEffectType[]) =>
    includeSelfTrigger && card.events.some((e: SupportEvent) => types.includes(e.effect_type))

  const pActions = includePItem ? (card.p_item?.actions ?? []) : []
  // フォールバック0: 実データでは全サポートに定義済みだが、未定義時は回数0として扱う
  const pItemLimitCount = includePItem ? (card.p_item?.effect?.limit?.count ?? 0) : 0
  const pDrinkBodyCount =
    card.p_item?.effect?.body?.find((b) => b.key === enums.EffectTemplateKeyType.RandomPdrinkCount)?.count ?? 0
  const pDrinkTotalCount = pItemLimitCount * pDrinkBodyCount
  const pItemBodyCount = card.p_item?.effect?.body?.[0]?.count ?? 0
  const pItemTotalCount = pItemLimitCount * pItemBodyCount

  // タイプ別サブアクション: 対象がアクティブかメンタルかはランダム/選択のため
  // デフォルト 0 でエントリだけ追加し、ユーザーが手動で調整できるようにする
  const ZERO_DEFAULT_ACTIONS: ReadonlySet<ActionIdType> = new Set([
    enums.ActionIdType.MSkillEnhance,
    enums.ActionIdType.ASkillEnhance,
    enums.ActionIdType.MSkillDelete,
    enums.ActionIdType.ASkillDelete,
  ])

  // 単一ソースルール: [条件, アクションID, カウント]
  const rules: [boolean, ActionIdType, number][] = [
    [givesSkillCard, enums.ActionIdType.SkillAcquire, 1],
    [givesSkillCard && card.skill_card?.type === enums.SkillCardType.Mental, enums.ActionIdType.MSkillAcquire, 1],
    [givesSkillCard && card.skill_card?.type === enums.SkillCardType.Active, enums.ActionIdType.ASkillAcquire, 1],
    [givesSkillCard && card.rarity === enums.RarityType.SSR, enums.ActionIdType.SsrCardAcquire, 1],
    [givesPItem, enums.ActionIdType.PItemAcquire, 1],
    [pActions.includes(enums.PItemActionType.PDrinkAcquire), enums.ActionIdType.PDrinkAcquire, pDrinkTotalCount],
  ]
  for (const [condition, actionId, count] of rules) {
    if (condition) {
      if (ZERO_DEFAULT_ACTIONS.has(actionId)) {
        provided[actionId] = provided[actionId] ?? 0
      } else {
        provided[actionId] = (provided[actionId] ?? 0) + count
      }
    }
  }

  // デュアルソースルール: [イベント条件, Pアイテム条件, アクションID]
  const enhanceEvent = hasEventEffectType(enums.EventEffectType.CardEnhance, enums.EventEffectType.SelectEnhance)
  const enhancePItem = pActions.includes(enums.PItemActionType.Enhance)
  const deleteEvent = hasEventEffectType(enums.EventEffectType.CardDelete, enums.EventEffectType.SelectDelete)
  const deletePItem = pActions.includes(enums.PItemActionType.Delete)

  const dualRules: [boolean, boolean, ActionIdType][] = [
    [enhanceEvent, enhancePItem, enums.ActionIdType.SkillEnhance],
    [enhanceEvent, enhancePItem, enums.ActionIdType.MSkillEnhance],
    [enhanceEvent, enhancePItem, enums.ActionIdType.ASkillEnhance],
    [deleteEvent, deletePItem, enums.ActionIdType.Delete],
    [deleteEvent, deletePItem, enums.ActionIdType.MSkillDelete],
    [deleteEvent, deletePItem, enums.ActionIdType.ASkillDelete],
    [
      hasEventEffectType(enums.EventEffectType.TroubleDelete),
      pActions.includes(enums.PItemActionType.TroubleDelete),
      enums.ActionIdType.TroubleDelete,
    ],
    [
      hasEventEffectType(enums.EventEffectType.CardChange),
      pActions.includes(enums.PItemActionType.Change),
      enums.ActionIdType.Change,
    ],
  ]
  for (const [eventCond, pItemCond, actionId] of dualRules) {
    if (eventCond || pItemCond) {
      if (ZERO_DEFAULT_ACTIONS.has(actionId)) {
        // エントリは追加するがデフォルト 0 にする
        provided[actionId] = provided[actionId] ?? 0
      } else {
        const count = (eventCond ? 1 : 0) + (pItemCond ? pItemTotalCount : 0)
        provided[actionId] = (provided[actionId] ?? 0) + count
      }
    }
  }

  return provided
}

/**
 * サポートが必要とするアクションIDを返す
 *
 * サポートのアビリティが持つ trigger_key に対応するアクションIDのセット。
 * skip_calculation や is_percentage のアビリティは除外する。
 *
 * @param card - 対象のサポート
 * @returns 必要なアクションIDのセット
 */
function getRequiredActions(card: SupportCard): Set<ActionIdType> {
  const required = new Set<ActionIdType>()
  for (const ability of card.abilities) {
    if (ability.skip_calculation || ability.is_percentage) continue
    if (!ability.trigger_key) continue
    const actionId = TriggerActionMap[ability.trigger_key]
    if (actionId !== enums.ActionIdType.Nothing) {
      required.add(actionId)
    }
  }
  return required
}

/** サポート間連携計算結果 */
interface SynergyResult {
  /** サポート名 → アクションID → 追加回数 */
  bonusMap: Map<string, Partial<Record<ActionIdType, number>>>
  /** サポート名 → 提供元詳細リスト */
  providerMap: Map<string, SynergyProviderDetail[]>
}

/**
 * 編成全体のサポート間連携を合算する
 *
 * 全ペア (i≠j) について getSupportSynergy を計算し、
 * 各受取サポートに対する追加アクション回数マップと提供元詳細を返す。
 *
 * @param members - 編成メンバーのサポート配列
 * @param cardCountCustom - サポート別カウント調整（省略可）
 * @param options - 提供アクション算出オプション（省略可）
 * @returns サポート間連携マップと提供元詳細
 */
export function computeUnitSupportSynergy(
  members: SupportCard[],
  cardCountCustom?: CardCountCustom,
  options?: ProvidedActionsOptions,
): SynergyResult {
  // 提供アクションを事前計算する（カウント調整があれば差分を反映）
  const providerActionMap = members.map((card) => {
    const provided = getProvidedActions(card, options)
    if (cardCountCustom?.[card.name]?.selfTrigger) {
      const customs = cardCountCustom[card.name].selfTrigger!
      // カウント調整値は提供回数そのものを表す（ベースラインは getProvidedActions の値）
      for (const [actionId, customCount] of Object.entries(customs)) {
        const aid = actionId as ActionIdType
        const autoCount = provided[aid] ?? 0
        const diff = customCount - autoCount
        if (diff !== 0) {
          provided[aid] = Math.max(0, customCount)
          // 連動グループ内の他のアクションにも同じ差分を適用する
          const group = LinkedActionGroups.find((g) => g.includes(aid))
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
    return { card, provided }
  })

  // サポート間連携の集計: 各サポート（receiver）が他のサポート（provider）から受ける
  // アクション回数を合算する。receiverが必要とするアクションのみを
  // providerが提供できる分だけカウントし、bonusMapに格納する
  const bonusMap = new Map<string, Partial<Record<ActionIdType, number>>>()
  const providerDetailMap = new Map<string, SynergyProviderDetail[]>()

  for (const receiver of members) {
    const required = getRequiredActions(receiver)
    const combined: Partial<Record<ActionIdType, number>> = {}
    const providers: SynergyProviderDetail[] = []

    for (const { card: provider, provided } of providerActionMap) {
      if (provider.name === receiver.name) continue
      for (const [actionId, count] of Object.entries(provided)) {
        if (required.has(actionId as ActionIdType)) {
          combined[actionId as ActionIdType] = (combined[actionId as ActionIdType] ?? 0) + (count ?? 0)
          providers.push({ providerName: provider.name, actionId: actionId as ActionIdType, count: count ?? 0 })
        }
      }
    }

    bonusMap.set(receiver.name, combined)
    providerDetailMap.set(receiver.name, providers)
  }

  return { bonusMap, providerMap: providerDetailMap }
}

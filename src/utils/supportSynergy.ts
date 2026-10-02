/**
 * サポート間相互作用（サポート間連携）の計算
 *
 * 同じ編成に入れたサポートが、別のサポートのアビリティ発動回数を
 * どれだけ増やすかを計算する
 */
import * as scoreData from '../data/score'
import type { CardCountCustom, PItemEffect, SupportCard, SupportEvent } from '../types/card'
import type { ActionIdType } from '../types/enums'
import * as enums from '../types/enums'
import type { SynergyProviderDetail } from '../types/unit'
import { isActionId } from './domainValueValidation'

/** サポート間連携の計算条件 */
interface ProvidedActionsOptions {
  /** サポート自身のイベントによるアクション提供を含めるか（既定値: true） */
  includeSelfTrigger?: boolean
  /** Pアイテムによるアクション提供を含めるか（既定値: true） */
  includePItem?: boolean
  /** Pアイテムの発動回数を求めるために使うスケジュールのアクション回数 */
  actionCounts?: Partial<Record<ActionIdType, number>>
}

/**
 * Pアイテムのトリガーからスケジュール上のアクションIDを解決する
 *
 * @param effect - Pアイテムの効果データ
 * @returns 対応するアクションID（不明なトリガーの場合は null）
 */
function resolvePItemTriggerActionId(effect: PItemEffect): ActionIdType | null {
  const paramMap = scoreData.PItemTriggerActionMap[effect.trigger.key]
  if (!paramMap) return null
  if (typeof paramMap === 'string') return paramMap
  const triggerValue = effect.trigger.param ?? effect.trigger.keyword
  if (!triggerValue) return null
  return paramMap[triggerValue] ?? null
}

/**
 * スケジュール上のトリガー回数を解決する。未入力・未登録のトリガーは1回扱い
 *
 * @param triggerActionId - 回数を参照するアクションID
 * @param actionCounts - スケジュールから得たアクション回数
 * @returns Pアイテムの発動回数として使う値
 */
function resolvePItemTriggerCount(
  triggerActionId: ActionIdType | null,
  actionCounts?: Partial<Record<ActionIdType, number>>,
): number {
  if (!triggerActionId || !actionCounts || !(triggerActionId in actionCounts)) return 1
  return actionCounts[triggerActionId] ?? 0
}

/**
 * Pアイテム本体のプロデュース全体の発動回数を解決する
 *
 * - `per_lesson`: 1レッスンあたりの上限 × 対応するスケジュール回数
 * - `per_produce`: プロデュース全体の上限をそのまま使用
 * - 制限なし: 対応するスケジュール回数を使用
 * - 対応するスケジュール回数がない場合: 1回として扱う
 *
 * @param effect - Pアイテムの効果データ
 * @param actionCounts - スケジュールから得たアクション回数
 * @param fallbackTriggerKey - Pアイテム側に対応表がない場合の発動条件
 * @returns プロデュース全体での発動回数
 */
export function resolvePItemFireCount(
  effect: PItemEffect,
  actionCounts?: Partial<Record<ActionIdType, number>>,
  fallbackTriggerKey?: enums.TriggerKeyType,
): number {
  const triggerActionId =
    resolvePItemTriggerActionId(effect) ??
    (fallbackTriggerKey ? (scoreData.TriggerActionMap[fallbackTriggerKey] ?? null) : null)
  const triggerCount = resolvePItemTriggerCount(triggerActionId, actionCounts)

  if (effect.limit?.key === enums.EffectTemplateKeyType.PerLesson) {
    return triggerCount * (effect.limit.count ?? 1)
  }
  if (effect.limit?.count !== undefined) return effect.limit.count
  return triggerActionId ? triggerCount : 1
}

/**
 * Pアイテム本文から、1回の発動で提供するアクション数を抽出する
 *
 * @param effect - Pアイテムの効果データ
 * @returns アクションIDごとの1回あたりの提供回数
 */
export function getPItemBodyActionCounts(effect: PItemEffect): Partial<Record<ActionIdType, number>> {
  const counts: Partial<Record<ActionIdType, number>> = {}
  const add = (actionId: ActionIdType, count = 1) => {
    counts[actionId] = (counts[actionId] ?? 0) + count
  }

  for (const body of effect.body) {
    const bodyCount = body.count ?? 1
    for (const actionId of scoreData.PItemBodyActionMap[body.key] ?? []) add(actionId, bodyCount)
  }

  return counts
}

/**
 * サポートAが編成内にいることで提供するアクション回数増加を返す
 *
 * サポートAのイベント・Pアイテムが何を提供/操作するかを判定し、
 * 対応するアクションIDごとの追加回数の対応表を返す
 *
 * @param card - 提供元のサポート
 * @param options - 設定オプション（省略時はすべて含む）
 * @returns アクションID → 追加回数
 */
export function getProvidedActions(
  card: SupportCard,
  options?: ProvidedActionsOptions,
): Partial<Record<ActionIdType, number>> {
  const { includeSelfTrigger = true, includePItem = true, actionCounts } = options ?? {}
  const provided: Partial<Record<ActionIdType, number>> = {}

  // ユーザー定義サポートでは、入力された提供アクションの回数をそのまま使う
  if (card.p_item?.provided_action_ids && includePItem) {
    const fireCount = card.p_item.effect
      ? resolvePItemFireCount(card.p_item.effect, actionCounts, card.p_item.boost?.trigger_key)
      : 1
    for (const [actionId, count] of Object.entries(card.p_item.provided_action_ids)) {
      if (!isActionId(actionId)) continue
      provided[actionId] = (provided[actionId] ?? 0) + (count ?? 0) * fireCount
    }

    // 下位のアクションで増えた回数を、対応する上位のアクションにも合算する
    for (const [parentId, ...childIds] of scoreData.LinkedActionGroups) {
      let childSum = 0
      for (const childId of childIds) {
        childSum += provided[childId] ?? 0
      }
      if (childSum > 0 && parentId in provided) {
        provided[parentId] = (provided[parentId] ?? 0) + childSum
      }
    }

    // TroubleDelete は Delete も同時に提供する（トラブル削除＝スキルカード削除）
    const troubleCount = provided[enums.ActionIdType.TroubleDelete] ?? 0
    if (troubleCount > 0) {
      provided[enums.ActionIdType.Delete] = (provided[enums.ActionIdType.Delete] ?? 0) + troubleCount
    }

    // イベント由来のアクションも追加する
    const hasEventEffectType = (...types: enums.EventEffectType[]) =>
      includeSelfTrigger && card.events.some((e: SupportEvent) => types.includes(e.effect_type))
    const givesSkillCard = hasEventEffectType(enums.EventEffectType.SkillCard)
    const givesPItem = hasEventEffectType(enums.EventEffectType.PItem)
    if (givesSkillCard) {
      provided[enums.ActionIdType.SkillAcquire] = (provided[enums.ActionIdType.SkillAcquire] ?? 0) + 1
      if (card.skill_card?.type === enums.SkillCardType.Mental) {
        provided[enums.ActionIdType.MSkillAcquire] = (provided[enums.ActionIdType.MSkillAcquire] ?? 0) + 1
      }
      if (card.skill_card?.type === enums.SkillCardType.Active) {
        provided[enums.ActionIdType.ASkillAcquire] = (provided[enums.ActionIdType.ASkillAcquire] ?? 0) + 1
      }
      if (card.rarity === enums.RarityType.SSR) {
        provided[enums.ActionIdType.SsrCardAcquire] = (provided[enums.ActionIdType.SsrCardAcquire] ?? 0) + 1
      }
    }
    if (givesPItem) {
      provided[enums.ActionIdType.PItemAcquire] = (provided[enums.ActionIdType.PItemAcquire] ?? 0) + 1
    }
    // イベント由来の強化・削除・チェンジ・トラブル削除
    const enhanceEvent = hasEventEffectType(enums.EventEffectType.CardEnhance, enums.EventEffectType.SelectEnhance)
    if (enhanceEvent) {
      provided[enums.ActionIdType.SkillEnhance] = (provided[enums.ActionIdType.SkillEnhance] ?? 0) + 1
      provided[enums.ActionIdType.MSkillEnhance] = provided[enums.ActionIdType.MSkillEnhance] ?? 0
      provided[enums.ActionIdType.ASkillEnhance] = provided[enums.ActionIdType.ASkillEnhance] ?? 0
    }
    const deleteEvent = hasEventEffectType(enums.EventEffectType.CardDelete, enums.EventEffectType.SelectDelete)
    if (deleteEvent) {
      provided[enums.ActionIdType.Delete] = (provided[enums.ActionIdType.Delete] ?? 0) + 1
      provided[enums.ActionIdType.MSkillDelete] = provided[enums.ActionIdType.MSkillDelete] ?? 0
      provided[enums.ActionIdType.ASkillDelete] = provided[enums.ActionIdType.ASkillDelete] ?? 0
    }
    if (hasEventEffectType(enums.EventEffectType.TroubleDelete)) {
      provided[enums.ActionIdType.TroubleDelete] = (provided[enums.ActionIdType.TroubleDelete] ?? 0) + 1
      provided[enums.ActionIdType.Delete] = (provided[enums.ActionIdType.Delete] ?? 0) + 1
    }
    const cardChangeEvent = hasEventEffectType(enums.EventEffectType.CardChange)
    if (cardChangeEvent) {
      // イベントのカードチェンジは基本カードを対象にするため、汎用と基本の両方へ1回ずつ加える
      provided[enums.ActionIdType.Change] = (provided[enums.ActionIdType.Change] ?? 0) + 1
      provided[enums.ActionIdType.BasicCardChange] = (provided[enums.ActionIdType.BasicCardChange] ?? 0) + 1
    }
    // Pアイテムのチェンジ先は基本カードとは限らないため、基本チェンジ欄だけ0で追加する
    if (!cardChangeEvent && provided[enums.ActionIdType.Change] !== undefined) {
      provided[enums.ActionIdType.BasicCardChange] = provided[enums.ActionIdType.BasicCardChange] ?? 0
    }
    return provided
  }

  // イベントのフラグを判定する
  const givesSkillCard =
    includeSelfTrigger && card.events.some((e: SupportEvent) => e.effect_type === enums.EventEffectType.SkillCard)
  const givesPItem =
    includeSelfTrigger && card.events.some((e: SupportEvent) => e.effect_type === enums.EventEffectType.PItem)
  const hasEventEffectType = (...types: enums.EventEffectType[]) =>
    includeSelfTrigger && card.events.some((e: SupportEvent) => types.includes(e.effect_type))

  const pActions = includePItem ? (card.p_item?.actions ?? []) : []
  // Pアイテム全体の発動回数を算出する。bodyのcount（1回の発動内の個数）とは別の値
  const pItemFireCount = !includePItem
    ? 0
    : card.p_item?.effect
      ? resolvePItemFireCount(card.p_item.effect, actionCounts)
      : 1
  // Pドリンク獲得個数（body内のrandom_pdrink_countのcountフィールド、なければ1）
  const pDrinkBodyCount =
    card.p_item?.effect?.body?.find((b) => b.key === enums.EffectTemplateKeyType.RandomPdrinkCount)?.count ?? 1
  const pDrinkTotalCount = pItemFireCount * pDrinkBodyCount
  // Pアイテムの1回あたり操作枚数（body内のSelectCardsEnhanceのcount、なければ1）
  const pItemBodyCount =
    card.p_item?.effect?.body?.find((b) => b.key === enums.EffectTemplateKeyType.SelectCardsEnhance)?.count ?? 1
  const pItemTotalCount = pItemFireCount * pItemBodyCount
  const bodyActionCounts =
    card.p_item?.effect && !card.p_item.provided_action_ids ? getPItemBodyActionCounts(card.p_item.effect) : {}

  // タイプ別サブアクション: 対象がアクティブかメンタルかはランダム/選択のため
  // 既定値0でエントリだけ追加し、ユーザーが手動で調整できるようにする
  const ZERO_DEFAULT_ACTIONS: ReadonlySet<ActionIdType> = new Set([
    enums.ActionIdType.MSkillEnhance,
    enums.ActionIdType.ASkillEnhance,
    enums.ActionIdType.MSkillDelete,
    enums.ActionIdType.ASkillDelete,
  ])

  // 1つの提供元だけで回数が決まる効果をまとめる
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

  // イベントとPアイテムのどちらからでも発生する効果をまとめる
  const enhanceEvent = hasEventEffectType(enums.EventEffectType.CardEnhance, enums.EventEffectType.SelectEnhance)
  const enhancePItem = pActions.includes(enums.PItemActionType.Enhance)
  const deleteEvent = hasEventEffectType(enums.EventEffectType.CardDelete, enums.EventEffectType.SelectDelete)
  const troubleDeletePItem = pActions.includes(enums.PItemActionType.TroubleDelete)
  const deletePItem = pActions.includes(enums.PItemActionType.Delete)
  const cardChangeEvent = hasEventEffectType(enums.EventEffectType.CardChange)
  const changePItem = pActions.includes(enums.PItemActionType.Change)

  const dualRules: [boolean, boolean, ActionIdType][] = [
    [enhanceEvent, enhancePItem, enums.ActionIdType.SkillEnhance],
    [enhanceEvent, enhancePItem, enums.ActionIdType.MSkillEnhance],
    [enhanceEvent, enhancePItem, enums.ActionIdType.ASkillEnhance],
    // トラブル削除はスキルカード削除に含めるが、メンタル・アクティブ個別削除には含めない
    [deleteEvent, deletePItem || troubleDeletePItem, enums.ActionIdType.Delete],
    [deleteEvent, deletePItem, enums.ActionIdType.MSkillDelete],
    [deleteEvent, deletePItem, enums.ActionIdType.ASkillDelete],
    [hasEventEffectType(enums.EventEffectType.TroubleDelete), troubleDeletePItem, enums.ActionIdType.TroubleDelete],
    // イベントのカードチェンジは基本カード対象なので、汎用と基本へ同じ1回分を提供する
    [cardChangeEvent, changePItem, enums.ActionIdType.Change],
    [cardChangeEvent, false, enums.ActionIdType.BasicCardChange],
  ]
  for (const [eventCond, pItemCond, actionId] of dualRules) {
    if (eventCond || pItemCond) {
      if (ZERO_DEFAULT_ACTIONS.has(actionId)) {
        // エントリは追加するが既定値0にする
        provided[actionId] = provided[actionId] ?? 0
      } else {
        const count = (eventCond ? 1 : 0) + (pItemCond ? pItemTotalCount : 0)
        provided[actionId] = (provided[actionId] ?? 0) + count
      }
    }
  }

  // 本文から判定できるカード・Pドリンクの獲得と削除も連携対象に含める
  // bodyActionCounts は1回分なので、ここでPアイテム全体の発動回数を掛ける
  for (const [actionId, count] of Object.entries(bodyActionCounts)) {
    if (!isActionId(actionId)) continue
    if (actionId === enums.ActionIdType.Delete && deletePItem) continue
    provided[actionId] = (provided[actionId] ?? 0) + count * pItemFireCount
  }

  // Pアイテムのチェンジ先は基本カードとは限らないため、基本チェンジは0回として扱う
  // イベントのカードチェンジがある場合は、上のルールで1回分が既に入っている
  if (changePItem) {
    provided[enums.ActionIdType.BasicCardChange] = provided[enums.ActionIdType.BasicCardChange] ?? 0
  }

  return provided
}

/**
 * サポートが必要とするアクションIDを返す
 *
 * サポートのアビリティが持つtrigger_keyに対応するアクションIDの一覧
 * skip_calculation や is_percentage のアビリティは除外する
 *
 * @param card - 対象のサポート
 * @returns 必要なアクションIDの一覧
 */
function getRequiredActions(card: SupportCard): Set<ActionIdType> {
  const required = new Set<ActionIdType>()
  for (const ability of card.abilities) {
    if (ability.skip_calculation || ability.is_percentage) continue
    if (!ability.trigger_key) continue
    const actionId = scoreData.TriggerActionMap[ability.trigger_key]
    if (actionId !== enums.ActionIdType.Nothing) {
      required.add(actionId)
    }
  }
  return required
}

/** サポート間連携計算結果 */
interface SynergyResult {
  /** サポート名から、追加されるアクション回数を探す表 */
  bonusMap: Map<string, Partial<Record<ActionIdType, number>>>
  /** サポート名から、回数を提供したサポートの詳細を探す表 */
  providerMap: Map<string, SynergyProviderDetail[]>
}

/**
 * 編成全体のサポート間連携を合算する
 *
 * 編成内の各提供元と受け手の組み合わせを確認し、
 * 受け手ごとの追加アクション回数と提供元の詳細を返す
 *
 * @param members - 編成メンバーのサポート配列
 * @param cardCountCustom - サポート別回数調整（省略可）
 * @param options - 提供アクション算出オプション（省略可）
 * @returns サポート間で追加された回数の対応表と提供元の詳細
 */
export function computeUnitSupportSynergy(
  members: SupportCard[],
  cardCountCustom?: CardCountCustom,
  options?: ProvidedActionsOptions,
): SynergyResult {
  // 各サポートが提供する回数を先に計算し、手動調整があれば反映する
  const providerActionMap = members.map((card) => {
    const provided = getProvidedActions(card, options)
    if (cardCountCustom?.[card.name]?.selfTrigger) {
      const customs = cardCountCustom[card.name].selfTrigger!
      // 手動調整は自動計算結果との差し替え値として扱う
      for (const [actionId, customCount] of Object.entries(customs)) {
        if (!isActionId(actionId)) continue
        const aid = actionId
        const autoCount = provided[aid] ?? 0
        const diff = customCount - autoCount
        if (diff !== 0) {
          provided[aid] = Math.max(0, customCount)
          // 関連するアクションにも同じ増減を反映する
          const group = scoreData.LinkedActionGroups.find((g) => g.includes(aid))
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

  // 受け手が必要とするアクションだけを、他のサポートが提供する回数として合算する
  const bonusMap = new Map<string, Partial<Record<ActionIdType, number>>>()
  const providerDetailMap = new Map<string, SynergyProviderDetail[]>()

  for (const receiver of members) {
    const required = getRequiredActions(receiver)
    const combined: Partial<Record<ActionIdType, number>> = {}
    const providers: SynergyProviderDetail[] = []

    for (const { card: provider, provided } of providerActionMap) {
      if (provider.name === receiver.name) continue
      for (const [actionId, count] of Object.entries(provided)) {
        if (isActionId(actionId) && required.has(actionId)) {
          combined[actionId] = (combined[actionId] ?? 0) + (count ?? 0)
          providers.push({ providerName: provider.name, actionId, count: count ?? 0 })
        }
      }
    }

    bonusMap.set(receiver.name, combined)
    providerDetailMap.set(receiver.name, providers)
  }

  return { bonusMap, providerMap: providerDetailMap }
}

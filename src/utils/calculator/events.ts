/**
 * イベント解析ユーティリティ
 *
 * サポートカードのイベント・Pアイテムから「パラメータ上昇量」や
 * 「自己保有ボーナス」（カード自身が提供するスキルカード/Pアイテム等による追加回数）
 * を読み取る。
 */
import type { SupportCard, SupportEvent, PItemEffect } from '../../types/card'
import type { ActionIdType } from '../../types/enums'
import * as enums from '../../types/enums'

/**
 * カードのイベントからパラメータ上昇量を読み取る
 *
 * イベントの中に effect_type が「param_boost」のものがあれば、
 * その param_value を返す。なければ 0。
 *
 * @param card - 対象のサポートカード
 * @returns パラメータ上昇量（なければ 0）
 */
export function parseEventParameterBoost(card: SupportCard): number {
  for (const event of card.events) {
    if (event.effect_type === enums.EventEffectType.ParamBoost && event.param_value) {
      return event.param_value
    }
  }
  return 0
}

/**
 * Pアイテム効果から解析されたパラメータ上昇の情報
 *
 * Pアイテムが「特定のトリガー時にパラメータ上昇」する効果を持つ場合に使う。
 */
interface PItemBoostEffect {
  /** どのアクションがトリガーか（例: レッスン、おでかけ等） */
  triggerKey: enums.TriggerKeyType
  /** パラメータタイプ（vocal / dance / visual） */
  parameterType: enums.ParameterType
  /** 1回あたりのパラメータ上昇値 */
  value: number
  /** プロデュース中の発動回数上限（なければ null） */
  maxCount: number | null
  /** Pアイテムの名前（内訳画面で表示する用） */
  description: string
  /** Pアイテム効果の構造化データ（UIで全文テキスト生成に使用） */
  effectData?: PItemEffect
}

/**
 * Pアイテムの構造化データからパラメータ上昇効果を読み取る
 *
 * @param card - 対象のサポートカード
 * @returns パラメータ上昇効果の配列（なければ空配列）
 */
export function parsePItemParameterBoost(card: SupportCard): PItemBoostEffect[] {
  // Pアイテムにブースト効果がなければ空配列を返す
  if (!card.p_item?.boost) return []

  // ブースト効果の値が0以下なら空配列を返す
  const boost = card.p_item.boost
  if (boost.value <= 0) return []

  return [
    {
      triggerKey: boost.trigger_key,
      parameterType: boost.parameter_type,
      value: boost.value,
      maxCount: boost.max_count ?? null,
      description: card.p_item.name,
      effectData: card.p_item.effect,
    },
  ]
}

/**
 * カード自身がイベントで提供するアイテムに基づく追加獲得回数を返す
 *
 * 例: カードのイベントがスキルカードを提供する場合、
 * そのカードの「スキルカード獲得時」トリガーのアビリティに +1 される。
 * これにより「自分のイベントで手に入るスキルカードも回数に含む」計算ができる。
 *
 * 判定の仕組み:
 * 1. カードのイベント・Pアイテムが何を提供/操作するかフラグを立てる
 * 2. カードのアビリティが持つトリガーキーを確認する
 * 3. 提供フラグとトリガーキーが一致する場合、追加回数 +1 する
 *
 * @param card - 対象のサポートカード
 * @returns アクションID → 追加回数のマッピング
 */
export function getSelfAcquisitionBonus(card: SupportCard): Partial<Record<ActionIdType, number>> {
  const bonus: Partial<Record<ActionIdType, number>> = {}

  // イベントが提供/操作するものを判定する
  const givesSkillCard = card.events.some((e: SupportEvent) => e.effect_type === enums.EventEffectType.SkillCard)
  const givesPItem = card.events.some((e: SupportEvent) => e.effect_type === enums.EventEffectType.PItem)
  const hasEventEffectType = (...types: enums.EventEffectType[]) =>
    card.events.some((e: SupportEvent) => types.includes(e.effect_type))

  const pActions = card.p_item?.actions ?? []
  // Pアイテムの効果回数（limit.count がある場合はその回数分、なければ1回）
  const pItemLimitCount = card.p_item?.effect?.limit?.count ?? 1
  // Pドリンク獲得個数（body内のrandom_pdrink_countのcountフィールド、なければ1）
  const pDrinkBodyCount = card.p_item?.effect?.body?.find(
    (b) => b.key === enums.EffectTemplateKeyType.RandomPdrinkCount
  )?.count ?? 1
  // Pドリンク獲得の総カウント = 発動回数 × 1回あたりの獲得個数
  const pDrinkTotalCount = pItemLimitCount * pDrinkBodyCount
  // Pアイテムの1回あたり操作枚数（body内の最初のエントリのcount、なければ1）
  const pItemBodyCount = card.p_item?.effect?.body?.[0]?.count ?? 1
  // Pアイテム効果の総カウント = 発動回数 × 1回あたりの操作枚数
  const pItemTotalCount = pItemLimitCount * pItemBodyCount

  // トリガーキー → アクションID の対応テーブル
  // each entry: [条件フラグ, トリガーキー, アクションID, カウント数]
  const bonusRules: [boolean, enums.TriggerKeyType, enums.ActionIdType, number][] = [
    // スキルカード獲得系
    [givesSkillCard, enums.TriggerKeyType.SkillAcquire, enums.ActionIdType.SkillAcquire, 1],
    [givesSkillCard && card.skill_card?.type === enums.SkillCardType.Mental, enums.TriggerKeyType.MSkillAcquire, enums.ActionIdType.MSkillAcquire, 1],
    [givesSkillCard && card.skill_card?.type === enums.SkillCardType.Active, enums.TriggerKeyType.ASkillAcquire, enums.ActionIdType.ASkillAcquire, 1],
    [givesSkillCard && card.rarity === enums.RarityType.SSR, enums.TriggerKeyType.SsrCardAcquire, enums.ActionIdType.SsrCardAcquire, 1],
    [givesPItem, enums.TriggerKeyType.PItemAcquire, enums.ActionIdType.PItemAcquire, 1],
    [pActions.includes(enums.PItemActionType.PDrinkAcquire), enums.TriggerKeyType.PDrinkAcquire, enums.ActionIdType.PDrinkAcquire, pDrinkTotalCount],
  ]

  // イベント・Pアイテム両方がソースになりうるルール
  // [イベント条件, Pアイテム条件, トリガーキー, アクションID]
  const enhanceEvent = hasEventEffectType(enums.EventEffectType.CardEnhance, enums.EventEffectType.SelectEnhance)
  const enhancePItem = pActions.includes(enums.PItemActionType.Enhance)
  const deleteEvent = hasEventEffectType(enums.EventEffectType.CardDelete, enums.EventEffectType.SelectDelete)
  const deletePItem = pActions.includes(enums.PItemActionType.Delete)
  const dualSourceRules: [boolean, boolean, enums.TriggerKeyType, enums.ActionIdType][] = [
    // 汎用 + タイプ固有の強化ルール（Pアイテムの select_enhance はM/Aどちらも対象になりうる）
    [enhanceEvent, enhancePItem, enums.TriggerKeyType.SkillEnhance, enums.ActionIdType.SkillEnhance],
    [enhanceEvent, enhancePItem, enums.TriggerKeyType.MSkillEnhance, enums.ActionIdType.MSkillEnhance],
    [enhanceEvent, enhancePItem, enums.TriggerKeyType.ASkillEnhance, enums.ActionIdType.ASkillEnhance],
    // 汎用 + タイプ固有の削除ルール（Pアイテムの select_delete はM/Aどちらも対象になりうる）
    [deleteEvent, deletePItem, enums.TriggerKeyType.Delete, enums.ActionIdType.Delete],
    [deleteEvent, deletePItem, enums.TriggerKeyType.MSkillDelete, enums.ActionIdType.MSkillDelete],
    [deleteEvent, deletePItem, enums.TriggerKeyType.ASkillDelete, enums.ActionIdType.ASkillDelete],
    [hasEventEffectType(enums.EventEffectType.TroubleDelete), pActions.includes(enums.PItemActionType.TroubleDelete), enums.TriggerKeyType.TroubleDelete, enums.ActionIdType.TroubleDelete],
    [hasEventEffectType(enums.EventEffectType.CardChange), pActions.includes(enums.PItemActionType.Change), enums.TriggerKeyType.Change, enums.ActionIdType.Change],
  ]

  for (const ability of card.abilities) {
    if (!ability.trigger_key || ability.skip_calculation) continue
    const tk = ability.trigger_key

    // 条件がtrueかつトリガーキーが一致すればカウント分加算
    for (const [condition, triggerKey, actionId, count] of bonusRules) {
      if (condition && tk === triggerKey) {
        bonus[actionId] = (bonus[actionId] ?? 0) + count
      }
    }

    // イベント分(1回) + Pアイテム分(limit.count × body.count回)を加算
    for (const [eventCondition, pItemCondition, triggerKey, actionId] of dualSourceRules) {
      if ((eventCondition || pItemCondition) && tk === triggerKey) {
        const count = (eventCondition ? 1 : 0) + (pItemCondition ? pItemTotalCount : 0)
        bonus[actionId] = (bonus[actionId] ?? 0) + count
      }
    }
  }

  return bonus
}
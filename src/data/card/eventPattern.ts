/**
 * イベントパターン定義マスタ
 *
 * サポートイベントは3段階構造:
 *   1. 初回イベント（Pアイテム or スキルカード）
 *   2. パラメータ上昇（レアリティで値固定）
 *   3. 追加イベント（なし / カード強化 / カードチェンジ / トラブル削除）
 */
import type { TranslationKey } from '../../i18n'
import type { RarityType } from '../../types/enums'
import { EventEffectType, RarityType as RarityEnum } from '../../types/enums'

/** 初回イベントの選択肢 */
export const FIRST_EVENT_OPTIONS: { value: EventEffectType; labelKey: TranslationKey }[] = [
  { value: EventEffectType.PItem, labelKey: 'user_support.event_option.p_item' },
  { value: EventEffectType.SkillCard, labelKey: 'user_support.event_option.skill_card' },
]

/** 追加イベント（3番目）の選択肢 */
export const THIRD_EVENT_OPTIONS: { value: EventEffectType | ''; labelKey: TranslationKey }[] = [
  { value: '', labelKey: 'user_support.event_option.none' },
  { value: EventEffectType.CardEnhance, labelKey: 'user_support.event_option.card_enhance' },
  { value: EventEffectType.CardChange, labelKey: 'user_support.event_option.card_change' },
  { value: EventEffectType.TroubleDelete, labelKey: 'user_support.event_option.trouble_delete' },
]

/** レアリティ別パラメータ上昇値 */
export const EVENT_PARAM_VALUE: Record<RarityType, number> = {
  [RarityEnum.SSR]: 20,
  [RarityEnum.SR]: 15,
  [RarityEnum.R]: 10,
}

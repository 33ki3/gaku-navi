/**
 * イベントの絞り込みと表示に使うデータ
 *
 * サポートイベントの絞り込み条件と一覧表示用ラベルを管理する
 * 絞り込み条件は、サポート一覧でイベントの種類を選ぶボタンに使う
 * 表示用ラベルは、イベント効果の種類から一覧に表示する文字を選ぶために使う
 */

import type { TranslationKey } from '../../i18n'
import { EventEffectType, EventFilterCategoryType, EventFilterType } from '../../types/enums'

const filterEntries: {
  value: EventFilterType
  label: TranslationKey
  order: number
  effects: EventEffectType[]
  category: EventFilterCategoryType
}[] = [
  {
    value: EventFilterType.SkillCard,
    label: 'card.event_filter.skill_card',
    order: 1,
    effects: [EventEffectType.SkillCard],
    category: EventFilterCategoryType.Acquire,
  },
  {
    value: EventFilterType.PItem,
    label: 'card.event_filter.p_item',
    order: 2,
    effects: [EventEffectType.PItem],
    category: EventFilterCategoryType.Acquire,
  },
  {
    value: EventFilterType.Enhance,
    label: 'card.event_filter.enhance',
    order: 3,
    effects: [EventEffectType.CardEnhance, EventEffectType.SelectEnhance],
    category: EventFilterCategoryType.Modify,
  },
  {
    value: EventFilterType.Delete,
    label: 'card.event_filter.delete',
    order: 4,
    effects: [EventEffectType.CardDelete, EventEffectType.SelectDelete],
    category: EventFilterCategoryType.Modify,
  },
  {
    value: EventFilterType.Change,
    label: 'card.event_filter.change',
    order: 5,
    effects: [EventEffectType.CardChange],
    category: EventFilterCategoryType.Modify,
  },
  {
    value: EventFilterType.TroubleDelete,
    label: 'card.event_filter.trouble_delete',
    order: 6,
    effects: [EventEffectType.TroubleDelete],
    category: EventFilterCategoryType.Modify,
  },
]

/** イベントフィルターから対応する効果タイプを探す表 */
const EVENT_FILTER_EFFECT_MAP = new Map(filterEntries.map((e) => [e.value, e.effects as readonly EventEffectType[]]))

/**
 * イベントフィルター種別に対応するイベント効果タイプ配列を返す
 *
 * @param filter - イベントフィルター種別
 * @returns マッチするイベント効果タイプの配列
 */
export function getEventFilterEffects(filter: EventFilterType): readonly EventEffectType[] {
  return EVENT_FILTER_EFFECT_MAP.get(filter)!
}

/** 獲得系フィルター一覧 */
export const EventFilterAcquireList = filterEntries.filter((e) => e.category === EventFilterCategoryType.Acquire)
/** 操作系フィルター一覧 */
export const EventFilterModifyList = filterEntries.filter((e) => e.category === EventFilterCategoryType.Modify)
/** 獲得系イベントかを判定するための一覧 */
export const EventCategoryAcquire = new Set<string>(EventFilterAcquireList.map((e) => e.value))

const summaryEntries: { id: EventEffectType; label: TranslationKey }[] = [
  { id: EventEffectType.SkillCard, label: 'card.summary.skill_card' },
  { id: EventEffectType.PItem, label: 'card.summary.p_item' },
  { id: EventEffectType.CardEnhance, label: 'card.summary.card_enhance' },
  { id: EventEffectType.CardChange, label: 'card.summary.card_change' },
  { id: EventEffectType.PpGain, label: 'card.summary.pp_gain' },
  { id: EventEffectType.SelectEnhance, label: 'card.summary.select_enhance' },
  { id: EventEffectType.SelectDelete, label: 'card.summary.select_delete' },
  { id: EventEffectType.TroubleDelete, label: 'card.summary.trouble_delete' },
]

const summaryMap = new Map(summaryEntries.map((e) => [e.id, e.label]))

/**
 * イベント効果タイプから一覧表示ラベルを取得する
 *
 * @param effectType - イベント効果タイプ
 * @returns 翻訳キー。対応するラベルがなければ undefined
 */
export function getEventSummaryLabel(effectType: EventEffectType): TranslationKey | undefined {
  return summaryMap.get(effectType)
}

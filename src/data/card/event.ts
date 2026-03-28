/**
 * イベントマスタ。
 *
 * サポートイベントのフィルター定義とサマリ表示ラベルを管理する。
 * フィルター: カード一覧のフィルターエリアで、イベント種類で絞り込むボタンの一覧。
 * サマリ: イベント効果タイプからカード一覧に表示するラベルを取得する。
 */

import { type EventFilterType, EventFilterCategoryType, type EventEffectType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

const filterEntries: {
  value: EventFilterType
  label: TranslationKey
  order: number
  effects: EventEffectType[]
  category: EventFilterCategoryType
}[] = [
  { value: 'skill_card', label: 'card.event_filter.skill_card', order: 1, effects: ['skill_card'], category: 'acquire' },
  { value: 'p_item', label: 'card.event_filter.p_item', order: 2, effects: ['p_item'], category: 'acquire' },
  { value: 'enhance', label: 'card.event_filter.enhance', order: 3, effects: ['card_enhance', 'select_enhance'], category: 'modify' },
  { value: 'delete', label: 'card.event_filter.delete', order: 4, effects: ['card_delete', 'select_delete'], category: 'modify' },
  { value: 'change', label: 'card.event_filter.change', order: 5, effects: ['card_change'], category: 'modify' },
  { value: 'trouble_delete', label: 'card.event_filter.trouble_delete', order: 6, effects: ['trouble_delete'], category: 'modify' },
]

/** イベントフィルター → 効果タイプのルックアップマップ */
const EVENT_FILTER_EFFECT_MAP = new Map(filterEntries.map((e) => [e.value, e.effects as readonly EventEffectType[]]))

/**
 * イベントフィルター種別に対応するイベント効果タイプ配列を返す。
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
/** 獲得系カテゴリの値 Set（フィルタリング判定用） */
export const EventCategoryAcquire = new Set<string>(EventFilterAcquireList.map((e) => e.value))

const summaryData: Partial<Record<EventEffectType, TranslationKey>> = {
  skill_card: 'card.summary.skill_card',
  p_item: 'card.summary.p_item',
  card_enhance: 'card.summary.card_enhance',
  card_change: 'card.summary.card_change',
  pp_gain: 'card.summary.pp_gain',
  select_enhance: 'card.summary.select_enhance',
  select_delete: 'card.summary.select_delete',
  trouble_delete: 'card.summary.trouble_delete',
}

/**
 * イベント効果タイプからサマリ表示ラベルを取得する。
 *
 * @param effectType - イベント効果タイプ
 * @returns i18n キー。マップに含まれない効果タイプは undefined
 */
export function getEventSummaryLabel(effectType: EventEffectType): TranslationKey | undefined {
  return summaryData[effectType]
}

/**
 * イベントマスタ。
 *
 * サポートイベントのフィルター定義とサマリ表示ラベルを管理する。
 * フィルター: サポート一覧のフィルターエリアで、イベント種類で絞り込むボタンの一覧。
 * サマリ: イベント効果タイプからサポート一覧に表示するラベルを取得する。
 */

import { EventFilterType, EventFilterCategoryType, EventEffectType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

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
 * イベント効果タイプからサマリ表示ラベルを取得する。
 *
 * @param effectType - イベント効果タイプ
 * @returns i18n キー。マップに含まれない効果タイプは undefined
 */
export function getEventSummaryLabel(effectType: EventEffectType): TranslationKey | undefined {
  return summaryMap.get(effectType)
}

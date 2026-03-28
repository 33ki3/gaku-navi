/**
 * イベントマスタ。
 *
 * サポートイベントのフィルター定義とサマリ表示ラベルを管理する。
 * フィルター: カード一覧のフィルターエリアで、イベント種類で絞り込むボタンの一覧。
 * サマリ: イベント効果タイプからカード一覧に表示するラベルを取得する。
 */

import rawData from './event.json'
import { type EventFilterType, EventFilterCategoryType, type EventEffectType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

const filterEntries = rawData.filters as {
  value: EventFilterType
  label: TranslationKey
  order: number
  effects: EventEffectType[]
  category: EventFilterCategoryType
}[]

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

const summaryData = rawData.summary_labels as Partial<Record<EventEffectType, TranslationKey>>

/**
 * イベント効果タイプからサマリ表示ラベルを取得する。
 *
 * @param effectType - イベント効果タイプ
 * @returns i18n キー。マップに含まれない効果タイプは undefined
 */
export function getEventSummaryLabel(effectType: EventEffectType): TranslationKey | undefined {
  return summaryData[effectType]
}

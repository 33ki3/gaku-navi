/**
 * localStorage に保存されるマップ・一覧形式の型ガード。
 *
 * 単純なオブジェクト判定ではなく、キーと値の組み合わせまで確認する
 */
import * as enums from '../types/enums'
import { isActionCountRecord, isEnumArray, isScheduleSelectionRecord } from './domainValueValidation'
import { isEnumValue, isOptional, isRecord } from './valueValidation'

/**
 * サポート名から凸数へのマップか判定する
 *
 * @param value - 判定する値
 * @returns 全値が有効な凸数なら true
 */
export function isUncapRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every((uncap) => isEnumValue(uncap, enums.UncapType))
}

/**
 * シナリオ別のスケジュール選択か判定する
 *
 * @param value - 判定する値
 * @returns シナリオ、週番号、活動IDがすべて有効なら true
 */
export function isScenarioScheduleSelections(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([scenario, selections]) => isEnumValue(scenario, enums.ScenarioType) && isScheduleSelectionRecord(selections),
    )
  )
}

/**
 * 一覧の検索・絞り込み・並び順設定か判定する
 *
 * @param value - 判定する値
 * @returns フィルター状態の全項目が正しい場合に true
 */
export function isPersistedFilterState(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.searchTerm === 'string' &&
    isEnumArray(value.rarities, enums.RarityType) &&
    isEnumArray(value.types, enums.CardType) &&
    isEnumArray(value.plans, enums.PlanType) &&
    typeof value.spOnly === 'boolean' &&
    isEnumArray(value.abilityKeywords, enums.AbilityKeywordType) &&
    isEnumArray(value.eventFilters, enums.EventFilterType) &&
    isEnumArray(value.sources, enums.SourceType) &&
    isEnumArray(value.uncaps, enums.UncapType) &&
    isEnumArray(value.countCustom, enums.CountCustomFilter) &&
    isEnumArray(value.cardExclusionFilters, enums.CardExclusionFilterType) &&
    isEnumValue(value.sortMode, enums.SortModeType) &&
    typeof value.sortReverse === 'boolean'
  )
}

/**
 * サポート1枚分の回数調整を検証する
 *
 * @param value - 判定する値
 * @returns 自動カウントとPアイテム回数が正しい場合に true
 */
function isCardCustomData(value: unknown): boolean {
  return (
    isRecord(value) &&
    isOptional(value.selfTrigger, isActionCountRecord) &&
    isOptional(value.pItemCount, isActionCountRecord)
  )
}

/**
 * サポート名別の回数調整設定か判定する
 *
 * @param value - 判定する値
 * @returns 各サポートのアクション回数が正しい場合に true
 */
export function isCardCountCustom(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(isCardCustomData)
}

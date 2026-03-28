/**
 * フィルタ・ソート用ラベルマスタ。
 *
 * JSON マスタからソートモード・タブのラベル情報を読み込み、
 * enum 値をキーにした i18n キーのルックアップと表示順配列を提供する。
 */
import rawData from './filterSortLabel.json'
import type { SortModeType, FilterSortTab } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** ラベルエントリ */
interface LabelEntry<T extends string = string> {
  value: T
  label: TranslationKey
}

/** ソートモード JSON エントリ配列 */
const sortModeEntries = rawData.sort_mode as LabelEntry<SortModeType>[]

/** ソートモードの value→label ルックアップマップ */
const sortModeMap = new Map<SortModeType, TranslationKey>(
  sortModeEntries.map((e) => [e.value, e.label]),
)

/** ソートモードの表示順 */
export const SortModeOrder: readonly SortModeType[] = sortModeEntries.map((e) => e.value)

/**
 * ソートモードの i18n キーを返す。
 *
 * @param mode - ソートモード
 * @returns i18n キー
 */
export function getSortModeLabel(mode: SortModeType): TranslationKey {
  return sortModeMap.get(mode)!
}

/** フィルタ・ソートタブ JSON エントリ配列 */
const filterSortTabEntries = rawData.filter_sort_tab as LabelEntry<FilterSortTab>[]

/** フィルタ・ソートタブの value→label ルックアップマップ */
const filterSortTabMap = new Map<FilterSortTab, TranslationKey>(
  filterSortTabEntries.map((e) => [e.value, e.label]),
)

/** フィルタ・ソートタブの表示順 */
export const FilterSortTabOrder: readonly FilterSortTab[] = filterSortTabEntries.map((e) => e.value)

/**
 * フィルタ・ソートタブの i18n キーを返す。
 *
 * @param tab - タブ種別
 * @returns i18n キー
 */
export function getFilterSortTabLabel(tab: FilterSortTab): TranslationKey {
  return filterSortTabMap.get(tab)!
}

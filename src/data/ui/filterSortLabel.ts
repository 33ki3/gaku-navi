/**
 * フィルタ・ソート用ラベルマスタ。
 *
 * ソートモード・タブのラベル情報を定義し、
 * enum 値をキーにした i18n キーのルックアップと表示順配列を提供する。
 */
import { SortModeType, FilterSortTab } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** ラベルエントリ */
interface LabelEntry<T extends string = string> {
  value: T
  label: TranslationKey
}

/** ソートモードエントリ配列 */
const sortModeEntries: LabelEntry<SortModeType>[] = [
  { value: SortModeType.Rarity, label: 'ui.sort.rarity' },
  { value: SortModeType.Date, label: 'ui.sort.date' },
  { value: SortModeType.Score, label: 'ui.sort.score' },
  { value: SortModeType.Uncap, label: 'ui.sort.uncap' },
]

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

/** フィルタ・ソートタブエントリ配列 */
const filterSortTabEntries: LabelEntry<FilterSortTab>[] = [
  { value: FilterSortTab.Sort, label: 'ui.filter_sort.tab_sort' },
  { value: FilterSortTab.Filter, label: 'ui.filter_sort.tab_filter' },
]

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

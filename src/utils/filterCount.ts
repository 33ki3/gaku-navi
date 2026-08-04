import type { FilterState } from '../hooks/useFilterState'

/**
 * 検索文字列を含む、現在適用中の絞り込み条件数を数える
 *
 * @param filters - 現在のフィルター状態
 * @returns 適用中の条件数
 */
export function getActiveFilterCount(filters: FilterState): number {
  return (
    filters.selectedRarities.size +
    filters.selectedTypes.size +
    filters.selectedPlans.size +
    (filters.spOnly ? 1 : 0) +
    filters.selectedAbilityKeywords.size +
    filters.selectedEventFilters.size +
    filters.selectedSources.size +
    filters.selectedUncaps.size +
    filters.selectedCountCustom.size +
    (filters.searchTerm.trim() ? 1 : 0)
  )
}

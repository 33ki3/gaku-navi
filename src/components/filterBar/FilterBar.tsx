/**
 * フィルターバーコンポーネント
 *
 * ヘッダー内に表示されるフィルター機能の親コンポーネント。
 * テキスト検索・レアリティ/タイプ/プラン・アビリティ・凸数・イベント種別
 * の各フィルターコンポーネントを縦に並べる。
 * フィルターが1つでも有効なら「フィルターをクリア」ボタンを表示する。
 * memoでラップして、フィルターが変わらない限り再描画しない。
 */
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { CardFiltersReturn } from '../../hooks'
import * as constant from '../../constant'
import { ButtonSizeType, CountCustomFilter } from '../../types/enums'
import { FilterSearchInput } from './FilterSearchInput'
import { RarityTypePlanFilter } from './RarityTypePlanFilter'
import { AbilityFilter } from './AbilityFilter'
import { UncapFilter } from './UncapFilter'
import { EventTypeFilter } from './EventTypeFilter'
import { SourceFilter } from './SourceFilter'
import { ToggleButton } from '../ui/ToggleButton'

/** FilterBar コンポーネントに渡すプロパティ */
interface FilterBarProps {
  /** フィルターの状態と操作関数群（useFilteredCards の戻り値） */
  filters: CardFiltersReturn
}

export default memo(function FilterBar({ filters }: FilterBarProps) {
  const { t } = useTranslation()

  // どれか1つでもフィルターがONなら「クリア」ボタンを出す
  const hasActiveFilter =
    filters.searchTerm.length > 0 ||
    filters.selectedRarities.size > 0 ||
    filters.selectedTypes.size > 0 ||
    filters.selectedPlans.size > 0 ||
    filters.spOnly ||
    filters.selectedAbilityKeywords.size > 0 ||
    filters.selectedEventFilters.size > 0 ||
    filters.selectedSources.size > 0 ||
    filters.selectedUncaps.size > 0 ||
    filters.selectedCountCustom.size > 0

  return (
    <div className="mt-3 flex flex-col gap-3">
      {/* テキスト検索 */}
      <FilterSearchInput value={filters.searchTerm} onChange={filters.setSearchTerm} />

      {/* レアリティ・タイプ・プランの切り替え */}
      <RarityTypePlanFilter
        selectedRarities={filters.selectedRarities}
        toggleRarity={filters.toggleRarity}
        selectedTypes={filters.selectedTypes}
        toggleType={filters.toggleType}
        selectedPlans={filters.selectedPlans}
        togglePlan={filters.togglePlan}
      />

      {/* アビリティキーワードとSPフィルター */}
      <AbilityFilter
        spOnly={filters.spOnly}
        toggleSP={filters.toggleSP}
        selectedAbilityKeywords={filters.selectedAbilityKeywords}
        toggleAbilityKeyword={filters.toggleAbilityKeyword}
      />

      {/* 凸数フィルター */}
      <UncapFilter selectedUncaps={filters.selectedUncaps} toggleUncap={filters.toggleUncap} />

      {/* イベント種別フィルター */}
      <EventTypeFilter
        selectedEventFilters={filters.selectedEventFilters}
        toggleEventFilter={filters.toggleEventFilter}
      />

      {/* 入手種別フィルター */}
      <SourceFilter
        selectedSources={filters.selectedSources}
        toggleSource={filters.toggleSource}
      />

      {/* 回数調整フィルター */}
      <div>
        <p className={constant.FILTER_SECTION_LABEL}>{t('ui.header.count_custom')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleButton
            isActive={filters.selectedCountCustom.has(CountCustomFilter.Unadjusted)}
            onClick={() => filters.toggleCountCustom(CountCustomFilter.Unadjusted)}
            activeClass="bg-violet-500 text-white shadow border border-transparent"
            size={ButtonSizeType.Sm}
          >
            {t('ui.filter.count_unadjusted')}
          </ToggleButton>
          <ToggleButton
            isActive={filters.selectedCountCustom.has(CountCustomFilter.Adjusted)}
            onClick={() => filters.toggleCountCustom(CountCustomFilter.Adjusted)}
            activeClass="bg-violet-500 text-white shadow border border-transparent"
            size={ButtonSizeType.Sm}
          >
            {t('ui.filter.count_adjusted')}
          </ToggleButton>
        </div>
      </div>

      {/* フィルターが1つでもONなら「クリア」ボタンを表示 */}
      {hasActiveFilter && (
        <div className="flex justify-center">
          <button
            onClick={filters.clearFilters}
            className="text-xs font-bold text-blue-500 hover:text-blue-700 hover:underline transition-colors"
          >
            {t('ui.message.clear_filters')}
          </button>
        </div>
      )}
    </div>
  )
})

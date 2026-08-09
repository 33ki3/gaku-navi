/**
 * フィルター・ソート切り替えタブ。
 *
 * PCヘッダーとスマホ下部の同じ操作を共通表示する
 */
import { useTranslation } from 'react-i18next'
import * as uiData from '../../data/ui'
import type { CardFiltersReturn } from '../../hooks'
import * as enums from '../../types/enums'
import { FilterCountBadge } from '../ui/FilterCountBadge'
import { AdjustedIcon, SortIcon } from '../ui/icons'
/** フィルター・ソートタブへ渡す状態と操作 */
interface FilterSortTabsProps {
  /** 現在のフィルター・ソート状態 */
  filters: CardFiltersReturn
  /** 現在選択中のタブ */
  activeTab: enums.FilterSortTab
  /** 適用中のフィルター件数 */
  activeFilterCount: number
  /** タブ切り替え処理 */
  onTabChange: (tab: enums.FilterSortTab) => void
}

/** フィルター・ソートタブを表示する */
export function FilterSortTabs({ filters, activeTab, activeFilterCount, onTabChange }: FilterSortTabsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-w-0 flex-1 gap-1 rounded-2xl bg-slate-100 p-1">
      {/* フィルター・ソート切り替えタブ */}
      {uiData.FilterSortTabOrder.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
            activeTab === tab
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {tab === enums.FilterSortTab.Sort ? (
            <SortIcon className="h-4 w-4" ascending={filters.sortReverse} />
          ) : (
            <AdjustedIcon className="h-4 w-4" />
          )}
          {t(uiData.getFilterSortTabLabel(tab))}
          {tab === enums.FilterSortTab.Filter && activeFilterCount > 0 && (
            <FilterCountBadge count={activeFilterCount} />
          )}
        </button>
      ))}
    </div>
  )
}

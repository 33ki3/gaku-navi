/**
 * フィルタ・ソートモーダルコンポーネント
 *
 * ソートとフィルタの操作をタブ切り替えで提供するモーダル。
 * 縦幅が足りない画面でもスクロール可能なモーダル内で操作できるようにする。
 */
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { CardFiltersReturn } from '../../hooks'
import { ButtonSizeType, FilterSortTab } from '../../types/enums'
import { getSortModeLabel, SortModeOrder, getFilterSortTabLabel, FilterSortTabOrder, getTabStyle } from '../../data/ui'
import * as constant from '../../constant'
import ModalOverlay from '../ui/ModalOverlay'
import CloseButton from '../ui/CloseButton'
import FilterBar from './FilterBar'

/** FilterSortModal コンポーネントに渡すプロパティ */
interface FilterSortModalProps {
  /** モーダルを閉じる関数 */
  onClose: () => void
  /** フィルターの状態と操作関数群 */
  filters: CardFiltersReturn
  /** パネルの幅分だけ右を空けるためのCSSクラス */
  panelRightOffset: string
  /** 現在のタブ */
  activeTab: FilterSortTab
  /** タブを切り替える関数 */
  onTabChange: (tab: FilterSortTab) => void
}

/** フィルタ・ソートモーダル */
export default memo(function FilterSortModal({
  onClose,
  filters,
  panelRightOffset,
  activeTab,
  onTabChange,
}: FilterSortModalProps) {
  const { t } = useTranslation()

  return (
    <ModalOverlay onClose={onClose} panelClassName={constant.MODAL_PANEL_FILTER} className={panelRightOffset}>
      {/* ヘッダー：タブ + 閉じるボタン */}
      <div className="sticky top-0 bg-white z-10 border-b border-slate-200 px-5 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-5">
            {FilterSortTabOrder.map((tab) => (
              <button key={tab} className={getTabStyle(activeTab === tab)} onClick={() => onTabChange(tab)}>
                {t(getFilterSortTabLabel(tab))}
              </button>
            ))}
          </div>
          <CloseButton onClick={onClose} size={ButtonSizeType.Sm} />
        </div>
      </div>

      {/* コンテンツ（パネルが固定高さなので flex-1 で残りを埋める） */}
      <div className="px-5 py-4 overflow-y-auto flex-1">
        {activeTab === FilterSortTab.Sort ? <SortContent filters={filters} /> : <FilterBar filters={filters} />}
      </div>
    </ModalOverlay>
  )
})

/** ソートタブの内容 */
function SortContent({ filters }: { filters: CardFiltersReturn }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-2">
      {SortModeOrder.map((mode) => (
        <button
          key={mode}
          onClick={() => filters.setSortMode(mode)}
          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
            filters.sortMode === mode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {t(getSortModeLabel(mode))}
        </button>
      ))}
    </div>
  )
}

/**
 * フィルタ・ソートモーダルコンポーネント
 *
 * ソートとフィルタの操作をタブ切り替えで提供するモーダル。
 * 縦幅が足りない画面でもスクロール可能なモーダル内で操作できるようにする。
 */
import { memo } from 'react'
import * as constant from '../../constant'
import type { CardFiltersReturn } from '../../hooks'
import * as enums from '../../types/enums'
import { getActiveFilterCount } from '../../utils/filterCount'
import CloseButton from '../ui/CloseButton'
import ModalOverlay from '../ui/ModalOverlay'
import FilterBar from './FilterBar'
import { FilterSortTabs } from './FilterSortTabs'
import { SortContent } from './SortContent'

/** FilterSortModal コンポーネントに渡すプロパティ */
interface FilterSortModalProps {
  /** モーダルを閉じる関数 */
  onClose: () => void
  /** フィルターの状態と操作関数群 */
  filters: CardFiltersReturn
  /** パネルの幅分だけ右を空けるためのCSSクラス */
  panelRightOffset: string
  /** 現在のタブ */
  activeTab: enums.FilterSortTab
  /** タブを切り替える関数 */
  onTabChange: (tab: enums.FilterSortTab) => void
}

/**
 * ソートとフィルターをタブで切り替えるモーダルを表示する。
 *
 * @param props - フィルター状態、選択中タブ、モーダル操作
 * @returns PCとスマホに対応したフィルタ・ソートモーダル
 */
export default memo(function FilterSortModal({
  onClose,
  filters,
  panelRightOffset,
  activeTab,
  onTabChange,
}: FilterSortModalProps) {
  const activeFilterCount = getActiveFilterCount(filters)

  return (
    <ModalOverlay onClose={onClose} panelClassName={constant.MODAL_PANEL_FILTER} className={panelRightOffset}>
      {/* PC用フィルター・ソート操作ヘッダー */}
      <div className="z-10 hidden items-center gap-2 border-b border-slate-200/80 bg-white/95 px-5 py-3 backdrop-blur-xl md:flex">
        {/* PC用フィルター・ソートタブ */}
        <FilterSortTabs
          filters={filters}
          activeTab={activeTab}
          activeFilterCount={activeFilterCount}
          onTabChange={onTabChange}
        />
        {/* PC用フィルター・ソートモーダルを閉じるボタン */}
        <CloseButton onClick={onClose} size={enums.ButtonSizeType.Sm} />
      </div>
      {/* スマホ用フィルター・ソートモーダルを閉じるボタン */}
      <CloseButton
        onClick={onClose}
        size={enums.ButtonSizeType.Lg}
        className="absolute right-2 top-2 z-20 h-11 w-11 md:hidden"
      />

      {/* 選択中タブのフィルター・ソート内容 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-14 sm:px-5 md:py-4">
        {activeTab === enums.FilterSortTab.Sort ? <SortContent filters={filters} /> : <FilterBar filters={filters} />}
      </div>

      {/* スマホ用フィルター・ソートタブ */}
      <div className="z-10 border-t border-slate-200/80 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden">
        <FilterSortTabs
          filters={filters}
          activeTab={activeTab}
          activeFilterCount={activeFilterCount}
          onTabChange={onTabChange}
        />
      </div>
    </ModalOverlay>
  )
})

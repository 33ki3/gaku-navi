/**
 * サポート一覧上部のコントロールバー
 *
 * 左に表示件数、右にソートモード表示ボタン・昇降順トグル・フィルタボタンを配置。
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as uiData from '../../data/ui'
import type { CardFiltersReturn } from '../../hooks'
import * as enums from '../../types/enums'
import { getActiveFilterCount } from '../../utils/filterCount'
import { FilterCountBadge } from '../ui/FilterCountBadge'
import { AdjustedIcon, SortIcon } from '../ui/icons'
import { FilterSearchInput } from './FilterSearchInput'

/** SortControls コンポーネントに渡すプロパティ */
interface SortControlsProps {
  /** 現在の表示件数 */
  count: number
  /** フィルターの状態 */
  filters: CardFiltersReturn
  /** フィルタ・ソートモーダルを開く関数 */
  onOpenFilterSort: () => void
  /** 点数設定を開く関数 */
  onOpenScoreSettings: () => void
  /** スケジュールが設定済みかどうか */
  scheduleConfigured: boolean
  /** 点数設定パネルが表示中か */
  scoreSettingsVisible: boolean
  /** サイドパネル表示中の省スペース配置にするか */
  compactLayout: boolean
}

/**
 * 表示件数、検索欄、ソート・フィルター操作を一覧上部へ表示する。
 *
 * @param props - 一覧件数、フィルター状態、設定画面を開く操作
 * @returns サポート一覧上部の操作バー
 */
export default function SortControls({
  count,
  filters,
  onOpenFilterSort,
  onOpenScoreSettings,
  scheduleConfigured,
  scoreSettingsVisible,
  compactLayout,
}: SortControlsProps) {
  const { t } = useTranslation()

  // アクティブなフィルター条件の数を計算する
  const activeFilterCount = getActiveFilterCount(filters)

  // ヘッダーボタンのスタイル
  const inactiveStyle = uiData.getFilterButtonStyle(enums.FilterButtonCategory.Inactive)
  return (
    <div className="mb-3">
      {/* スマホ: ヒントをバーの上に表示 */}
      {!scheduleConfigured && !scoreSettingsVisible && (
        <div className="text-center mb-1 sm:hidden">
          <button
            onClick={onOpenScoreSettings}
            className="text-[10px] text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          >
            {t('ui.message.score_settings_hint')}
          </button>
        </div>
      )}
      {/* PC: 検索欄の上にヒントを置き、一覧中央付近で見つけやすくする */}
      {!compactLayout && !scheduleConfigured && !scoreSettingsVisible && (
        <div className="mb-1 text-center hidden md:block">
          <button
            onClick={onOpenScoreSettings}
            className="text-[10px] text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          >
            {t('ui.message.score_settings_hint')}
          </button>
        </div>
      )}
      {/* 表示件数・検索欄・一覧操作ボタンの同一行レイアウト */}
      <div className="relative flex items-center gap-1.5 md:gap-2">
        {/* 左: 表示件数 */}
        <p className="shrink-0 text-xs font-medium text-slate-600">
          {count} {t('ui.unit.cards')}
        </p>
        {/* 検索欄の配置（PCは中央、コンパクト時は可変幅） */}
        <div
          className={`min-w-0 flex-1 ${
            compactLayout
              ? 'mx-auto max-w-[24rem] md:max-w-[24rem]'
              : 'mx-auto max-w-[24rem] md:absolute md:left-1/2 md:w-[24rem] md:-translate-x-1/2'
          }`}
        >
          <FilterSearchInput value={filters.searchTerm} onChange={filters.setSearchTerm} fullWidth />
        </div>
        {/* ソート・フィルター操作 */}
        <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5">
          {/* ソートモード名ボタン（フィルタ適用時の色と件数バッジ） */}
          <button
            onClick={onOpenFilterSort}
            className={`${constant.BTN_HEADER_ACTION} ${
              compactLayout ? 'md:gap-1 md:px-1.5 md:text-[10px] xl:gap-1.5 xl:px-2.5 xl:text-xs' : ''
            } ${activeFilterCount > 0 ? constant.NAV_ITEM_ACTIVE : inactiveStyle}`}
          >
            <AdjustedIcon className="h-3.5 w-3.5" />
            {t(uiData.getSortModeLabel(filters.sortMode))}
            <FilterCountBadge count={activeFilterCount} className="ml-1" />
          </button>
          {/* 昇降順トグル */}
          <button
            onClick={filters.toggleSortReverse}
            className={`${constant.BTN_HEADER_ACTION} ${
              compactLayout ? 'md:px-1.5 xl:px-2.5' : ''
            } ${filters.sortReverse ? constant.NAV_ITEM_ACTIVE : inactiveStyle}`}
            title={t(filters.sortReverse ? 'ui.sort.ascending' : 'ui.sort.descending')}
            aria-label={t(filters.sortReverse ? 'ui.sort.ascending' : 'ui.sort.descending')}
          >
            <SortIcon className="h-3.5 w-3.5" ascending={filters.sortReverse} />
          </button>
        </div>
      </div>
    </div>
  )
}

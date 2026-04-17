/**
 * サポート一覧上部のコントロールバー
 *
 * 左に表示件数、右にソートモード表示ボタン・昇降順トグル・フィルタボタンを配置。
 */
import { useTranslation } from 'react-i18next'
import type { CardFiltersReturn } from '../../hooks'
import { getFilterButtonStyle, getSortModeLabel } from '../../data/ui'
import { FilterButtonCategory } from '../../types/enums'
import * as constant from '../../constant'
import { SortDirectionIcon, SortIcon } from '../ui/icons'

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
}

/** 件数表示 + ソート・フィルタボタン */
export default function SortControls({
  count,
  filters,
  onOpenFilterSort,
  onOpenScoreSettings,
  scheduleConfigured,
  scoreSettingsVisible,
}: SortControlsProps) {
  const { t } = useTranslation()

  // アクティブなフィルター条件の数を計算する
  const activeFilterCount =
    filters.selectedRarities.size +
    filters.selectedTypes.size +
    filters.selectedPlans.size +
    (filters.spOnly ? 1 : 0) +
    filters.selectedAbilityKeywords.size +
    filters.selectedEventFilters.size +
    filters.selectedUncaps.size +
    (filters.searchTerm.length > 0 ? 1 : 0)

  // ヘッダーボタンのスタイル
  const inactiveStyle = getFilterButtonStyle(FilterButtonCategory.Inactive)
  const activeStyle = getFilterButtonStyle(FilterButtonCategory.Active)

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
      <div className="flex items-center justify-between">
        {/* 左: 表示件数 */}
        <p className="text-xs font-medium text-slate-600">
          {count} {t('ui.unit.cards')}
        </p>
        {/* PC: ヒントを中央に表示 */}
        {!scheduleConfigured && !scoreSettingsVisible && (
          <button
            onClick={onOpenScoreSettings}
            className="hidden sm:block text-[10px] text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          >
            {t('ui.message.score_settings_hint')}
          </button>
        )}
        {/* 右: ソートモードボタン + 昇降順トグル */}
        <div className="flex items-center gap-1.5">
          {/* ソートモード名ボタン（フィルタアクティブ時は暗く + バッジ表示） */}
          <button
            onClick={onOpenFilterSort}
            className={`${constant.BTN_HEADER_ACTION} ${activeFilterCount > 0 ? activeStyle : inactiveStyle}`}
          >
            <SortIcon className="w-3.5 h-3.5" />
            {t(getSortModeLabel(filters.sortMode))}
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-slate-700 text-[9px] font-black">
                {activeFilterCount}
              </span>
            )}
          </button>
          {/* 昇降順トグル */}
          <button
            onClick={filters.toggleSortReverse}
            className={`${constant.BTN_HEADER_ACTION} ${filters.sortReverse ? activeStyle : inactiveStyle}`}
            title={t('ui.sort.reverse')}
          >
            <SortDirectionIcon
              className={`w-3.5 h-3.5 transition-transform ${filters.sortReverse ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

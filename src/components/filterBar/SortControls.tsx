/**
 * ソート操作バーコンポーネント
 *
 * カード一覧の上に表示される。
 * 左側に表示件数、右側にソート方法のセレクトと逆順ボタン。
 */
import { useTranslation } from 'react-i18next'
import type { SortModeType } from '../../hooks'
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import { ToggleButton } from '../ui/ToggleButton'

/** SortControls コンポーネントに渡すプロパティ */
interface SortControlsProps {
  /** 現在の表示件数 */
  count: number
  /** 現在のソート方法 */
  sortMode: SortModeType
  /** ソート方法が変わった時に呼ばれる関数 */
  onSortModeChange: (mode: SortModeType) => void
  /** 今逆順かどうか */
  sortReverse: boolean
  /** 逆順のON/OFFを切り替える関数 */
  onToggleSortReverse: () => void
  /** 点数設定を開く関数 */
  onOpenScoreSettings: () => void
  /** スケジュールが設定済みかどうか */
  scheduleConfigured: boolean
  /** 点数設定パネルが表示中か */
  scoreSettingsVisible: boolean
}

/** 件数表示 + ソートセレクト + 順序切替ボタン */
export default function SortControls({
  count,
  sortMode,
  onSortModeChange,
  sortReverse,
  onToggleSortReverse,
  onOpenScoreSettings,
  scheduleConfigured,
  scoreSettingsVisible,
}: SortControlsProps) {
  const { t } = useTranslation()

  return (
    <div className="mb-3">
      {/* スマホ: ヒントをソートバーの上に表示 */}
      {!scheduleConfigured && !scoreSettingsVisible && (
        <div className="text-center mb-1 sm:hidden">
          <button
            onClick={onOpenScoreSettings}
            className="text-[10px] text-blue-400 hover:text-blue-600 transition-colors cursor-pointer"
          >
            {t('ui.message.score_settings_hint')}
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        {/* 左: 表示件数 */}
        <p className="text-xs font-medium text-slate-400">
          {count} {t('ui.unit.cards')}
        </p>
        {/* PC: ヒントを中央に表示 */}
        {!scheduleConfigured && !scoreSettingsVisible && (
          <button
            onClick={onOpenScoreSettings}
            className="hidden sm:block text-[10px] text-blue-400 hover:text-blue-600 transition-colors cursor-pointer"
          >
            {t('ui.message.score_settings_hint')}
          </button>
        )}
        {/* 右: ソート方法セレクト + 逆順ボタン */}
        <div className="flex items-center gap-2">
        {/* ソート方法を選ぶドロップダウン */}
        <select
          value={sortMode}
          onChange={(e) => onSortModeChange(e.target.value as SortModeType)}
          className={constant.SELECT_XS}
        >
          <option value={enums.SortModeType.Rarity}>{t('ui.sort.rarity')}</option>
          <option value={enums.SortModeType.Date}>{t('ui.sort.date')}</option>
          <option value={enums.SortModeType.Score}>{t('ui.sort.score')}</option>
          <option value={enums.SortModeType.Uncap}>{t('ui.sort.uncap')}</option>
        </select>
        {/* 逆順トグルボタン（矢印アイコンが180度回転する） */}
        <ToggleButton
          isActive={sortReverse}
          onClick={onToggleSortReverse}
          activeClass="bg-slate-700 text-white border border-transparent"
          className="p-1"
        >
          <svg
            className={`w-4 h-4 transition-transform ${sortReverse ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
        </ToggleButton>
        </div>
      </div>
    </div>
  )
}

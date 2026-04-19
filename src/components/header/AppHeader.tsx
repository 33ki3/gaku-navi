/**
 * アプリケーションヘッダーコンポーネント
 *
 * ページ最上部に固定表示されるヘッダー。
 * アプリタイトル、凸数設定/スコア設定/最適編成ボタン、
 * データ管理パネル、モバイルメニューを含む。
 */
import { useTranslation } from 'react-i18next'
import { useState, lazy, Suspense } from 'react'
import { useCardUIContext } from '../../contexts/CardContext'
import * as constant from '../../constant'
import { getFilterButtonStyle } from '../../data/ui'
import { FilterButtonCategory } from '../../types/enums'
import DataManagementPanel from './DataManagementPanel'
import { MobileMenu } from './MobileMenu'
import { InfoIcon, PlusIcon } from '../ui/icons'

const HelpModal = lazy(() => import('../helpModal/HelpModal'))
const AboutModal = lazy(() => import('../aboutModal/AboutModal'))

/** AppHeader コンポーネントに渡すプロパティ */
interface AppHeaderProps {
  /** スコア設定モーダルを開く関数（モバイル用） */
  onOpenScoreSettings: () => void
  /** スコア設定パネルのピン留めを切り替える関数（PC用） */
  onPinScoreSettings: () => void
  /** スコア設定がピン留めされているか */
  settingsPinned: boolean
  /** 最適編成パネルを開く関数（モバイル用） */
  onOpenSimulator: () => void
  /** 最適編成パネルのピン留めを切り替える関数（PC用） */
  onPinSimulator: () => void
  /** 最適編成がピン留めされているか */
  simulatorPinned: boolean
  /** 両パネルがピン留めされているか */
  bothPanelsPinned: boolean
  /** パネルの幅分だけ右を空けるためのCSSクラス */
  panelRightOffset: string
  /** サポート追加モーダルを開く関数 */
  onOpenUserCardForm: () => void
}

/** アプリケーションヘッダー */
export default function AppHeader({
  onOpenScoreSettings,
  onPinScoreSettings,
  settingsPinned,
  onOpenSimulator,
  onPinSimulator,
  simulatorPinned,
  bothPanelsPinned,
  panelRightOffset,
  onOpenUserCardForm,
}: AppHeaderProps) {
  const { t } = useTranslation()
  const { uncapEditMode, onToggleUncapEdit } = useCardUIContext()
  const [helpOpen, setHelpOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  // ヘッダーボタンのスタイル
  const activeStyle = getFilterButtonStyle(FilterButtonCategory.Active)
  const inactiveStyle = getFilterButtonStyle(FilterButtonCategory.Inactive)

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2">
          {/* アプリタイトル */}
          <h1
            className="text-lg font-black tracking-tight text-slate-900 sm:text-2xl cursor-pointer select-none shrink-0"
            onClick={() => {
              window.location.href = import.meta.env.BASE_URL
            }}
          >
            {t('ui.app_title')}
          </h1>
          {/* PC用ヘッダーボタン群（sm以上で表示、両パネルピン時は非表示） */}
          <div className={`${bothPanelsPinned ? 'hidden' : 'hidden sm:flex'} items-center gap-1.5 shrink-0`}>
            {/* 凸数設定: アクティブ時は白文字・暗背景 */}
            <button
              onClick={onToggleUncapEdit}
              className={`${constant.BTN_HEADER_ACTION} ${uncapEditMode ? activeStyle : inactiveStyle}`}
            >
              {t('ui.settings.uncap_settings')}
            </button>
            {/* スコア設定: ピン留め時は白文字・暗背景 */}
            <button
              onClick={onPinScoreSettings}
              className={`${constant.BTN_HEADER_ACTION} ${settingsPinned ? activeStyle : inactiveStyle}`}
            >
              {t('ui.settings.score_settings')}
            </button>
            {/* 最適編成: ピン留め時は白文字・暗背景 */}
            <button
              onClick={onPinSimulator}
              className={`${constant.BTN_HEADER_ACTION} ${simulatorPinned ? activeStyle : inactiveStyle}`}
            >
              {t('ui.settings.unit_simulator')}
            </button>
            {/* サポート追加ボタン */}
            <button onClick={onOpenUserCardForm} className={`${constant.BTN_HEADER_ACTION} ${inactiveStyle}`}>
              <PlusIcon className="w-3.5 h-3.5" />
              {t('userSupport.add_button')}
            </button>
            {/* データ管理パネル（インポート/エクスポート） */}
            <DataManagementPanel />
            {/* ヘルプボタン */}
            <button
              onClick={() => setHelpOpen(true)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${inactiveStyle}`}
              aria-label={t('ui.help.title')}
            >
              ?
            </button>
            {/* Aboutボタン */}
            <button
              onClick={() => setAboutOpen(true)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${inactiveStyle}`}
              aria-label={t('ui.about.title')}
            >
              <InfoIcon className="w-4 h-4" />
            </button>
          </div>
          {/* モバイル用ハンバーガーメニュー（sm未満で表示、両パネルピン時はPC幅でも表示） */}
          <MobileMenu
            onOpenScoreSettings={bothPanelsPinned ? onPinScoreSettings : onOpenScoreSettings}
            onOpenSimulator={bothPanelsPinned ? onPinSimulator : onOpenSimulator}
            settingsPinned={settingsPinned}
            simulatorPinned={simulatorPinned}
            bothPanelsPinned={bothPanelsPinned}
            onOpenHelp={() => setHelpOpen(true)}
            onOpenAbout={() => setAboutOpen(true)}
            onOpenUserCardForm={onOpenUserCardForm}
          />
        </div>
      </div>
      {/* ヘルプモーダル */}
      {helpOpen && (
        <Suspense fallback={null}>
          <HelpModal onClose={() => setHelpOpen(false)} panelRightOffset={panelRightOffset} />
        </Suspense>
      )}
      {/* Aboutモーダル */}
      {aboutOpen && (
        <Suspense fallback={null}>
          <AboutModal onClose={() => setAboutOpen(false)} panelRightOffset={panelRightOffset} />
        </Suspense>
      )}
    </header>
  )
}

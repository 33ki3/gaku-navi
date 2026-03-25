/**
 * アプリケーションヘッダーコンポーネント
 *
 * ページ最上部に固定表示されるヘッダー。
 * アプリタイトル、凸数設定/スコア設定ボタン、
 * データ管理パネル、モバイルメニューを含む。
 */
import { useTranslation } from 'react-i18next'
import { useState, lazy, Suspense } from 'react'
import { useCardContext } from '../../contexts/CardContext'
import * as constant from '../../constant'
import { getFilterButtonStyle } from '../../data/ui'
import { FilterButtonCategory } from '../../types/enums'
import DataManagementPanel from './DataManagementPanel'
import { MobileMenu } from './MobileMenu'

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
}

/** アプリケーションヘッダー */
export default function AppHeader({
  onOpenScoreSettings,
  onPinScoreSettings,
  settingsPinned,
}: AppHeaderProps) {
  const { t } = useTranslation()
  const { uncapEditMode, onToggleUncapEdit } = useCardContext()
  const [helpOpen, setHelpOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  // ヘッダーボタンのスタイル
  const activeStyle = getFilterButtonStyle(FilterButtonCategory.Active)
  const inactiveStyle = getFilterButtonStyle(FilterButtonCategory.Inactive)

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* アプリタイトル（クリックでトップへ遷移） */}
          <div className="flex items-center gap-2">
            <h1
              className="text-lg font-black tracking-tight text-slate-900 sm:text-2xl cursor-pointer select-none"
              onClick={() => { window.location.href = import.meta.env.BASE_URL }}
            >
              {t('ui.app_title')}
            </h1>
          </div>
          {/* PC用ヘッダーボタン群（sm以上で表示） */}
          <div className="hidden sm:flex items-center gap-2">
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
            {/* データ管理パネル（インポート/エクスポート） */}
            <DataManagementPanel />
            {/* ヘルプボタン */}
            <button
              onClick={() => setHelpOpen(true)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${inactiveStyle}`}
              aria-label={t('ui.help.title')}
            >
              ?
            </button>
            {/* Aboutボタン */}
            <button
              onClick={() => setAboutOpen(true)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${inactiveStyle}`}
              aria-label={t('ui.about.title')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          {/* モバイル用ハンバーガーメニュー（sm未満で表示） */}
          <MobileMenu onOpenScoreSettings={onOpenScoreSettings} onOpenHelp={() => setHelpOpen(true)} onOpenAbout={() => setAboutOpen(true)} />
        </div>
      </div>
      {/* ヘルプモーダル */}
      {helpOpen && (
        <Suspense fallback={null}>
          <HelpModal onClose={() => setHelpOpen(false)} settingsPinned={settingsPinned} />
        </Suspense>
      )}
      {/* Aboutモーダル */}
      {aboutOpen && (
        <Suspense fallback={null}>
          <AboutModal onClose={() => setAboutOpen(false)} settingsPinned={settingsPinned} />
        </Suspense>
      )}
    </header>
  )
}

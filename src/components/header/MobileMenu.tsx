/**
 * モバイルメニューコンポーネント
 *
 * スマホ画面（sm未満）でのみ表示されるハンバーガーメニュー。
 * ≡アイコンを押すとドロップダウンが開き、
 * 凸数設定・スコア設定・データ管理の操作ができる。
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCardContext } from '../../contexts/CardContext'
import DataManagementPanel from './DataManagementPanel'

/** MobileMenu コンポーネントに渡すプロパティ */
interface MobileMenuProps {
  /** スコア設定モーダルを開く関数（両パネルピン時はピン留め切替） */
  onOpenScoreSettings: () => void
  /** 最適編成パネルを開く関数（両パネルピン時はピン留め切替） */
  onOpenSimulator: () => void
  /** スコア設定がピン留めされているか */
  settingsPinned: boolean
  /** 最適編成がピン留めされているか */
  simulatorPinned: boolean
  /** 両パネルがピン留めされているか（PC幅でもメニューを表示） */
  bothPanelsPinned: boolean
  /** ヘルプモーダルを開く関数 */
  onOpenHelp: () => void
  /** Aboutモーダルを開く関数 */
  onOpenAbout: () => void
}

/** モバイル用ハンバーガーメニュー */
export function MobileMenu({
  onOpenScoreSettings,
  onOpenSimulator,
  settingsPinned,
  simulatorPinned,
  bothPanelsPinned,
  onOpenHelp,
  onOpenAbout,
}: MobileMenuProps) {
  const { t } = useTranslation()
  const { uncapEditMode, onToggleUncapEdit } = useCardContext()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    // sm未満のみ表示（両パネルピン時はPC幅でもハンバーガーメニューを表示）
    <div className={`relative ${bothPanelsPinned ? '' : 'sm:hidden'}`}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label={t('ui.accessibility.menu')}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {menuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      {/* menuOpen が true のときドロップダウンを表示 */}
      {menuOpen && (
        <>
          {/* 透明オーバーレイ: メニュー外のどこかをタップすると閉じる */}
          <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-2 w-48 z-30">
            {/* 凸数設定ボタン: アクティブ時はハイライト表示 */}
            <button
              onClick={() => {
                onToggleUncapEdit()
                setMenuOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors ${
                uncapEditMode ? 'text-slate-900 bg-slate-100' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              {uncapEditMode ? t('ui.settings.uncap_settings_active') : t('ui.settings.uncap_settings')}
            </button>
            {/* スコア設定ボタン: モバイルはモーダル、両パネルピン時はピン切替 */}
            <button
              onClick={() => {
                onOpenScoreSettings()
                setMenuOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors ${
                bothPanelsPinned && settingsPinned ? 'text-slate-900 bg-slate-100' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              {t('ui.settings.score_settings')}
            </button>
            {/* 最適編成ボタン: モバイルはモーダル、両パネルピン時はピン切替 */}
            <button
              onClick={() => {
                onOpenSimulator()
                setMenuOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors ${
                bothPanelsPinned && simulatorPinned ? 'text-slate-900 bg-slate-100' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              {t('ui.settings.unit_simulator')}
            </button>
            {/* 区切り線 */}
            <div className="border-t border-slate-100 my-1" />
            {/* データ管理パネル（インポート/エクスポート） */}
            <div className="px-4 py-2">
              <DataManagementPanel />
            </div>
            {/* 区切り線 */}
            <div className="border-t border-slate-100 my-1" />
            {/* ヘルプボタン */}
            <button
              onClick={() => {
                onOpenHelp()
                setMenuOpen(false)
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01"
                />
              </svg>
              {t('ui.help.title')}
            </button>
            {/* Aboutボタン */}
            <button
              onClick={() => {
                onOpenAbout()
                setMenuOpen(false)
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {t('ui.about.title')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

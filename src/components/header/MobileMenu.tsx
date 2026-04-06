/**
 * モバイルメニューコンポーネント
 *
 * スマホ画面（sm未満）でのみ表示されるハンバーガーメニュー。
 * ≡アイコンを押すとドロップダウンが開き、
 * 凸数設定・スコア設定・データ管理の操作ができる。
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCardUIContext } from '../../contexts/CardContext'
import DataManagementPanel from './DataManagementPanel'
import { CalculatorIcon, InfoIcon, MenuIcon, QuestionIcon, ScoreSettingsIcon, StarIcon } from '../ui/icons'

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
  const { uncapEditMode, onToggleUncapEdit } = useCardUIContext()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    // sm未満のみ表示（両パネルピン時はPC幅でもハンバーガーメニューを表示）
    <div className={`relative ${bothPanelsPinned ? '' : 'sm:hidden'}`}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label={t('ui.accessibility.menu')}
      >
        <MenuIcon className="w-5 h-5" isOpen={menuOpen} />
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
              <StarIcon className="w-4 h-4" />
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
              <ScoreSettingsIcon className="w-4 h-4" />
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
              <CalculatorIcon className="w-4 h-4" />
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
              <QuestionIcon className="w-4 h-4" />
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
              <InfoIcon className="w-4 h-4" />
              {t('ui.about.title')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

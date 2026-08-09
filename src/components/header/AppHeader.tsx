/**
 * アプリケーションヘッダーコンポーネント
 *
 * ページ最上部に固定表示されるヘッダー。
 * アプリタイトル、凸数設定/スコア設定/最適編成ボタン、
 * データ管理パネル、モバイルメニューを含む。
 */
import { Suspense, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import { useCardUIContext } from '../../contexts/CardContext'
import { useHeaderHeightCssVariable } from '../../hooks/useHeaderHeightCssVariable'
import * as lazyModules from '../../utils/lazyModules'
import { createPreloadedComponent } from '../../utils/preloadedComponent'
import { ModalLoadingFallback } from '../ui/ModalLoadingFallback'
import { DesktopHeaderNavigation } from './DesktopHeaderNavigation'
import { MobileMenu } from './MobileMenu'

const HelpModal = createPreloadedComponent(lazyModules.loadHelpModal)
const AboutModal = createPreloadedComponent(lazyModules.loadAboutModal)
const DataManagementModal = createPreloadedComponent(lazyModules.loadDataManagementModal)

/** AppHeader コンポーネントに渡すプロパティ */
interface AppHeaderProps {
  /** スコア設定モーダルを開く関数（モバイル用） */
  onOpenScoreSettings: () => void
  /** スコア設定パネルのピン留めを切り替える関数（PC用） */
  onPinScoreSettings: () => void
  /** スコア設定がピン留めされているか */
  settingsPinned: boolean
  /** スコア設定が表示されているか */
  scoreSettingsActive: boolean
  /** 最適編成パネルを開く関数（モバイル用） */
  onOpenSimulator: () => void
  /** 最適編成パネルのピン留めを切り替える関数（PC用） */
  onPinSimulator: () => void
  /** 最適編成がピン留めされているか */
  simulatorPinned: boolean
  /** 最適編成が表示されているか */
  simulatorActive: boolean
  /** モバイルの凸数編集モードを切り替える */
  onToggleMobileUncap: () => void
  /** モバイルのフィルタを開く */
  onOpenMobileFilter: () => void
  /** モバイル下部メニューに表示する現在の並び順 */
  mobileFilterLabel: string
  /** モバイル下部メニューに表示する適用中の絞り込み件数 */
  mobileFilterCount: number
  /** 現在の並び順が昇順か */
  sortReverse: boolean
  /** サポート追加モーダルを開く関数 */
  onOpenUserCardForm: () => void
  /** オプションモーダルを開く関数 */
  onOpenOptions: () => void
  /** スマホ下部メニューを表示するか */
  showMobileBottomNav: boolean
  /** スマホ下部メニューをスクロール時も固定するか */
  keepMobileBottomNavFixed: boolean
  /** 外部操作から下部ナビを表示し直す関数を登録する */
  registerMobileNavigationShow?: (handler: (() => void) | null) => void
}

/**
 * アプリケーションのタイトル、主要操作、補助モーダルをまとめて表示する。
 *
 * @param props - 各パネルとモバイルナビゲーションの状態・操作
 * @returns 画面上部へ固定するアプリケーションヘッダー
 */
export default function AppHeader({
  onOpenScoreSettings,
  onPinScoreSettings,
  settingsPinned,
  scoreSettingsActive,
  onOpenSimulator,
  onPinSimulator,
  simulatorPinned,
  simulatorActive,
  onToggleMobileUncap,
  onOpenMobileFilter,
  mobileFilterLabel,
  mobileFilterCount,
  sortReverse,
  onOpenUserCardForm,
  onOpenOptions,
  showMobileBottomNav,
  keepMobileBottomNavFixed,
  registerMobileNavigationShow,
}: AppHeaderProps) {
  const { t } = useTranslation()
  const { uncapEditMode, onToggleUncapEdit } = useCardUIContext()
  const [helpOpen, setHelpOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [dataManagementOpen, setDataManagementOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  useHeaderHeightCssVariable(headerRef)

  const moreMenuActions = {
    openUserCardForm: onOpenUserCardForm,
    openDataManagement: () => setDataManagementOpen(true),
    openOptions: onOpenOptions,
    openHelp: () => setHelpOpen(true),
    openAbout: () => setAboutOpen(true),
  }

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm md:z-50">
        <div className="mx-auto px-4 py-3 sm:px-6 md:py-1.5 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 md:flex-nowrap">
            {/* アプリタイトル */}
            <button
              className="text-left cursor-pointer select-none shrink-0"
              onClick={() => {
                window.location.href = import.meta.env.BASE_URL
              }}
            >
              <span className="text-lg font-black tracking-tight text-slate-900 sm:text-2xl md:text-base lg:text-2xl">
                {t('ui.app_title')}
              </span>
            </button>
            {/* PC・タブレット用タイル型ナビゲーション */}
            <DesktopHeaderNavigation
              uncap={{ active: uncapEditMode, select: onToggleUncapEdit }}
              simulator={{ active: simulatorPinned, select: onPinSimulator }}
              scoreSettings={{ active: settingsPinned, select: onPinScoreSettings }}
              moreMenuActions={moreMenuActions}
            />
            {/* モバイル用ヘッダーメニューと下部ナビ */}
            <MobileMenu
              panels={{
                scoreSettings: {
                  active: scoreSettingsActive,
                  pinned: settingsPinned,
                  open: onOpenScoreSettings,
                },
                simulator: {
                  active: simulatorActive,
                  pinned: simulatorPinned,
                  open: onOpenSimulator,
                },
              }}
              onToggleUncapEdit={onToggleMobileUncap}
              filter={{
                label: mobileFilterLabel,
                count: mobileFilterCount,
                sortReverse,
                open: onOpenMobileFilter,
              }}
              moreMenuActions={moreMenuActions}
              bottomNavigation={{
                show: showMobileBottomNav,
                keepFixed: keepMobileBottomNavFixed,
              }}
              registerMobileNavigationShow={registerMobileNavigationShow}
            />
          </div>
        </div>
        {helpOpen && (
          <Suspense fallback={<ModalLoadingFallback />}>
            {/* ヘルプモーダル */}
            <HelpModal onClose={() => setHelpOpen(false)} />
          </Suspense>
        )}
        {aboutOpen && (
          <Suspense fallback={<ModalLoadingFallback />}>
            {/* Aboutモーダル */}
            <AboutModal onClose={() => setAboutOpen(false)} />
          </Suspense>
        )}
        {dataManagementOpen && (
          <Suspense fallback={<ModalLoadingFallback panelClassName={constant.MODAL_PANEL_DETAIL} />}>
            {/* データ管理モーダル */}
            <DataManagementModal onClose={() => setDataManagementOpen(false)} />
          </Suspense>
        )}
      </header>
    </>
  )
}

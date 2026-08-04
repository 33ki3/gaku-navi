/**
 * サポート一覧ページのルートコンポーネント。
 *
 * 状態管理と各表示領域の組み合わせだけを担当し、ページ本体・モーダル・設定パネル・複雑な操作は専用ファイルへ委譲する。
 */
import { useCallback, useRef } from 'react'

import { AppModals } from './components/app/AppModals'
import { AppPageContent } from './components/app/AppPageContent'
import { AppSettingsPanels } from './components/app/AppSettingsPanels'
import * as constant from './constant'
import { CardDataProvider, CardUIProvider } from './contexts/CardContext'
import { useAppState } from './hooks'
import { useAppOptions } from './hooks/useAppOptions'
import { useCardInteractions } from './hooks/useCardInteractions'
import { usePanelNavigation } from './hooks/usePanelNavigation'
import { useUnitCardSelectionBridge } from './hooks/useUnitCardSelectionBridge'

/**
 * アプリ全体の状態と責務別コンポーネントを接続する。
 *
 * @returns サポート一覧、モーダル、設定パネルを含むアプリ全体
 */
function App() {
  const state = useAppState()
  const options = useAppOptions()
  const mobileNavigationShowRef = useRef<() => void>(() => {})
  const registerMobileNavigationShow = useCallback((handler: (() => void) | null) => {
    // 下部ナビを所有するヘッダーと、選択完了を処理する一覧をrefで接続する
    mobileNavigationShowRef.current = handler ?? (() => {})
  }, [])
  const requestMobileNavigationShow = useCallback(() => {
    // 一覧から最適編成へ戻る遷移でも、下部ナビを表示状態へ戻す
    mobileNavigationShowRef.current()
  }, [])
  const navigation = usePanelNavigation({
    ui: state.ui,
    toggleUncapEdit: state.handlers.handleToggleUncapEdit,
  })
  const selection = useUnitCardSelectionBridge({
    selectionMode: state.ui.unitCardSelectMode,
    setSelectionMode: state.ui.setUnitCardSelectMode,
    openCardDetail: state.handlers.handleCardClick,
    openScoreDetail: state.handlers.handleScoreClick,
    isMobileViewport: navigation.isMobileViewport,
    openUnitSimulator: navigation.openUnitSimulator,
    requestMobileNavigationShow,
  })
  const cardInteractions = useCardInteractions({ state, selection })

  const panelRightOffset = state.ui.bothPanelsPinned
    ? constant.MODAL_TWO_PANEL_OFFSET
    : state.ui.anyPanelPinned
      ? constant.MODAL_ONE_PANEL_OFFSET
      : ''
  const mobileNavPadding = options.preferences.showMobileBottomNav
    ? constant.PAGE_WITH_MOBILE_NAV
    : constant.PAGE_WITHOUT_MOBILE_NAV

  return (
    <CardDataProvider value={cardInteractions.dataContext}>
      <CardUIProvider value={cardInteractions.uiContext}>
        <div className={`${constant.PAGE_ROOT} ${mobileNavPadding}`}>
          <AppPageContent
            state={state}
            navigation={navigation}
            options={options}
            selection={selection}
            registerMobileNavigationShow={registerMobileNavigationShow}
          />
          <AppModals
            state={state}
            cardInteractions={cardInteractions}
            options={options}
            panelRightOffset={panelRightOffset}
          />
          <AppSettingsPanels
            state={state}
            navigation={navigation}
            selection={selection}
            reserveMobileNavSpace={options.preferences.showMobileBottomNav}
          />
        </div>
      </CardUIProvider>
    </CardDataProvider>
  )
}

export default App

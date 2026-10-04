/**
 * アプリ全体のルートコンポーネント
 *
 * 状態管理と各表示領域の組み合わせだけを担当する
 * ページ本体・モーダル・設定パネル・複雑な操作は専用ファイルが担当する
 */
import { Suspense, useEffect, useState } from 'react'

import { AppModals } from './components/app/AppModals'
import { AppPageContent } from './components/app/AppPageContent'
import { AppSettingsPanels } from './components/app/AppSettingsPanels'
import { PageLoadingFallback } from './components/ui/PageLoadingFallback'
import * as constant from './constant'
import { CardDataProvider, CardUIProvider } from './contexts/CardContext'
import * as data from './data'
import { useAppState } from './hooks'
import { useAchievementCalculatorProgress } from './hooks/useAchievementCalculatorProgress'
import { useApplicationCommands } from './hooks/useApplicationCommands'
import { useApplicationUi } from './hooks/useApplicationUi'
import { useApplicationWebMcp } from './hooks/useApplicationWebMcp'
import { useAppOptions } from './hooks/useAppOptions'
import * as enums from './types/enums'
import * as lazyModules from './utils/lazyModules'
import { preloadAllLazyModules } from './utils/lazyPreload'
import { createPreloadedComponent } from './utils/preloadedComponent'
import { loadPresets } from './utils/presetHelpers'

// モーダルと同じ表示入口を使い、先読み済みなら同期表示、解決前ならSuspenseで待つ
const AchievementCalculatorPage = createPreloadedComponent(lazyModules.loadAchievementCalculatorPage)

/** エクスポート対象の保存値からインポート画面用の状態を作る */
function loadImportState(): Record<string, string | null> {
  const entries: Array<readonly [string, string | null]> = []
  for (const key of data.EXPORT_KEYS) {
    try {
      entries.push([key, localStorage.getItem(key)])
    } catch {
      entries.push([key, null])
    }
  }
  return Object.fromEntries(entries)
}

/**
 * アプリ全体の状態と責務別コンポーネントを接続する
 *
 * @returns 選択中のページ
 */
function App() {
  // 表示中の画面はアプリ内の状態で切り替え、URLやブラウザ履歴へ反映しない
  const [activePage, navigateToPage] = useState<enums.AppPage>(enums.AppPage.SupportList)

  // 初期画面のcommitと描画機会を優先し、その後にメニュー・モーダル・計算機の表示準備を進める
  useEffect(() => {
    let nextFrame: number | undefined
    const firstFrame = requestAnimationFrame(() => {
      nextFrame = requestAnimationFrame(() => {
        void preloadAllLazyModules(lazyModules.INITIAL_PRELOAD_MODULES)
      })
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      if (nextFrame !== undefined) cancelAnimationFrame(nextFrame)
    }
  }, [])

  // 計算機の記録はページ遷移に依存せず保持し、どの画面でも外部操作と同じ状態を参照する
  const achievementControls = useAchievementCalculatorProgress()
  const [selectedAchievementIdolId, setSelectedAchievementIdolId] = useState<string>(enums.IdolId.Saki)
  const state = useAppState()

  // ヘッダーと外部操作の両方から開くため、
  // データ管理モーダルの状態をここでまとめて管理する
  const [dataManagementOpen, setDataManagementOpen] = useState(false)
  const options = useAppOptions(state.unitSettings)
  const [presets, setPresets] = useState(loadPresets)
  const [importState, setImportState] = useState(loadImportState)
  const { commands: applicationCommands, handlers: commandHandlers } = useApplicationCommands({
    state,
    options,
    presets,
    setPresets,
    importState,
    setImportState,
  })
  const {
    updateScoreSettings,
    updateUnitSettings,
    updatePreferences,
    saveUserSupport,
    deleteUserSupport,
    updateCardUncap,
  } = commandHandlers

  const applicationUi = useApplicationUi({ state, deleteUserSupport, updateCardUncap })
  const { navigation, closeUnitSimulator, registerMobileNavigationShow, selection, cardListMode, cardInteractions } =
    applicationUi
  useApplicationWebMcp({
    achievementCommands: achievementControls.commands,
    achievementQuery: achievementControls.query,
    selectedAchievementIdolId,
    state,
    options,
    navigation,
    closeUnitSimulator,
    applicationCommands,
    dataManagementOpen,
    setDataManagementOpen,
  })

  const panelRightOffset = state.ui.bothPanelsPinned
    ? constant.MODAL_TWO_PANEL_OFFSET
    : state.ui.anyPanelPinned
      ? constant.MODAL_ONE_PANEL_OFFSET
      : ''
  const mobileNavPadding = options.preferences.showMobileBottomNav
    ? constant.PAGE_WITH_MOBILE_NAV
    : constant.PAGE_WITHOUT_MOBILE_NAV

  // ページIDごとに表示を選び、共有状態と外部操作の登録はページ切り替え中も保持する
  switch (activePage) {
    case enums.AppPage.AchievementCalculator:
      return (
        <Suspense fallback={<PageLoadingFallback />}>
          <AchievementCalculatorPage
            controls={achievementControls}
            selectedIdolId={selectedAchievementIdolId}
            onSelectIdol={setSelectedAchievementIdolId}
            onBack={() => navigateToPage(enums.AppPage.SupportList)}
          />
        </Suspense>
      )

    case enums.AppPage.SupportList:
      return (
        <CardDataProvider value={cardInteractions.dataContext}>
          <CardUIProvider value={cardInteractions.uiContext}>
            <div className={`${constant.PAGE_ROOT} ${mobileNavPadding}`}>
              <AppPageContent
                onNavigatePage={navigateToPage}
                state={state}
                navigation={navigation}
                options={options}
                cardListMode={cardListMode}
                registerMobileNavigationShow={registerMobileNavigationShow}
                dataManagementOpen={dataManagementOpen}
                onOpenDataManagement={() => setDataManagementOpen(true)}
                onCloseDataManagement={() => setDataManagementOpen(false)}
              />
              <AppModals
                state={state}
                cardInteractions={cardInteractions}
                options={options}
                panelRightOffset={panelRightOffset}
                onSaveUserSupport={saveUserSupport}
                onPreferencesChange={updatePreferences}
                onScoreSettingsChange={updateScoreSettings}
                onUnitSettingsChange={updateUnitSettings}
                onCardUncapChange={updateCardUncap}
              />
              <AppSettingsPanels
                state={state}
                navigation={navigation}
                selection={selection}
                cardListMode={cardListMode}
                reserveMobileNavSpace={options.preferences.showMobileBottomNav}
                presets={presets}
                presetCommand={applicationCommands.presets}
                onScoreSettingsChange={updateScoreSettings}
                onUnitSettingsChange={updateUnitSettings}
              />
            </div>
          </CardUIProvider>
        </CardDataProvider>
      )
  }
}

export default App

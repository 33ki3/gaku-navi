/**
 * サポート一覧ページのルートコンポーネント
 *
 * 状態管理と各表示領域の組み合わせだけを担当する
 * ページ本体・モーダル・設定パネル・複雑な操作は専用ファイルが担当する
 */
import { useState } from 'react'

import { AppModals } from './components/app/AppModals'
import { AppPageContent } from './components/app/AppPageContent'
import { AppSettingsPanels } from './components/app/AppSettingsPanels'
import * as constant from './constant'
import { CardDataProvider, CardUIProvider } from './contexts/CardContext'
import * as data from './data'
import { useAppState } from './hooks'
import { useApplicationCommands } from './hooks/useApplicationCommands'
import { useApplicationUi } from './hooks/useApplicationUi'
import { useApplicationWebMcp } from './hooks/useApplicationWebMcp'
import { useAppOptions } from './hooks/useAppOptions'
import { loadPresets } from './utils/presetHelpers'

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
 * @returns サポート一覧、モーダル、設定パネルを含むアプリ全体
 */
function App() {
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

  return (
    <CardDataProvider value={cardInteractions.dataContext}>
      <CardUIProvider value={cardInteractions.uiContext}>
        <div className={`${constant.PAGE_ROOT} ${mobileNavPadding}`}>
          <AppPageContent
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

export default App

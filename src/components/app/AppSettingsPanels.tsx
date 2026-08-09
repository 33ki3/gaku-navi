/**
 * 点数設定と最適編成のサイドパネルを表示する。
 *
 * パネル間の切り替えと、一覧からサポートを選ぶための接続だけを
 * ルートコンポーネントから受け取る
 */
import { Suspense, lazy, useCallback } from 'react'
import type { AppState } from '../../hooks/useAppState'
import type { PanelNavigationActions } from '../../hooks/usePanelNavigation'
import type { UnitCardSelectionBridge } from '../../hooks/useUnitCardSelectionBridge'
import { ErrorBoundary } from '../ui/ErrorBoundary'

const ScoreSettingsPanel = lazy(() => import('../scoreSettingsPanel/ScoreSettingsPanel'))
const UnitSimulatorPanel = lazy(() => import('../unitSimulator/UnitSimulatorPanel'))

interface AppSettingsPanelsProps {
  /** アプリ全体の統合状態 */
  state: AppState
  /** 設定パネル間を移動する操作 */
  navigation: PanelNavigationActions
  /** 最適編成パネルと一覧の選択接続 */
  selection: UnitCardSelectionBridge
  /** スマホ下部メニュー分の余白をパネルに確保するか */
  reserveMobileNavSpace: boolean
}

/**
 * 開いている点数設定・最適編成パネルを遅延読込して表示する
 *
 * @param props - アプリ状態、パネル遷移、一覧選択接続、下部余白設定
 * @returns 表示対象の設定パネル
 */
export function AppSettingsPanels({ state, navigation, selection, reserveMobileNavSpace }: AppSettingsPanelsProps) {
  const closeScoreSettings = useCallback(() => {
    state.ui.setScoreSettingsOpen(false)
    state.ui.setSettingsPinned(false)
  }, [state.ui])

  const closeUnitSimulator = useCallback(() => {
    state.ui.setSimulatorOpen(false)
    state.ui.setSimulatorPinned(false)
    // 手動選択中は一覧からのカード追加処理を維持するため、選択モードはここで解除しない
  }, [state.ui])

  return (
    <>
      {/* 点数設定パネル（表示条件に応じた遅延読込） */}
      {(state.ui.scoreSettingsOpen || state.ui.settingsPinned) && (
        <ErrorBoundary onCancel={closeScoreSettings}>
          <Suspense fallback={null}>
            {/* 点数設定パネル */}
            <ScoreSettingsPanel
              isOpen={state.ui.scoreSettingsOpen}
              onClose={closeScoreSettings}
              pinned={state.ui.settingsPinned}
              settings={state.scores.scoreSettings}
              onSettingsChange={state.scores.setScoreSettings}
              reserveMobileNavSpace={reserveMobileNavSpace}
              onSwitchToSimulator={navigation.openUnitSimulator}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* 最適編成パネル（手動選択中もマウント維持） */}
      {(state.ui.simulatorOpen || state.ui.simulatorPinned || state.ui.unitCardSelectMode) && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            {/* 最適編成パネル */}
            <UnitSimulatorPanel
              isOpen={state.ui.simulatorOpen}
              onClose={closeUnitSimulator}
              pinned={state.ui.simulatorPinned}
              secondPanel={state.ui.bothPanelsPinned}
              registerAddManualCard={selection.registerAddManualCard}
              registerIsCardEligible={selection.registerIsCardEligible}
              unitCardSelectMode={state.ui.unitCardSelectMode}
              setUnitCardSelectMode={selection.setSelectionMode}
              countCustom={state.scores.countCustom}
              scoreSettings={state.scores.scoreSettings}
              allCards={state.userCards.allCards}
              allCardByName={state.userCards.allCardByName}
              cardUncaps={state.scores.cardUncaps}
              onManualSelectionComplete={selection.handleSelectionComplete}
              reserveMobileNavSpace={reserveMobileNavSpace}
              onSwitchToScoreSettings={navigation.openScoreSettings}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  )
}

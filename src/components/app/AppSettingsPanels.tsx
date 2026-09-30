/**
 * 点数設定と最適編成のサイドパネルを表示する。
 *
 * パネル間の切り替えと、一覧からサポートを選ぶための接続だけを
 * ルートコンポーネントから受け取る
 */
import { Suspense, useCallback } from 'react'
import type { AppState } from '../../hooks/useAppState'
import type { PanelNavigationActions } from '../../hooks/usePanelNavigation'
import type { UnitCardSelectionBridge } from '../../hooks/useUnitCardSelectionBridge'
import type { CardListModeController } from '../../types/app'
import { CardListInteractionModeType } from '../../types/enums'
import * as lazyModules from '../../utils/lazyModules'
import { createPreloadedComponent } from '../../utils/preloadedComponent'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { PanelLoadingFallback } from '../ui/PanelLoadingFallback'

const ScoreSettingsPanel = createPreloadedComponent(lazyModules.loadScoreSettingsPanel)
const UnitSimulatorPanel = createPreloadedComponent(lazyModules.loadUnitSimulatorPanel)

interface AppSettingsPanelsProps {
  /** アプリ全体の統合状態 */
  state: AppState
  /** 設定パネル間を移動する操作 */
  navigation: PanelNavigationActions
  /** 最適編成パネルと一覧の選択接続 */
  selection: UnitCardSelectionBridge
  /** サポート一覧の操作モードと切り替え操作 */
  cardListMode: CardListModeController
  /** スマホ下部メニュー分の余白をパネルに確保するか */
  reserveMobileNavSpace: boolean
}

/**
 * 開いている点数設定・最適編成パネルを遅延読込して表示する
 *
 * @param props - アプリ状態、パネル遷移、一覧選択接続、下部余白設定
 * @returns 表示対象の設定パネル
 */
export function AppSettingsPanels({
  state,
  navigation,
  selection,
  cardListMode,
  reserveMobileNavSpace,
}: AppSettingsPanelsProps) {
  const closeScoreSettings = useCallback(() => {
    state.ui.setScoreSettingsOpen(false)
    state.ui.setSettingsPinned(false)
  }, [state.ui])

  const closeUnitSimulator = useCallback(() => {
    state.ui.setSimulatorOpen(false)
    state.ui.setSimulatorPinned(false)
    // 手動選択・除外設定中は一覧との連携を維持するため、モード自体はここで解除しない
  }, [state.ui])

  return (
    <>
      {/* 点数設定パネル（表示条件に応じた遅延読込） */}
      {(state.ui.scoreSettingsOpen || state.ui.settingsPinned) && (
        <ErrorBoundary onCancel={closeScoreSettings}>
          <Suspense
            fallback={
              <PanelLoadingFallback pinned={state.ui.settingsPinned} reserveMobileNavSpace={reserveMobileNavSpace} />
            }
          >
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
      {(state.ui.simulatorOpen ||
        state.ui.simulatorPinned ||
        cardListMode.mode !== CardListInteractionModeType.None) && (
        <ErrorBoundary>
          <Suspense
            fallback={
              <PanelLoadingFallback
                pinned={state.ui.simulatorPinned}
                secondPanel={state.ui.bothPanelsPinned}
                reserveMobileNavSpace={reserveMobileNavSpace}
              />
            }
          >
            {/* 最適編成パネル */}
            <UnitSimulatorPanel
              isOpen={state.ui.simulatorOpen}
              onClose={closeUnitSimulator}
              pinned={state.ui.simulatorPinned}
              secondPanel={state.ui.bothPanelsPinned}
              registerAddManualCard={selection.registerAddManualCard}
              registerIsCardEligible={selection.registerIsCardEligible}
              cardListMode={cardListMode}
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

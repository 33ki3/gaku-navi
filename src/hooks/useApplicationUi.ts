/** Appの画面遷移、カード操作、手動編成選択を組み立てるcontroller facade */
import { useCallback, useMemo, useRef } from 'react'

import type { CardListModeController } from '../types/app'
import * as enums from '../types/enums'
import type { DeleteUserSupportHandler, UpdateCardUncapHandler } from './useApplicationCommands'
import type { AppState } from './useAppState'
import type { CardInteractions } from './useCardInteractions'
import { useCardInteractions } from './useCardInteractions'
import type { PanelNavigationActions } from './usePanelNavigation'
import { usePanelNavigation } from './usePanelNavigation'
import type { UnitCardSelectionBridge } from './useUnitCardSelectionBridge'
import { useUnitCardSelectionBridge } from './useUnitCardSelectionBridge'

/** Appの画面操作をまとめた値 */
interface ApplicationUi {
  /** 設定パネル間の移動操作 */
  navigation: PanelNavigationActions
  /** 最適編成パネルを閉じ、固定状態も解除する */
  closeUnitSimulator: () => void
  /** 下部ナビを表示する処理を登録する */
  registerMobileNavigationShow: (handler: (() => void) | null) => void
  /** 下部ナビを表示する処理を呼び出す */
  requestMobileNavigationShow: () => void
  /** 一覧と最適編成パネルの選択状態をつなぐ処理 */
  selection: UnitCardSelectionBridge
  /** カード一覧の操作モードと切り替え操作 */
  cardListMode: CardListModeController
  /** カード一覧へ渡すデータと操作 */
  cardInteractions: CardInteractions
}

interface UseApplicationUiOptions {
  /** アプリ全体の統合状態 */
  state: AppState
  /** ユーザー定義サポート削除の共通command handler */
  deleteUserSupport: DeleteUserSupportHandler
  /** カード凸数変更の共通command handler */
  updateCardUncap: UpdateCardUncapHandler
}

/**
 * Appで共有する画面操作を組み立てる
 *
 * @param options - アプリ状態と保存commandへ接続する操作
 * @returns Appの表示領域へ渡す画面操作
 */
export function useApplicationUi({
  state,
  deleteUserSupport,
  updateCardUncap,
}: UseApplicationUiOptions): ApplicationUi {
  const navigation = usePanelNavigation({
    ui: state.ui,
    toggleUncapEdit: state.handlers.handleToggleUncapEdit,
  })

  const closeUnitSimulator = useCallback(() => {
    state.ui.setSimulatorOpen(false)
    state.ui.setSimulatorPinned(false)
  }, [state.ui])

  const mobileNavigationShowRef = useRef<() => void>(() => {})
  const registerMobileNavigationShow = useCallback((handler: (() => void) | null) => {
    // 下部ナビを所有するヘッダーと、選択完了を処理する一覧を同じ操作へ接続する
    mobileNavigationShowRef.current = handler ?? (() => {})
  }, [])
  const requestMobileNavigationShow = useCallback(() => {
    // 一覧から最適編成へ戻る遷移でも、下部ナビを表示状態へ戻す
    mobileNavigationShowRef.current()
  }, [])

  const { setCardListMode } = state.ui
  const setSelectionMode = useCallback(
    (enabled: boolean) => {
      setCardListMode(
        enabled ? enums.CardListInteractionModeType.UnitCardSelect : enums.CardListInteractionModeType.None,
      )
    },
    [setCardListMode],
  )
  const selection = useUnitCardSelectionBridge({
    selectionMode: state.ui.cardListMode === enums.CardListInteractionModeType.UnitCardSelect,
    setSelectionMode,
    isMobileViewport: navigation.isMobileViewport,
    openUnitSimulator: navigation.openUnitSimulator,
    requestMobileNavigationShow,
  })

  const toggleCardExclusionMode = useCallback(() => {
    const enabling = state.ui.cardListMode !== enums.CardListInteractionModeType.CardExclusionEdit
    if (enabling && state.ui.cardListMode === enums.CardListInteractionModeType.UnitCardSelect) {
      // 操作モードを切り替える前に、手動選択の連携状態を解除する
      selection.setSelectionMode(false)
    }
    state.handlers.handleToggleCardExclusionMode()
    // スマホではカード一覧を操作できるよう、モード開始時にパネルだけ閉じる
    if (enabling && navigation.isMobileViewport()) closeUnitSimulator()
  }, [closeUnitSimulator, navigation, selection, state.handlers, state.ui.cardListMode])

  const cardListMode = useMemo<CardListModeController>(
    () => ({
      mode: state.ui.cardListMode,
      setManualSelection: selection.setSelectionMode,
      finishManualSelection: selection.finishSelection,
      toggleExclusion: toggleCardExclusionMode,
    }),
    [selection.finishSelection, selection.setSelectionMode, state.ui.cardListMode, toggleCardExclusionMode],
  )
  const cardInteractions = useCardInteractions({ state, selection, deleteUserSupport, updateCardUncap })

  return {
    navigation,
    closeUnitSimulator,
    registerMobileNavigationShow,
    requestMobileNavigationShow,
    selection,
    cardListMode,
    cardInteractions,
  }
}

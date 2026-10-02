/** Appの状態をWebMCP runtimeへ変換し、ページツールを登録するcontroller facade */
import { useCallback } from 'react'

import * as constant from '../constant'
import { createEmptyResult } from '../utils/calculator/calculateCard'
import { ApplicationUiAction } from '../types/enums'
import type { WebMcpUiCommand } from '../webmcp/types'
import type { ApplicationCommands } from './useApplicationCommands'
import type { AppOptionsState } from './useAppOptions'
import type { AppState } from './useAppState'
import type { PanelNavigationActions } from './usePanelNavigation'
import { useWebMcp } from './useWebMcp'

interface UseApplicationWebMcpOptions {
  /** アプリ全体の統合状態 */
  state: AppState
  /** 表示設定と最適編成設定 */
  options: AppOptionsState
  /** 設定パネル間の移動操作 */
  navigation: PanelNavigationActions
  /** 最適編成パネルを閉じる操作 */
  closeUnitSimulator: () => void
  /** 通常UIとWebMCPで共有する保存command */
  applicationCommands: ApplicationCommands
  /** データ管理モーダルの表示状態 */
  dataManagementOpen: boolean
  /** データ管理モーダルの表示状態を変更する */
  setDataManagementOpen: (open: boolean) => void
}

/**
 * Appの現在状態をWebMCP runtimeへ接続する
 *
 * @param options - 画面状態、画面遷移、保存commandの接続情報
 */
export function useApplicationWebMcp({
  state,
  options,
  navigation,
  closeUnitSimulator,
  applicationCommands,
  dataManagementOpen,
  setDataManagementOpen,
}: UseApplicationWebMcpOptions): void {
  // 外部操作へ返す状態は、カード名と必要なフラグだけに変換する
  const getUiState = useCallback(
    () => ({
      selectedCardName: state.ui.selectedCard?.name ?? null,
      scoreSettingsOpen: state.ui.scoreSettingsOpen,
      settingsPinned: state.ui.settingsPinned,
      simulatorOpen: state.ui.simulatorOpen,
      simulatorPinned: state.ui.simulatorPinned,
      filterSortOpen: state.ui.filterSortOpen,
      filterSortTab: state.ui.filterSortTab,
      cardListMode: state.ui.cardListMode,
      uncapEditMode: state.ui.uncapEditMode,
      scoreBreakdownCardName: state.ui.scoreBreakdown?.card.name ?? null,
      userSupportFormOpen: state.ui.userCardFormOpen,
      editingUserSupportName: state.ui.editingUserCard?.name ?? null,
      dataManagementOpen,
      optionsOpen: options.isOpen,
    }),
    [dataManagementOpen, options.isOpen, state.ui],
  )

  const controlUi = useCallback(
    (command: WebMcpUiCommand) => {
      switch (command.action) {
        // 点数設定パネルは、開くときだけ既存のナビゲーション規則を通す
        case ApplicationUiAction.OpenScoreSettings:
          navigation.openScoreSettings()
          return
        case ApplicationUiAction.CloseScoreSettings:
          // パネルを閉じる操作では、開いたまま残りやすい固定状態も解除する
          state.ui.setScoreSettingsOpen(false)
          state.ui.setSettingsPinned(false)
          return
        case ApplicationUiAction.SetScoreSettingsPinned:
          // 固定状態だけを変更し、パネルの開閉自体は変更しない
          state.ui.setSettingsPinned(command.pinned)
          return

        // 最適編成パネルも既存のナビゲーション規則を使って開閉する
        case ApplicationUiAction.OpenUnitSimulator:
          navigation.openUnitSimulator()
          return
        case ApplicationUiAction.CloseUnitSimulator:
          closeUnitSimulator()
          return
        case ApplicationUiAction.SetSimulatorPinned:
          // 固定状態の変更は、現在のパネル表示を維持したまま適用する
          state.ui.setSimulatorPinned(command.pinned)
          return

        // 絞り込みパネルの開閉と表示タブを個別に変更する
        case ApplicationUiAction.OpenFilterSort:
          state.ui.setFilterSortOpen(true)
          return
        case ApplicationUiAction.CloseFilterSort:
          state.ui.setFilterSortOpen(false)
          return
        case ApplicationUiAction.SetFilterSortTab:
          state.ui.setFilterSortTab(command.tab)
          return

        // カード一覧の表示・操作モードを既存の画面更新処理へ渡す
        case ApplicationUiAction.SetCardListMode:
          state.ui.setCardListMode(command.mode)
          return
        case ApplicationUiAction.SetUncapEditMode:
          state.ui.setUncapEditMode(command.enabled)
          return
        case ApplicationUiAction.ShowCard: {
          // 表示対象が存在する場合だけカード詳細を開き、存在しない名前では画面の状態を変更しない
          const card = state.userCards.allCardByName.get(command.cardName)
          if (card) state.ui.setSelectedCard(card)
          return
        }
        case ApplicationUiAction.HideCard:
          state.ui.setSelectedCard(null)
          return
        case ApplicationUiAction.ShowCardScore: {
          // 点数結果がまだないカードも、0点の内訳画面を開けるようにする
          const card = state.userCards.allCardByName.get(command.cardName)
          if (!card) return
          const result = state.scores.cardResults.get(command.cardName) ?? createEmptyResult(card)
          state.ui.setScoreBreakdown({ card, result })
          return
        }
        case ApplicationUiAction.HideCardScore:
          state.ui.setScoreBreakdown(null)
          return
        case ApplicationUiAction.OpenUserSupportForm:
          // 新規入力では既存カードの編集対象を解除して、空のフォームを開く
          state.ui.setEditingUserCard(null)
          state.ui.setUserCardFormOpen(true)
          return
        case ApplicationUiAction.EditUserSupportForm: {
          // 編集対象はユーザー定義サポートに限定し、組み込みサポートを編集状態へ入れない
          const card = state.userCards.userCards.find((candidate) => candidate.name === command.cardName)
          if (!card) return
          state.ui.setEditingUserCard(card)
          state.ui.setUserCardFormOpen(true)
          return
        }
        case ApplicationUiAction.CloseUserSupportForm:
          // フォームを閉じるときは、次回の新規入力へ編集対象が残らないよう解除する
          state.ui.setUserCardFormOpen(false)
          state.ui.setEditingUserCard(null)
          return
        case ApplicationUiAction.OpenDataManagement:
          setDataManagementOpen(true)
          return
        case ApplicationUiAction.CloseDataManagement:
          setDataManagementOpen(false)
          return
        case ApplicationUiAction.OpenOptions:
          // オプションの開閉は、表示設定の共通更新処理を通して画面の状態をそろえる
          options.open()
          return
        case ApplicationUiAction.CloseOptions:
          options.close()
          return
      }
    },
    [
      closeUnitSimulator,
      navigation,
      options,
      setDataManagementOpen,
      state.scores.cardResults,
      state.ui,
      state.userCards.allCardByName,
      state.userCards.userCards,
    ],
  )

  useWebMcp({
    // カード検索・詳細取得・計算比較では、実行時点のカード一覧を使う
    getCards: () => state.userCards.allCards,
    getCardByName: () => state.userCards.allCardByName,
    getCalculationSnapshot: state.getCalculationSnapshot,
    // 一覧条件は外部へ渡す前に配列へ変換し、現在の選択肢を安全に返す
    getFilterState: () => ({
      searchTerm: state.filters.searchTerm,
      rarities: [...state.filters.selectedRarities],
      types: [...state.filters.selectedTypes],
      plans: [...state.filters.selectedPlans],
      spOnly: state.filters.spOnly,
      abilityKeywords: [...state.filters.selectedAbilityKeywords],
      eventFilters: [...state.filters.selectedEventFilters],
      sources: [...state.filters.selectedSources],
      uncaps: [...state.filters.selectedUncaps],
      countCustom: [...state.filters.selectedCountCustom],
      cardExclusionFilters: [...state.filters.selectedCardExclusionFilters],
      sortMode: state.filters.sortMode,
      sortReverse: state.filters.sortReverse,
    }),
    // 表示設定とユーザー定義サポートは読み取りだけをruntimeへ渡し、更新はcommandへ統一する
    getPreferences: () => options.preferences,
    getUserSupports: () => state.userCards.userCards,
    refreshFromStorage: async () => {
      // storageイベントは同じタブへ届かないため、インポート後は画面へ再読込を通知する
      window.dispatchEvent(new StorageEvent(constant.STORAGE_EVENT_NAME, { key: null }))
      // 画面がイベントによる更新を反映してから、次のWebMCP呼び出しへ制御を戻す
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
    },
    applicationCommands,
    getUiState,
    controlUi,
  })
}

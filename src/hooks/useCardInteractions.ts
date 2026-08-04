/**
 * サポート一覧へ渡すContext値とユーザーサポート操作を組み立てる。
 *
 * 更新頻度の異なるデータ操作とUI状態を別々にメモ化し、一覧項目の不要な再描画を抑える。
 */
import { useCallback, useMemo } from 'react'
import type { CardDataContextValue, CardUIContextValue } from '../contexts/CardContext'
import type { SupportCard } from '../types/card'
import type { AppState } from './useAppState'
import type { UnitCardSelectionBridge } from './useUnitCardSelectionBridge'

/** サポート一覧Contextとユーザーサポート操作 */
export interface CardInteractions {
  /** 変更頻度の低いサポートデータ操作 */
  dataContext: CardDataContextValue
  /** 編集モードなど表示に関する状態 */
  uiContext: CardUIContextValue
  /** ユーザーサポート編集画面を開く */
  editUserCard: (card: SupportCard) => void
  /** ユーザーサポートを削除する */
  deleteUserCard: (cardName: string) => void
}

interface UseCardInteractionsParams {
  /** アプリ全体の統合状態 */
  state: AppState
  /** サポート一覧と最適編成パネルの接続状態 */
  selection: UnitCardSelectionBridge
}

/**
 * サポート一覧で使うContext値と編集・削除操作を提供する
 *
 * @param params - アプリ状態と編成選択の接続状態
 * @returns 2種類のContext値とユーザーサポート操作
 */
export function useCardInteractions({ state, selection }: UseCardInteractionsParams): CardInteractions {
  // Contextへ渡す操作と、ユーザー追加サポートの編集操作を状態から取り出す
  const { handleUncapChange, handleToggleUncapEdit } = state.handlers
  const { setEditingUserCard, setUserCardFormOpen } = state.ui
  const { deleteUserCard: removeUserCard } = state.userCards

  const editUserCard = useCallback(
    (card: SupportCard) => {
      // 編集対象を先に保存してから、フォームモーダルを開く
      setEditingUserCard(card)
      setUserCardFormOpen(true)
    },
    [setEditingUserCard, setUserCardFormOpen],
  )

  const deleteUserCard = useCallback(
    (cardName: string) => {
      // 削除処理はユーザーサポートhookへ委譲し、一覧側の状態を直接変更しない
      removeUserCard(cardName)
    },
    [removeUserCard],
  )

  // 一覧へ渡すカードデータ操作のContext値
  const dataContext = useMemo<CardDataContextValue>(
    () => ({
      getCardUncap: state.scores.getCardUncap,
      onCardClick: selection.onCardClick,
      onScoreClick: selection.onScoreClick,
      onUncapChange: handleUncapChange,
      onEditUserCard: editUserCard,
      onDeleteUserCard: deleteUserCard,
    }),
    [
      state.scores.getCardUncap,
      selection.onCardClick,
      selection.onScoreClick,
      handleUncapChange,
      editUserCard,
      deleteUserCard,
    ],
  )

  // 一覧へ渡す表示状態と選択可否のContext値
  const uiContext = useMemo<CardUIContextValue>(
    () => ({
      uncapEditMode: state.ui.uncapEditMode,
      onToggleUncapEdit: handleToggleUncapEdit,
      unitCardSelectMode: state.ui.unitCardSelectMode,
      isCardEligible: selection.isCardEligible,
      eligibilityVersion: selection.eligibilityVersion,
    }),
    [
      state.ui.uncapEditMode,
      state.ui.unitCardSelectMode,
      handleToggleUncapEdit,
      selection.isCardEligible,
      selection.eligibilityVersion,
    ],
  )

  return { dataContext, uiContext, editUserCard, deleteUserCard }
}

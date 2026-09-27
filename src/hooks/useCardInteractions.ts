/**
 * サポート一覧で使うデータと操作を組み立てる
 *
 * サポートの表示データと画面操作を分け、一覧で必要な操作だけを共有する
 */
import { useCallback, useMemo } from 'react'
import type { CardDataContextValue, CardUIContextValue } from '../contexts/CardContext'
import type { SupportCard } from '../types/card'
import * as enums from '../types/enums'
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
  /** ユーザーサポート削除の共通保存処理。省略時は状態フックの操作を使う */
  deleteUserSupport?: (cardName: string) => void
  /** 凸数変更の共通保存処理。省略時は状態フックの操作を使う */
  updateCardUncap?: (cardName: string, uncap: enums.UncapType) => void
}

/**
 * サポート一覧で使うContext値と編集・削除操作を提供する
 *
 * @param params - アプリ状態と編成選択の接続状態
 * @returns 2種類のContext値とユーザーサポート操作
 */
export function useCardInteractions({
  state,
  selection,
  deleteUserSupport,
  updateCardUncap,
}: UseCardInteractionsParams): CardInteractions {
  // Contextへ渡す操作と、ユーザー追加サポートの編集操作を状態から取り出す
  const { handleCardClick, handleScoreClick, handleUncapChange, handleToggleUncapEdit, handleToggleCardExcluded } =
    state.handlers
  const { setEditingUserCard, setUserCardFormOpen } = state.ui
  const { deleteUserCard: removeUserCard } = state.userCards
  const { handleManualCardClick } = selection

  // 一覧のクリック入口を共通にし、現在の操作モードに応じて処理を振り分ける
  const onCardClick = useCallback(
    (card: SupportCard) => {
      if (state.ui.cardListMode === enums.CardListInteractionModeType.CardExclusionEdit) {
        handleToggleCardExcluded(card.name)
        return
      }
      if (state.ui.cardListMode === enums.CardListInteractionModeType.UnitCardSelect) {
        handleManualCardClick(card)
        return
      }
      handleCardClick(card)
    },
    [handleCardClick, handleManualCardClick, handleToggleCardExcluded, state.ui.cardListMode],
  )

  // 編集対象を先に保持してから、ユーザーサポートフォームを開く
  const editUserCard = useCallback(
    (card: SupportCard) => {
      // 編集対象を先に保存してから、フォームモーダルを開く
      setEditingUserCard(card)
      setUserCardFormOpen(true)
    },
    [setEditingUserCard, setUserCardFormOpen],
  )

  // 渡された共通commandを優先し、未指定時は状態hookへ委譲する
  const deleteUserCard = useCallback(
    (cardName: string) => {
      // 一覧側で状態を直接変更せず、ユーザーサポートの更新処理に通す
      if (deleteUserSupport) {
        deleteUserSupport(cardName)
        return
      }
      removeUserCard(cardName)
    },
    [deleteUserSupport, removeUserCard],
  )

  // 一覧へ渡すカードデータ操作のContext値
  const dataContext = useMemo<CardDataContextValue>(
    () => ({
      getCardUncap: state.scores.getCardUncap,
      onCardClick,
      onScoreClick: handleScoreClick,
      onUncapChange: updateCardUncap ?? handleUncapChange,
      isCardExcluded: state.exclusions.isCardExcluded,
    }),
    [
      state.scores.getCardUncap,
      onCardClick,
      handleScoreClick,
      handleUncapChange,
      state.exclusions.isCardExcluded,
      updateCardUncap,
    ],
  )

  // 一覧へ渡す表示状態と選択可否のContext値
  const uiContext = useMemo<CardUIContextValue>(
    () => ({
      cardListMode: state.ui.cardListMode,
      uncapEditMode: state.ui.uncapEditMode,
      onToggleUncapEdit: handleToggleUncapEdit,
      isCardEligible: selection.isCardEligible,
      eligibilityVersion: selection.eligibilityVersion,
    }),
    [
      state.ui.cardListMode,
      state.ui.uncapEditMode,
      handleToggleUncapEdit,
      selection.isCardEligible,
      selection.eligibilityVersion,
    ],
  )

  return { dataContext, uiContext, editUserCard, deleteUserCard }
}

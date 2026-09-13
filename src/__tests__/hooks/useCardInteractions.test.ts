/**
 * サポート一覧の共通クリック入口が、操作モードに応じて処理を振り分けることを検証する。
 */
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as data from '../../data'
import { useCardInteractions } from '../../hooks/useCardInteractions'
import type { AppState } from '../../hooks/useAppState'
import type { UnitCardSelectionBridge } from '../../hooks/useUnitCardSelectionBridge'
import * as enums from '../../types/enums'

const targetCard = data.AllCards[0]

function createState(cardListMode: enums.CardListInteractionModeType): AppState {
  return {
    handlers: {
      handleCardClick: vi.fn(),
      handleScoreClick: vi.fn(),
      handleUncapChange: vi.fn(),
      handleToggleUncapEdit: vi.fn(),
      handleToggleCardExclusionMode: vi.fn(),
      handleToggleCardExcluded: vi.fn(),
    },
    ui: {
      cardListMode,
      uncapEditMode: false,
      setEditingUserCard: vi.fn(),
      setUserCardFormOpen: vi.fn(),
    },
    userCards: {
      deleteUserCard: vi.fn(),
    },
    scores: {
      getCardUncap: vi.fn(() => enums.UncapType.Four),
    },
    exclusions: {
      isCardExcluded: vi.fn(() => false),
    },
  } as unknown as AppState
}

function createSelection(): UnitCardSelectionBridge {
  return {
    handleManualCardClick: vi.fn(),
    isCardEligible: vi.fn(() => true),
    eligibilityVersion: 0,
  } as unknown as UnitCardSelectionBridge
}

describe('useCardInteractions', () => {
  it('除外設定中も共通のカードクリック入口から除外切り替えへ渡す', () => {
    const state = createState(enums.CardListInteractionModeType.CardExclusionEdit)
    const selection = createSelection()

    const { result } = renderHook(() => useCardInteractions({ state, selection }))

    act(() => result.current.dataContext.onCardClick(targetCard))

    expect(state.handlers.handleToggleCardExcluded).toHaveBeenCalledWith(targetCard.name)
    expect(selection.handleManualCardClick).not.toHaveBeenCalled()
  })

  it('通常時は詳細表示へ、手動選択時は選択ブリッジへ共通入口から渡す', () => {
    const selection = createSelection()
    const state = createState(enums.CardListInteractionModeType.None)
    const { result, rerender } = renderHook(() => useCardInteractions({ state, selection }))

    act(() => result.current.dataContext.onCardClick(targetCard))
    expect(state.handlers.handleCardClick).toHaveBeenCalledWith(targetCard)
    expect(selection.handleManualCardClick).not.toHaveBeenCalled()

    state.ui.cardListMode = enums.CardListInteractionModeType.UnitCardSelect
    rerender()
    act(() => result.current.dataContext.onCardClick(targetCard))
    expect(selection.handleManualCardClick).toHaveBeenCalledWith(targetCard)
  })
})

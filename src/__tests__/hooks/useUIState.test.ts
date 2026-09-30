/** サポート一覧の操作モードと凸数編集状態の関係を検証する。 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useUIState } from '../../hooks/useUIState'
import { CardListInteractionModeType } from '../../types/enums'

function stubViewport(): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: true,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useUIState - サポート一覧操作モード', () => {
  it('凸数編集は独立し、除外設定と手動編成だけを相互排他にする', () => {
    stubViewport()
    const { result } = renderHook(() => useUIState())

    expect(result.current.cardListMode).toBe(CardListInteractionModeType.None)
    expect(result.current.uncapEditMode).toBe(false)

    act(() => result.current.toggleUncapEditMode())
    expect(result.current.uncapEditMode).toBe(true)

    act(() => result.current.toggleCardListMode(CardListInteractionModeType.CardExclusionEdit))
    expect(result.current.cardListMode).toBe(CardListInteractionModeType.CardExclusionEdit)
    expect(result.current.uncapEditMode).toBe(true)

    act(() => result.current.setCardListMode(CardListInteractionModeType.UnitCardSelect))
    expect(result.current.cardListMode).toBe(CardListInteractionModeType.UnitCardSelect)
    expect(result.current.uncapEditMode).toBe(true)

    act(() => result.current.toggleCardListMode(CardListInteractionModeType.UnitCardSelect))
    expect(result.current.cardListMode).toBe(CardListInteractionModeType.None)

    act(() => result.current.setUncapEditMode(false))
    expect(result.current.uncapEditMode).toBe(false)
  })
})

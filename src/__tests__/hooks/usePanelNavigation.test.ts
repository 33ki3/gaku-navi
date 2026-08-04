/**
 * 設定パネル遷移の表示幅別ルールを検証する
 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePanelNavigation } from '../../hooks/usePanelNavigation'
import { useUIState } from '../../hooks/useUIState'

/**
 * matchMediaが指定した表示幅を返すようにする
 *
 * @param desktop - PC幅として扱うか
 * @returns 戻り値なし
 */
function stubViewport(desktop: boolean): void {
  // ナビゲーションが表示幅を判定できるよう、matchMediaの結果だけをテスト用に固定する
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: desktop,
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

describe('usePanelNavigation', () => {
  it('PCの一覧操作では点数設定を固定表示する', () => {
    stubViewport(true)
    const toggleUncapEdit = vi.fn()
    const { result } = renderHook(() => {
      const ui = useUIState()
      return { ui, navigation: usePanelNavigation({ ui, toggleUncapEdit }) }
    })

    // PCの一覧から開く操作は、重ね合わせではなく右側の固定パネルを選ぶ
    act(() => result.current.navigation.openScoreSettingsFromList())

    // 固定フラグだけがONになり、通常のオーバーレイ表示はOFFである
    expect(result.current.ui.settingsPinned).toBe(true)
    expect(result.current.ui.scoreSettingsOpen).toBe(false)
  })

  it('スマホでは同じパネルを再選択すると閉じる', () => {
    stubViewport(false)
    const toggleUncapEdit = vi.fn()
    const { result } = renderHook(() => {
      const ui = useUIState()
      return { ui, navigation: usePanelNavigation({ ui, toggleUncapEdit }) }
    })

    // 1回目は点数設定を開き、2回目は同じメニューの再選択として扱う
    act(() => result.current.navigation.openScoreSettings())
    expect(result.current.ui.scoreSettingsOpen).toBe(true)

    act(() => result.current.navigation.openScoreSettings())
    // 同じパネルを再選択した結果、トグルとして閉じられる
    expect(result.current.ui.scoreSettingsOpen).toBe(false)
  })

  it('スマホで最適編成を開くと競合する点数設定と固定状態を閉じる', () => {
    stubViewport(false)
    const toggleUncapEdit = vi.fn()
    const { result } = renderHook(() => {
      const ui = useUIState()
      return { ui, navigation: usePanelNavigation({ ui, toggleUncapEdit }) }
    })

    // 先に点数設定を開いて固定状態にもしておき、競合する状態を作る
    act(() => {
      result.current.ui.setScoreSettingsOpen(true)
      result.current.ui.setSettingsPinned(true)
    })
    // 最適編成を開く操作では、スマホの排他ルールにより点数設定を閉じる
    act(() => result.current.navigation.openUnitSimulator())

    // 最適編成だけが開き、点数設定の通常/固定状態はどちらも解除される
    expect(result.current.ui.simulatorOpen).toBe(true)
    expect(result.current.ui.scoreSettingsOpen).toBe(false)
    expect(result.current.ui.settingsPinned).toBe(false)
  })

  it('スマホの凸数編集開始時は設定パネルを閉じてから既存操作を呼ぶ', () => {
    stubViewport(false)
    const toggleUncapEdit = vi.fn()
    const { result } = renderHook(() => {
      const ui = useUIState()
      return { ui, navigation: usePanelNavigation({ ui, toggleUncapEdit }) }
    })

    // 凸数編集開始前に両パネルを開き、開始操作が先に閉じることを検証する
    act(() => {
      result.current.ui.setScoreSettingsOpen(true)
      result.current.ui.setSimulatorOpen(true)
    })
    act(() => result.current.navigation.toggleMobileUncapEdit())

    // 既存の凸数編集ハンドラが1回呼ばれ、両方の設定パネルが閉じている
    expect(result.current.ui.scoreSettingsOpen).toBe(false)
    expect(result.current.ui.simulatorOpen).toBe(false)
    expect(toggleUncapEdit).toHaveBeenCalledOnce()
  })
})

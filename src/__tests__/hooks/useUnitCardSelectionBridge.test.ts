/**
 * サポート一覧と最適編成パネルの選択接続を検証する
 */
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as data from '../../data'
import { useUnitCardSelectionBridge } from '../../hooks/useUnitCardSelectionBridge'

/** テストで選択する実在サポート */
const targetCard = data.AllCards[0]

describe('useUnitCardSelectionBridge', () => {
  it('手動選択モード外のカードクリックは追加しない', () => {
    const addManualCard = vi.fn()
    const { result } = renderHook(() =>
      useUnitCardSelectionBridge({
        selectionMode: false,
        setSelectionMode: vi.fn(),
        isMobileViewport: () => false,
        openUnitSimulator: vi.fn(),
      }),
    )

    // 選択モードOFFで手動選択用のクリック処理を呼んでも追加しない
    act(() => {
      result.current.registerAddManualCard(addManualCard)
      result.current.handleManualCardClick(targetCard)
    })

    expect(addManualCard).not.toHaveBeenCalled()
  })

  it('選択モード中は登録された追加処理へサポート名を渡す', () => {
    const addManualCard = vi.fn()
    const { result } = renderHook(() =>
      useUnitCardSelectionBridge({
        selectionMode: true,
        setSelectionMode: vi.fn(),
        isMobileViewport: () => false,
        openUnitSimulator: vi.fn(),
      }),
    )

    // 選択モード用の追加処理を登録してから、カードクリックを発生させる
    act(() => {
      result.current.registerAddManualCard(addManualCard)
      result.current.handleManualCardClick(targetCard)
    })

    // 選択中はカードオブジェクト全体ではなく、追加処理が扱うカード名だけを渡す
    expect(addManualCard).toHaveBeenCalledWith(targetCard.name)
  })

  it('選択可否判定の登録を一覧へ伝え、登録した条件を使う', () => {
    const { result } = renderHook(() =>
      useUnitCardSelectionBridge({
        selectionMode: true,
        setSelectionMode: vi.fn(),
        isMobileViewport: () => false,
        openUnitSimulator: vi.fn(),
      }),
    )
    // 登録前のバージョンを保存し、登録による一覧再評価の通知を比較する
    const initialVersion = result.current.eligibilityVersion

    // 常にfalseを返す判定を登録する
    act(() => result.current.registerIsCardEligible(() => false))

    // バージョンが1つ進み、対象カードも選択不可として評価される
    expect(result.current.eligibilityVersion).toBe(initialVersion + 1)
    expect(result.current.isCardEligible(targetCard)).toBe(false)
  })

  it('スマホで選択を完了すると選択モードを解除して最適編成へ戻る', () => {
    const setSelectionMode = vi.fn()
    const openUnitSimulator = vi.fn()
    const requestMobileNavigationShow = vi.fn()
    const { result } = renderHook(() =>
      useUnitCardSelectionBridge({
        selectionMode: true,
        setSelectionMode,
        isMobileViewport: () => true,
        openUnitSimulator,
        requestMobileNavigationShow,
      }),
    )
    // 完了操作では選択モードを解除し、スマホだけ最適編成パネルを再表示する
    act(() => result.current.finishSelection())

    // 選択解除とパネル再表示が、それぞれ1回ずつ通知される
    expect(setSelectionMode).toHaveBeenCalledWith(false)
    expect(requestMobileNavigationShow).toHaveBeenCalledOnce()
    expect(openUnitSimulator).toHaveBeenCalledOnce()
  })
})

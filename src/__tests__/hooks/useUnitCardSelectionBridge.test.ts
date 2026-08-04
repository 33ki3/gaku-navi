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
  it('通常時のカードクリックは詳細表示へ渡す', () => {
    const openCardDetail = vi.fn()
    const { result } = renderHook(() =>
      useUnitCardSelectionBridge({
        selectionMode: false,
        setSelectionMode: vi.fn(),
        openCardDetail,
        openScoreDetail: vi.fn(),
        isMobileViewport: () => false,
        openUnitSimulator: vi.fn(),
      }),
    )

    // 選択モードOFFでカードをクリックし、通常の詳細表示へ渡す
    act(() => result.current.onCardClick(targetCard))

    // 詳細ハンドラには、一覧でクリックした同じカードがそのまま渡される
    expect(openCardDetail).toHaveBeenCalledWith(targetCard)
  })

  it('選択モード中は登録された追加処理へサポート名を渡す', () => {
    const addManualCard = vi.fn()
    const openCardDetail = vi.fn()
    const { result } = renderHook(() =>
      useUnitCardSelectionBridge({
        selectionMode: true,
        setSelectionMode: vi.fn(),
        openCardDetail,
        openScoreDetail: vi.fn(),
        isMobileViewport: () => false,
        openUnitSimulator: vi.fn(),
      }),
    )

    // 選択モード用の追加処理を登録してから、カードクリックを発生させる
    act(() => {
      result.current.registerAddManualCard(addManualCard)
      result.current.onCardClick(targetCard)
    })

    // 選択中はカードオブジェクト全体ではなく、追加処理が扱うカード名だけを渡す
    expect(addManualCard).toHaveBeenCalledWith(targetCard.name)
    expect(openCardDetail).not.toHaveBeenCalled()
  })

  it('パネルの追加処理が未登録でも、選択したサポートを登録後に引き渡す', () => {
    const addManualCard = vi.fn()
    const { result } = renderHook(() =>
      useUnitCardSelectionBridge({
        selectionMode: true,
        setSelectionMode: vi.fn(),
        openCardDetail: vi.fn(),
        openScoreDetail: vi.fn(),
        isMobileViewport: () => true,
        openUnitSimulator: vi.fn(),
      }),
    )

    // 先にクリックして保留し、後からパネル側の追加処理を登録する順序を再現する
    act(() => result.current.onCardClick(targetCard))
    act(() => result.current.registerAddManualCard(addManualCard))

    // 保留されたカードが登録直後に1回だけ引き渡される
    expect(addManualCard).toHaveBeenCalledOnce()
    expect(addManualCard).toHaveBeenCalledWith(targetCard.name)
  })

  it('選択可否判定の登録を一覧へ伝え、登録した条件を使う', () => {
    const { result } = renderHook(() =>
      useUnitCardSelectionBridge({
        selectionMode: true,
        setSelectionMode: vi.fn(),
        openCardDetail: vi.fn(),
        openScoreDetail: vi.fn(),
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
        openCardDetail: vi.fn(),
        openScoreDetail: vi.fn(),
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

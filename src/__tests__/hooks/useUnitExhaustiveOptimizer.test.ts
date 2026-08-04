/**
 * 総当たり最適化hookの完了直前の進捗表示を検証する。
 *
 * 計算完了通知を受け取ったら、満タン表示を1フレーム描画してから進捗状態を片付けることを確認する
 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_UNIT_SIMULATOR_SETTINGS } from '../../constant/settings'
import type { OptimizeInput } from '../../types/unitOptimizer'

vi.mock('../../hooks/unitOptimizerRunner', () => ({
  runOptimizerAsync: vi.fn(),
}))

import { runOptimizerAsync } from '../../hooks/unitOptimizerRunner'
import { useUnitExhaustiveOptimizer } from '../../hooks/useUnitExhaustiveOptimizer'

describe('useUnitExhaustiveOptimizer', () => {
  let frameCallbacks: FrameRequestCallback[]

  beforeEach(() => {
    frameCallbacks = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frameCallbacks.push(callback)
      return frameCallbacks.length
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('完了通知時に満タン表示を描画してから進捗表示を片付ける', () => {
    vi.mocked(runOptimizerAsync).mockImplementation(({ onProgress, onDone }) => {
      // 最後に届いた進捗を80%として、完了通知だけが続く状況を再現する
      onProgress(8, 10)
      onDone(null)
      return null
    })

    const { result } = renderHook(() =>
      useUnitExhaustiveOptimizer({
        settings: DEFAULT_UNIT_SIMULATOR_SETTINGS,
        buildRuntimeInput: vi.fn(() => ({}) as OptimizeInput),
        applyOptimizedResult: vi.fn(),
        setResult: vi.fn(),
        setHasCalculated: vi.fn(),
        setIsCalculating: vi.fn(),
      }),
    )

    act(() => result.current.optimizeRemaining())
    // 最初のフレームでrunnerを起動し、完了通知後の表示を確認する
    act(() => frameCallbacks.shift()?.(0))

    // 完了通知直後は、直前の80%から100%へ進んだ状態を1フレーム保持する
    expect(result.current.exhaustiveProgress).toEqual({ done: 10, total: 10 })

    // 1回目の完了フレームでは、満タン表示を維持して次の描画を待つ
    act(() => frameCallbacks.shift()?.(0))
    expect(result.current.exhaustiveProgress).toEqual({ done: 10, total: 10 })

    // 2回目の完了フレームで結果表示へ移行し、進捗状態を破棄する
    act(() => frameCallbacks.shift()?.(0))
    expect(result.current.exhaustiveProgress).toBeNull()
  })

  it('総量到達の進捗イベントではバーを満タンにする', () => {
    vi.mocked(runOptimizerAsync).mockImplementation(({ onProgress }) => {
      // 完了通知前に総量到達イベントだけが届く状況を再現する
      onProgress(10, 10)
      return null
    })

    const { result } = renderHook(() =>
      useUnitExhaustiveOptimizer({
        settings: DEFAULT_UNIT_SIMULATOR_SETTINGS,
        buildRuntimeInput: vi.fn(() => ({}) as OptimizeInput),
        applyOptimizedResult: vi.fn(),
        setResult: vi.fn(),
        setHasCalculated: vi.fn(),
        setIsCalculating: vi.fn(),
      }),
    )

    act(() => result.current.optimizeRemaining())
    act(() => frameCallbacks.shift()?.(0))

    // 総量到達イベントを受け取った時点で、表示値を100%へ更新する
    expect(result.current.exhaustiveProgress).toEqual({ done: 10, total: 10 })
  })
})

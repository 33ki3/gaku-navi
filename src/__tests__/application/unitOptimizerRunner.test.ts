/**
 * 最適編成計算の共通実行と中断の扱いを検証する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as constant from '../../constant'
import * as data from '../../data'
import { ApplicationOperationStatus } from '../../types/application'
import type { OptimizeInput } from '../../types/unitOptimizer'
import { createDefaultSettings } from '../../utils/scoreSettings'

vi.mock('../../utils/unitSimulator', () => ({
  exhaustiveOptimizeAsync: vi.fn(),
}))

import { runUnitOptimizer } from '../../application/unitOptimizerRunner'
import { exhaustiveOptimizeAsync } from '../../utils/unitSimulator'

function createInput(): OptimizeInput {
  return {
    settings: constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
    scoreSettings: createDefaultSettings(),
    cardUncaps: {},
    cardCountCustom: {},
    allCards: [...data.AllCards],
    cardByName: new Map(data.AllCards.map((card) => [card.name, card])),
    excludedCardNames: [],
  }
}

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  terminate = vi.fn()
  postMessage = vi.fn()
}

describe('application/unitOptimizerRunner', () => {
  const mockedExhaustive = vi.mocked(exhaustiveOptimizeAsync)
  let originalWorker: typeof Worker | undefined

  beforeEach(() => {
    originalWorker = globalThis.Worker
    mockedExhaustive.mockReset()
  })

  afterEach(() => {
    if (originalWorker) vi.stubGlobal('Worker', originalWorker)
    else Reflect.deleteProperty(globalThis, 'Worker')
    vi.restoreAllMocks()
  })

  it('Worker未対応環境ではPromise形式で完了結果を返す', async () => {
    Reflect.deleteProperty(globalThis, 'Worker')
    mockedExhaustive.mockResolvedValueOnce(null)

    const result = await runUnitOptimizer({ input: createInput() })

    expect(result).toEqual({ status: ApplicationOperationStatus.Complete, result: null })
    expect(mockedExhaustive).toHaveBeenCalledTimes(1)
  })

  it('開始前にAbortSignalが中断済みなら計算を起動しない', async () => {
    Reflect.deleteProperty(globalThis, 'Worker')
    const controller = new AbortController()
    controller.abort()

    const result = await runUnitOptimizer({ input: createInput(), signal: controller.signal })

    expect(result).toEqual({ status: ApplicationOperationStatus.Aborted, result: null })
    expect(mockedExhaustive).not.toHaveBeenCalled()
  })

  it('Worker実行中のAbortSignalでWorkerを終了しPromiseを中断する', async () => {
    const worker = new MockWorker()
    vi.stubGlobal('Worker', function WorkerConstructor() {
      return worker
    })
    const controller = new AbortController()

    const resultPromise = runUnitOptimizer({ input: createInput(), signal: controller.signal })
    controller.abort()
    const result = await resultPromise

    expect(result).toEqual({ status: ApplicationOperationStatus.Aborted, result: null })
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })

  it('main thread実行中のAbortSignalでPromiseを即時中断する', async () => {
    Reflect.deleteProperty(globalThis, 'Worker')
    let resolveOptimization: ((result: null) => void) | undefined
    mockedExhaustive.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveOptimization = resolve
        }),
    )
    const controller = new AbortController()
    const resultPromise = runUnitOptimizer({ input: createInput(), signal: controller.signal })
    await Promise.resolve()

    controller.abort()
    await expect(resultPromise).resolves.toEqual({ status: ApplicationOperationStatus.Aborted, result: null })
    resolveOptimization?.(null)
  })
})

/**
 * 最適編成のバックグラウンド計算の動作を検証する
 *
 * バックグラウンド計算を使う経路と画面側へ切り替える経路、失敗時の復帰を検証する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../utils/unitSimulator', () => ({
  exhaustiveOptimizeAsync: vi.fn(),
}))

import { runOptimizerAsync } from '../../application/unitOptimizerRunner'
import * as enums from '../../types/enums'
import type { UnitOptimizerWorkerResponseMessage } from '../../types/unitOptimizerWorker'
import { UnitOptimizerWorkerMessageType } from '../../types/unitOptimizerWorker'
import type { OptimizeInput } from '../../utils/unitSimulator'
import { exhaustiveOptimizeAsync } from '../../utils/unitSimulator'

// テスト用最適化入力を作成する
function makeInput(): OptimizeInput {
  return {
    settings: {
      plan: enums.PlanType.Logic,
      allowedTypes: [enums.CardType.Vocal, enums.CardType.Dance, enums.CardType.Visual],
      spConstraint: { vocal: 0, dance: 0, visual: 0 },
      typeCountMin: {
        [enums.ParameterType.Vocal]: 0,
        [enums.ParameterType.Dance]: 0,
        [enums.ParameterType.Visual]: 0,
      },
      typeCountMax: {
        [enums.ParameterType.Vocal]: 6,
        [enums.ParameterType.Dance]: 6,
        [enums.ParameterType.Visual]: 6,
      },
      paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
      manualRental: false,
      rentalCardName: null,
      lockedCards: [],
      manualCards: [],
      excludedCardNames: [],
      initialParams: { vocal: 0, dance: 0, visual: 0 },
      exhaustiveCandidateLimit: 10,
    },
    scoreSettings: {
      name: 'test',
      scenario: enums.ScenarioType.Hajime,
      difficulty: enums.DifficultyType.Regular,
      useFixedUncap: true,
      useCustomMode: false,
      customParamBonusRows: [{ vocal: 0, dance: 0, visual: 0 }],
      customClassBonus: { vocal: 0, dance: 0, visual: 0 },
      customNonBonusGain: { vocal: 0, dance: 0, visual: 0 },
      hifExamRatios: [
        { vocal: 0, dance: 0, visual: 0 },
        { vocal: 0, dance: 0, visual: 0 },
        { vocal: 0, dance: 0, visual: 0 },
      ],
      hifLessonSplitSub: true,
      scheduleSelections: {},
      useScheduleLimits: false,
      includeSelfTrigger: true,
      includePItem: true,
      parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
      actionCounts: {},
    },
    cardUncaps: {},
    excludedCardNames: [],
    allCards: [],
    cardByName: new Map(),
  }
}

/** テスト用のバックグラウンド計算モック */
class MockWorker {
  onmessage: ((event: MessageEvent<UnitOptimizerWorkerResponseMessage>) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  terminate = vi.fn()
  postMessage = vi.fn()

  // バックグラウンド計算の通知を疑似的に受け取らせる
  emitMessage(message: UnitOptimizerWorkerResponseMessage): void {
    this.onmessage?.({ data: message } as MessageEvent<UnitOptimizerWorkerResponseMessage>)
  }
}

/**
 * ブラウザのバックグラウンド計算機能を差し替えるテスト用の生成関数を作る
 *
 * @param workerInstance - 差し替え先として返すバックグラウンド計算のインスタンス
 * @returns バックグラウンド計算の生成関数として使える関数
 */
function createWorkerConstructor(workerInstance: MockWorker): typeof Worker {
  return function WorkerConstructor() {
    return workerInstance
  } as unknown as typeof Worker
}

describe('runOptimizerAsync', () => {
  const mockedExhaustive = vi.mocked(exhaustiveOptimizeAsync)
  let originalWorker: typeof Worker | undefined

  beforeEach(() => {
    originalWorker = globalThis.Worker
    mockedExhaustive.mockReset()
  })

  afterEach(() => {
    if (originalWorker) {
      vi.stubGlobal('Worker', originalWorker)
    } else {
      Reflect.deleteProperty(globalThis, 'Worker')
    }
    vi.restoreAllMocks()
  })

  it('Worker 未対応環境では main thread 実行にフォールバックする', async () => {
    // バックグラウンド計算を無効化して、画面側で実行する経路を通す
    Reflect.deleteProperty(globalThis, 'Worker')
    mockedExhaustive.mockResolvedValueOnce(null)

    const onDone = vi.fn()
    const worker = runOptimizerAsync({
      input: makeInput(),
      isCancelled: () => false,
      onProgress: vi.fn(),
      onBetter: vi.fn(),
      onDone,
    })

    expect(worker).toBeNull()
    // 非同期処理の後続処理が終わるまで待つ
    await Promise.resolve()

    expect(mockedExhaustive).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledWith(null)
  })

  it('main thread 実行でキャンセル済みかつ null 結果なら onDone を呼ばない', async () => {
    // キャンセル済み状態を固定して onDone 抑止を確認する
    Reflect.deleteProperty(globalThis, 'Worker')
    mockedExhaustive.mockResolvedValueOnce(null)

    const onDone = vi.fn()
    runOptimizerAsync({
      input: makeInput(),
      isCancelled: () => true,
      onProgress: vi.fn(),
      onBetter: vi.fn(),
      onDone,
    })

    await Promise.resolve()

    expect(mockedExhaustive).toHaveBeenCalledTimes(1)
    expect(onDone).not.toHaveBeenCalled()
  })

  it('Worker メッセージに応じて progress/better/done を通知する', () => {
    // バックグラウンド計算を差し替え、受信イベントを手動で流し込む
    const workerInstance = new MockWorker()
    vi.stubGlobal('Worker', createWorkerConstructor(workerInstance))

    const onProgress = vi.fn()
    const onBetter = vi.fn()
    const onDone = vi.fn()

    const returned = runOptimizerAsync({
      input: makeInput(),
      isCancelled: () => false,
      onProgress,
      onBetter,
      onDone,
    })

    expect(returned).toBe(workerInstance)
    expect(workerInstance.postMessage).toHaveBeenCalledTimes(1)

    // 進捗イベントを受信したら onProgress が呼ばれる
    workerInstance.emitMessage({
      type: UnitOptimizerWorkerMessageType.Progress,
      payload: { done: 3, total: 10 },
    })
    expect(onProgress).toHaveBeenCalledWith(3, 10)

    // 中間ベストイベントを受信したら onBetter が呼ばれる
    workerInstance.emitMessage({
      type: UnitOptimizerWorkerMessageType.Better,
      payload: {
        result: {
          members: [],
          totalScore: 100,
          totalParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
          parameterBonus: { vocal: 0, dance: 0, visual: 0 },
          parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
          outsideParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
        },
      },
    })
    expect(onBetter).toHaveBeenCalledTimes(1)

    // 完了通知でバックグラウンド計算の終了と完了通知が行われる
    workerInstance.emitMessage({
      type: UnitOptimizerWorkerMessageType.Done,
      payload: { result: null },
    })
    expect(workerInstance.terminate).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledWith(null)
  })

  it('Worker が Error を返した場合は main thread へフォールバックする', async () => {
    // バックグラウンド計算側の失敗時に画面側へ切り替わることを確認する
    const workerInstance = new MockWorker()
    vi.stubGlobal('Worker', createWorkerConstructor(workerInstance))

    mockedExhaustive.mockResolvedValueOnce(null)

    const onDone = vi.fn()
    runOptimizerAsync({
      input: makeInput(),
      isCancelled: () => false,
      onProgress: vi.fn(),
      onBetter: vi.fn(),
      onDone,
    })

    workerInstance.emitMessage({
      type: UnitOptimizerWorkerMessageType.Error,
      payload: { message: 'failed' },
    })

    await Promise.resolve()

    expect(workerInstance.terminate).toHaveBeenCalledTimes(1)
    expect(mockedExhaustive).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledWith(null)
  })
})

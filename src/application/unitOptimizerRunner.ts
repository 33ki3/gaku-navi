/**
 * 最適編成計算を補助スレッドまたは画面側で実行する共通処理
 *
 * 画面操作と条件比較が同じ実行経路を使えるよう、補助スレッドの起動・進捗・
 * 中断・利用できない場合の代替実行をここへ集約する
 */
import * as constant from '../constant'
import type { ApplicationOperationStatusType } from '../types/application'
import { ApplicationOperationStatus } from '../types/application'
import type { UnitResult } from '../types/unit'
import type { OptimizeInput } from '../types/unitOptimizer'
import type {
  UnitOptimizerWorkerInput,
  UnitOptimizerWorkerRequestMessage,
  UnitOptimizerWorkerResponseMessage,
} from '../types/unitOptimizerWorker'
import { UnitOptimizerWorkerMessageType } from '../types/unitOptimizerWorker'
import { exhaustiveOptimizeAsync } from '../utils/unitSimulator'

/** 進捗と結果を通知する最適化の実行設定 */
interface RunOptimizerOptions {
  /** 最適化入力 */
  input: OptimizeInput
  /** 実行を中断するか確認する関数 */
  isCancelled: () => boolean
  /** 外部からの中断通知。省略時は従来のisCancelledだけを使う */
  signal?: AbortSignal
  /** 進捗通知（done / total 件数） */
  onProgress: (done: number, total: number) => void
  /** 途中経過ベスト結果通知 */
  onBetter: (result: UnitResult) => void
  /** 完了通知（キャンセルされた場合は呼ばれない） */
  onDone: (result: UnitResult | null) => void
  /** AbortSignalまたはisCancelledで中断したときの通知 */
  onCancel?: () => void
}

/** 最適化を非同期で実行するための設定 */
interface RunUnitOptimizerOptions {
  /** 最適化入力 */
  input: OptimizeInput
  /** WebMCPや画面操作から渡される中断通知 */
  signal?: AbortSignal
  /** 中断通知以外の実行中断条件 */
  isCancelled?: () => boolean
  /** 進捗通知 */
  onProgress?: (done: number, total: number) => void
  /** 途中経過ベスト結果通知 */
  onBetter?: (result: UnitResult) => void
}

/** 非同期最適化の終了状態と結果 */
interface UnitOptimizerRunResult {
  /** 完了・AbortSignal中断・その他のキャンセルを区別する */
  status: Exclude<ApplicationOperationStatusType, typeof ApplicationOperationStatus.Stale>
  /** 完了した場合の結果。候補がなければnull */
  result: UnitResult | null
}

/**
 * 補助スレッドまたは画面側で総当たり最適化を非同期実行する
 *
 * 補助スレッドを利用できない場合や、起動・計算に失敗した場合は画面側でやり直す
 * 中断された場合は計算を止め、完了結果ではなく中断だけを通知する
 *
 * @param options - 実行オプション
 * @returns 起動した補助スレッド（画面側で実行した場合はnull）
 */
export function runOptimizerAsync(options: RunOptimizerOptions): Worker | null {
  const { input, isCancelled, signal, onProgress, onBetter, onDone, onCancel } = options
  let activeWorker: Worker | null = null
  let finished = false

  const isSignalAborted = () => signal?.aborted ?? false
  const shouldCancel = () => isSignalAborted() || isCancelled()
  let handleAbort = () => {}
  const cleanupSignal = () => signal?.removeEventListener(constant.ABORT_EVENT_NAME, handleAbort)
  // 中断時は完了通知を出さず、登録した中断監視だけを片付ける
  const notifyCancel = () => {
    if (finished) return
    finished = true
    cleanupSignal()
    onCancel?.()
  }
  // 完了時は中断通知と重複しないよう、一度だけ結果を返す
  const finish = (result: UnitResult | null) => {
    if (finished) return
    finished = true
    cleanupSignal()
    onDone(result)
  }
  // 中断通知を受けたら、補助スレッドを止めてから中断結果を確定する
  handleAbort = () => {
    activeWorker?.terminate()
    activeWorker = null
    notifyCancel()
  }

  if (isSignalAborted()) {
    notifyCancel()
    return null
  }
  signal?.addEventListener(constant.ABORT_EVENT_NAME, handleAbort, { once: true })

  /**
   * 画面側で最適化を実行する
   *
   * @returns 計算を開始し、結果は通知操作で受け取る
   */
  const runOnMainThread = () => {
    if (finished) return
    void exhaustiveOptimizeAsync(
      input,
      (done, total) => {
        if (!shouldCancel()) onProgress(done, total)
      },
      shouldCancel,
      (betterResult) => {
        if (!shouldCancel()) onBetter(betterResult)
      },
    )
      .then((result) => {
        if (finished) return
        if (shouldCancel()) {
          notifyCancel()
          return
        }
        finish(result)
      })
      .catch((error: unknown) => {
        if (finished) return
        if (shouldCancel()) {
          notifyCancel()
          return
        }
        console.error('Main-thread optimization failed:', error)
        finish(null)
      })
  }

  // 補助スレッドを使えない環境では、画面側で同じ計算を続ける
  if (typeof Worker === 'undefined') {
    runOnMainThread()
    return null
  }

  try {
    const worker = new Worker(new URL('../workers/unitOptimizerWorker.ts', import.meta.url), { type: 'module' })
    activeWorker = worker
    // 計算の準備中に中断された場合は、入力を送らずに終了する
    if (finished) {
      worker.terminate()
      activeWorker = null
      return null
    }

    worker.onmessage = (event: MessageEvent<UnitOptimizerWorkerResponseMessage>) => {
      if (finished) return
      // 中断通知を受けた場合は、監視側で補助スレッドを止める
      if (shouldCancel()) {
        handleAbort()
        return
      }
      const message = event.data

      if (message.type === UnitOptimizerWorkerMessageType.Progress) {
        onProgress(message.payload.done, message.payload.total)
        return
      }
      if (message.type === UnitOptimizerWorkerMessageType.Better && message.payload.result) {
        onBetter(message.payload.result)
        return
      }
      if (message.type === UnitOptimizerWorkerMessageType.Done) {
        // 計算が終わったら補助スレッドを片付けて結果を返す
        worker.terminate()
        activeWorker = null
        finish(message.payload.result)
        return
      }
      if (message.type === UnitOptimizerWorkerMessageType.Error) {
        // 補助スレッドで失敗した場合は、画面側で計算をやり直す
        worker.terminate()
        activeWorker = null
        console.error('Worker optimization failed:', message.payload.message)
        runOnMainThread()
      }
    }

    worker.onerror = () => {
      if (finished) return
      worker.terminate()
      activeWorker = null
      if (shouldCancel()) {
        notifyCancel()
        return
      }
      runOnMainThread()
    }

    // 補助スレッドへ必要な計算条件だけを渡す
    // カード一覧はそこで名前から探せる形にする
    const workerPayload: UnitOptimizerWorkerInput = {
      settings: input.settings,
      scoreSettings: input.scoreSettings,
      cardUncaps: input.cardUncaps,
      cardCountCustom: input.cardCountCustom,
      allCards: input.allCards,
      excludedCardNames: input.excludedCardNames,
    }
    const workerInput: UnitOptimizerWorkerRequestMessage = {
      type: UnitOptimizerWorkerMessageType.Start,
      payload: { input: workerPayload },
    }
    worker.postMessage(workerInput)
    return worker
  } catch {
    // 補助スレッドを作れない場合も、画面側で計算を続ける
    activeWorker = null
    runOnMainThread()
    return null
  }
}

/**
 * 通知を受け取る計算を、終了状態と結果を返す処理へ変換する
 *
 * @param options - 入力、中断通知、進捗・結果の通知
 * @returns 完了・中断状態と最適化結果
 */
export function runUnitOptimizer(options: RunUnitOptimizerOptions): Promise<UnitOptimizerRunResult> {
  return new Promise((resolve) => {
    let settled = false
    /**
     * 終了結果を一度だけ確定する
     *
     * @param result - 確定する最適化結果
     * @returns なし
     */
    const settle = (result: UnitOptimizerRunResult) => {
      if (settled) return
      settled = true
      resolve(result)
    }
    const isCancelled = () => options.signal?.aborted || options.isCancelled?.() || false

    if (isCancelled()) {
      settle({
        status: options.signal?.aborted ? ApplicationOperationStatus.Aborted : ApplicationOperationStatus.Cancelled,
        result: null,
      })
      return
    }

    runOptimizerAsync({
      input: options.input,
      isCancelled,
      signal: options.signal,
      onProgress: (done, total) => options.onProgress?.(done, total),
      onBetter: (result) => options.onBetter?.(result),
      onDone: (result) => {
        settle({
          status: isCancelled()
            ? options.signal?.aborted
              ? ApplicationOperationStatus.Aborted
              : ApplicationOperationStatus.Cancelled
            : ApplicationOperationStatus.Complete,
          result,
        })
      },
      onCancel: () => {
        settle({
          status: options.signal?.aborted ? ApplicationOperationStatus.Aborted : ApplicationOperationStatus.Cancelled,
          result: null,
        })
      },
    })
  })
}

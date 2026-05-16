/**
 * 編成最適化ランナー
 *
 * Worker または main thread で最適化を実行する。
 * Worker が利用できない場合・エラー時は自動的に main thread にフォールバックする。
 * Worker 内部の起動・メッセージ処理・エラー処理をすべてここに集約し、
 * フック側のコードを最小化する。
 */
import type { UnitResult } from '../types/unit'
import type {
  UnitOptimizerWorkerInput,
  UnitOptimizerWorkerRequestMessage,
  UnitOptimizerWorkerResponseMessage,
} from '../types/unitOptimizerWorker'
import { UnitOptimizerWorkerMessageType } from '../types/unitOptimizerWorker'
import { exhaustiveOptimizeAsync } from '../utils/unitSimulator'
import type { OptimizeInput } from '../utils/unitSimulator'

/** runOptimizerAsync に渡す実行オプション */
interface RunOptimizerOptions {
  /** 最適化入力 */
  input: OptimizeInput
  /** キャンセル判定（true を返すと処理を中断する） */
  isCancelled: () => boolean
  /** 進捗通知（done / total 件数） */
  onProgress: (done: number, total: number) => void
  /** 途中経過ベスト結果通知 */
  onBetter: (result: UnitResult) => void
  /** 完了通知（キャンセルされた場合は呼ばれない） */
  onDone: (result: UnitResult | null) => void
}

/**
 * Worker または main thread で総当たり最適化を非同期実行する
 *
 * Worker が利用できない・起動失敗・エラーの場合は main thread に自動フォールバックする。
 * isCancelled が true の場合は進捗・完了コールバックを呼ばない。
 *
 * @param options - 実行オプション
 * @returns 起動した Worker（main thread 実行時は null）
 */
export function runOptimizerAsync(options: RunOptimizerOptions): Worker | null {
  const { input, isCancelled, onProgress, onBetter, onDone } = options

  // main thread フォールバック: キャンセル確認をコールバック内でも行う
  const runOnMainThread = () => {
    exhaustiveOptimizeAsync(
      input,
      (done, total) => {
        if (isCancelled()) return
        onProgress(done, total)
      },
      isCancelled,
      (betterResult) => {
        if (isCancelled()) return
        onBetter(betterResult)
      },
    ).then((result) => {
      // main thread では isCancelled チェックは exhaustiveOptimizeAsync 側で行う
      // null 戻り = キャンセル済みのため onDone は呼ばない
      if (result !== null || !isCancelled()) onDone(result)
    })
  }

  // Worker が使えない環境（Node.js や SSR 等）は即座に main thread へ
  if (typeof Worker === 'undefined') {
    runOnMainThread()
    return null
  }

  try {
    const worker = new Worker(new URL('../workers/unitOptimizerWorker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (event: MessageEvent<UnitOptimizerWorkerResponseMessage>) => {
      // キャンセル済みの場合はメッセージを無視する（Worker は呼び出し元が終了させる）
      if (isCancelled()) return
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
        // 正常完了: Worker を自己終了させてから完了通知する
        worker.terminate()
        onDone(message.payload.result)
        return
      }
      if (message.type === UnitOptimizerWorkerMessageType.Error) {
        // Worker エラー: 自己終了後に main thread でリトライする
        worker.terminate()
        console.error('Worker optimization failed:', message.payload.message)
        runOnMainThread()
      }
    }

    worker.onerror = () => {
      // 予期しない Worker エラー: main thread にフォールバックする
      worker.terminate()
      runOnMainThread()
    }

    // Worker へ入力を送信する（Map は構造化複製できないため配列に変換する）
    const workerPayload: UnitOptimizerWorkerInput = {
      settings: input.settings,
      scoreSettings: input.scoreSettings,
      cardUncaps: input.cardUncaps,
      cardCountCustom: input.cardCountCustom,
      allCards: input.allCards,
      cardByNameEntries: [...input.cardByName.entries()],
    }
    const workerInput: UnitOptimizerWorkerRequestMessage = {
      type: UnitOptimizerWorkerMessageType.Start,
      payload: { input: workerPayload },
    }
    worker.postMessage(workerInput)
    return worker
  } catch {
    // Worker 生成自体に失敗した場合も main thread にフォールバックする
    runOnMainThread()
    return null
  }
}

/**
 * 総当たり最適化Worker
 *
 * 重い最適化処理を別スレッドへ逃がし、UIスレッドのブロックを防ぐ。
 */
import { exhaustiveOptimizeAsync } from '../utils/unitSimulator'
import type {
  UnitOptimizerWorkerRequestMessage,
  UnitOptimizerWorkerResponseMessage,
} from '../types/unitOptimizerWorker'
import { UnitOptimizerWorkerMessageType } from '../types/unitOptimizerWorker'

interface WorkerScopeLike {
  onmessage: ((event: MessageEvent<UnitOptimizerWorkerRequestMessage>) => void) | null
  postMessage: (message: UnitOptimizerWorkerResponseMessage) => void
}

const workerScope = self as unknown as WorkerScopeLike

workerScope.onmessage = async (event: MessageEvent<UnitOptimizerWorkerRequestMessage>) => {
  // Start メッセージ以外はこの Worker の責務外なので無視する。
  if (event.data.type !== UnitOptimizerWorkerMessageType.Start) return
  try {
    const { input } = event.data.payload
    // 受信時は配列化されている cardByName を Map に戻して実行入力を再構築する。
    const runtimeInput = {
      ...input,
      cardByName: new Map(input.cardByNameEntries),
    }
    const result = await exhaustiveOptimizeAsync(
      runtimeInput,
      (done, total) => {
        // 進捗イベントをそのままUI側へ中継する。
        const message: UnitOptimizerWorkerResponseMessage = {
          type: UnitOptimizerWorkerMessageType.Progress,
          payload: { done, total },
        }
        workerScope.postMessage(message)
      },
      () => false,
      (betterResult) => {
        // 途中のベスト更新を通知してUIプレビューを即時反映できるようにする。
        const message: UnitOptimizerWorkerResponseMessage = {
          type: UnitOptimizerWorkerMessageType.Better,
          payload: { result: betterResult },
        }
        workerScope.postMessage(message)
      },
    )
    // 最終結果を Done として返し、呼び出し元で完了処理を行えるようにする。
    const message: UnitOptimizerWorkerResponseMessage = {
      type: UnitOptimizerWorkerMessageType.Done,
      payload: { result },
    }
    workerScope.postMessage(message)
  } catch (error) {
    // 例外内容を Error メッセージへ詰め替えて、呼び出し元のフォールバックに委譲する。
    const message: UnitOptimizerWorkerResponseMessage = {
      type: UnitOptimizerWorkerMessageType.Error,
      payload: { message: error instanceof Error ? error.message : 'unknown worker error' },
    }
    workerScope.postMessage(message)
  }
}

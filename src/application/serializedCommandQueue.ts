/**
 * 同じ設定への更新を順番に実行するキュー
 *
 * 先行処理の成功・失敗にかかわらず次の処理を開始するため、1件の失敗で
 * 後続操作が止まらない。処理が返した結果はそのまま呼び出し元へ返す
 */

/** 順番を保証して実行する処理 */
export type SerializedTask<T> = () => T | PromiseLike<T>

/** 同じ設定への更新順序を保証する小さなキュー */
export class SerializedCommandQueue {
  private tail: Promise<void> = Promise.resolve()

  private pending = 0

  /**
   * 実行中と実行待ちを含む処理数
   *
   * @returns 実行中と実行待ちを含む処理数
   */
  get pendingCount(): number {
    return this.pending
  }

  /**
   * 前の処理が完了してから次の処理を実行する
   *
   * @param task - 順番を保証して実行する処理
   * @returns 処理が完了したときの実行結果
   */
  run<T>(task: SerializedTask<T>): Promise<T> {
    this.pending += 1
    const execution = this.tail.then(task)
    this.tail = execution.then(
      () => undefined,
      () => undefined,
    )
    return execution.finally(() => {
      this.pending -= 1
    })
  }
}

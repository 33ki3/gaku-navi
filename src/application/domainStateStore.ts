/**
 * 画面と外部操作が共有する現在値を管理し、更新完了を通知する小さな保管庫
 *
 * 画面やWebMCPに依存しないため、どの操作からでも同じ競合確認と更新通知を使える
 * 保存処理そのものは別の共通処理へ分けている
 */
import * as constant from '../constant'
import type {
  ApplicationDomainType,
  CommandResult,
  DomainRevision,
  DomainStateSnapshot,
  ExpectedRevisionOptions,
} from '../types/application'
import { DomainIssueCode } from '../types/application'
import { createDomainStateSnapshot } from '../utils/domainRevision'
import { createCommandError, createCommandSuccess, createDomainIssue } from './result'
import { SerializedCommandQueue, type SerializedTask } from './serializedCommandQueue'

/** 値が更新されたときに通知する差分 */
interface DomainStateChange<T> {
  /** 更新前の値 */
  before: DomainStateSnapshot<T>
  /** 更新後の値 */
  after: DomainStateSnapshot<T>
  /** 実際に値が変わったか */
  changed: boolean
}

/** 値の変更を受け取る購読関数 */
type DomainStateListener<T> = (change: DomainStateChange<T>) => void

/** 現在値を管理する対象の設定 */
interface DomainStateStoreOptions<T> {
  /** 現在値を識別する名前 */
  domain: ApplicationDomainType
  /** 初期値 */
  initialValue: T
}

/** 状態番号付きの現在値を管理し、同じ設定への更新順序も保証する保管庫 */
export class DomainStateStore<T> {
  private snapshot: DomainStateSnapshot<T>

  private readonly listeners = new Set<DomainStateListener<T>>()

  private readonly queue = new SerializedCommandQueue()

  constructor(options: DomainStateStoreOptions<T>) {
    this.snapshot = createDomainStateSnapshot(options.domain, options.initialValue)
  }

  /**
   * 現在の値と状態番号を読む
   *
   * @returns 現在の値と状態番号
   */
  getSnapshot(): DomainStateSnapshot<T> {
    return this.snapshot
  }

  /**
   * 更新後の差分通知を購読する
   *
   * @param listener - 値の変更を受け取る関数
   * @returns 購読解除関数
   */
  subscribe(listener: DomainStateListener<T>): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 同じ対象への更新を順番に実行する
   *
   * @param task - 順番に実行する処理
   * @returns 非同期の処理結果
   */
  runSerialized<R>(task: SerializedTask<R>): Promise<R> {
    return this.queue.run(task)
  }

  /**
   * キュー内で値を更新する
   *
   * @param value - 更新する値
   * @param options - 呼び出し元が見ていた状態番号などの条件
   * @returns 更新結果
   */
  commit(value: T, options: ExpectedRevisionOptions = {}): CommandResult<T> {
    const before = this.snapshot
    // 呼び出し元が見ていた状態から変更されていれば、後から来た値で上書きしない
    if (options.expectedRevision !== undefined && options.expectedRevision !== before.revision) {
      return createCommandError(createStaleRevisionIssue(options.expectedRevision, before.revision))
    }

    const after = createDomainStateSnapshot(before.domain, value, before)
    const changed = after.digest !== before.digest
    // 同じ値なら状態番号も通知も増やさず、変更なしとして返す
    if (!changed) {
      return createCommandSuccess(before.value, {
        changed: false,
        revision: before.revision,
        digest: before.digest,
        before: before.value,
        after: before.value,
      })
    }

    // 値が変わったときだけ現在値を更新し、購読中の画面へ知らせる
    this.snapshot = after
    const change: DomainStateChange<T> = { before, after, changed: true }
    for (const listener of [...this.listeners]) listener(change)

    return createCommandSuccess(after.value, {
      changed: true,
      revision: after.revision,
      digest: after.digest,
      before: before.value,
      after: after.value,
    })
  }

  /**
   * 先行する更新の完了後に状態番号を確認してから、現在値を更新する
   *
   * @param value - 更新する値
   * @param options - 呼び出し元が見ていた状態番号などの更新条件
   * @returns 非同期の更新結果
   */
  commitSerialized(value: T, options: ExpectedRevisionOptions = {}): Promise<CommandResult<T>> {
    return this.queue.run(() => this.commit(value, options))
  }

  /**
   * 指定した状態番号の値が現在値として反映されるまで待つ
   *
   * @param revision - 待機する状態番号
   * @param timeoutMs - 待機の上限時間（ミリ秒）
   * @returns 指定した状態番号を確認できた場合はtrue
   */
  waitForRevision(revision: DomainRevision, timeoutMs = constant.STATE_SYNC_TIMEOUT_MS): Promise<boolean> {
    if (this.snapshot.revision === revision) return Promise.resolve(true)

    return new Promise((resolve) => {
      let settled = false
      let timer: ReturnType<typeof setTimeout> | undefined
      /**
       * 購読通知と時間切れのどちらか一方だけで待機を終了する
       *
       * @param result - 待機条件を満たしたか
       * @param unsubscribe - 購読解除関数
       * @returns なし
       */
      const finish = (result: boolean, unsubscribe: () => void) => {
        if (settled) return
        settled = true
        unsubscribe()
        if (timer !== undefined) clearTimeout(timer)
        resolve(result)
      }

      const unsubscribe = this.subscribe(({ after }) => {
        finish(after.revision === revision, unsubscribe)
      })
      if (timeoutMs >= 0) timer = setTimeout(() => finish(false, unsubscribe), timeoutMs)
    })
  }
}

/**
 * 状態番号の不一致を、現在値の管理先以外でも同じ形で返す補助関数
 *
 * 保存処理など、保管庫の外側で同じ競合を検出した場合にも利用する
 *
 * @param expectedRevision - 呼び出し元が見ていた状態番号
 * @param currentRevision - 現在の状態番号
 * @returns 状態番号の競合を表すエラー
 */
function createStaleRevisionIssue(expectedRevision: DomainRevision, currentRevision: DomainRevision) {
  return createDomainIssue(DomainIssueCode.StaleRevision, {
    params: { expectedRevision, currentRevision },
    retryable: true,
  })
}

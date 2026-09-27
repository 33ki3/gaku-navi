/**
 * 画面やWebMCPから共通の保存処理を呼ぶための窓口
 *
 * 画面やWebMCPの型を保存処理へ持ち込まず、どちらの呼び出し元からも同じ処理を
 * 呼べるようにする。保存先の違いは別の窓口へ分ける
 */
import type {
  CommandResult,
  DomainRevision,
  DomainStateSnapshot,
  ExpectedRevisionOptions,
} from '../../types/application'
import type { StorageAdapter } from '../../types/storage'
import type { SerializedTask } from '../serializedCommandQueue'

/** 保存処理へ渡す更新条件 */
export interface CommandOptions extends ExpectedRevisionOptions {
  /** 保存・画面反映の途中で中断するための通知 */
  signal?: AbortSignal
  /** 画面への反映完了を待つか。省略時は待ち、同期確認が必要な呼び出し元で使う */
  waitForStateSync?: boolean
  /** 画面への反映を待つ最大時間。既定値は500ms */
  syncTimeoutMs?: number
}

/** 共通保存処理へ値を確定する関数の型 */
export type CommandCommit<T> = (
  value: T,
  options?: ExpectedRevisionOptions,
) => CommandResult<T> | PromiseLike<CommandResult<T>>

/** 指定したrevisionが画面へ反映されるまで待つ関数の型 */
export type CommandWaitForRevision = (revision: DomainRevision, timeoutMs?: number) => boolean | PromiseLike<boolean>

/** command factoryの設定から、現在値を管理するstate portの型だけを取り出す */
export type CommandStateFromFactory<TFactory> = TFactory extends (options: infer TOptions) => unknown
  ? TOptions extends { state: infer TState }
    ? TState
    : never
  : never

/** 現在値を管理する画面/WebMCP共通の窓口 */
export interface CommandStatePort<T> {
  /** 現在値と状態番号を読む */
  getSnapshot: () => DomainStateSnapshot<T>
  /** 同じ状態を扱うcommandの更新を順番に実行する */
  runSerialized: <R>(task: SerializedTask<R>) => Promise<R>
  /** 呼び出し元が見ていた状態番号を確認して現在値を更新する */
  commit: CommandCommit<T>
  /** 現在値の反映完了を待つ。同期的な呼び出し元は省略できる */
  waitForRevision?: CommandWaitForRevision
}

/** 保存先を差し替えても、同じ更新処理を使えるようにする窓口 */
export type CommandStoragePort = StorageAdapter

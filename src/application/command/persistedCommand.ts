/**
 * 複数の設定を保存し、画面の表示まで同じ値にそろえる共通処理
 *
 * 各操作が検証と保存するキーを準備した後に利用し、保存途中の失敗や
 * 保存と画面表示のずれを呼び出し元へ返す
 */
import * as constant from '../../constant'
import type { CommandResult, CommandSuccess, DomainIssue, DomainStateSnapshot } from '../../types/application'
import { ApplicationStatePhase, DomainIssueCode } from '../../types/application'
import {
  type StorageEntry,
  type StorageRollbackResult,
  type StorageSnapshot,
  type StorageSnapshotResult,
  StorageTransactionOutcome,
  type StorageTransactionResult,
} from '../../types/storage'
import {
  applyStorageEntries,
  createStorageSnapshotResult,
  restoreStorageSnapshot,
} from '../../utils/storageTransaction'
import { createCommandError, createCommandSuccess, createDomainIssue } from '../result'
import type { CommandOptions, CommandStatePort, CommandStoragePort } from './ports'

/** 保存処理へ渡す入力 */
interface PersistedCommandRequest<T> {
  /** 現在の値を読み書きする対象 */
  state: CommandStatePort<T>
  /** 保存後に画面へ反映する値 */
  nextValue: T
  /** 保存するキーと文字列 */
  entries: readonly StorageEntry[]
  /** 中断や競合確認などの実行条件 */
  options?: CommandOptions
  /** テストなどで差し替える保存先 */
  storage?: CommandStoragePort
}

/**
 * 保存結果を共通の更新エラーへ変換する
 *
 * @param result - 変換対象の保存結果
 * @returns 共通の更新処理で扱うエラー
 */
function createStorageIssue(
  result: StorageTransactionResult | Extract<StorageSnapshotResult, { ok: false }> | StorageRollbackResult,
): DomainIssue {
  const outcome = result.outcome
  const firstIssue = result.issues[0]
  const params: Record<string, string | number | boolean> = { outcome }
  if (firstIssue?.phase !== undefined) params.phase = firstIssue.phase
  if (firstIssue?.key !== undefined) params.key = firstIssue.key

  if (outcome === StorageTransactionOutcome.SnapshotFailed) {
    return createDomainIssue(DomainIssueCode.SnapshotFailed, { params, retryable: true })
  }
  if (outcome === StorageTransactionOutcome.RollbackFailed) {
    return createDomainIssue(DomainIssueCode.RollbackFailed, { params, retryable: false })
  }
  if (outcome === StorageTransactionOutcome.UnknownOutcome) {
    return createDomainIssue(DomainIssueCode.UnknownOutcome, { params, retryable: false })
  }
  return createDomainIssue(DomainIssueCode.StorageError, { params, retryable: true })
}

/**
 * 処理が中断された結果を返す
 *
 * @returns 中断を表す処理結果
 */
function createAbortedResult<T>(): CommandResult<T> {
  return createCommandError(createDomainIssue(DomainIssueCode.Aborted, { retryable: true }))
}

/**
 * 中断通知を確認する
 *
 * @param signal - 確認対象の中断通知
 * @returns 中断済みの場合はtrue
 */
function isAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted ?? false
}

/**
 * 呼び出し元が見ていた値から変更されていれば、その結果を返す
 *
 * @param expectedRevision - 呼び出し元が見ていた状態番号
 * @param currentRevision - 現在の状態番号
 * @returns 競合を表す処理結果
 */
function createStaleResult<T>(expectedRevision: string, currentRevision: string): CommandResult<T> {
  return createCommandError(
    createDomainIssue(DomainIssueCode.StaleRevision, {
      params: { expectedRevision, currentRevision },
      retryable: true,
    }),
  )
}

/**
 * 保存前後の値を含む共通の結果へそろえる
 *
 * @param result - 現在値の更新結果
 * @param before - 更新前の値
 * @returns 更新前後の値を含む保存結果
 */
function normalizeCommitResult<T>(result: CommandSuccess<T>, before: DomainStateSnapshot<T>): CommandSuccess<T> {
  return createCommandSuccess(result.value, {
    changed: result.changed,
    revision: result.revision,
    digest: result.digest,
    before: result.before ?? before.value,
    after: result.after ?? result.value,
  })
}

/**
 * 保存先へ反映した値を保存前へ戻す
 *
 * @param snapshot - 保存前に取得した値
 * @param storage - 復元に使う保存先
 * @returns 復元に失敗した場合の問題、成功時はnull
 */
function rollbackStorage(snapshot: StorageSnapshot, storage?: CommandStoragePort): DomainIssue | null {
  const rollback = restoreStorageSnapshot(snapshot, storage)
  return rollback.outcome === StorageTransactionOutcome.RolledBack ? null : createStorageIssue(rollback)
}

/**
 * 画面と保存先を元へ戻し、どちらかの復元に失敗したことも返す
 *
 * @param state - 復元対象の現在値
 * @param before - 更新前の値
 * @param committedRevision - 復元対象の更新後状態番号
 * @param snapshot - 保存前に取得した値
 * @param storage - 復元に使う保存先
 * @param originalError - 最初に発生した問題
 * @returns 復元後に返す処理結果
 */
async function rollbackAfterStateCommit<T>(
  state: CommandStatePort<T>,
  before: DomainStateSnapshot<T>,
  committedRevision: string,
  snapshot: StorageSnapshot,
  storage: CommandStoragePort | undefined,
  originalError: DomainIssue,
): Promise<CommandResult<T>> {
  let stateRollbackSucceeded = false
  try {
    const result = await state.commit(before.value, { expectedRevision: committedRevision })
    stateRollbackSucceeded = result.ok
  } catch {
    stateRollbackSucceeded = false
  }

  const storageIssue = rollbackStorage(snapshot, storage)
  if (!stateRollbackSucceeded) {
    return createCommandError(
      createDomainIssue(DomainIssueCode.RollbackFailed, {
        params: { phase: ApplicationStatePhase.Rollback },
        retryable: false,
      }),
    )
  }
  if (storageIssue !== null) return createCommandError(storageIssue)
  return createCommandError(originalError)
}

/**
 * 画面へ反映する前に保存先だけを元へ戻す
 *
 * @param snapshot - 保存前に取得した値
 * @param storage - 復元に使う保存先
 * @param originalError - 最初に発生した問題
 * @returns 復元後に返す処理結果
 */
function rollbackAfterStorageCommit<T>(
  snapshot: StorageSnapshot,
  storage: CommandStoragePort | undefined,
  originalError: DomainIssue,
): CommandResult<T> {
  const storageIssue = rollbackStorage(snapshot, storage)
  return storageIssue === null ? createCommandError(originalError) : createCommandError(storageIssue)
}

/**
 * 保存・画面反映・表示更新の確認をまとめて実行する
 *
 * @param request - 保存値、保存先、実行条件
 * @returns 保存と画面反映の結果
 */
export async function runPersistedCommand<T>(request: PersistedCommandRequest<T>): Promise<CommandResult<T>> {
  const { state, nextValue, entries, options = {}, storage } = request
  const { signal, expectedRevision, waitForStateSync = true, syncTimeoutMs = constant.STATE_SYNC_TIMEOUT_MS } = options

  if (isAborted(signal)) return createAbortedResult<T>()

  // 最初に現在の状態番号を確認し、別の操作で新しくなった値を上書きしない
  const before = state.getSnapshot()
  if (expectedRevision !== undefined && expectedRevision !== before.revision) {
    return createStaleResult(expectedRevision, before.revision)
  }
  if (isAborted(signal)) return createAbortedResult<T>()

  // 書き込み前の値を退避し、途中で失敗したときに元へ戻せるようにする
  let snapshotResult: ReturnType<typeof createStorageSnapshotResult>
  try {
    snapshotResult = createStorageSnapshotResult(entries, storage)
  } catch {
    return createCommandError(createDomainIssue(DomainIssueCode.SnapshotFailed, { retryable: true }))
  }
  if (!snapshotResult.ok) return createCommandError(createStorageIssue(snapshotResult))
  const snapshot = snapshotResult.snapshot

  if (isAborted(signal)) return createAbortedResult<T>()

  // 複数の設定をまとめて保存する。途中で失敗した場合は保存前の値へ戻す
  let transaction: StorageTransactionResult
  try {
    transaction = applyStorageEntries(entries, snapshot, storage)
  } catch {
    return createCommandError(createDomainIssue(DomainIssueCode.UnknownOutcome, { retryable: false }))
  }
  if (transaction.outcome !== StorageTransactionOutcome.Committed) {
    return createCommandError(createStorageIssue(transaction))
  }

  if (isAborted(signal)) {
    return rollbackAfterStorageCommit(
      snapshot,
      storage,
      createDomainIssue(DomainIssueCode.Aborted, { retryable: true }),
    )
  }

  // 保存が完了したら画面側の現在値も更新し、保存内容と表示をそろえる
  let committed: CommandResult<T>
  try {
    committed = await state.commit(nextValue, { expectedRevision: before.revision })
  } catch {
    return rollbackAfterStorageCommit(
      snapshot,
      storage,
      createDomainIssue(DomainIssueCode.UnknownOutcome, {
        params: { phase: ApplicationStatePhase.Commit },
        retryable: false,
      }),
    )
  }
  if (!committed.ok) {
    return rollbackAfterStorageCommit(snapshot, storage, committed.error)
  }

  const normalized = normalizeCommitResult(committed, before)
  let synchronized = true
  if (waitForStateSync && state.waitForRevision !== undefined) {
    try {
      // 外部操作へ成功を返す前に、画面の表示が新しい値へ追いついたことを確認する
      synchronized = await state.waitForRevision(normalized.revision, syncTimeoutMs)
    } catch {
      synchronized = false
    }
  }
  // 表示への反映を確認できない場合は、保存先と画面の両方を元へ戻す
  if (!synchronized) {
    return rollbackAfterStateCommit(
      state,
      before,
      normalized.revision,
      snapshot,
      storage,
      createDomainIssue(DomainIssueCode.StateSyncTimeout, { retryable: true }),
    )
  }
  // 成功を返す前に中断された場合も、保存先と画面の両方を元へ戻す
  if (isAborted(signal)) {
    return rollbackAfterStateCommit(
      state,
      before,
      normalized.revision,
      snapshot,
      storage,
      createDomainIssue(DomainIssueCode.Aborted, { retryable: true }),
    )
  }
  return normalized
}

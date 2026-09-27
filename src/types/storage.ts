/**
 * 保存処理で共有する型と結果分類
 *
 * 保存先の実装から型と分類を分離し、画面・更新処理・補助関数が
 * 同じルールで結果を扱えるようにする
 */

/** 保存するキーとJSON文字列の組み合わせ */
export type StorageEntry = readonly [string, string]

/** 保存処理から保存先へ接続するための最小の窓口 */
export interface StorageAdapter {
  /** 保存済みの文字列を読む。キーがなければnull */
  getItem: (key: string) => string | null
  /** 文字列を保存する */
  setItem: (key: string, value: string) => void
  /** 保存済みのキーを削除する */
  removeItem: (key: string) => void
}

/** 複数の保存前の値を退避したもの */
export type StorageSnapshot = Map<string, string | null>

/** 複数キー保存の結果分類 */
export const StorageTransactionOutcome = {
  /** すべての保存が完了した */
  Committed: 'committed',
  /** 保存に失敗したが、保存前の値へ戻せた */
  RolledBack: 'rolled_back',
  /** 保存に失敗し、保存前の値へ完全には戻せなかった */
  RollbackFailed: 'rollback_failed',
  /** 保存後の状態を確定できない */
  UnknownOutcome: 'unknown_outcome',
  /** 保存前の値を読み取れなかった */
  SnapshotFailed: 'snapshot_failed',
} as const

/** 複数キー保存の結果分類の型 */
export type StorageTransactionOutcomeType = (typeof StorageTransactionOutcome)[keyof typeof StorageTransactionOutcome]

/** 保存処理で失敗した段階 */
export const StorageOperationPhase = {
  /** 保存前の値を読み取る段階 */
  Snapshot: 'snapshot',
  /** 保存先へ値を書き込む段階 */
  Write: 'write',
  /** 書き込んだ値を確認する段階 */
  Verify: 'verify',
  /** 保存前の値へ戻す段階 */
  Rollback: 'rollback',
} as const

/** 保存処理で失敗した段階の型 */
export type StorageOperationPhaseType = (typeof StorageOperationPhase)[keyof typeof StorageOperationPhase]

/** 値そのものを含めず、失敗した段階とキーだけを返す情報 */
export interface StorageOperationIssue {
  /** 失敗した段階 */
  phase: StorageOperationPhaseType
  /** 特定キーの処理で失敗した場合のキー */
  key?: string
}

/** 保存前の値を読み取った結果 */
export type StorageSnapshotResult =
  | { ok: true; snapshot: StorageSnapshot }
  | { ok: false; outcome: typeof StorageTransactionOutcome.SnapshotFailed; issues: readonly StorageOperationIssue[] }

/** 保存失敗後に値を戻した結果 */
export type StorageRollbackResult =
  | { outcome: typeof StorageTransactionOutcome.RolledBack; issues: readonly StorageOperationIssue[] }
  | { outcome: typeof StorageTransactionOutcome.RollbackFailed; issues: readonly StorageOperationIssue[] }
  | { outcome: typeof StorageTransactionOutcome.UnknownOutcome; issues: readonly StorageOperationIssue[] }

/** 複数キー保存の結果。呼び出し元が失敗状態を必ず判別できる */
export type StorageTransactionResult =
  | {
      outcome: typeof StorageTransactionOutcome.Committed
      changed: boolean
      writtenKeys: readonly string[]
      issues: readonly StorageOperationIssue[]
    }
  | {
      outcome: typeof StorageTransactionOutcome.RolledBack
      changed: false
      writtenKeys: readonly string[]
      issues: readonly StorageOperationIssue[]
    }
  | {
      outcome: typeof StorageTransactionOutcome.RollbackFailed
      changed: true
      writtenKeys: readonly string[]
      issues: readonly StorageOperationIssue[]
    }
  | {
      outcome: typeof StorageTransactionOutcome.UnknownOutcome
      changed: boolean
      writtenKeys: readonly string[]
      issues: readonly StorageOperationIssue[]
    }
  | {
      outcome: typeof StorageTransactionOutcome.SnapshotFailed
      changed: false
      writtenKeys: readonly []
      issues: readonly StorageOperationIssue[]
    }

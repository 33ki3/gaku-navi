/**
 * 複数の設定をまとめて保存する処理
 *
 * 一部だけ保存される可能性があるため、途中で失敗した場合は保存前の値へ戻す
 * 元へ戻せたか、状態を確認できないかも結果に残す
 */

import {
  type StorageAdapter,
  type StorageEntry,
  type StorageOperationIssue,
  StorageOperationPhase,
  type StorageOperationPhaseType,
  type StorageRollbackResult,
  type StorageSnapshot,
  type StorageSnapshotResult,
  StorageTransactionOutcome,
  type StorageTransactionResult,
} from '../types/storage'

/**
 * 既定のブラウザ保存先を解決する。SSRでは呼び出し側の保存先を必須にする
 *
 * @param storage - 使用する保存先。省略時はブラウザの保存領域
 * @returns 保存処理に使う保存先
 */
function resolveStorage(storage?: StorageAdapter): StorageAdapter {
  return storage ?? localStorage
}

/**
 * 保存対象キーの現在値をまとめて読み取る詳細処理
 *
 * @param entries - 保存対象のキーと値
 * @param storage - 使用する保存先。省略時はブラウザの保存領域
 * @returns 保存前の値または読み込み失敗の詳細
 */
export function createStorageSnapshotResult(
  entries: readonly StorageEntry[],
  storage?: StorageAdapter,
): StorageSnapshotResult {
  const snapshot: StorageSnapshot = new Map()
  const issues: StorageOperationIssue[] = []
  for (const [key] of entries) {
    try {
      const target = resolveStorage(storage)
      // nullも保持し、キーが存在しなかった状態と空文字の保存を区別する
      snapshot.set(key, target.getItem(key))
    } catch {
      issues.push({ phase: StorageOperationPhase.Snapshot, key })
      break
    }
  }

  if (issues.length > 0) return { ok: false, outcome: StorageTransactionOutcome.SnapshotFailed, issues }
  return { ok: true, snapshot }
}

/**
 * 保存対象キーの現在値をまとめて読み取る
 *
 * 詳細な失敗理由が必要な場合は、詳細版の読み取り処理を使う
 *
 * @param entries - 保存対象のキーと値
 * @param storage - 使用する保存先。省略時はブラウザの保存領域
 * @returns 保存前の値。読み込みに失敗した場合はnull
 */
export function createStorageSnapshot(
  entries: readonly StorageEntry[],
  storage?: StorageAdapter,
): StorageSnapshot | null {
  const result = createStorageSnapshotResult(entries, storage)
  return result.ok ? result.snapshot : null
}

/**
 * 保存前の値に保存対象の全キーが含まれているか確認する
 *
 * @param entries - 保存対象のキーと値
 * @param snapshot - 保存前に取得した値
 * @returns 保存前の値にないキーの一覧
 */
function findMissingSnapshotKeys(entries: readonly StorageEntry[], snapshot: StorageSnapshot): string[] {
  return [...new Set(entries.map(([key]) => key))].filter((key) => !snapshot.has(key))
}

/**
 * 指定キーの現在値が意図した保存値と一致するか検証する
 *
 * @param entries - 確認するキーと期待値
 * @param storage - 使用する保存先。省略時はブラウザの保存領域
 * @returns すべて一致したか、キーごとの不一致
 */
function verifyEntries(
  entries: readonly StorageEntry[],
  storage?: StorageAdapter,
): { ok: true } | { ok: false; issues: StorageOperationIssue[] } {
  const issues: StorageOperationIssue[] = []
  const expected = new Map(entries)
  for (const [key, value] of expected) {
    try {
      const target = resolveStorage(storage)
      if (target.getItem(key) !== value) {
        issues.push({ phase: StorageOperationPhase.Verify, key })
      }
    } catch {
      issues.push({ phase: StorageOperationPhase.Verify, key })
    }
  }
  return issues.length > 0 ? { ok: false, issues } : { ok: true }
}

/**
 * 保存前の値へ戻した後、元の値になったことを確認する
 *
 * @param snapshot - 確認する元の値
 * @param phase - 不一致時に記録する処理段階
 * @param storage - 使用する保存先。省略時はブラウザの保存領域
 * @returns 復元後の一致結果
 */
function verifySnapshot(
  snapshot: StorageSnapshot,
  phase: StorageOperationPhaseType = StorageOperationPhase.Rollback,
  storage?: StorageAdapter,
): { ok: true } | { ok: false; unknown: boolean; issues: StorageOperationIssue[] } {
  const issues: StorageOperationIssue[] = []
  let unknown = false
  let target: StorageAdapter
  try {
    target = resolveStorage(storage)
  } catch {
    return {
      ok: false,
      unknown: true,
      issues: [...snapshot.keys()].map((key) => ({ phase, key })),
    }
  }
  for (const [key, expected] of snapshot) {
    try {
      if (target.getItem(key) !== expected) issues.push({ phase, key })
    } catch {
      unknown = true
      issues.push({ phase, key })
    }
  }
  return issues.length === 0 ? { ok: true } : { ok: false, unknown, issues }
}

/**
 * 保存失敗時に、変更対象を保存前の値へ戻す
 *
 * 復元後の値も読み直し、復元失敗と状態を確認できない場合を分けて返す
 *
 * @param snapshot - 保存前に取得した値
 * @param storage - 使用する保存先。省略時はブラウザの保存領域
 * @returns 元へ戻せたかと問題の詳細
 */
export function restoreStorageSnapshot(snapshot: StorageSnapshot, storage?: StorageAdapter): StorageRollbackResult {
  const issues: StorageOperationIssue[] = []
  let target: StorageAdapter
  try {
    target = resolveStorage(storage)
  } catch {
    return {
      outcome: StorageTransactionOutcome.UnknownOutcome,
      issues: [...snapshot.keys()].map((key) => ({ phase: StorageOperationPhase.Rollback, key })),
    }
  }
  for (const [key, previousValue] of [...snapshot].reverse()) {
    try {
      // 複数キーを逆順に戻し、途中まで成功した保存を可能な範囲で巻き戻す
      if (previousValue === null) {
        target.removeItem(key)
      } else {
        target.setItem(key, previousValue)
      }
    } catch {
      issues.push({ phase: StorageOperationPhase.Rollback, key })
    }
  }

  const verification = verifySnapshot(snapshot, StorageOperationPhase.Rollback, storage)
  if (verification.ok) {
    return { outcome: StorageTransactionOutcome.RolledBack, issues }
  }
  if (verification.unknown) {
    return { outcome: StorageTransactionOutcome.UnknownOutcome, issues: [...issues, ...verification.issues] }
  }
  return { outcome: StorageTransactionOutcome.RollbackFailed, issues: [...issues, ...verification.issues] }
}

/**
 * 保存失敗後の復元結果を保存結果へ変換する
 *
 * @param rollback - 復元処理の結果
 * @param originalIssues - 最初に発生した問題
 * @param writtenKeys - 書き込みを試みたキー
 * @returns 復元結果を含めた保存結果
 */
function createFailureResult(
  rollback: StorageRollbackResult,
  originalIssues: readonly StorageOperationIssue[],
  writtenKeys: readonly string[],
): StorageTransactionResult {
  const issues = [...originalIssues, ...rollback.issues]
  if (rollback.outcome === StorageTransactionOutcome.RolledBack) {
    return { outcome: StorageTransactionOutcome.RolledBack, changed: false, writtenKeys, issues }
  }
  if (rollback.outcome === StorageTransactionOutcome.RollbackFailed) {
    return { outcome: StorageTransactionOutcome.RollbackFailed, changed: true, writtenKeys, issues }
  }
  return { outcome: StorageTransactionOutcome.UnknownOutcome, changed: true, writtenKeys, issues }
}

/**
 * 保存予定データを反映し、失敗時は保存前の値へ戻す詳細処理
 *
 * 保存後に読み直して確認するため、保存処理が例外を投げずに
 * 意図しない値を保存した場合も検出できる
 *
 * @param entries - 保存するキーと値
 * @param snapshot - 保存前に取得した値
 * @param storage - 使用する保存先。省略時はブラウザの保存領域
 * @returns 保存処理の詳細結果
 */
export function applyStorageEntries(
  entries: readonly StorageEntry[],
  snapshot: StorageSnapshot,
  storage?: StorageAdapter,
): StorageTransactionResult {
  const missingSnapshotKeys = findMissingSnapshotKeys(entries, snapshot)
  if (missingSnapshotKeys.length > 0) {
    return {
      outcome: StorageTransactionOutcome.SnapshotFailed,
      changed: false,
      writtenKeys: [],
      issues: missingSnapshotKeys.map((key) => ({ phase: StorageOperationPhase.Snapshot, key })),
    }
  }

  // 保存前の値を確認し、退避後に別の変更が入っていれば上書きせず止める
  const baselineVerification = verifySnapshot(snapshot, StorageOperationPhase.Snapshot, storage)
  if (!baselineVerification.ok) {
    return {
      outcome: StorageTransactionOutcome.UnknownOutcome,
      changed: false,
      writtenKeys: [],
      issues: baselineVerification.issues,
    }
  }

  // 同じキーを複数回含む場合は、最後に指定された値を変更判定に使う
  const targetEntries = [...new Map(entries)]
  const changed = targetEntries.some(([key, value]) => snapshot.get(key) !== value)
  if (!changed) {
    return { outcome: StorageTransactionOutcome.Committed, changed: false, writtenKeys: [], issues: [] }
  }

  const writtenKeys: string[] = []
  let target: StorageAdapter
  try {
    target = resolveStorage(storage)
  } catch {
    return createFailureResult(
      restoreStorageSnapshot(snapshot, storage),
      [{ phase: StorageOperationPhase.Write }],
      writtenKeys,
    )
  }
  // 対象キーを順番に保存し、途中で失敗したら保存前の値へ戻す
  for (const [key, value] of entries) {
    try {
      target.setItem(key, value)
      if (!writtenKeys.includes(key)) writtenKeys.push(key)
    } catch {
      return createFailureResult(
        restoreStorageSnapshot(snapshot, storage),
        [{ phase: StorageOperationPhase.Write, key }],
        writtenKeys,
      )
    }
  }

  // 例外がなくても、保存後に読み直して意図した値になったか確認する
  const verification = verifyEntries(entries, storage)
  if (!verification.ok) {
    // 他タブの変更や読み取り不能で保存後の状態を特定できない場合は、
    // さらに上書きせず結果不明にする
    return {
      outcome: StorageTransactionOutcome.UnknownOutcome,
      changed: true,
      writtenKeys,
      issues: verification.issues,
    }
  }

  return {
    outcome: StorageTransactionOutcome.Committed,
    changed: true,
    writtenKeys,
    issues: [],
  }
}

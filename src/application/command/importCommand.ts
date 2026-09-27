/**
 * 検証済みのインポートデータを既知の保存項目へ適用する処理
 *
 * JSON本文の解析や項目ごとの検証は呼び出し側が担当する。ここでは検証済みのキーと
 * JSON文字列を受け取り、確認時点からの変更を確認する
 * 複数項目の保存と全画面への反映も扱う
 */
import * as data from '../../data'
import type { CommandResult, DomainDigest, DomainRevision, DomainStateSnapshot, Result } from '../../types/application'
import { DomainIssueCode } from '../../types/application'
import type { StorageEntry } from '../../types/storage'
import { DomainIssuePath, createCommandError, createDomainIssue, createResult } from '../result'
import { runPersistedCommand } from './persistedCommand'
import type { CommandOptions, CommandStatePort, CommandStoragePort } from './ports'

/** インポート後に画面へ反映する保存値 */
export type ImportCommandState = Record<string, string | null>

/** 確認時点で固定したインポート内容と現在値の識別情報 */
export interface ImportPreview {
  /** 既知キーへ適用するJSON文字列 */
  entries: readonly StorageEntry[]
  /** 確認を作成した時点の状態番号 */
  baseRevision: DomainRevision
  /** 確認を作成した時点の内容の印 */
  baseDigest: DomainDigest
  /** 確認時点で保存されていた対象キーの値 */
  baseStorageEntries: ImportStorageSnapshot
  /** 確認時点で画面が保持していたエクスポート対象の状態印 */
  baseApplicationDigest: string
}

type ImportStorageSnapshot = readonly (readonly [string, string | null])[]

/** インポート処理を作るための設定 */
interface ImportCommandOptions {
  /** インポート対象全体の現在値を管理する共通窓口 */
  state: CommandStatePort<ImportCommandState>
  /** 保存先の差し替え先 */
  storage?: CommandStoragePort
  /** 受け付ける既知キー。省略時はEXPORT_KEYS全体 */
  knownKeys?: readonly string[] | ReadonlySet<string>
  /** 各画面フックが保持しているエクスポート対象の現在値を識別する */
  getCurrentApplicationDigest?: () => string
}

/** インポート処理 */
export interface ImportCommand {
  /** 現在のインポート対象と状態番号を読む */
  getSnapshot: () => DomainStateSnapshot<ImportCommandState>
  /** 検証済みの保存項目から確認情報を作る。保存や画面更新は行わない */
  preview: (entries: readonly StorageEntry[]) => Result<ImportPreview>
  /** 確認情報または同じ検証済みの保存項目を適用する */
  apply: (
    previewOrEntries: ImportPreview | readonly StorageEntry[],
    options?: CommandOptions,
  ) => Promise<CommandResult<ImportCommandState>>
  /** 保存先を外部で戻した後、インポート画面の現在値だけを同じ値へ戻す */
  restoreState: (value: ImportCommandState, options?: CommandOptions) => Promise<CommandResult<ImportCommandState>>
}

/**
 * 既知キー集合を作る
 *
 * @param knownKeys - 受け付けるキー一覧または集合
 * @returns 検証に使うキー集合
 */
function createKnownKeySet(knownKeys: readonly string[] | ReadonlySet<string> | undefined): ReadonlySet<string> {
  return knownKeys instanceof Set ? knownKeys : new Set(knownKeys ?? data.EXPORT_KEYS)
}

/**
 * 検証済みの保存項目を重複なくコピーする
 *
 * @param entries - 検証する保存項目
 * @param knownKeys - 受け付けるキー集合
 * @returns 正規化したentry、または入力エラー
 */
function validateEntries(
  entries: readonly StorageEntry[],
  knownKeys: ReadonlySet<string>,
): Result<readonly StorageEntry[]> {
  if (!Array.isArray(entries)) {
    return {
      ok: false,
      error: createDomainIssue(DomainIssueCode.InvalidInput, { path: { field: DomainIssuePath.Entries } }),
    }
  }

  const seen = new Set<string>()
  const normalized: StorageEntry[] = []
  for (const [index, entry] of entries.entries()) {
    const key = entry?.[0]
    const value = entry?.[1]
    if (typeof key !== 'string' || key === '' || !knownKeys.has(key)) {
      return {
        ok: false,
        error: createDomainIssue(DomainIssueCode.InvalidInput, {
          path: { field: DomainIssuePath.EntriesKey, index },
        }),
      }
    }
    if (typeof value !== 'string') {
      return {
        ok: false,
        error: createDomainIssue(DomainIssueCode.InvalidInput, {
          path: { field: DomainIssuePath.EntriesValue, index },
        }),
      }
    }
    if (seen.has(key)) {
      return createCommandErrorResult(
        createDomainIssue(DomainIssueCode.Conflict, {
          path: { field: DomainIssuePath.EntriesKey, index },
          params: { key },
          retryable: false,
        }),
      )
    }
    seen.add(key)
    normalized.push([key, value])
  }
  return createResult(normalized)
}

/**
 * インポート画面の現在値と既知の保存項目だけを検証する
 *
 * @param value - 検証対象の現在値
 * @param knownKeys - 受け付けるキー集合
 * @returns インポート対象の現在値として扱える場合はtrue
 */
function isValidImportState(value: unknown, knownKeys: ReadonlySet<string>): value is ImportCommandState {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.entries(value).every(
    ([key, entry]) => knownKeys.has(key) && (entry === null || typeof entry === 'string'),
  )
}

/**
 * 失敗理由をResult型へ包む補助
 *
 * @param error - 呼び出し元へ返す失敗理由
 * @returns 失敗結果
 */
function createCommandErrorResult<T>(error: ReturnType<typeof createDomainIssue>): Result<T> {
  return { ok: false, error }
}

/**
 * 確認情報と保存項目の配列を判別する
 *
 * @param value - 判別対象の値
 * @returns 確認情報の場合はtrue
 */
function isImportPreview(value: unknown): value is ImportPreview {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const preview = value as ImportPreview
  return (
    Array.isArray(preview.entries) &&
    typeof preview.baseRevision === 'string' &&
    typeof preview.baseDigest === 'string' &&
    typeof preview.baseApplicationDigest === 'string' &&
    Array.isArray(preview.baseStorageEntries) &&
    preview.baseStorageEntries.every(
      (entry) =>
        Array.isArray(entry) && typeof entry[0] === 'string' && (entry[1] === null || typeof entry[1] === 'string'),
    )
  )
}

// 確認後に対象キーが外部変更されたか比較できるよう、キー順に保存値を読み取る
function readStorageSnapshot(keys: readonly string[], storage?: CommandStoragePort): Result<ImportStorageSnapshot> {
  try {
    const target = storage ?? localStorage
    return createResult(keys.map((key) => [key, target.getItem(key)] as const))
  } catch {
    return createCommandErrorResult(
      createDomainIssue(DomainIssueCode.StorageError, { path: { field: DomainIssuePath.Entries }, retryable: true }),
    )
  }
}

// 確認時と適用直前の保存値が、すべての対象キーで一致するかを調べる
function matchesStorageSnapshot(
  current: ImportStorageSnapshot,
  expected: ImportStorageSnapshot,
  keys: readonly string[],
): boolean {
  if (current.length !== keys.length || expected.length !== keys.length) return false
  return keys.every(
    (key, index) =>
      current[index]?.[0] === key && expected[index]?.[0] === key && current[index]?.[1] === expected[index]?.[1],
  )
}

/**
 * インポート処理を作る
 *
 * @param options - 現在値、保存先、受け付ける保存項目の設定
 * @returns インポート処理
 */
export function createImportCommand(options: ImportCommandOptions): ImportCommand {
  const { state, storage } = options
  const getCurrentApplicationDigest = options.getCurrentApplicationDigest ?? (() => '')
  const knownKeys = createKnownKeySet(options.knownKeys)

  /**
   * 検証済みの保存項目を確認情報へ固定する
   *
   * @param entries - インポートする保存キーとJSON文字列
   * @returns 状態番号付きの確認情報または入力エラー
   */
  const preview = (entries: readonly StorageEntry[]): Result<ImportPreview> => {
    const validated = validateEntries(entries, knownKeys)
    if (!validated.ok) return validated
    const baseStorage = readStorageSnapshot(
      validated.value.map(([key]) => key),
      storage,
    )
    if (!baseStorage.ok) return baseStorage
    const snapshot = state.getSnapshot()
    return createResult({
      entries: validated.value,
      baseRevision: snapshot.revision,
      baseDigest: snapshot.digest,
      baseStorageEntries: baseStorage.value,
      baseApplicationDigest: getCurrentApplicationDigest(),
    })
  }

  /**
   * 確認情報または保存項目を、現在値を確認してから保存する
   *
   * @param previewOrEntries - 適用する確認情報または保存項目
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const apply = (previewOrEntries: ImportPreview | readonly StorageEntry[], commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      // 確認情報の場合は、確認後に別の変更が入っていないかを確認してから続ける
      const isPreview = isImportPreview(previewOrEntries)
      const entries = isPreview ? previewOrEntries.entries : previewOrEntries
      const validated = validateEntries(entries, knownKeys)
      if (!validated.ok) return createCommandError(validated.error)

      const before = state.getSnapshot()
      if (isPreview && before.digest !== previewOrEntries.baseDigest) {
        return createCommandError(
          createDomainIssue(DomainIssueCode.StaleRevision, {
            params: {
              expectedRevision: previewOrEntries.baseRevision,
              currentRevision: before.revision,
              expectedDigest: previewOrEntries.baseDigest,
              currentDigest: before.digest,
            },
            retryable: true,
          }),
        )
      }
      if (isPreview && getCurrentApplicationDigest() !== previewOrEntries.baseApplicationDigest) {
        return createCommandError(
          createDomainIssue(DomainIssueCode.StaleRevision, {
            params: { expectedRevision: previewOrEntries.baseRevision, currentRevision: before.revision },
            retryable: true,
          }),
        )
      }
      if (isPreview) {
        const keys = validated.value.map(([key]) => key)
        const currentStorage = readStorageSnapshot(keys, storage)
        if (!currentStorage.ok) return createCommandError(currentStorage.error)
        if (!matchesStorageSnapshot(currentStorage.value, previewOrEntries.baseStorageEntries, keys)) {
          return createCommandError(
            createDomainIssue(DomainIssueCode.StaleRevision, {
              params: { expectedRevision: previewOrEntries.baseRevision, currentRevision: before.revision },
              retryable: true,
            }),
          )
        }
      }
      const expectedRevision =
        commandOptions.expectedRevision ?? (isPreview ? previewOrEntries.baseRevision : undefined)
      // インポートする項目だけを現在値へ重ね、指定されていない項目は残す
      const nextValue: ImportCommandState = { ...before.value }
      for (const [key, value] of validated.value) nextValue[key] = value
      return runPersistedCommand<ImportCommandState>({
        state,
        storage,
        nextValue,
        entries: validated.value,
        options: { ...commandOptions, expectedRevision },
      })
    })

  /**
   * 保存先の復元後に、インポート画面の現在値を更新する
   *
   * @param value - 復元するインポート画面の現在値
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 画面反映の結果
   */
  const restoreState = (value: ImportCommandState, commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      if (!isValidImportState(value, knownKeys)) {
        return createCommandError(
          createDomainIssue(DomainIssueCode.InvalidInput, { path: { field: DomainIssuePath.State } }),
        )
      }
      // 保存先の復元が完了した後にだけ呼び出し、画面の現在値も同じ内容へ戻す
      return await state.commit({ ...value }, commandOptions)
    })

  return { getSnapshot: state.getSnapshot, preview, apply, restoreState }
}

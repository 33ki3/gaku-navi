/**
 * localStorage へ複数キーを反映するための簡易トランザクション。
 *
 * 先に全キーの現在値を退避し、途中で保存に失敗した場合は
 * 変更済みのキーを元に戻す
 */
import type { ExportKey, ValidatedStorageEntry } from './importDataValidation'

/** インポート前の保存値スナップショット */
type StorageSnapshot = Map<ExportKey, string | null>

/**
 * インポート対象キーの現在値をまとめて読み取る
 *
 * @param entries - 検証済みの保存予定データ
 * @returns 全件読めた場合はスナップショット、1件でも失敗した場合は null
 */
export function createStorageSnapshot(entries: ValidatedStorageEntry[]): StorageSnapshot | null {
  const snapshot: StorageSnapshot = new Map()
  try {
    for (const [key] of entries) {
      snapshot.set(key, localStorage.getItem(key))
    }
    return snapshot
  } catch {
    return null
  }
}

/**
 * 保存失敗時に、変更対象をインポート前の値へ戻す
 *
 * @param snapshot - インポート前に取得した値
 * @returns 戻り値なし
 */
function restoreStorage(snapshot: StorageSnapshot): void {
  for (const [key, previousValue] of [...snapshot].reverse()) {
    try {
      if (previousValue === null) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, previousValue)
      }
    } catch {
      /**
       * ブラウザがストレージ自体を拒否している場合は復元も失敗し得る。
       * 呼び出し元には最初の保存失敗を通知し、処理は必ず終了させる
       */
    }
  }
}

/**
 * 検証済みデータを保存し、失敗時はスナップショットへ戻す
 *
 * @param entries - 検証済みの保存データ
 * @param snapshot - インポート前に取得した値
 * @returns 全件保存できた場合に true
 */
export function applyStorageEntries(entries: ValidatedStorageEntry[], snapshot: StorageSnapshot): boolean {
  try {
    for (const [key, value] of entries) {
      localStorage.setItem(key, value)
    }
    return true
  } catch {
    restoreStorage(snapshot)
    return false
  }
}

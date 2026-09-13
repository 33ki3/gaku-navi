/**
 * アプリ全体の表示設定を localStorage へ保存・復元する
 */
import * as constant from '../constant'
import type { AppPreferences } from '../types/app'
import { isAppPreferences } from './settingsValidation'
import { isRecord } from './valueValidation'

/**
 * 共有された既定値を変更しないよう、新しいオブジェクトで返す
 *
 * @returns 新しい表示設定オブジェクト
 */
function createDefaultPreferences(): AppPreferences {
  return { ...constant.DEFAULT_APP_PREFERENCES }
}

/**
 * 保存済みアプリ表示設定へ、コード側の既定値を補完する。
 * 保存文字列は変更せず、画面で利用する一時的な値だけを作る
 *
 * @param value - 保存データから読み込んだ値
 * @returns 補完済み設定。既知の設定がない場合は null
 */
function normalizeAppPreferences(value: unknown): AppPreferences | null {
  if (!isRecord(value)) return null

  const normalized: Record<string, unknown> = {
    ...createDefaultPreferences(),
    ...value,
  }
  return isAppPreferences(normalized) ? normalized : null
}

/**
 * localStorage からアプリ表示設定を読み込む
 *
 * @returns 保存済み設定。未保存または不正な場合は既定値
 */
export function loadAppPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(constant.APP_PREFERENCES_STORAGE_KEY)
    if (raw === null) return createDefaultPreferences()

    const parsed: unknown = JSON.parse(raw)
    return normalizeAppPreferences(parsed) ?? createDefaultPreferences()
  } catch {
    return createDefaultPreferences()
  }
}

/**
 * アプリ表示設定を localStorage に保存する
 *
 * @param preferences - 保存する表示設定
 * @returns 戻り値なし
 */
export function saveAppPreferences(preferences: AppPreferences): void {
  try {
    localStorage.setItem(constant.APP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    /** ストレージを利用できない環境でも、画面上の設定変更は維持する */
  }
}

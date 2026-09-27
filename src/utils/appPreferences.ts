/**
 * アプリ全体の表示設定をブラウザの保存領域へ保存・復元する
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
  // 定数オブジェクトを直接返さず、利用側の変更で既定値を汚さない
  return { ...constant.DEFAULT_APP_PREFERENCES }
}

/**
 * 保存済みアプリ表示設定へ、コード側の既定値を補完する
 * 保存文字列は変更せず、画面で利用する一時的な値だけを作る
 *
 * @param value - 保存データから読み込んだ値
 * @returns 補完済み設定。既知の設定がない場合は null
 */
function normalizeAppPreferences(value: unknown): AppPreferences | null {
  if (!isRecord(value)) return null

  // 保存値にない項目だけを既定値で補い、保存済みの値を優先する
  const normalized: Record<string, unknown> = {
    ...createDefaultPreferences(),
    ...value,
  }
  return isAppPreferences(normalized) ? normalized : null
}

/**
 * ブラウザの保存領域からアプリ表示設定を読み込む
 *
 * @returns 保存済み設定。未保存または不正な場合は既定値
 */
export function loadAppPreferences(): AppPreferences {
  try {
    // 保存データの構文エラーや保存領域の例外があっても、既定値で起動する
    const raw = localStorage.getItem(constant.APP_PREFERENCES_STORAGE_KEY)
    if (raw === null) return createDefaultPreferences()

    const parsed: unknown = JSON.parse(raw)
    return normalizeAppPreferences(parsed) ?? createDefaultPreferences()
  } catch {
    return createDefaultPreferences()
  }
}

/**
 * アプリ表示設定をブラウザの保存領域へ保存する
 *
 * @param preferences - 保存する表示設定
 * @returns 保存できた場合はtrue
 */
export function saveAppPreferences(preferences: AppPreferences): boolean {
  try {
    // 呼び出し元で検証済みの設定だけをJSON化して保存する
    localStorage.setItem(constant.APP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
    return true
  } catch {
    // 保存できない場合は表示だけが変わらないよう、呼び出し元へ失敗を返す
    return false
  }
}

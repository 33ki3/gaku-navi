/**
 * ユーザー定義サポートの永続化ユーティリティ。
 *
 * localStorage にユーザーが手動登録したサポートデータを保存・読み込みする。
 */
import type { SupportCard } from '../types/card'
import * as constant from '../constant'

/**
 * localStorage からユーザー定義サポートを読み込む
 *
 * @returns 保存済みのユーザー定義サポート配列。未保存なら空配列
 */
export function loadUserCards(): SupportCard[] {
  try {
    const raw = localStorage.getItem(constant.USER_SUPPORTS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as SupportCard[]
  } catch {
    return []
  }
}

/**
 * ユーザー定義サポートを localStorage に保存する
 *
 * @param cards - ユーザー定義サポートの配列
 */
export function saveUserCards(cards: SupportCard[]): void {
  try {
    localStorage.setItem(constant.USER_SUPPORTS_STORAGE_KEY, JSON.stringify(cards))
  } catch {
    // quota exceeded — 無視
  }
}

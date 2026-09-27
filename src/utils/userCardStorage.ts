/**
 * ユーザー定義サポートの永続化ユーティリティ
 *
 * ユーザーが手動登録したサポートデータをブラウザの保存領域へ保存・読み込みする
 */
import * as constant from '../constant'
import type { SupportCard } from '../types/card'

/**
 * ブラウザの保存領域からユーザー定義サポートを読み込む
 *
 * @returns 保存済みのユーザー定義サポート配列。未保存なら空配列
 */
export function loadUserCards(): SupportCard[] {
  try {
    // ユーザーカードキーがない場合は空配列として開始する
    const raw = localStorage.getItem(constant.USER_SUPPORTS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    // 保存形式の最上位が配列であることだけを確認し、
    // 詳細なフォーム検証は利用側で行う
    if (!Array.isArray(parsed)) return []
    return parsed as SupportCard[]
  } catch {
    return []
  }
}

/**
 * ユーザー定義サポートをブラウザの保存領域へ保存する
 *
 * @param cards - ユーザー定義サポートの配列
 * @returns 保存できた場合はtrue
 */
export function saveUserCards(cards: SupportCard[]): boolean {
  try {
    // 保存できたかを返し、呼び出し側が画面の更新タイミングを制御できるようにする
    localStorage.setItem(constant.USER_SUPPORTS_STORAGE_KEY, JSON.stringify(cards))
    return true
  } catch {
    return false
  }
}

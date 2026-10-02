/**
 * サポート凸数の永続化ユーティリティ
 *
 * ブラウザの保存領域を使ったサポート凸数データの読み込み・保存を行う
 */
import * as constant from '../constant'
import type { UncapType } from '../types/enums'
import * as enums from '../types/enums'

const VALID_UNCAPS = new Set(Object.values(enums.UncapType))

/**
 * ブラウザの保存領域に保存されたサポート凸数データを読み込む
 * 保存データがなければ空のオブジェクトを返す
 *
 * @returns サポート名 → 凸数のマッピング
 */
export function loadCardUncaps(): Record<string, UncapType> {
  try {
    // 保存がない場合は空の対応表とし、未設定カードの既定凸は呼び出し側で補う
    const raw = localStorage.getItem(constant.UNCAP_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const result: Record<string, UncapType> = {}
    for (const [key, value] of Object.entries(parsed)) {
      // 不正な凸値だけを捨て、他カードの有効な設定は維持する
      if (VALID_UNCAPS.has(value as UncapType)) {
        result[key] = value as UncapType
      }
    }
    return result
  } catch {
    return {}
  }
}

/**
 * サポート凸数データをブラウザの保存領域に保存する
 *
 * @param uncaps - サポート名 → 凸数のマッピング
 * @returns 保存できた場合はtrue
 */
export function saveCardUncaps(uncaps: Record<string, UncapType>): boolean {
  try {
    // 呼び出し元で検証済みの凸数設定をJSON化し、保存できたかを返す
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify(uncaps))
    return true
  } catch {
    return false
  }
}

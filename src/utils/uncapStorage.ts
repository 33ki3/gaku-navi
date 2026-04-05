/**
 * サポート凸数の永続化ユーティリティ
 *
 * localStorage を使ったサポート凸数データの読み込み・保存を行う。
 */
import type { UncapType } from '../types/enums'
import * as enums from '../types/enums'
import * as constant from '../constant'

const VALID_UNCAPS = new Set(Object.values(enums.UncapType))

/**
 * localStorage に保存されたサポート凸数データを読み込む
 * 保存データがなければ空のオブジェクトを返す
 *
 * @returns サポート名 → 凸数のマッピング
 */
export function loadCardUncaps(): Record<string, UncapType> {
  try {
    const raw = localStorage.getItem(constant.UNCAP_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const result: Record<string, UncapType> = {}
    for (const [key, value] of Object.entries(parsed)) {
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
 * サポート凸数データを localStorage に保存する
 *
 * @param uncaps - サポート名 → 凸数のマッピング
 */
export function saveCardUncaps(uncaps: Record<string, UncapType>) {
  localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify(uncaps))
}

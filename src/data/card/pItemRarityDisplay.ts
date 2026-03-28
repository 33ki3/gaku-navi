/**
 * Pアイテムレアリティ表示用マスタデータ。
 *
 * Pアイテム固有の SSR / SR バッジ色を定義する。
 * サポートカード用の rarityDisplay とは独立して管理する。
 */
import { type PItemRarityType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** Pアイテムレアリティの表示情報 */
interface PItemRarityEntry {
  rarity: PItemRarityType
  label: TranslationKey
  color: string
}

const entries: PItemRarityEntry[] = [
  { rarity: 'ssr', label: 'common.p_item_rarity.ssr', color: 'bg-gradient-to-r from-rose-400 via-amber-300 to-sky-400 text-white' },
  { rarity: 'sr', label: 'common.p_item_rarity.sr', color: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white' },
]

const map = new Map<string, PItemRarityEntry>(
  entries.map((e) => [e.rarity, e]),
)

/**
 * Pアイテムレアリティの表示エントリを返す。
 *
 * @param rarity - Pアイテムのレアリティ（SSR / SR）
 * @returns PItemRarityEntry オブジェクト
 */
export function getPItemRarityEntry(rarity: PItemRarityType): PItemRarityEntry {
  return map.get(rarity)!
}

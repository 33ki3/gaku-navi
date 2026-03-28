/**
 * Pアイテムレアリティ表示用マスタデータ。
 *
 * Pアイテム固有の SSR / SR バッジ色を定義する。
 * サポートカード用の rarityDisplay とは独立して管理する。
 */
import rawData from './pItemRarityDisplay.json'
import { type PItemRarityType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** Pアイテムレアリティの表示情報 */
interface PItemRarityEntry {
  rarity: PItemRarityType
  label: TranslationKey
  color: string
}

const map = new Map<string, PItemRarityEntry>(
  (rawData as PItemRarityEntry[]).map((e) => [e.rarity, e]),
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

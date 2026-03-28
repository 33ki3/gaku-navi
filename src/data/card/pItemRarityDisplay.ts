/**
 * Pアイテムレアリティ表示用マスタデータ。
 *
 * Pアイテム固有の SSR / SR バッジ色を定義する。
 * サポートカード用の rarityDisplay とは独立して管理する。
 */
import { PItemRarityType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'
import { RARITY_COLOR_SSR, RARITY_COLOR_SR } from '../../constant/styles'

/** Pアイテムレアリティの表示情報 */
interface PItemRarityEntry {
  rarity: PItemRarityType
  label: TranslationKey
  color: string
}

const entries: PItemRarityEntry[] = [
  { rarity: PItemRarityType.SSR, label: 'common.p_item_rarity.ssr', color: RARITY_COLOR_SSR },
  { rarity: PItemRarityType.SR, label: 'common.p_item_rarity.sr', color: RARITY_COLOR_SR },
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

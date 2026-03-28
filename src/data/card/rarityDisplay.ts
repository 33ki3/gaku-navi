/**
 * レアリティ表示用マスタデータ。
 *
 * SSR / SR / R それぞれのソート順、グラデーションバッジ色、
 * シンプルバッジ色を定義する。
 */
import rawData from './rarityDisplay.json'
import { type RarityType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

interface RarityEntry {
  rarity: RarityType
  order: number
  label: TranslationKey
  color: string
}

const map = new Map<string, RarityEntry>(
  (rawData as RarityEntry[]).map((e) => [e.rarity, e]),
)

/**
 * レアリティの表示エントリを丸ごと返す。
 *
 * @param rarity - レアリティ
 * @returns RarityEntry オブジェクト
 */
export function getRarityEntry(rarity: RarityType): RarityEntry {
  return map.get(rarity)!
}

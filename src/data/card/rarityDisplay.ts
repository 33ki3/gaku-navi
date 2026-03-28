/**
 * レアリティ表示用マスタデータ。
 *
 * SSR / SR / R それぞれのソート順、グラデーションバッジ色、
 * シンプルバッジ色を定義する。
 */
import { type RarityType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

interface RarityEntry {
  rarity: RarityType
  order: number
  label: TranslationKey
  color: string
}

const entries: RarityEntry[] = [
  { rarity: 'ssr', order: 3, label: 'common.rarity.ssr', color: 'bg-gradient-to-r from-rose-400 via-amber-300 to-sky-400 text-white' },
  { rarity: 'sr', order: 2, label: 'common.rarity.sr', color: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white' },
  { rarity: 'r', order: 1, label: 'common.rarity.r', color: 'bg-gradient-to-r from-slate-300 to-slate-400 text-white' },
]

const map = new Map<string, RarityEntry>(
  entries.map((e) => [e.rarity, e]),
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

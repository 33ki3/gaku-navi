/**
 * レアリティ表示用マスタデータ。
 *
 * SSR / SR / R それぞれのソート順、グラデーションバッジ色、
 * シンプルバッジ色を定義する。
 */
import { RarityType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'
import { RARITY_COLOR_SSR, RARITY_COLOR_SR, RARITY_COLOR_R } from '../../constant/styles'

interface RarityEntry {
  rarity: RarityType
  order: number
  label: TranslationKey
  color: string
}

const entries: RarityEntry[] = [
  { rarity: RarityType.SSR, order: 3, label: 'common.rarity.ssr', color: RARITY_COLOR_SSR },
  { rarity: RarityType.SR, order: 2, label: 'common.rarity.sr', color: RARITY_COLOR_SR },
  { rarity: RarityType.R, order: 1, label: 'common.rarity.r', color: RARITY_COLOR_R },
]

const map = new Map<string, RarityEntry>(entries.map((e) => [e.rarity, e]))

/**
 * レアリティの表示エントリを丸ごと返す。
 *
 * @param rarity - レアリティ
 * @returns RarityEntry オブジェクト
 */
export function getRarityEntry(rarity: RarityType): RarityEntry {
  return map.get(rarity)!
}

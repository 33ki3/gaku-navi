/**
 * Pアイテムレアリティ表示ラベルマスタ。
 *
 * Pアイテムのレアリティ（SSR / SR）に対応する表示ラベルとバッジ色を定義する。
 * カードレアリティ色とは独立して管理する。
 */
import rawData from '../json/pItemRarityLabel.json'
import { type PItemRarityType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** Pアイテムレアリティ JSON の生データ1行分 */
interface PItemRarityRawEntry {
  key: string
  label: TranslationKey
  badge_color: string
}

/** Pアイテムレアリティの表示情報 */
interface PItemRarityEntry {
  label: TranslationKey
  badge_color: string
}

const map = new Map<string, PItemRarityEntry>(
  (rawData as PItemRarityRawEntry[]).map((e) => [
    e.key,
    { label: e.label, badge_color: e.badge_color },
  ]),
)

/**
 * Pアイテムレアリティのエントリ（ラベル＋バッジ色）を返す。
 *
 * @param rarity - Pアイテムのレアリティ（SSR / SR）
 * @returns ラベル（i18n キー）とバッジ色クラスを含むエントリ
 */
export function getPItemRarityEntry(rarity: PItemRarityType): PItemRarityEntry {
  return map.get(rarity)!
}

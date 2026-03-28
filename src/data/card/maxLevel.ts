/**
 * カードレベル上限マスタ。
 *
 * レアリティと凸数の組み合わせで決まるサポートカードの
 * レベル上限を定義する。
 */

import rawData from './maxLevel.json'
import { type RarityType, type UncapType } from '../../types/enums'

const data = rawData as Record<RarityType, Record<UncapType, number>>

/**
 * カードレベル上限を取得する。
 *
 * @param rarity - カードのレアリティ（SSR / SR / R）
 * @param uncap - 凸数（0〜4）
 * @returns レベル上限
 */
export function getMaxLevel(rarity: RarityType, uncap: UncapType): number {
  return data[rarity][uncap]
}

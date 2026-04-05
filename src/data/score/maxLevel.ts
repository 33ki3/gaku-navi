/**
 * サポートレベル上限マスタ。
 *
 * レアリティと凸数の組み合わせで決まるサポートカードの
 * レベル上限を定義する。
 */

import { RarityType, UncapType } from '../../types/enums'

const data = {
  [RarityType.SSR]: {
    [UncapType.Zero]: 40,
    [UncapType.One]: 45,
    [UncapType.Two]: 50,
    [UncapType.Three]: 55,
    [UncapType.Four]: 60,
  },
  [RarityType.SR]: {
    [UncapType.Zero]: 30,
    [UncapType.One]: 35,
    [UncapType.Two]: 40,
    [UncapType.Three]: 45,
    [UncapType.Four]: 50,
  },
  [RarityType.R]: {
    [UncapType.Zero]: 20,
    [UncapType.One]: 25,
    [UncapType.Two]: 30,
    [UncapType.Three]: 35,
    [UncapType.Four]: 40,
  },
} as Record<RarityType, Record<UncapType, number>>

/**
 * サポートレベル上限を取得する。
 *
 * @param rarity - サポートのレアリティ（SSR / SR / R）
 * @param uncap - 凸数（0〜4）
 * @returns レベル上限
 */
export function getMaxLevel(rarity: RarityType, uncap: UncapType): number {
  return data[rarity][uncap]
}

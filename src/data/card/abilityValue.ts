/**
 * アビリティ値マスタ。
 *
 * スケジュール（凸数→段階番号）と効果段階（段階番号→効果値）を
 * JSON から読み込み、プロパティアクセスで引けるようにする。
 */

import rawData from './abilityValue.json'
import { type RarityTierType, type AbilityNameKeyType } from '../../types/enums'

const schedules = rawData.schedules as Record<RarityTierType, number[][]>
const stages = rawData.stages as Record<RarityTierType, Partial<Record<AbilityNameKeyType, string[]>>>

/**
 * スロット段階スケジュールを取得する。
 *
 * @param rarityTier - レアリティ階層
 * @param slot - スロット番号（1-based）
 * @returns 凸数→段階番号の配列
 */
export function getSchedule(
  rarityTier: RarityTierType,
  slot: number,
): readonly number[] {
  return schedules[rarityTier][slot - 1]
}

/**
 * アビリティの段階別効果値を取得する。
 *
 * @param rarityTier - レアリティ階層
 * @param nameKey - アビリティ名キー
 * @returns 段階別効果値配列
 */
export function getStages(
  rarityTier: RarityTierType,
  nameKey: AbilityNameKeyType,
): readonly string[] {
  return stages[rarityTier][nameKey]!
}

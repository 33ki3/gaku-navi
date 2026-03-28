/**
 * スキルカードレアリティ表示用マスタデータ。
 *
 * スキルカード固有の SSR / SR / R バッジ色を定義する。
 * サポートカード用の rarityDisplay とは独立して管理する。
 */
import rawData from './skillCardRarityDisplay.json'
import { type SkillCardRarityType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** スキルカードレアリティの表示情報 */
interface SkillCardRarityEntry {
  rarity: SkillCardRarityType
  label: TranslationKey
  color: string
}

const map = new Map<string, SkillCardRarityEntry>(
  (rawData as SkillCardRarityEntry[]).map((e) => [e.rarity, e]),
)

/**
 * スキルカードレアリティの表示エントリを返す。
 *
 * @param rarity - レアリティ
 * @returns SkillCardRarityEntry オブジェクト
 */
export function getSkillCardRarityEntry(rarity: SkillCardRarityType): SkillCardRarityEntry {
  return map.get(rarity)!
}

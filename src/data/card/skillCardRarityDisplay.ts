/**
 * スキルカードレアリティ表示用マスタデータ。
 *
 * スキルカード固有の SSR / SR / R バッジ色を定義する。
 * サポートカード用の rarityDisplay とは独立して管理する。
 */
import { SkillCardRarityType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'
import { RARITY_COLOR_SSR, RARITY_COLOR_SR, RARITY_COLOR_R } from '../../constant/styles'

/** スキルカードレアリティの表示情報 */
interface SkillCardRarityEntry {
  rarity: SkillCardRarityType
  label: TranslationKey
  color: string
}

const entries: SkillCardRarityEntry[] = [
  { rarity: SkillCardRarityType.SSR, label: 'common.skill_card_rarity.ssr', color: RARITY_COLOR_SSR },
  { rarity: SkillCardRarityType.SR, label: 'common.skill_card_rarity.sr', color: RARITY_COLOR_SR },
  { rarity: SkillCardRarityType.R, label: 'common.skill_card_rarity.r', color: RARITY_COLOR_R },
]

const map = new Map<string, SkillCardRarityEntry>(entries.map((e) => [e.rarity, e]))

/**
 * スキルカードレアリティの表示エントリを返す。
 *
 * @param rarity - レアリティ
 * @returns SkillCardRarityEntry オブジェクト
 */
export function getSkillCardRarityEntry(rarity: SkillCardRarityType): SkillCardRarityEntry {
  return map.get(rarity)!
}

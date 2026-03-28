/**
 * スキルカードレアリティ表示用マスタデータ。
 *
 * スキルカード固有の SSR / SR / R バッジ色を定義する。
 * サポートカード用の rarityDisplay とは独立して管理する。
 */
import { type SkillCardRarityType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** スキルカードレアリティの表示情報 */
interface SkillCardRarityEntry {
  rarity: SkillCardRarityType
  label: TranslationKey
  color: string
}

const entries: SkillCardRarityEntry[] = [
  { rarity: 'ssr', label: 'common.skill_card_rarity.ssr', color: 'bg-gradient-to-r from-rose-400 via-amber-300 to-sky-400 text-white' },
  { rarity: 'sr', label: 'common.skill_card_rarity.sr', color: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white' },
  { rarity: 'r', label: 'common.skill_card_rarity.r', color: 'bg-gradient-to-r from-slate-300 to-slate-400 text-white' },
]

const map = new Map<string, SkillCardRarityEntry>(
  entries.map((e) => [e.rarity, e]),
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

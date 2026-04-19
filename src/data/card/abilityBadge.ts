/**
 * アビリティバッジ構築ユーティリティ。
 *
 * サポートごとに、スコアに寄与するアビリティキーワードのバッジ一覧を構築する。
 * カード一覧のバッジ表示に使用する。
 */
import type { TranslationKey } from '../../i18n'
import type { SupportCard } from '../../types/card'
import { AbilityKeywordList, AbilityKeywordMap } from './abilityKeyword'

/** サポートが特定のアビリティキーワードに対応する（スコア寄与のみ）か判定する */
function hasScoreRelevantKeyword(card: SupportCard, keyword: Parameters<typeof AbilityKeywordMap.get>[0]): boolean {
  const triggers = AbilityKeywordMap.get(keyword)?.triggers ?? []
  const triggerSet = new Set(triggers)
  return card.abilities.some((a) => {
    if (!triggerSet.has(a.trigger_key)) return false
    if (a.skip_calculation) return false
    return true
  })
}

/** 任意のカード配列からアビリティバッジマップを構築する */
export function buildAbilityBadgeMap(cards: SupportCard[]): Map<string, TranslationKey[]> {
  const map = new Map<string, TranslationKey[]>()
  for (const card of cards) {
    const badges: TranslationKey[] = []
    for (const kw of AbilityKeywordList) {
      if (hasScoreRelevantKeyword(card, kw)) {
        badges.push(AbilityKeywordMap.get(kw)!.badge)
      }
    }
    if (badges.length > 0) map.set(card.name, badges)
  }
  return map
}

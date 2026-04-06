/**
 * アビリティバッジ静的マップ。
 *
 * サポートごとに、スコアに寄与するアビリティキーワードのバッジ一覧を
 * モジュールスコープで1回だけ構築する。
 * カード一覧のバッジ表示に使用する。
 */
import type { TranslationKey } from '../../i18n'
import { AbilityKeywordList, AbilityKeywordMap } from './abilityKeyword'
import { AllCards } from './cards'

/**
 * サポートが特定のアビリティキーワードに対応する（スコア寄与のみ）か判定する。
 * cardQuery.ts の hasAbilityKeyword と同等だが、data 層内部で使うため独立定義。
 */
function hasScoreRelevantKeyword(
  card: (typeof AllCards)[number],
  keyword: Parameters<typeof AbilityKeywordMap.get>[0],
): boolean {
  const triggers = AbilityKeywordMap.get(keyword)?.triggers ?? []
  const triggerSet = new Set(triggers)
  return card.abilities.some((a) => {
    if (!triggerSet.has(a.trigger_key)) return false
    if (a.skip_calculation) return false
    return true
  })
}

/** サポート名 → スコア寄与アビリティバッジの配列（空ならエントリなし） */
export const AbilityBadgeMap: Map<string, TranslationKey[]> = (() => {
  const map = new Map<string, TranslationKey[]>()
  for (const card of AllCards) {
    const badges: TranslationKey[] = []
    for (const kw of AbilityKeywordList) {
      if (hasScoreRelevantKeyword(card, kw)) {
        badges.push(AbilityKeywordMap.get(kw)!.badge)
      }
    }
    if (badges.length > 0) map.set(card.name, badges)
  }
  return map
})()

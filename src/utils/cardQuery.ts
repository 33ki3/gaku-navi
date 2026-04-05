/**
 * サポート検索・判定ユーティリティ
 *
 * サポートがSPレッスン率アビリティを持つか、
 * 特定のキーワードに対応するアビリティを持つか、
 * イベントサマリのラベルを取得するなど、サポートデータの問い合わせ関数。
 */
import type { SupportCard, SkillCardInfo } from '../types/card'
import type { TranslationKey } from '../i18n'
import type { TFunction } from 'i18next'
import * as enums from '../types/enums'
import * as data from '../data'

/**
 * サポートのイベント一覧から、コンパクト表示用のラベル（i18nキー）を配列で返す
 *
 * @param card - 対象のサポートカード
 * @returns イベント種別ごとの表示ラベルの配列
 */
export function getEventSummaryParts(card: SupportCard): TranslationKey[] {
  if (card.events.length === 0) return []
  const parts: TranslationKey[] = []
  for (const e of card.events) {
    const label = data.getEventSummaryLabel(e.effect_type)
    if (label) parts.push(label)
  }
  return parts
}

/**
 * サポートが SP レッスン発生率を上げるアビリティを持っているか判定する
 *
 * @param card - チェックするサポート
 * @returns SP レッスン発生率アビリティがあれば true
 */
export function hasSPAbility(card: SupportCard): boolean {
  return card.abilities.some((a) => data.SpRateTriggers.has(a.trigger_key))
}

/**
 * サポートが特定のアビリティキーワードに対応するアビリティを持っているか判定する
 *
 * trigger_key ベースの判定を行う。scoreRelevantOnly が true の場合、
 * skip_calculation のアビリティ（SP率・体力回復など点数に影響しないもの）は除外する。
 *
 * @param card - チェックするサポート
 * @param keyword - アビリティキーワード名
 * @param scoreRelevantOnly - true なら点数に寄与するアビリティのみ対象
 * @returns キーワードに対応するアビリティがあれば true
 */
export function hasAbilityKeyword(
  card: SupportCard,
  keyword: enums.AbilityKeywordType,
  scoreRelevantOnly = false,
): boolean {
  const triggers = data.AbilityKeywordMap.get(keyword)?.triggers ?? []
  const triggerSet = new Set(triggers)
  return card.abilities.some((a) => {
    if (!triggerSet.has(a.trigger_key)) return false
    if (scoreRelevantOnly && a.skip_calculation) return false
    return true
  })
}

/**
 * スキルカードの備考情報をバッジ用の文字列配列に変換する
 *
 * @param skillCard - スキルカード情報
 * @param t - i18n の翻訳関数
 * @returns バッジとして表示する文字列の配列
 */
export function parseSkillCardNotes(skillCard: SkillCardInfo, t: TFunction): string[] {
  const result: string[] = []
  if (skillCard.lesson_limit > 0) {
    result.push(t('card.skill_card_notes.lesson_limit', { count: skillCard.lesson_limit }))
  }
  if (skillCard.no_duplicate) {
    result.push(t('card.skill_card_notes.no_duplicate'))
  }
  return result
}

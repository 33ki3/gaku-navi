/**
 * カード検索・判定ユーティリティ
 *
 * カードがSPレッスン率アビリティを持つか、
 * 特定のキーワードに対応するアビリティを持つか、
 * イベントサマリのラベルを取得するなど、カードデータの問い合わせ関数。
 */
import type { SupportCard, SkillCardInfo } from '../types/card'
import type { TranslationKey } from '../i18n'
import type { TFunction } from 'i18next'
import * as enums from '../types/enums'
import * as data from '../data'

/**
 * カードのイベント一覧から、コンパクト表示用のラベル（i18nキー）を配列で返す
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
 * カードが SP レッスン発生率を上げるアビリティを持っているか判定する
 *
 * @param card - チェックするカード
 * @returns SP レッスン発生率アビリティがあれば true
 */
export function hasSPAbility(card: SupportCard): boolean {
  return card.abilities.some((a) => a.trigger_key === enums.TriggerKeyType.SpLessonRate)
}

/**
 * カードが特定のアビリティキーワードに対応するアビリティを持っているか判定する
 *
 * trigger_key ベースの判定に加え、レッスン/授業のように trigger_key を
 * 共有するキーワードは name_key でも判定する。
 *
 * @param card - チェックするカード
 * @param keyword - アビリティキーワード名
 * @returns キーワードに対応するアビリティがあれば true
 */
export function hasAbilityKeyword(card: SupportCard, keyword: enums.AbilityKeywordType): boolean {
  const triggers = data.AbilityKeywordMap.get(keyword)?.triggers ?? []
  const triggerSet = new Set(triggers)
  return card.abilities.some((a) => triggerSet.has(a.trigger_key))
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

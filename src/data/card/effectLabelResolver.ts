/**
 * エフェクトラベルリゾルバ。
 *
 * カード効果テンプレートで使う i18n キーを一元管理する。
 * パラメータタイプ・カードゾーン・スキル種別・イベント効果・
 * イベント解放条件・コスト種別のラベルと、
 * エフェクトテンプレートセクションのプレフィックスを提供する。
 */
import rawTypeData from './typeDisplay.json'
import rawEffectLabel from './effectLabel.json'
import type { TranslationKey } from '../../i18n'
import type { ParameterType, CardZoneType, SkillCardType, EventEffectType, ReleaseConditionType, CostType, EffectTemplateKeyType, AbilityNameKeyType, TriggerKeyType } from '../../types/enums'

interface TypeEntry {
  card_type: string
  display_label: TranslationKey
}

const typeEntries = rawTypeData as TypeEntry[]
const PARAM_LABEL_MAP = new Map(typeEntries.map((e) => [e.card_type, e.display_label]))

const data = rawEffectLabel as {
  card_zone: Record<CardZoneType, TranslationKey>
  skill_type: Record<SkillCardType, TranslationKey>
  event_effect: Record<EventEffectType, TranslationKey>
  event_release: Record<ReleaseConditionType, TranslationKey>
  cost_type: Record<CostType, TranslationKey>
  effect_section_prefix: Record<string, string>
}

/**
 * パラメータタイプの i18n ラベルキーを返す。
 *
 * @param param - パラメータ識別子（例: "vocal"）
 * @returns i18n キー（例: "common.type.vocal"）
 */
export function getParamLabel(param: ParameterType): TranslationKey {
  return PARAM_LABEL_MAP.get(param)!
}

/**
 * カードゾーンの i18n ラベルキーを返す。
 *
 * @param zone - ゾーン識別子（"hand" | "discard"）
 * @returns i18n キー
 */
export function getCardZoneLabel(zone: CardZoneType): TranslationKey {
  return data.card_zone[zone]
}

/**
 * スキル種別の i18n ラベルキーを返す。
 *
 * @param skillType - スキル種別（"mental" | "active"）
 * @returns i18n キー
 */
export function getSkillTypeLabel(skillType: SkillCardType): TranslationKey {
  return data.skill_type[skillType]
}

/**
 * イベント効果種別の i18n ラベルキーを返す。
 *
 * @param effectType - 効果種別（例: "param_boost"）
 * @returns i18n キー
 */
export function getEventEffectLabelKey(effectType: EventEffectType): TranslationKey {
  return data.event_effect[effectType]
}

/**
 * イベント解放条件の i18n ラベルキーを返す。
 *
 * @param release - 解放条件（"initial" | "lv20" | "lv40"）
 * @returns i18n キー
 */
export function getEventReleaseLabelKey(release: ReleaseConditionType): TranslationKey {
  return data.event_release[release]
}

/**
 * コスト種別の i18n ラベルキーを返す。
 *
 * @param costType - コスト種別（例: "vitality"）
 * @returns i18n キー
 */
export function getCostTypeLabelKey(costType: CostType): TranslationKey {
  return data.cost_type[costType]
}

/** エフェクトセクションの識別型 */
type EffectSectionType = keyof typeof rawEffectLabel.effect_section_prefix

/**
 * エフェクトテンプレートの i18n ラベルキーを返す。
 *
 * セクションプレフィックスとキーを結合して i18n パスを構築する。
 *
 * @param section - セクション識別子
 * @param key - テンプレートキー
 * @returns i18n キー（例: "card.pitem_body.param_boost"）
 */
export function getEffectLabelKey(section: EffectSectionType, key: EffectTemplateKeyType | AbilityNameKeyType | TriggerKeyType): TranslationKey {
  return `${data.effect_section_prefix[section]}.${key}` as TranslationKey
}

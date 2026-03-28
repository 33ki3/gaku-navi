/**
 * エフェクトラベルリゾルバ。
 *
 * カード効果テンプレートで使う i18n キーを一元管理する。
 * パラメータタイプ・カードゾーン・スキル種別・イベント効果・
 * イベント解放条件・コスト種別のラベルと、
 * エフェクトテンプレートセクションのプレフィックスを提供する。
 */
import { TypeDisplayEntries } from './typeDisplay'
import type { TranslationKey } from '../../i18n'
import type { ParameterType, CardZoneType, SkillCardType, EventEffectType, ReleaseConditionType, CostType, EffectTemplateKeyType, AbilityNameKeyType, TriggerKeyType } from '../../types/enums'

const PARAM_LABEL_MAP = new Map(TypeDisplayEntries.map((e) => [e.card_type, e.display_label]))

const data = {
  card_zone: {
    hand: 'card.card_zone.hand',
    discard: 'card.card_zone.discard',
  } as Record<CardZoneType, TranslationKey>,
  skill_type: {
    mental: 'card.skill.mental',
    active: 'card.skill.active',
  } as Record<SkillCardType, TranslationKey>,
  event_effect: {
    param_boost: 'card.event_effect.param_boost',
    skill_card: 'card.event_effect.skill_card',
    p_item: 'card.event_effect.p_item',
    hp_recovery: 'card.event_effect.hp_recovery',
    card_enhance: 'card.event_effect.card_enhance',
    card_delete: 'card.event_effect.card_delete',
    card_change: 'card.event_effect.card_change',
    pp_gain: 'card.event_effect.pp_gain',
    select_enhance: 'card.event_effect.select_enhance',
    select_delete: 'card.event_effect.select_delete',
    trouble_delete: 'card.event_effect.trouble_delete',
  } as Record<EventEffectType, TranslationKey>,
  event_release: {
    initial: 'card.event_release.initial',
    lv20: 'card.event_release.lv20',
    lv40: 'card.event_release.lv40',
  } as Record<ReleaseConditionType, TranslationKey>,
  cost_type: {
    none: 'card.cost_type.none',
    vitality: 'card.cost_type.vitality',
    hp: 'card.cost_type.hp',
    motivation: 'card.cost_type.motivation',
    good_condition: 'card.cost_type.good_condition',
  } as Record<CostType, TranslationKey>,
  effect_section_prefix: {
    ability_name: 'card.ability_name',
    pitem_restriction: 'card.pitem_restriction',
    pitem_trigger: 'card.pitem_trigger',
    pitem_condition: 'card.pitem_condition',
    pitem_body: 'card.pitem_body',
    pitem_limit: 'card.pitem_limit',
    skill_use_condition: 'card.skill_effect.use_condition',
    skill_pre_modifier: 'card.skill_effect.pre_modifier',
    skill_temporal: 'card.skill_effect.temporal',
    skill_trigger: 'card.skill_effect.trigger',
    skill_condition: 'card.skill_effect.condition',
    skill_action: 'card.skill_effect.action',
    custom_slot_name: 'card.custom_slot_name',
    custom_slot_effect: 'card.custom_slot_effect',
  } as Record<string, string>,
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
type EffectSectionType = keyof typeof data.effect_section_prefix

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

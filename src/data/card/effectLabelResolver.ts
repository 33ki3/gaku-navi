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
import {
  CardZoneType,
  SkillCardType,
  EventEffectType,
  ReleaseConditionType,
  CostType,
  EffectSectionType,
} from '../../types/enums'
import type { ParameterType } from '../../types/enums'

const PARAM_LABEL_MAP = new Map(TypeDisplayEntries.map((e) => [e.cardType, e.displayLabel]))

/** enum値→i18nキーのエントリ型 */
interface LabelEntry<T> {
  id: T
  label: TranslationKey
}

const cardZoneEntries: LabelEntry<CardZoneType>[] = [
  { id: CardZoneType.Hand, label: 'card.card_zone.hand' },
  { id: CardZoneType.Discard, label: 'card.card_zone.discard' },
]

const skillTypeEntries: LabelEntry<SkillCardType>[] = [
  { id: SkillCardType.Mental, label: 'card.skill.mental' },
  { id: SkillCardType.Active, label: 'card.skill.active' },
]

const eventEffectEntries: LabelEntry<EventEffectType>[] = [
  { id: EventEffectType.ParamBoost, label: 'card.event_effect.param_boost' },
  { id: EventEffectType.SkillCard, label: 'card.event_effect.skill_card' },
  { id: EventEffectType.PItem, label: 'card.event_effect.p_item' },
  { id: EventEffectType.HpRecovery, label: 'card.event_effect.hp_recovery' },
  { id: EventEffectType.CardEnhance, label: 'card.event_effect.card_enhance' },
  { id: EventEffectType.CardDelete, label: 'card.event_effect.card_delete' },
  { id: EventEffectType.CardChange, label: 'card.event_effect.card_change' },
  { id: EventEffectType.PpGain, label: 'card.event_effect.pp_gain' },
  { id: EventEffectType.SelectEnhance, label: 'card.event_effect.select_enhance' },
  { id: EventEffectType.SelectDelete, label: 'card.event_effect.select_delete' },
  { id: EventEffectType.TroubleDelete, label: 'card.event_effect.trouble_delete' },
]

const eventReleaseEntries: LabelEntry<ReleaseConditionType>[] = [
  { id: ReleaseConditionType.Initial, label: 'card.event_release.initial' },
  { id: ReleaseConditionType.Lv20, label: 'card.event_release.lv20' },
  { id: ReleaseConditionType.Lv40, label: 'card.event_release.lv40' },
]

const costTypeEntries: LabelEntry<CostType>[] = [
  { id: CostType.None, label: 'card.cost_type.none' },
  { id: CostType.Vitality, label: 'card.cost_type.vitality' },
  { id: CostType.Hp, label: 'card.cost_type.hp' },
  { id: CostType.Motivation, label: 'card.cost_type.motivation' },
  { id: CostType.GoodCondition, label: 'card.cost_type.good_condition' },
]

const effectSectionPrefixEntries = [
  { id: EffectSectionType.AbilityName, prefix: 'card.ability_name' },
  { id: EffectSectionType.PitemRestriction, prefix: 'card.pitem_restriction' },
  { id: EffectSectionType.PitemTrigger, prefix: 'card.pitem_trigger' },
  { id: EffectSectionType.PitemCondition, prefix: 'card.pitem_condition' },
  { id: EffectSectionType.PitemBody, prefix: 'card.pitem_body' },
  { id: EffectSectionType.PitemLimit, prefix: 'card.pitem_limit' },
  { id: EffectSectionType.SkillUseCondition, prefix: 'card.skill_effect.use_condition' },
  { id: EffectSectionType.SkillPreModifier, prefix: 'card.skill_effect.pre_modifier' },
  { id: EffectSectionType.SkillTemporal, prefix: 'card.skill_effect.temporal' },
  { id: EffectSectionType.SkillTrigger, prefix: 'card.skill_effect.trigger' },
  { id: EffectSectionType.SkillCondition, prefix: 'card.skill_effect.condition' },
  { id: EffectSectionType.SkillAction, prefix: 'card.skill_effect.action' },
  { id: EffectSectionType.CustomSlotName, prefix: 'card.custom_slot_name' },
  { id: EffectSectionType.CustomSlotEffect, prefix: 'card.custom_slot_effect' },
] as const

const cardZoneMap = new Map(cardZoneEntries.map((e) => [e.id, e.label]))
const skillTypeMap = new Map(skillTypeEntries.map((e) => [e.id, e.label]))
const eventEffectMap = new Map(eventEffectEntries.map((e) => [e.id, e.label]))
const eventReleaseMap = new Map(eventReleaseEntries.map((e) => [e.id, e.label]))
const costTypeMap = new Map(costTypeEntries.map((e) => [e.id, e.label]))
const effectSectionPrefixMap = new Map(effectSectionPrefixEntries.map((e) => [e.id, e.prefix] as const))

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
  return cardZoneMap.get(zone)!
}

/**
 * スキル種別の i18n ラベルキーを返す。
 *
 * @param skillType - スキル種別（"mental" | "active"）
 * @returns i18n キー
 */
export function getSkillTypeLabel(skillType: SkillCardType): TranslationKey {
  return skillTypeMap.get(skillType)!
}

/**
 * イベント効果種別の i18n ラベルキーを返す。
 *
 * @param effectType - 効果種別（例: "param_boost"）
 * @returns i18n キー
 */
export function getEventEffectLabelKey(effectType: EventEffectType): TranslationKey {
  return eventEffectMap.get(effectType)!
}

/**
 * イベント解放条件の i18n ラベルキーを返す。
 *
 * @param release - 解放条件（"initial" | "lv20" | "lv40"）
 * @returns i18n キー
 */
export function getEventReleaseLabelKey(release: ReleaseConditionType): TranslationKey {
  return eventReleaseMap.get(release)!
}

/**
 * コスト種別の i18n ラベルキーを返す。
 *
 * @param costType - コスト種別（例: "vitality"）
 * @returns i18n キー
 */
export function getCostTypeLabelKey(costType: CostType): TranslationKey {
  return costTypeMap.get(costType)!
}

/**
 * エフェクトセクション種別の i18n キープレフィックスを返す。
 *
 * @param section - セクション種別（例: EffectSectionType.SkillAction）
 * @returns i18n プレフィックス（例: "card.skill_effect.action"）
 */
export function getEffectSectionPrefix(section: EffectSectionType): string {
  return effectSectionPrefixMap.get(section)!
}

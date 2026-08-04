/**
 * ユーザー定義サポートの型ガード。
 *
 * 一覧・詳細・計算処理が直接参照する必須項目に加え、アビリティとイベントの各要素も保存前に検証する。
 */
import type { SupportCard } from '../types/card'
import * as enums from '../types/enums'
import { isPItem, isSkillCardInfo } from './supportEffectValidation'
import { isEnumValue, isFiniteNumber, isOptional, isRecord, isStringRecord } from './valueValidation'

/**
 * サポートアビリティ1件を検証する
 *
 * @param value - 判定する値
 * @returns アビリティの必須項目と任意項目が正しい場合に true
 */
function isAbility(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    isEnumValue(value.name_key, enums.AbilityNameKeyType) &&
    isStringRecord(value.values) &&
    isEnumValue(value.trigger_key, enums.TriggerKeyType) &&
    isOptional(value.parameter_type, (item) => isEnumValue(item, enums.ParameterType)) &&
    isOptional(value.max_count, isFiniteNumber) &&
    isOptional(value.is_percentage, (item) => typeof item === 'boolean') &&
    isOptional(value.is_event_boost, (item) => typeof item === 'boolean') &&
    isOptional(value.is_parameter_bonus, (item) => typeof item === 'boolean') &&
    isOptional(value.is_initial_stat, (item) => typeof item === 'boolean') &&
    isOptional(value.skip_calculation, (item) => typeof item === 'boolean')
  )
}

/**
 * サポートイベント1件を検証する
 *
 * @param value - 判定する値
 * @returns イベントの必須項目と任意項目が正しい場合に true
 */
function isSupportEvent(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    isEnumValue(value.release, enums.ReleaseConditionType) &&
    isEnumValue(value.effect_type, enums.EventEffectType) &&
    isOptional(value.param_type, (item) => isEnumValue(item, enums.ParameterType)) &&
    isOptional(value.param_value, isFiniteNumber) &&
    typeof value.title === 'string'
  )
}

/**
 * サポートカードか判定する
 *
 * @param value - 判定する値
 * @returns サポートの必須項目と入れ子データが正しい場合に true
 */
export function isSupportCard(value: unknown): value is SupportCard {
  if (!isRecord(value) || !Array.isArray(value.abilities) || !Array.isArray(value.events)) {
    return false
  }
  return (
    typeof value.name === 'string' &&
    isEnumValue(value.rarity, enums.RarityType) &&
    isEnumValue(value.plan, enums.PlanType) &&
    isEnumValue(value.type, enums.CardType) &&
    isEnumValue(value.parameter_type, enums.ParameterType) &&
    isEnumValue(value.source, enums.SourceType) &&
    isOptional(value.is_event_source, (item) => typeof item === 'boolean') &&
    isOptional(value.source_detail, (item) => typeof item === 'string') &&
    typeof value.release_date === 'string' &&
    value.abilities.every(isAbility) &&
    value.events.every(isSupportEvent) &&
    (value.p_item === null || isPItem(value.p_item)) &&
    (value.skill_card === null || isSkillCardInfo(value.skill_card))
  )
}

/**
 * サポートカード配列か判定する
 *
 * @param value - 判定する値
 * @returns 全要素が安全なサポートカードなら true
 */
export function isSupportCardArray(value: unknown): value is SupportCard[] {
  return Array.isArray(value) && value.every(isSupportCard)
}

/**
 * ユーザー定義サポートに含まれるPアイテム・スキルカードの検証。
 *
 * 入れ子が深い効果データをサポート本体の検証から分離し、各関数が確認する責務を小さく保つ。
 */
import * as enums from '../types/enums'
import { isActionCountRecord } from './domainValueValidation'
import { isEnumValue, isFiniteNumber, isOptional, isRecord, isStringRecord } from './valueValidation'

/**
 * Pアイテム効果を構成する1要素を検証する
 *
 * @param value - 判定する値
 * @returns 効果テンプレートと任意パラメータが正しい場合に true
 */
function isEffectPart(value: unknown): boolean {
  if (!isRecord(value) || !isEnumValue(value.key, enums.EffectTemplateKeyType)) return false
  return (
    isOptional(value.param, (item) => isEnumValue(item, enums.ParameterType)) &&
    isOptional(value.keyword, (item) => isEnumValue(item, enums.EffectKeywordType)) &&
    isOptional(value.keyword2, (item) => isEnumValue(item, enums.EffectKeywordType)) &&
    isOptional(value.keyword3, (item) => isEnumValue(item, enums.EffectKeywordType)) &&
    isOptional(value.action_id, (item) => isEnumValue(item, enums.ActionIdType)) &&
    isOptional(value.threshold, isFiniteNumber) &&
    isOptional(value.count, isFiniteNumber) &&
    isOptional(value.value, isFiniteNumber) &&
    isOptional(value.turns, isFiniteNumber) &&
    isOptional(value.card_name, (item) => typeof item === 'string') &&
    isOptional(value.item_name, (item) => typeof item === 'string')
  )
}

/**
 * Pアイテムの構造化効果を検証する
 *
 * @param value - 判定する値
 * @returns トリガーと効果本体が正しい場合に true
 */
function isPItemEffect(value: unknown): boolean {
  return (
    isRecord(value) &&
    isOptional(value.restriction, isEffectPart) &&
    isEffectPart(value.trigger) &&
    isOptional(value.condition, isEffectPart) &&
    Array.isArray(value.body) &&
    value.body.every(isEffectPart) &&
    isOptional(value.limit, isEffectPart)
  )
}

/**
 * Pアイテム情報か判定する
 *
 * @param value - 判定する値
 * @returns Pアイテムの必須項目と任意効果が正しい場合に true
 */
export function isPItem(value: unknown): boolean {
  if (!isRecord(value)) return false

  const boostIsValid =
    value.boost === undefined ||
    (isRecord(value.boost) &&
      isEnumValue(value.boost.trigger_key, enums.TriggerKeyType) &&
      isEnumValue(value.boost.parameter_type, enums.ParameterType) &&
      isFiniteNumber(value.boost.value) &&
      isOptional(value.boost.max_count, isFiniteNumber))

  const actionsAreValid =
    value.actions === undefined ||
    (Array.isArray(value.actions) && value.actions.every((item) => isEnumValue(item, enums.PItemActionType)))

  return (
    typeof value.name === 'string' &&
    isEnumValue(value.rarity, enums.PItemRarityType) &&
    isEnumValue(value.memory, enums.PItemMemoryType) &&
    isOptional(value.effect, isPItemEffect) &&
    boostIsValid &&
    actionsAreValid &&
    isOptional(value.provided_action_ids, isActionCountRecord) &&
    isOptional(value.trigger_key, (item) => isEnumValue(item, enums.TriggerKeyType))
  )
}

/**
 * スキルカード効果の1アクションを検証する
 *
 * @param value - 判定する値
 * @returns テンプレートと任意パラメータが正しい場合に true
 */
function isSkillEffectAction(value: unknown): boolean {
  if (!isRecord(value) || !isEnumValue(value.key, enums.EffectTemplateKeyType)) return false
  return (
    isOptional(value.value, isFiniteNumber) &&
    isOptional(value.value2, isFiniteNumber) &&
    isOptional(value.turns, isFiniteNumber) &&
    isOptional(value.keyword, (item) => isEnumValue(item, enums.EffectKeywordType)) &&
    isOptional(value.pct, isFiniteNumber) &&
    isOptional(value.rate, (item) => typeof item === 'string') &&
    isOptional(value.count, isFiniteNumber) &&
    isOptional(value.card_zone, (item) => isEnumValue(item, enums.CardZoneType)) &&
    isOptional(value.skill_type, (item) => isEnumValue(item, enums.SkillCardType)) &&
    isOptional(value.stage, isFiniteNumber)
  )
}

/**
 * スキルカードの構造化効果を検証する
 *
 * @param value - 判定する値
 * @returns 全アクショングループが正しい場合に true
 */
function isSkillEffect(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.groups)) return false
  const groupsAreValid = value.groups.every(
    (group) =>
      isRecord(group) &&
      isOptional(group.condition, isSkillEffectAction) &&
      isOptional(group.temporal, isSkillEffectAction) &&
      isOptional(group.trigger, isSkillEffectAction) &&
      isOptional(group.action, isSkillEffectAction) &&
      isOptional(group.temporal_first, (item) => typeof item === 'boolean'),
  )
  return (
    groupsAreValid &&
    isOptional(value.use_condition, isSkillEffectAction) &&
    isOptional(value.pre_modifier, isSkillEffectAction)
  )
}

/**
 * スキルカードのカスタム枠を検証する
 *
 * @param value - 判定する値
 * @returns 枠名と全段階の効果が正しい場合に true
 */
function isCustomSlot(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.name) || !Array.isArray(value.stages)) return false
  const nameIsValid =
    isEnumValue(value.name.key, enums.EffectTemplateKeyType) &&
    isOptional(value.name.keyword, (item) => isEnumValue(item, enums.EffectKeywordType))
  const stagesAreValid = value.stages.every(
    (stage) =>
      isRecord(stage) &&
      isFiniteNumber(stage.stage) &&
      isFiniteNumber(stage.cost) &&
      isOptional(
        stage.effect,
        (effect) =>
          isRecord(effect) &&
          isEnumValue(effect.template, enums.EffectTemplateKeyType) &&
          isOptional(effect.params, isStringRecord),
      ),
  )
  return nameIsValid && stagesAreValid
}

/**
 * スキルカード情報か判定する
 *
 * @param value - 判定する値
 * @returns スキルカードの必須項目と全配列要素が正しい場合に true
 */
export function isSkillCardInfo(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.effects) || !Array.isArray(value.custom_slot)) {
    return false
  }
  const effectsAreValid = value.effects.every(
    (effect) =>
      isRecord(effect) &&
      isEnumValue(effect.level, enums.SkillCardLevelType) &&
      isEnumValue(effect.cost_type, enums.CostType) &&
      isFiniteNumber(effect.cost_value) &&
      isOptional(effect.effect, isSkillEffect),
  )
  return (
    typeof value.name === 'string' &&
    isEnumValue(value.rarity, enums.SkillCardRarityType) &&
    isEnumValue(value.type, enums.SkillCardType) &&
    isFiniteNumber(value.lesson_limit) &&
    typeof value.no_duplicate === 'boolean' &&
    effectsAreValid &&
    isFiniteNumber(value.custom_cap) &&
    value.custom_slot.every(isCustomSlot)
  )
}

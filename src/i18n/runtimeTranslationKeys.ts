/**
 * マスタとカードデータから実行時に参照される翻訳キーを集める。
 *
 * i18next-cliが追跡できない動的キーを、実際のデータを使って未使用判定から除外する。
 */
import * as data from '../data'
import * as activityData from '../data/score/activity'
import * as importData from '../data/ui/importData'
import * as hifScheduleData from '../data/score/hifScheduleMaster'
import * as parameterInputData from '../data/score/parameterInput'
import * as parameterLabelsData from '../data/score/parameterLabels'
import * as enums from '../types/enums'
import * as pItemResolver from '../utils/pItemResolver'
import ja from './locales/ja.json'

type LocaleResource = Record<string, unknown>
type EffectPart = {
  key?: enums.EffectTemplateKeyType | enums.AbilityNameKeyType | enums.TriggerKeyType
}

const locale = ja as LocaleResource
const localeRoots = new Set(Object.keys(locale))
const dottedPathPattern = /^[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)+$/
const nonExtractedTranslationKeys = [
  'ui.message.import_item_unit_members',
  'ui.message.import_item_unit_result',
  'ui.message.import_reason_invalid_array_item',
] as const

/** 翻訳JSONに存在するドット区切りのキーかを判定する */
function isLocaleKey(value: string): boolean {
  return dottedPathPattern.test(value) && localeRoots.has(value.split('.')[0] ?? '')
}

/** マスタオブジェクト内の翻訳キー形式の文字列を集める */
function collectDataKeys(value: unknown, keys: Set<string>, visited: WeakSet<object>): void {
  if (typeof value === 'string') {
    if (isLocaleKey(value)) keys.add(value)
    return
  }

  if (value === null || typeof value !== 'object' || visited.has(value)) return
  visited.add(value)

  if (Array.isArray(value)) {
    value.forEach((item) => collectDataKeys(item, keys, visited))
    return
  }

  if (value instanceof Map || value instanceof Set) {
    value.forEach((item) => collectDataKeys(item, keys, visited))
    return
  }

  Object.values(value).forEach((item) => collectDataKeys(item, keys, visited))
}

/** 翻訳JSON内のビルド時参照（`$t(...)`）を集める */
function collectLocaleReferenceKeys(value: unknown, keys: Set<string>): void {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/\$t\(\s*([^()]+?)\s*\)/g)) {
      const key = match[1]?.trim()
      if (key && isLocaleKey(key)) keys.add(key)
    }
    return
  }

  if (value === null || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item) => collectLocaleReferenceKeys(item, keys))
    return
  }

  Object.values(value).forEach((item) => collectLocaleReferenceKeys(item, keys))
}

/** 効果パーツのキーを、セクションのプレフィックス付きで追加する */
function addEffectKey(keys: Set<string>, section: enums.EffectSectionType, part: EffectPart | undefined): void {
  if (part?.key) keys.add(data.getEffectLabelKey(section, part.key))
}

/** カードデータから実際に表示される動的翻訳キーを集める */
function collectCardKeys(keys: Set<string>): void {
  for (const nameKey of Object.values(enums.AbilityNameKeyType)) {
    addEffectKey(keys, enums.EffectSectionType.AbilityName, { key: nameKey })
  }

  for (const rarityTier of Object.values(enums.RarityTierType)) {
    for (const nameKey of data.getAvailableAbilities(rarityTier)) {
      addEffectKey(keys, enums.EffectSectionType.AbilityName, { key: nameKey })
    }
  }

  for (const option of data.PITEM_TRIGGER_OPTIONS) {
    addEffectKey(keys, enums.EffectSectionType.PitemTrigger, pItemResolver.resolveEffectTrigger(option.value))
  }

  addEffectKey(keys, enums.EffectSectionType.PitemBody, { key: enums.EffectTemplateKeyType.ParamUp })
  addEffectKey(keys, enums.EffectSectionType.PitemBody, { key: enums.EffectTemplateKeyType.SimpleEffectCount })
  addEffectKey(keys, enums.EffectSectionType.PitemLimit, { key: enums.EffectTemplateKeyType.PerProduce })

  for (const card of data.AllCards) {
    for (const ability of card.abilities) {
      addEffectKey(keys, enums.EffectSectionType.AbilityName, { key: ability.name_key })
    }

    for (const event of card.events) {
      keys.add(data.getEventEffectLabelKey(event.effect_type))
      keys.add(data.getEventReleaseLabelKey(event.release))
      if (event.param_type) keys.add(data.getParamLabel(event.param_type))
    }

    const pItemEffect = card.p_item?.effect
    if (pItemEffect) {
      addEffectKey(keys, enums.EffectSectionType.PitemRestriction, pItemEffect.restriction)
      addEffectKey(keys, enums.EffectSectionType.PitemTrigger, pItemEffect.trigger)
      addEffectKey(keys, enums.EffectSectionType.PitemCondition, pItemEffect.condition)
      pItemEffect.body.forEach((part) => addEffectKey(keys, enums.EffectSectionType.PitemBody, part))
      addEffectKey(keys, enums.EffectSectionType.PitemLimit, pItemEffect.limit)
    }

    for (const skillEffect of card.skill_card?.effects ?? []) {
      const effect = skillEffect.effect
      if (!effect) continue

      addEffectKey(keys, enums.EffectSectionType.SkillUseCondition, effect.use_condition)
      addEffectKey(keys, enums.EffectSectionType.SkillPreModifier, effect.pre_modifier)
      for (const group of effect.groups) {
        addEffectKey(keys, enums.EffectSectionType.SkillTemporal, group.temporal)
        addEffectKey(keys, enums.EffectSectionType.SkillTrigger, group.trigger)
        addEffectKey(keys, enums.EffectSectionType.SkillCondition, group.condition)
        addEffectKey(keys, enums.EffectSectionType.SkillAction, group.action)
      }
    }

    for (const slot of card.skill_card?.custom_slot ?? []) {
      addEffectKey(keys, enums.EffectSectionType.CustomSlotName, slot.name)
      for (const stage of slot.stages) {
        if (stage.effect?.template) {
          addEffectKey(keys, enums.EffectSectionType.CustomSlotEffect, { key: stage.effect.template })
        }
      }
    }
  }
}

/** enumからラベル取得関数を呼び出し、関数内に閉じたマスタも収集する */
function collectGetterKeys(keys: Set<string>): void {
  const collect = (value: unknown): void => {
    if (typeof value === 'string') {
      if (isLocaleKey(value)) keys.add(value)
      return
    }
    collectDataKeys(value, keys, new WeakSet<object>())
  }

  for (const value of Object.values(enums.ActivityIdType)) collect(activityData.getActivityLabel(value))
  for (const value of Object.values(enums.ActionGroupType)) collect(data.getActionGroupLabel(value))
  for (const value of Object.values(enums.CardType)) collect(data.getTypeEntry(value))
  for (const value of Object.values(enums.CardZoneType)) collect(data.getCardZoneLabel(value))
  for (const value of Object.values(enums.CostType)) collect(data.getCostTypeLabelKey(value))
  for (const value of Object.values(enums.EventEffectType)) {
    collect(data.getEventEffectLabelKey(value))
    collect(data.getEventSummaryLabel(value))
  }
  for (const value of Object.values(enums.EffectKeywordType)) collect(data.getEffectKeywordEntry(value))
  for (const value of Object.values(enums.FilterSortTab)) collect(data.getFilterSortTabLabel(value))
  for (const value of Object.values(enums.PItemMemoryType)) collect(data.getMemoryBadge(value))
  for (const value of Object.values(enums.PItemRarityType)) collect(data.getPItemRarityEntry(value))
  for (const value of Object.values(enums.ParameterType)) {
    collect(data.getParamLabel(value))
    collect(parameterLabelsData.PARAMETER_LABELS[value])
    collect(parameterInputData.ParameterInputList.find((entry) => entry.id === value))
  }
  for (const value of Object.values(enums.PlanType)) collect(data.getPlanBadge(value))
  for (const value of Object.values(enums.RarityType)) collect(data.getRarityEntry(value))
  for (const value of Object.values(enums.ReleaseConditionType)) collect(data.getEventReleaseLabelKey(value))
  for (const value of Object.values(enums.ScenarioType)) {
    data.getDifficultyOptionList(value).forEach(collect)
    for (const difficulty of Object.values(enums.DifficultyType)) {
      collect(data.getScheduleData(value, difficulty))
    }
  }
  for (const value of Object.values(enums.SkillCardRarityType)) collect(data.getSkillCardRarityEntry(value))
  for (const value of Object.values(enums.SkillCardType)) {
    collect(data.getSkillTypeBadge(value))
    collect(data.getSkillTypeLabel(value))
  }
  for (const value of Object.values(enums.SkillCardViewModeType)) collect(data.getSkillCardViewModeLabel(value))
  for (const value of Object.values(enums.SortDirectionType)) collect(data.getSortDirectionEntry(value))
  for (const value of Object.values(enums.SortModeType)) collect(data.getSortModeLabel(value))
  for (const value of Object.values(enums.SourceType)) collect(data.getSourceEntry(value))
}

/** カードデータから生成する翻訳キーを返す */
export function collectCardTranslationKeys(): string[] {
  const keys = new Set<string>()
  collectCardKeys(keys)
  return [...keys].sort()
}

/** マスタデータから参照する翻訳キーを返す */
export function collectMasterTranslationKeys(): string[] {
  const keys = new Set<string>()
  collectDataKeys(data, keys, new WeakSet<object>())
  collectDataKeys(activityData, keys, new WeakSet<object>())
  collectDataKeys(hifScheduleData, keys, new WeakSet<object>())
  collectDataKeys(importData, keys, new WeakSet<object>())
  collectDataKeys(parameterInputData, keys, new WeakSet<object>())
  collectDataKeys(parameterLabelsData, keys, new WeakSet<object>())
  collectGetterKeys(keys)
  nonExtractedTranslationKeys.forEach((key) => keys.add(key))
  return [...keys].sort()
}

/** フォームエラーから参照する翻訳キーを返す */
export function collectFormErrorTranslationKeys(): string[] {
  return data.FORM_ERROR_TYPES.map(data.getFormErrorTranslationKey)
}

/** 翻訳JSON内のビルド時参照から翻訳キーを返す */
function collectLocaleReferenceTranslationKeys(): string[] {
  const keys = new Set<string>()
  collectLocaleReferenceKeys(locale, keys)
  return [...keys].sort()
}

/** CLIの静的解析だけでは拾えない翻訳キーを返す */
export function collectRuntimeTranslationKeys(): string[] {
  const keys = new Set([
    ...collectCardTranslationKeys(),
    ...collectMasterTranslationKeys(),
    ...collectFormErrorTranslationKeys(),
    ...collectLocaleReferenceTranslationKeys(),
  ])
  return [...keys].sort()
}

/**
 * ユーザー定義サポートフォームが保存する項目の一覧
 *
 * フォーム由来のデータだけを保存するため、検証側の許可項目一覧として利用する
 */
import { AbilityDerivedFlagType, SupportCardFieldKeyType, SupportCardFormFieldGroupType } from '../../types/enums'

/** フォームの種類ごとに、保存を許可する項目をまとめた一覧 */
export const FORM_FIELD_KEYS: Readonly<
  Record<SupportCardFormFieldGroupType, ReadonlySet<SupportCardFieldKeyType | AbilityDerivedFlagType>>
> = {
  [SupportCardFormFieldGroupType.Ability]: new Set([
    SupportCardFieldKeyType.NameKey,
    SupportCardFieldKeyType.Values,
    SupportCardFieldKeyType.TriggerKey,
    SupportCardFieldKeyType.ParameterType,
    SupportCardFieldKeyType.MaxCount,
    AbilityDerivedFlagType.IsPercentage,
    AbilityDerivedFlagType.IsEventBoost,
    AbilityDerivedFlagType.IsParameterBonus,
    AbilityDerivedFlagType.IsInitialStat,
    AbilityDerivedFlagType.SkipCalculation,
  ]),
  [SupportCardFormFieldGroupType.Event]: new Set([
    SupportCardFieldKeyType.Release,
    SupportCardFieldKeyType.EffectType,
    SupportCardFieldKeyType.ParamType,
    SupportCardFieldKeyType.ParamValue,
    SupportCardFieldKeyType.Title,
  ]),
  [SupportCardFormFieldGroupType.SupportCard]: new Set([
    SupportCardFieldKeyType.Name,
    SupportCardFieldKeyType.Rarity,
    SupportCardFieldKeyType.Plan,
    SupportCardFieldKeyType.Type,
    SupportCardFieldKeyType.ParameterType,
    SupportCardFieldKeyType.Source,
    SupportCardFieldKeyType.IsEventSource,
    SupportCardFieldKeyType.ReleaseDate,
    SupportCardFieldKeyType.Abilities,
    SupportCardFieldKeyType.Events,
    SupportCardFieldKeyType.PItem,
    SupportCardFieldKeyType.SkillCard,
  ]),
  [SupportCardFormFieldGroupType.PItem]: new Set([
    SupportCardFieldKeyType.Name,
    SupportCardFieldKeyType.Rarity,
    SupportCardFieldKeyType.Memory,
    SupportCardFieldKeyType.Effect,
    SupportCardFieldKeyType.Boost,
    SupportCardFieldKeyType.ProvidedActionIds,
    SupportCardFieldKeyType.TriggerKey,
  ]),
  [SupportCardFormFieldGroupType.PItemEffect]: new Set([
    SupportCardFieldKeyType.Trigger,
    SupportCardFieldKeyType.Body,
    SupportCardFieldKeyType.Limit,
  ]),
  [SupportCardFormFieldGroupType.SkillCard]: new Set([
    SupportCardFieldKeyType.Name,
    SupportCardFieldKeyType.Rarity,
    SupportCardFieldKeyType.Type,
    SupportCardFieldKeyType.LessonLimit,
    SupportCardFieldKeyType.NoDuplicate,
    SupportCardFieldKeyType.Effects,
    SupportCardFieldKeyType.CustomCap,
    SupportCardFieldKeyType.CustomSlot,
  ]),
  [SupportCardFormFieldGroupType.EffectPart]: new Set([
    SupportCardFieldKeyType.Key,
    SupportCardFieldKeyType.Param,
    SupportCardFieldKeyType.ActionId,
    SupportCardFieldKeyType.Count,
    SupportCardFieldKeyType.Value,
  ]),
}

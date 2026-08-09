/**
 * 最適編成の保存結果を復元する前に検証する型ガード。
 *
 * localStorage 由来の値を unknown のまま受け取り、UI が参照する構造を
 * 一段ずつ確認することで、不正なキャッシュを安全に破棄できるようにする
 */
import type { CardCalculationResult, ParameterValues } from '../types/card'
import * as enums from '../types/enums'
import type { SupportSynergyDetail, SynergyProviderDetail } from '../types/unit'
import { isActionCountRecord, isParameterValues } from './domainValueValidation'
import { isEnumValue, isFiniteNumber, isOptional, isRecord } from './valueValidation'

/** 保存時にカード本体を名前へ置き換えた編成メンバー */
interface StoredUnitMember {
  cardName: string
  uncap: enums.UncapType
  isRental: boolean
  result: CardCalculationResult
  supportSynergy: number
  supportSynergyDetail?: SupportSynergyDetail
  synergyProviders?: SynergyProviderDetail[]
  paramBonusPercent?: ParameterValues
}

/** localStorage に保存する最適編成結果 */
interface StoredUnitResult {
  members: StoredUnitMember[]
  totalScore: number
  totalParamBonusPercent: ParameterValues
  parameterBonus: ParameterValues
  parameterBonusBase?: ParameterValues
  outsideParamBonusPercent?: ParameterValues
}

type AbilityBoost = CardCalculationResult['abilityBoosts'][number]
type AbilityDetail = CardCalculationResult['allAbilityDetails'][number]

/** 任意の文字列プロパティを検証する */
function isOptionalString(value: unknown): boolean {
  return isOptional(value, (candidate) => typeof candidate === 'string')
}

/** 任意の有限数プロパティを検証する */
function isOptionalNumber(value: unknown): boolean {
  return isOptional(value, isFiniteNumber)
}

/** TriggerKeyTypeをキーに有限数だけを持つマップか判定する */
function isNumberRecord(value: unknown): value is SupportSynergyDetail {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([triggerKey, count]) => isEnumValue(triggerKey, enums.TriggerKeyType) && isFiniteNumber(count),
    )
  )
}

/** アビリティ計算内訳の共通フィールドを検証する */
function hasValidAbilityFields(value: Record<string, unknown>): boolean {
  return (
    isOptionalString(value.nameKey) &&
    isOptional(value.parameterType, (item) => isEnumValue(item, enums.ParameterType)) &&
    isOptionalNumber(value.maxCount) &&
    isOptionalString(value.displayName) &&
    isEnumValue(value.trigger, enums.TriggerKeyType) &&
    isFiniteNumber(value.count) &&
    isFiniteNumber(value.valuePerTrigger) &&
    isFiniteNumber(value.total)
  )
}

/** 表示対象のアビリティ計算内訳か判定する */
function isAbilityBoost(value: unknown): value is AbilityBoost {
  return isRecord(value) && hasValidAbilityFields(value)
}

/** 全アビリティ計算内訳か判定する */
function isAbilityDetail(value: unknown): value is AbilityDetail {
  return isRecord(value) && hasValidAbilityFields(value) && isOptional(value.effectData, isRecord)
}

/** カード計算結果として UI が安全に参照できるか判定する */
function isCardCalculationResult(value: unknown): value is CardCalculationResult {
  if (!isRecord(value)) return false

  return (
    typeof value.cardName === 'string' &&
    isEnumValue(value.parameterType, enums.ParameterType) &&
    isFiniteNumber(value.eventBoost) &&
    Array.isArray(value.abilityBoosts) &&
    value.abilityBoosts.every(isAbilityBoost) &&
    Array.isArray(value.allAbilityDetails) &&
    value.allAbilityDetails.every(isAbilityDetail) &&
    isFiniteNumber(value.parameterBonus) &&
    isFiniteNumber(value.paramBonusPercent) &&
    isFiniteNumber(value.paramBonusBase) &&
    isFiniteNumber(value.eventBoostBase) &&
    isFiniteNumber(value.eventBoostPercent) &&
    isFiniteNumber(value.totalIncrease) &&
    isActionCountRecord(value.autoCounts)
  )
}

/** サポート間連携の提供元詳細か判定する */
function isSynergyProviderDetail(value: unknown): value is SynergyProviderDetail {
  return (
    isRecord(value) &&
    typeof value.providerName === 'string' &&
    isEnumValue(value.actionId, enums.ActionIdType) &&
    isFiniteNumber(value.count)
  )
}

/** 保存済み編成メンバーか判定する */
export function isStoredUnitMember(value: unknown): value is StoredUnitMember {
  return (
    isRecord(value) &&
    typeof value.cardName === 'string' &&
    isEnumValue(value.uncap, enums.UncapType) &&
    typeof value.isRental === 'boolean' &&
    isCardCalculationResult(value.result) &&
    isFiniteNumber(value.supportSynergy) &&
    isOptional(value.supportSynergyDetail, isNumberRecord) &&
    isOptional(
      value.synergyProviders,
      (providers) => Array.isArray(providers) && providers.every(isSynergyProviderDetail),
    ) &&
    isOptional(value.paramBonusPercent, isParameterValues)
  )
}

/**
 * 保存済み最適編成結果か判定する
 *
 * @param value - JSON.parse 後の未検証値
 * @returns 復元に必要な構造と値が揃っている場合に true
 */
export function isStoredUnitResult(value: unknown): value is StoredUnitResult {
  return (
    isRecord(value) &&
    Array.isArray(value.members) &&
    value.members.every(isStoredUnitMember) &&
    isFiniteNumber(value.totalScore) &&
    isParameterValues(value.totalParamBonusPercent) &&
    isParameterValues(value.parameterBonus) &&
    isOptional(value.parameterBonusBase, isParameterValues) &&
    isOptional(value.outsideParamBonusPercent, isParameterValues)
  )
}

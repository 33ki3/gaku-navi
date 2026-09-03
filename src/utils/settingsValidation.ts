/**
 * アプリ表示設定と最適編成設定の型ガード。
 *
 * localStorage とインポートJSONの両方で同じ検証を使い、読み込み経路による判定差をなくす。
 */
import type { AppPreferences } from '../types/app'
import * as enums from '../types/enums'
import type { UnitSimulatorSettings } from '../types/unit'
import { isEnumArray, isParameterValues } from './domainValueValidation'
import { isEnumValue, isFiniteNumber, isNullableStringArray, isRecord, isStringArray } from './valueValidation'

/**
 * アプリ全体の表示設定か判定する
 *
 * @param value - 判定する値
 * @returns 必須の表示設定が boolean で揃っていれば true
 */
export function isAppPreferences(value: unknown): value is AppPreferences {
  return (
    isRecord(value) &&
    typeof value.showMobileBottomNav === 'boolean' &&
    typeof value.keepMobileBottomNavFixed === 'boolean'
  )
}

/**
 * 最適編成設定か判定する。
 *
 * 計算処理が直接参照する入れ子構造まで確認し、オブジェクトであるだけの
 * 不完全な設定が保存されることを防ぐ
 *
 * @param value - 判定する値
 * @returns 最適編成設定として安全に利用できる場合に true
 */
export function isUnitSimulatorSettings(value: unknown): value is UnitSimulatorSettings {
  if (!isRecord(value)) return false

  const requiredValuesAreValid =
    isEnumValue(value.plan, enums.PlanType) &&
    isEnumArray(value.allowedTypes, enums.CardType) &&
    isParameterValues(value.spConstraint) &&
    isParameterValues(value.typeCountMin) &&
    isParameterValues(value.typeCountMax) &&
    isParameterValues(value.paramBonusPercent) &&
    typeof value.manualRental === 'boolean' &&
    (typeof value.rentalCardName === 'string' || value.rentalCardName === null) &&
    isStringArray(value.lockedCards) &&
    isNullableStringArray(value.manualCards) &&
    isStringArray(value.excludedCardNames) &&
    value.excludedCardNames.every((name) => name.trim() !== '') &&
    isParameterValues(value.initialParams)

  if (!requiredValuesAreValid) return false

  return (
    (value.paramCapOverride === null || isFiniteNumber(value.paramCapOverride)) &&
    typeof value.unifyRentalLock === 'boolean' &&
    typeof value.excludeContestSkillCards === 'boolean' &&
    typeof value.excludeContestPItems === 'boolean' &&
    typeof value.ignoreCardExclusions === 'boolean' &&
    isFiniteNumber(value.exhaustiveCandidateLimit) &&
    Number.isSafeInteger(value.exhaustiveCandidateLimit) &&
    value.exhaustiveCandidateLimit > 0
  )
}

/**
 * アプリ表示設定と最適編成設定の型ガード。
 *
 * localStorage とインポートJSONの両方で同じ検証を使い、読み込み経路による判定差をなくす。
 */
import type { AppPreferences } from '../types/app'
import * as enums from '../types/enums'
import type { UnitSimulatorSettings } from '../types/unit'
import { isEnumArray, isParameterValues } from './domainValueValidation'
import {
  isEnumValue,
  isFiniteNumber,
  isNullableStringArray,
  isOptional,
  isRecord,
  isStringArray,
} from './valueValidation'

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
 * 後から追加された表示設定が欠けた保存データも判定する。
 *
 * 後から追加された項目が欠けていても、読み込み時にコード側の既定値を補完できるようにする。
 * 既知の項目が1つもない値は受け付けない
 *
 * @param value - 判定する値
 * @returns 既定値補完で利用できる場合に true
 */
export function isImportableAppPreferences(value: unknown): boolean {
  if (!isRecord(value)) return false

  const hasKnownProperty = 'showMobileBottomNav' in value || 'keepMobileBottomNavFixed' in value
  return (
    hasKnownProperty &&
    isOptional(value.showMobileBottomNav, (item) => typeof item === 'boolean') &&
    isOptional(value.keepMobileBottomNavFixed, (item) => typeof item === 'boolean')
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
    isOptional(value.paramCapOverride, (item) => item === null || isFiniteNumber(item)) &&
    isOptional(value.unifyRentalLock, (item) => typeof item === 'boolean') &&
    isOptional(value.excludeContestSkillCards, (item) => typeof item === 'boolean') &&
    isOptional(value.excludeContestPItems, (item) => typeof item === 'boolean') &&
    isOptional(value.ignoreCardExclusions, (item) => typeof item === 'boolean') &&
    isOptional(value.exhaustiveCandidateLimit, (item) => isFiniteNumber(item) && Number.isSafeInteger(item) && item > 0)
  )
}

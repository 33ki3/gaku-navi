/**
 * アプリ表示設定と最適編成設定の型ガード
 *
 * ブラウザの保存領域とインポートJSONの両方で同じ検証を使い、
 * 読み込み経路による判定差をなくす
 */
import * as constant from '../constant'
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
  // 表示設定はtrue/falseの2項目だけを許可し、未知の値を画面へ渡さない
  return (
    isRecord(value) &&
    typeof value.showMobileBottomNav === 'boolean' &&
    typeof value.keepMobileBottomNavFixed === 'boolean'
  )
}

/**
 * 最適編成設定か判定する
 *
 * 計算処理が直接参照する入れ子構造まで確認し、オブジェクトであるだけの
 * 不完全な設定が保存されることを防ぐ
 *
 * @param value - 判定する値
 * @returns 最適編成設定として安全に利用できる場合に true
 */
export function isUnitSimulatorSettings(value: unknown): value is UnitSimulatorSettings {
  // 計算が直接読む入れ子構造まで、保存・入力の境界で検証する
  if (!isRecord(value)) return false

  const hasExactParameterKeys = (candidate: unknown): candidate is Record<enums.ParameterType, number> =>
    // Vo/Da/Viの欠落と余分なキーを同時に拒否する
    isParameterValues(candidate) &&
    Object.keys(candidate).length === Object.values(enums.ParameterType).length &&
    Object.values(enums.ParameterType).every((parameterType) => parameterType in candidate)
  const isStepValue = (candidate: number, step: number) => {
    // 0.05刻みなどの小数入力を浮動小数点誤差込みで判定する
    const scaled = candidate / step
    return Math.abs(scaled - Math.round(scaled)) < 1e-9
  }
  const countValuesAreValid = (candidate: unknown, max: number) =>
    // 枚数や初期値は整数・非負・用途ごとの最大値で制限する
    hasExactParameterKeys(candidate) &&
    Object.values(candidate).every((item) => Number.isSafeInteger(item) && item >= 0 && item <= max)
  const paramBonusIsValid =
    hasExactParameterKeys(value.paramBonusPercent) &&
    Object.values(value.paramBonusPercent).every(
      (item) =>
        isFiniteNumber(item) &&
        item >= 0 &&
        item <= constant.PARAMETER_BONUS_PERCENT_MAX &&
        isStepValue(item, constant.PARAMETER_BONUS_PERCENT_STEP),
    )
  const initialParamsAreValid = countValuesAreValid(value.initialParams, constant.INITIAL_PARAMETER_MAX)
  const paramCapIsValid =
    // nullはシナリオ既定上限、数値は画面で指定可能な上限として扱う
    value.paramCapOverride === null ||
    (typeof value.paramCapOverride === 'number' &&
      Number.isSafeInteger(value.paramCapOverride) &&
      value.paramCapOverride >= constant.PARAM_CAP_MIN &&
      value.paramCapOverride <= constant.INITIAL_PARAMETER_MAX)
  const candidateLimitIsValid =
    // 総当たり候補数は、外部入力で計算量を無制限に増やさない
    typeof value.exhaustiveCandidateLimit === 'number' &&
    Number.isSafeInteger(value.exhaustiveCandidateLimit) &&
    value.exhaustiveCandidateLimit >= constant.CANDIDATE_LIMIT_MIN &&
    value.exhaustiveCandidateLimit <= constant.CANDIDATE_LIMIT_MAX
  const uniqueValues = (items: readonly string[]) =>
    items.every((item) => item.trim() !== '') && new Set(items).size === items.length
  const uniqueNullableValues = (items: readonly (string | null)[]) => {
    // null枠は許可しつつ、実カード名だけを重複チェックする
    const names = items.filter((item): item is string => item !== null)
    return names.every((item) => item.trim() !== '') && new Set(names).size === names.length
  }

  const requiredValuesAreValid =
    // 必須項目をまとめて確認し、不完全な設定を計算へ渡さない
    isEnumValue(value.plan, enums.PlanType) &&
    isEnumArray(value.allowedTypes, enums.CardType) &&
    new Set(value.allowedTypes).size === value.allowedTypes.length &&
    countValuesAreValid(value.spConstraint, constant.SP_TOTAL_MAX) &&
    countValuesAreValid(value.typeCountMin, constant.UNIT_SIZE) &&
    countValuesAreValid(value.typeCountMax, constant.UNIT_SIZE) &&
    paramBonusIsValid &&
    (typeof value.rentalCardName === 'string' || value.rentalCardName === null) &&
    isStringArray(value.lockedCards) &&
    uniqueValues(value.lockedCards) &&
    isNullableStringArray(value.selectedCards) &&
    uniqueNullableValues(value.selectedCards) &&
    isStringArray(value.excludedCardNames) &&
    uniqueValues(value.excludedCardNames) &&
    initialParamsAreValid

  if (!requiredValuesAreValid) return false

  if (!isStringArray(value.lockedCards) || !isNullableStringArray(value.selectedCards)) return false
  const rentalCardName = value.rentalCardName

  return (
    // 任意項目と配列長も確認し、最適編成探索が想定する6枚構成を守る
    paramCapIsValid &&
    typeof value.unifyRentalLock === 'boolean' &&
    typeof value.excludeContestSkillCards === 'boolean' &&
    typeof value.excludeContestPItems === 'boolean' &&
    typeof value.ignoreCardExclusions === 'boolean' &&
    candidateLimitIsValid &&
    value.lockedCards.length <= constant.UNIT_SIZE &&
    value.selectedCards.length <= constant.UNIT_SIZE &&
    (value.selectedCards.filter((name) => name !== null).length < constant.UNIT_SIZE ||
      (typeof rentalCardName === 'string' && value.selectedCards.includes(rentalCardName))) &&
    (rentalCardName === null || (typeof rentalCardName === 'string' && rentalCardName.trim() !== ''))
  )
}

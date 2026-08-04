/**
 * 点数設定と点数プリセットの型ガード。
 *
 * 計算処理が配列操作やプロパティ参照を行う箇所まで検証し、不完全な設定をインポート段階で拒否する。
 */
import type { ScoreSettings } from '../types/card'
import * as enums from '../types/enums'
import { isActionCountRecord, isParameterValues, isScheduleSelectionRecord } from './domainValueValidation'
import { isEnumValue, isOptional, isRecord } from './valueValidation'

/**
 * 点数設定か判定する
 *
 * @param value - 判定する値
 * @returns 現在の点数計算で必要な全項目が正しい場合に true
 */
export function isScoreSettings(value: unknown): value is ScoreSettings {
  if (!isRecord(value)) return false

  if (!isScoreSettingsBase(value)) return false

  const scheduleSelectionsAreValid = isScheduleSelectionRecord(value.scheduleSelections)
  const parameterRowsAreValid =
    Array.isArray(value.customParamBonusRows) &&
    value.customParamBonusRows.every(isParameterValues) &&
    Array.isArray(value.hifExamRatios) &&
    value.hifExamRatios.every(isParameterValues)

  return (
    scheduleSelectionsAreValid &&
    typeof value.useFixedUncap === 'boolean' &&
    typeof value.useCustomMode === 'boolean' &&
    parameterRowsAreValid &&
    isParameterValues(value.customClassBonus) &&
    isParameterValues(value.customNonBonusGain) &&
    typeof value.hifLessonSplitSub === 'boolean'
  )
}

/**
 * 現行設定へ追加された項目が欠けた保存データを含め、基礎部分を判定する。
 *
 * 新しく追加された設定項目は含めず、既定値補完する前提の共通項目だけを検証する
 *
 * @param value - 判定する値
 * @returns 既定値補完で利用できる基礎設定なら true
 */
export function isScoreSettingsBase(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    isEnumValue(value.scenario, enums.ScenarioType) &&
    isEnumValue(value.difficulty, enums.DifficultyType) &&
    isParameterValues(value.parameterBonusBase) &&
    isActionCountRecord(value.actionCounts) &&
    isOptional(value.scheduleSelections, isScheduleSelectionRecord) &&
    typeof value.useScheduleLimits === 'boolean' &&
    typeof value.includeSelfTrigger === 'boolean' &&
    typeof value.includePItem === 'boolean' &&
    isOptional(value.useFixedUncap, (item) => typeof item === 'boolean') &&
    isOptional(value.useCustomMode, (item) => typeof item === 'boolean') &&
    isOptional(value.customParamBonusRows, (item) => Array.isArray(item) && item.every(isParameterValues)) &&
    isOptional(value.customClassBonus, isParameterValues) &&
    isOptional(value.customNonBonusGain, isParameterValues) &&
    isOptional(value.hifExamRatios, (item) => Array.isArray(item) && item.every(isParameterValues)) &&
    isOptional(value.hifLessonSplitSub, (item) => typeof item === 'boolean')
  )
}

/**
 * インポート可能なスコア設定か判定する。
 *
 * 必須項目を満たし、後から追加された項目の欠落を既定値で補完できる設定を許可する。
 * 欠落項目は読み込み時にフロント側の既定値で補完する
 *
 * @param value - 判定する値
 * @returns 読み込み可能な設定なら true
 */
export function isImportableScoreSettings(value: unknown): boolean {
  return isScoreSettings(value) || isScoreSettingsBase(value)
}

/** プリセット配列のインポート検証結果 */
interface ScorePresetImportInspection {
  /** 配列として読み込めるか */
  valid: boolean
  /** 欠落項目を既定値で補完する設定件数 */
  missingDefaultsCount: number
  /** 構造不正なプリセット件数 */
  invalidCount: number
}

/** インポート可能な点数設定プリセット1件か判定する */
export function isImportableScorePreset(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    (isScoreSettings(value.settings) || isScoreSettingsBase(value.settings))
  )
}

/**
 * 点数設定プリセット配列を検査する
 *
 * @param value - 判定する値
 * @returns 欠落項目を補完する設定件数と不正件数を含む検査結果
 */
export function inspectScorePresetArray(value: unknown): ScorePresetImportInspection {
  if (!Array.isArray(value)) {
    return { valid: false, missingDefaultsCount: 0, invalidCount: 1 }
  }

  let missingDefaultsCount = 0
  let invalidCount = 0
  for (const preset of value) {
    if (!isImportableScorePreset(preset)) {
      invalidCount += 1
      continue
    }

    // 完全な設定も基礎設定の型ガードを満たすため、全項目の判定に失敗した場合だけ補完対象として数える
    if (isRecord(preset) && isScoreSettingsBase(preset.settings) && !isScoreSettings(preset.settings)) {
      missingDefaultsCount += 1
    }
  }

  return { valid: invalidCount === 0, missingDefaultsCount, invalidCount }
}

/**
 * 読み込み可能な点数設定プリセット配列か判定する
 *
 * @param value - 判定する値
 * @returns すべてのプリセットを読み込める場合に true
 */
export function isImportableScorePresetArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isImportableScorePreset)
}

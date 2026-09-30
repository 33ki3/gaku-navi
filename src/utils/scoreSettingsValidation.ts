/**
 * 点数設定と点数プリセットの型ガード。
 *
 * 計算処理が配列操作やプロパティ参照を行う箇所まで検証し、不完全な設定をインポート段階で拒否する。
 */
import type { ScoreSettings } from '../types/card'
import * as enums from '../types/enums'
import { isActionCountRecord, isParameterValues, isScheduleSelectionRecord } from './domainValueValidation'
import { isEnumValue, isRecord } from './valueValidation'

/**
 * 点数設定か判定する
 *
 * @param value - 判定する値
 * @returns 現在の点数計算で必要な全項目が正しい場合に true
 */
export function isScoreSettings(value: unknown): value is ScoreSettings {
  if (!isRecord(value)) return false

  const scheduleSelectionsAreValid = isScheduleSelectionRecord(value.scheduleSelections)
  const parameterRowsAreValid =
    Array.isArray(value.customParamBonusRows) &&
    value.customParamBonusRows.every(isParameterValues) &&
    Array.isArray(value.hifExamRatios) &&
    value.hifExamRatios.every(isParameterValues)

  return (
    typeof value.name === 'string' &&
    isEnumValue(value.scenario, enums.ScenarioType) &&
    isEnumValue(value.difficulty, enums.DifficultyType) &&
    isParameterValues(value.parameterBonusBase) &&
    isActionCountRecord(value.actionCounts) &&
    scheduleSelectionsAreValid &&
    typeof value.useScheduleLimits === 'boolean' &&
    typeof value.includeSelfTrigger === 'boolean' &&
    typeof value.includePItem === 'boolean' &&
    typeof value.useFixedUncap === 'boolean' &&
    typeof value.useCustomMode === 'boolean' &&
    parameterRowsAreValid &&
    isParameterValues(value.customClassBonus) &&
    isParameterValues(value.customNonBonusGain) &&
    typeof value.hifLessonSplitSub === 'boolean'
  )
}

/** 現在の完全な点数設定を持つプリセット1件か判定する */
export function isScorePreset(value: unknown): boolean {
  return isRecord(value) && typeof value.name === 'string' && isScoreSettings(value.settings)
}

/** 現在の完全な点数設定を持つプリセット配列か判定する */
export function isScorePresetArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isScorePreset)
}

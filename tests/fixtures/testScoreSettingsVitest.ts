/** Vitest用にテストJSONをアプリと同じインポート検証・既定値補完へ通す */
import * as constant from '../../src/constant'
import { prepareImportText } from '../../src/utils/exportImport'
import { type TestScoreSettingsOptions, testScoreSettingsJsonText } from './testScoreSettings'

/** データ管理と同じ検証・既定値補完を通し、テストに使う条件を返す */
export function readValidatedTestScoreSettingsOptions(): TestScoreSettingsOptions {
  const selectedKeys = [
    constant.SCORE_SETTINGS_STORAGE_KEY,
    constant.SCHEDULE_SELECTIONS_STORAGE_KEY,
    constant.UNIT_SIMULATOR_STORAGE_KEY,
  ] as const
  const preview = prepareImportText(testScoreSettingsJsonText, selectedKeys)

  // 一部取込や検証警告を見逃さず、fixture全体が通った場合だけ計算条件に使う
  if (
    !preview.canImport ||
    preview.entries === null ||
    preview.entries.length !== selectedKeys.length ||
    preview.warnings.length > 0
  ) {
    throw new Error(`testScoreSettings.json is not importable: ${preview.message}`)
  }

  const importedData = Object.fromEntries(preview.entries.map(([key, value]) => [key, JSON.parse(value)]))

  return {
    scoreSettings: importedData[constant.SCORE_SETTINGS_STORAGE_KEY],
    scenarioSchedules: importedData[constant.SCHEDULE_SELECTIONS_STORAGE_KEY],
    unitSettings: importedData[constant.UNIT_SIMULATOR_STORAGE_KEY],
  }
}

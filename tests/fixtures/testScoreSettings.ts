/** E2Eと計算回帰で共用する、点数設定テストJSONの値を扱う */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import type { ScenarioScheduleSelections } from '../../src/types/calculation'
import type { ScoreSettings } from '../../src/types/card'
import * as enums from '../../src/types/enums'
import type { UnitSimulatorSettings } from '../../src/types/unit'
import { readAppStorageKeys } from './readAppStorageKeys'

/** 点数設定テストで使う保存値 */
export interface TestScoreSettingsOptions {
  /** 初レジェンドのスケジュール選択を含む点数設定 */
  scoreSettings: Partial<ScoreSettings>
  /** シナリオ別に保存するスケジュール。HIFの予定を含む */
  scenarioSchedules: ScenarioScheduleSelections & {
    [enums.ScenarioType.Hif]: Record<number, enums.ActivityIdType>
  }
  /** JSONで明示した最適編成設定 */
  unitSettings: Partial<UnitSimulatorSettings>
}

/** enumキーを使った3パラメータの共通入力型 */
type TestParameterValues = Record<enums.ParameterType, number>

/** 最適編成の比較入力。設定値はテストJSON由来の保存値を記録する */
export interface TestOptimizerScenarioInput extends Record<string, unknown> {
  settings: Partial<UnitSimulatorSettings>
  scoreSettings: Partial<ScoreSettings>
}

/** 最適編成の比較条件として上書きできる設定。候補上限はJSONの値を使う */
type TestOptimizerScenarioOverrides = Omit<Partial<UnitSimulatorSettings>, 'exhaustiveCandidateLimit'>

/** Nodeから直接読み、PlaywrightでもアプリのVite依存を読み込まずに使うテストJSON */
export const testScoreSettingsJsonText = readFileSync(
  path.join(process.cwd(), 'tests', 'fixtures', 'testScoreSettings.json'),
  'utf8',
)

/** JSONに格納したデータ管理キーをテスト条件へ対応付ける */
function readTestScoreSettingsOptions(): TestScoreSettingsOptions {
  const parsed = JSON.parse(testScoreSettingsJsonText) as { data: Record<string, unknown> }
  const storageKeys = readAppStorageKeys()

  return {
    scoreSettings: parsed.data[storageKeys.scoreSettings] as Partial<ScoreSettings>,
    scenarioSchedules: parsed.data[storageKeys.scheduleSelections] as TestScoreSettingsOptions['scenarioSchedules'],
    unitSettings: parsed.data[storageKeys.unitSettings] as Partial<UnitSimulatorSettings>,
  }
}

/** E2Eで画面へ保存する、元のテストJSON設定 */
export const testScoreSettingsOptions = readTestScoreSettingsOptions()

/** HIFの保存スケジュールを、最適編成の点数設定へ組み合わせる */
const testOptimizerScoreSettingsInput: Partial<ScoreSettings> = {
  ...testScoreSettingsOptions.scoreSettings,
  scheduleSelections: testScoreSettingsOptions.scenarioSchedules[enums.ScenarioType.Hif],
}

/** カスタム計算とE2E入力で共用する、JSON由来の上昇値 */
const { customParamBonusRows, customClassBonus, customNonBonusGain } = testScoreSettingsOptions.scoreSettings
if (!customParamBonusRows || customParamBonusRows.length === 0 || !customClassBonus || !customNonBonusGain) {
  throw new Error('testScoreSettings.json is missing custom score settings')
}
export const testCustomScoreSettingsValues: Pick<
  ScoreSettings,
  'customParamBonusRows' | 'customClassBonus' | 'customNonBonusGain'
> = { customParamBonusRows, customClassBonus, customNonBonusGain }

/** パラメータ値を既存enumのキーへ対応付ける */
export function parameterValues(vocal: number, dance: number, visual: number): TestParameterValues {
  return {
    [enums.ParameterType.Vocal]: vocal,
    [enums.ParameterType.Dance]: dance,
    [enums.ParameterType.Visual]: visual,
  }
}

/** JSON既定値とシナリオ差分をまとめ、比較用に配列とパラメータ値を複製する */
export function createTestOptimizerScenarioInput(
  overrides: TestOptimizerScenarioOverrides = {},
): TestOptimizerScenarioInput {
  const settings = { ...testScoreSettingsOptions.unitSettings, ...overrides }

  return {
    settings: {
      ...settings,
      ...(settings.allowedTypes ? { allowedTypes: [...settings.allowedTypes] } : {}),
      ...(settings.spConstraint ? { spConstraint: { ...settings.spConstraint } } : {}),
      ...(settings.typeCountMin ? { typeCountMin: { ...settings.typeCountMin } } : {}),
      ...(settings.typeCountMax ? { typeCountMax: { ...settings.typeCountMax } } : {}),
      ...(settings.paramBonusPercent ? { paramBonusPercent: { ...settings.paramBonusPercent } } : {}),
      ...(settings.lockedCards ? { lockedCards: [...settings.lockedCards] } : {}),
      ...(settings.selectedCards ? { selectedCards: [...settings.selectedCards] } : {}),
      ...(settings.excludedCardNames
        ? { excludedCardNames: [...settings.excludedCardNames].sort((left, right) => left.localeCompare(right)) }
        : {}),
      ...(settings.initialParams ? { initialParams: { ...settings.initialParams } } : {}),
    },
    scoreSettings: testOptimizerScoreSettingsInput,
  }
}

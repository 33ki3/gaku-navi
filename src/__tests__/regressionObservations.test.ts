/** ブランチ間で比較する計算結果をVitest環境で採取する */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from 'node:process'

import { expect, it } from 'vitest'

import {
  type TestOptimizerScenarioInput,
  createTestOptimizerScenarioInput,
  parameterValues,
  testCustomScoreSettingsValues,
} from '../../tests/fixtures/testScoreSettings'
import { readValidatedTestScoreSettingsOptions } from '../../tests/fixtures/testScoreSettingsVitest'
import * as constant from '../constant'
import * as data from '../data'
import * as enums from '../types/enums'
import type { UnitSimulatorSettings } from '../types/unit'
import { calculateCardWithSettings } from '../utils/calculator/calculateCardScores'
import { createDefaultSettings, normalizeScoreSettings, normalizeScoreSettingsDerived } from '../utils/scoreSettings'
import { exhaustiveOptimizeAsync } from '../utils/unitSimulator'

const targetCardName = 'もうすぐ本番ですね'
// 全サポートから総当たりする最適編成の観測には、Vitest既定の5秒より長い上限を設ける
const optimizerObservationTimeoutMs = 120_000
// 通常のVitestでは重い最適化を実行せず、回帰コマンドが指定した場合だけ観測する
const regressionObservationTest = it.skipIf(!env.REGRESSION_OUTPUT)

interface CalculationObservation {
  id: string
  calculation: Record<string, unknown>
  description?: string
  semanticInput?: Record<string, unknown>
  scenarioHash?: string
}

/** プロパティの順序差でscenario hashが変わらないよう再帰的にキーを整列する */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    )
  }
  return value
}

function createScenarioHash(input: Record<string, unknown>): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(input)))
    .digest('hex')
}

async function saveCalculationObservation(observation: CalculationObservation): Promise<void> {
  // 通常のVitestではファイルを残さず、回帰実行時だけ計算結果を保存する
  if (!env.REGRESSION_OUTPUT) return

  const calculationPath = path.join(env.REGRESSION_OUTPUT, 'calculations', `${observation.id}.json`)
  await mkdir(path.dirname(calculationPath), { recursive: true })
  await writeFile(calculationPath, JSON.stringify(observation, null, 2))
}

/** 固定条件で最適編成を実行し、再比較できる入力と内部結果を保存する */
async function observeOptimizer(
  id: string,
  description: string,
  semanticInput: TestOptimizerScenarioInput,
): Promise<void> {
  const normalizedScoreSettings = normalizeScoreSettings(semanticInput.scoreSettings)
  if (!normalizedScoreSettings) throw new Error('testScoreSettings.json contains invalid score settings')
  const scoreSettings = normalizeScoreSettingsDerived(normalizedScoreSettings)
  const settings: UnitSimulatorSettings = {
    ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
    ...readValidatedTestScoreSettingsOptions().unitSettings,
    ...semanticInput.settings,
  }
  const result = await exhaustiveOptimizeAsync(
    {
      settings,
      scoreSettings,
      cardUncaps: Object.fromEntries(data.AllCards.map(({ name }) => [name, constant.DEFAULT_UNCAP])),
      allCards: data.AllCards,
      cardByName: new Map(data.AllCards.map((card) => [card.name, card])),
      excludedCardNames: [],
    },
    () => undefined,
    () => false,
  )

  expect(result).not.toBeNull()
  if (!result) return
  expect(result.members).toHaveLength(6)
  expect(Number.isFinite(result.totalScore)).toBe(true)

  await saveCalculationObservation({
    id,
    description,
    semanticInput,
    scenarioHash: createScenarioHash(semanticInput),
    calculation: {
      input: semanticInput,
      internal: {
        totalScore: result.totalScore,
        parameterBonus: result.parameterBonus,
        // 編成内の表示順ではなく、選ばれたカード集合として比較する
        selectedCards: result.members.map(({ card }) => card.name).sort((left, right) => left.localeCompare(right)),
        rentalCards: result.members
          .filter(({ isRental }) => isRental)
          .map(({ card }) => card.name)
          .sort((left, right) => left.localeCompare(right)),
      },
    },
  })
}

regressionObservationTest('support-card-score-basic: default score observation', async () => {
  const card = data.AllCards.find((candidate) => candidate.name === targetCardName)
  expect(card, `card data for ${targetCardName}`).toBeDefined()
  if (!card) return

  const result = calculateCardWithSettings(card, constant.DEFAULT_UNCAP, createDefaultSettings())
  expect(result, 'default settings should produce a card score').toBeDefined()
  if (!result) return
  expect(Number.isFinite(result.totalIncrease)).toBe(true)

  const semanticInput = {
    cardName: card.name,
    uncap: constant.DEFAULT_UNCAP,
    scoreSettings: 'default',
  }

  await saveCalculationObservation({
    id: 'support-card-score-basic',
    description: '既定設定と4凸状態でサポート点数を計算する',
    semanticInput,
    scenarioHash: createScenarioHash(semanticInput),
    calculation: {
      input: semanticInput,
      internal: {
        total: result.totalIncrease,
        eventBoost: result.eventBoost,
        parameterBonus: result.parameterBonus,
        abilityBreakdown: result.abilityBoosts.map(({ nameKey, total }) => ({ nameKey, total })),
      },
    },
  })
})

regressionObservationTest('score-settings-custom: custom score observation', async () => {
  const card = data.AllCards.find((candidate) => candidate.name === targetCardName)
  expect(card, `card data for ${targetCardName}`).toBeDefined()
  if (!card) return

  const settings = normalizeScoreSettingsDerived({
    ...createDefaultSettings(enums.ScenarioType.Custom),
    ...testCustomScoreSettingsValues,
  })
  const semanticInput = {
    panel: enums.SettingsPanelType.Score,
    settings: {
      scenario: enums.ScenarioType.Custom,
      ...testCustomScoreSettingsValues,
    },
    cardName: targetCardName,
    uncap: constant.DEFAULT_UNCAP,
  }
  const result = calculateCardWithSettings(card, constant.DEFAULT_UNCAP, settings)
  expect(result, 'custom settings should produce a card score').toBeDefined()
  if (!result) return
  expect(Number.isFinite(result.totalIncrease)).toBe(true)

  await saveCalculationObservation({
    id: 'score-settings-custom',
    description: 'カスタムパラメータ設定を使ってサポート点数を計算する',
    semanticInput,
    scenarioHash: createScenarioHash(semanticInput),
    calculation: {
      input: semanticInput,
      internal: {
        total: result.totalIncrease,
        eventBoost: result.eventBoost,
        parameterBonus: result.parameterBonus,
        abilityBreakdown: result.abilityBoosts.map(({ nameKey, total }) => ({ nameKey, total })),
      },
    },
  })
})

regressionObservationTest(
  'optimization-basic: default optimizer observation',
  async () => {
    await observeOptimizer(
      'optimization-basic',
      'テスト用JSONの点数設定・編成条件で最適編成する',
      createTestOptimizerScenarioInput(),
    )
  },
  optimizerObservationTimeoutMs,
)

regressionObservationTest(
  'optimization-filtered: exclude assist cards from optimizer observation',
  async () => {
    await observeOptimizer(
      'optimization-filtered',
      'アシストを候補から除外して最適編成する',
      createTestOptimizerScenarioInput({
        allowedTypes: [enums.CardType.Vocal, enums.CardType.Dance, enums.CardType.Visual],
      }),
    )
  },
  optimizerObservationTimeoutMs,
)

regressionObservationTest(
  'optimization-logic: logic plan observation',
  async () => {
    await observeOptimizer(
      'optimization-logic',
      'ロジックプランの全タイプから最適編成する',
      createTestOptimizerScenarioInput({ plan: enums.PlanType.Logic }),
    )
  },
  optimizerObservationTimeoutMs,
)

regressionObservationTest(
  'optimization-anomaly: anomaly plan observation',
  async () => {
    await observeOptimizer(
      'optimization-anomaly',
      'アノマリープランの全タイプから最適編成する',
      createTestOptimizerScenarioInput({ plan: enums.PlanType.Anomaly }),
    )
  },
  optimizerObservationTimeoutMs,
)

regressionObservationTest(
  'optimization-dance-bonus: parameter bonus observation',
  async () => {
    await observeOptimizer(
      'optimization-dance-bonus',
      'テスト用JSONの設定からDaパラメータボーナスを40%に変えて最適編成する',
      createTestOptimizerScenarioInput({
        paramBonusPercent: parameterValues(30, 40, 30),
      }),
    )
  },
  optimizerObservationTimeoutMs,
)

regressionObservationTest(
  'optimization-type-balance: balanced type count constraint observation',
  async () => {
    await observeOptimizer(
      'optimization-type-balance',
      'Vo・Da・Viを各2枚に制限して最適編成する',
      createTestOptimizerScenarioInput({
        typeCountMin: parameterValues(2, 2, 2),
        typeCountMax: parameterValues(2, 2, 2),
      }),
    )
  },
  optimizerObservationTimeoutMs,
)

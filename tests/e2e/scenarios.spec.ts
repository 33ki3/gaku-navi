/** E2Eで画面操作を確認し、PR比較用の画面観測と計算値をシナリオIDで結び付ける */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { type Locator, type Page, type TestInfo, expect, test } from '@playwright/test'
import type { ScenarioScheduleSelections } from '../../src/types/calculation'
import type { ScoreSettings } from '../../src/types/card'
import * as enums from '../../src/types/enums'
import { readAppStorageKeys } from '../fixtures/readAppStorageKeys'
import {
  type TestScoreSettingsOptions,
  createTestOptimizerScenarioInput,
  parameterValues,
  testCustomScoreSettingsValues,
  testScoreSettingsOptions,
} from '../fixtures/testScoreSettings'

const regressionOutput = process.env.REGRESSION_OUTPUT
const targetCardName = 'もうすぐ本番ですね'
const appStorageKeys = readAppStorageKeys()

/** 内部計算JSONから、指定した計算結果の数値を検証付きで取り出す */
function readInternalNumber(observation: unknown, key: string): number {
  if (observation === null || typeof observation !== 'object') {
    throw new Error('Calculation observation is not an object')
  }
  const calculation = 'calculation' in observation ? observation.calculation : observation
  if (calculation === null || typeof calculation !== 'object' || !('internal' in calculation)) {
    throw new Error('Calculation observation has no internal result')
  }
  const internal = calculation.internal
  if (internal === null || typeof internal !== 'object') {
    throw new Error(`Calculation observation has no numeric ${key}`)
  }
  const value = (internal as Record<string, unknown>)[key]
  if (typeof value !== 'number') throw new Error(`Calculation observation has no numeric ${key}`)
  return value
}

/** 回帰レポートへ出すシナリオの識別子・説明と、比較対象の入力条件 */
interface ScenarioDefinition {
  /** Playwrightのテストタイトルと対応し、ブランチ間で固定する識別子 */
  id: string
  /** 回帰レポートでシナリオの操作内容を伝える短い説明 */
  description: string
  /** 差分対象にする画面状態・操作条件。内容はscenarioHashにも反映する */
  semanticInput: Record<string, unknown>
}

/** 端末別のE2E実行から回帰比較へ渡す画面・計算の観測値 */
interface ScenarioObservation {
  screenshot?: string
  visualComparison?: {
    matches: boolean
    changedPixels?: number
    changedRatio?: number
    dimensionsMismatch?: boolean
  }
  calculation?: Record<string, unknown>
  ui?: Record<string, unknown>
}

interface ScoreScenarioInput {
  scenario: enums.ScenarioType
  difficulty: enums.DifficultyType
  useScheduleLimits: boolean
  useFixedUncap: boolean
  includeSelfTrigger: boolean
  includePItem: boolean
}

/** 通常の点数計算条件を、画面設定と同じenum値で表す */
const defaultScoreInput: ScoreScenarioInput = {
  scenario: enums.ScenarioType.Hajime,
  difficulty: enums.DifficultyType.Legend,
  useScheduleLimits: true,
  useFixedUncap: false,
  includeSelfTrigger: true,
  includePItem: true,
}

/** Playwrightのtest titleから観測IDと意味入力を引く表。登録漏れはafterEachで検出する */
const scenarios: Record<string, ScenarioDefinition> = {
  'home-default': {
    id: 'home-default',
    description: '保存状態が空の初期画面',
    semanticInput: { route: '/', storage: 'empty' },
  },
  'support-card-search-basic': {
    id: 'support-card-search-basic',
    description: 'サポートカード名で一覧を検索する',
    semanticInput: { route: '/', searchQuery: targetCardName },
  },
  'support-card-detail': {
    id: 'support-card-detail',
    description: 'サポートカード詳細を開く',
    semanticInput: { route: '/', cardName: targetCardName, action: 'open-detail' },
  },
  'support-card-score-detail': {
    id: 'support-card-score-detail',
    description: 'サポートカードの点数行から内訳モーダルを開く',
    semanticInput: { route: '/', cardName: targetCardName, action: 'open-score-detail' },
  },
  'support-card-uncap-edit': {
    id: 'support-card-uncap-edit',
    description: '一覧で凸数編集を有効にして代表カードの凸数を変更する',
    semanticInput: { route: '/', cardName: targetCardName, action: 'set-uncap', uncap: enums.UncapType.Four },
  },
  'filter-sort-actions': {
    id: 'filter-sort-actions',
    description: '一覧の並び順とフィルターを切り替える',
    semanticInput: {
      route: '/',
      sortMode: enums.SortModeType.Score,
      sortDirection: enums.SortDirectionType.Ascending,
      filters: [
        enums.RarityType.SSR,
        'sp-rate',
        `uncap:${enums.UncapType.Four}`,
        enums.CardExclusionFilterType.Excluded,
        `event:${enums.EventFilterType.SkillCard}`,
        `source:${enums.SourceType.Gacha}`,
        `count:${enums.CountCustomFilter.Unadjusted}`,
      ],
      actions: ['clear-filters'],
    },
  },
  'support-card-score-basic': {
    id: 'support-card-score-basic',
    description: '既定の点数設定で表示値と内部計算値を比較する',
    semanticInput: {
      cardName: targetCardName,
      uncap: enums.UncapType.Four,
      scoreSettings: 'default',
    },
  },
  'optimization-basic': {
    id: 'optimization-basic',
    description: 'テスト用点数設定で最適編成を計算する',
    semanticInput: createTestOptimizerScenarioInput(),
  },
  'optimization-filtered': {
    id: 'optimization-filtered',
    description: 'アシストを候補から除外して最適編成を計算する',
    semanticInput: createTestOptimizerScenarioInput({
      allowedTypes: [enums.CardType.Vocal, enums.CardType.Dance, enums.CardType.Visual],
    }),
  },
  'optimization-logic': {
    id: 'optimization-logic',
    description: 'ロジックプランの条件で最適編成を計算する',
    semanticInput: createTestOptimizerScenarioInput({ plan: enums.PlanType.Logic }),
  },
  'optimization-anomaly': {
    id: 'optimization-anomaly',
    description: 'アノマリープランの条件で最適編成を計算する',
    semanticInput: createTestOptimizerScenarioInput({ plan: enums.PlanType.Anomaly }),
  },
  'optimization-dance-bonus': {
    id: 'optimization-dance-bonus',
    description: 'テスト用点数設定からDaボーナス率を変更して計算する',
    semanticInput: createTestOptimizerScenarioInput({
      paramBonusPercent: parameterValues(30, 40, 30),
    }),
  },
  'optimization-type-balance': {
    id: 'optimization-type-balance',
    description: 'Vo・Da・Viを各2枚に制限して最適編成する',
    semanticInput: createTestOptimizerScenarioInput({
      typeCountMin: parameterValues(2, 2, 2),
      typeCountMax: parameterValues(2, 2, 2),
    }),
  },
  'score-settings-default': {
    id: 'score-settings-default',
    description: '既定の点数設定パネルを表示する',
    semanticInput: { panel: enums.SettingsPanelType.Score, settings: defaultScoreInput },
  },
  'score-settings-custom': {
    id: 'score-settings-custom',
    description: 'カスタム上昇値を入力した点数設定パネルを表示する',
    semanticInput: {
      panel: enums.SettingsPanelType.Score,
      settings: {
        scenario: enums.ScenarioType.Custom,
        ...testCustomScoreSettingsValues,
      },
      cardName: targetCardName,
      uncap: enums.UncapType.Four,
    },
  },
  'score-settings-actions': {
    id: 'score-settings-actions',
    description: 'シナリオ・難易度とスケジュール・アクション回数・計算オプションを操作する',
    semanticInput: {
      panel: enums.SettingsPanelType.Score,
      settings: defaultScoreInput,
      actions: ['change-scenario', 'select-difficulty', 'open-schedule', 'edit-schedule', 'toggle-score-option'],
    },
  },
  'score-preset-actions': {
    id: 'score-preset-actions',
    description: '点数設定プリセットを保存・読込・上書き・削除する',
    semanticInput: {
      panel: enums.SettingsPanelType.Score,
      presetName: 'PR回帰確認',
      actions: ['save', 'load', 'overwrite', 'delete'],
    },
  },
  'unit-settings-actions': {
    id: 'unit-settings-actions',
    description: '最適編成のプラン・タイプ・数値・オプション設定を操作する',
    semanticInput: {
      panel: enums.SettingsPanelType.UnitSimulator,
      plan: enums.PlanType.Logic,
      excludedType: enums.CardType.Assist,
      initialParams: parameterValues(100, 0, 0),
      ignoreCardExclusions: true,
    },
  },
  'unit-manual-selection': {
    id: 'unit-manual-selection',
    description: '空き枠からカードを手動編成へ追加して再び外す',
    semanticInput: {
      panel: enums.SettingsPanelType.UnitSimulator,
      cardName: targetCardName,
      actions: ['add-to-slot', 'remove-from-slot'],
    },
  },
  'options-modal-actions': {
    id: 'options-modal-actions',
    description: 'オプションの各セクションとチェック設定を操作する',
    semanticInput: {
      modal: 'options',
      sections: [enums.OptionsSectionKey.General, enums.OptionsSectionKey.UnitSimulator, enums.OptionsSectionKey.Score],
    },
  },
  'data-management-actions': {
    id: 'data-management-actions',
    description: 'データ選択、ファイル出力、JSON文字列操作を行う',
    semanticInput: {
      modal: 'data-management',
      actions: ['select-none', 'select-all', 'export-file', 'import-file', 'reload-json', 'apply-invalid-json'],
    },
  },
  'user-card-form-actions': {
    id: 'user-card-form-actions',
    description: 'ユーザーサポートを追加・編集・削除する',
    semanticInput: {
      modal: 'user-card-form',
      cardNames: ['回帰確認用サポート', '回帰編集済みサポート'],
      actions: ['open', 'toggle-section', 'save', 'edit', 'delete'],
    },
  },
  'help-about-actions': {
    id: 'help-about-actions',
    description: 'ヘルプとAboutをメニューから開いて閉じる',
    semanticInput: { modals: ['help', 'about'], actions: ['open-from-menu', 'close'] },
  },
  'achievement-calculator-actions': {
    id: 'achievement-calculator-actions',
    description: 'アチーブ計算機のタブ・経験値方向・一覧復帰を操作する',
    semanticInput: {
      page: enums.AppPage.AchievementCalculator,
      tabs: [enums.CalculatorTab.Idol, enums.CalculatorTab.Production, enums.CalculatorTab.Other],
      otherExp: { direction: 'subtract', value: 1200 },
      actions: ['increment-progress', 'return-to-list'],
    },
  },
  'header-more-menu': {
    id: 'header-more-menu',
    description: '画面幅ごとのその他メニューを開閉する',
    semanticInput: { route: '/', menu: 'more', action: 'open-and-close' },
  },
}

const observations = new Map<string, ScenarioObservation>()

/** キー順を固定し、同じ意味の入力から安定したscenario hashを作る */
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

/** 意味入力をキー順で正規化してからhash化し、キーの記述順では差分にしない */
function scenarioHash(scenario: ScenarioDefinition): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(scenario.semanticInput)))
    .digest('hex')
}

/** E2E起動時にアプリの保存領域へ読み込ませるテスト初期値 */
interface AppStorageSeed {
  scoreSettings?: Partial<ScoreSettings>
  scenarioSchedules?: ScenarioScheduleSelections
  unitSettings?: TestScoreSettingsOptions['unitSettings']
}

/** 保存状態を初期化し、必要なシナリオだけ指定した計算条件で起動する */
async function openApp(page: Page, seed: AppStorageSeed = {}): Promise<void> {
  await page.addInitScript(
    ({ scoreSettings, scenarioSchedules, unitSettings, storageKeys }) => {
      window.localStorage.clear()
      if (scoreSettings) window.localStorage.setItem(storageKeys.scoreSettings, JSON.stringify(scoreSettings))
      if (scenarioSchedules) {
        window.localStorage.setItem(storageKeys.scheduleSelections, JSON.stringify(scenarioSchedules))
      }
      if (unitSettings) window.localStorage.setItem(storageKeys.unitSettings, JSON.stringify(unitSettings))
    },
    {
      ...seed,
      storageKeys: {
        scoreSettings: appStorageKeys.scoreSettings,
        scheduleSelections: appStorageKeys.scheduleSelections,
        unitSettings: appStorageKeys.unitSettings,
      },
    },
  )
  await page.goto('./')
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByTestId('support-card').first()).toBeVisible()
  // 撮影ごとの揺れを抑えるため、遷移・アニメーションと入力カーソルを画面から除く
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `,
  })
  // フォント未読込のまま撮影すると文字幅や改行位置が変わるため、描画完了を待つ
  await page.evaluate(async () => {
    await document.fonts.ready
  })
}

/** テスト用JSONの設定値をアプリの保存形式で読み込み、最適編成画面を起動する */
async function openOptimizerApp(page: Page): Promise<void> {
  await openApp(page, {
    scoreSettings: testScoreSettingsOptions.scoreSettings,
    scenarioSchedules: testScoreSettingsOptions.scenarioSchedules,
    unitSettings: testScoreSettingsOptions.unitSettings,
  })
}

/** 保存済み基準画像がある場合に画面を比較し、差分を観測値として返す */
async function compareScreenshot(
  scenario: ScenarioDefinition,
  testInfo: TestInfo,
  page: Page,
  screenshotTarget?: Locator,
): Promise<ScenarioObservation['visualComparison']> {
  // 比較を有効にしていない実行では通常の画面確認だけを行う
  if (process.env.REGRESSION_COMPARE_BASELINE !== '1') return undefined

  const snapshotPath = testInfo.snapshotPath(`${scenario.id}.png`)
  // 初回追加シナリオには比較元がないため、画像を新規差分として扱わない
  if (!existsSync(snapshotPath)) return undefined

  const options = { animations: 'disabled' as const, caret: 'hide' as const, threshold: 0.1 }
  try {
    if (screenshotTarget) {
      await expect(screenshotTarget).toHaveScreenshot(`${scenario.id}.png`, options)
    } else {
      await expect(page).toHaveScreenshot(`${scenario.id}.png`, options)
    }
    return { matches: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const pixelDifference = message.match(/(\d+) pixels \(ratio ([\d.]+) of all image pixels\) are different\./)
    const dimensionsMismatch = /Expected an image \d+px by \d+px, received \d+px by \d+px\./.test(message)
    // 画像差分だけを観測値に変換し、それ以外の失敗は隠さない
    if (!pixelDifference && !dimensionsMismatch) throw error

    return {
      matches: false,
      ...(pixelDifference
        ? { changedPixels: Number(pixelDifference[1]), changedRatio: Number(pixelDifference[2]) }
        : {}),
      ...(dimensionsMismatch ? { dimensionsMismatch: true } : {}),
    }
  }
}

/** 画像をdevice別に保存し、シナリオJSONへ渡す観測内容をメモリに保持する */
async function saveObservation(
  scenario: ScenarioDefinition,
  testInfo: TestInfo,
  page: Page,
  details?: Pick<ScenarioObservation, 'calculation' | 'ui'>,
  screenshotTarget?: Locator,
): Promise<void> {
  if (!regressionOutput) return

  const device = testInfo.project.name
  const screenshotPath = path.join(regressionOutput, 'visual', device, `${scenario.id}.png`)
  const observationPath = path.join(regressionOutput, 'observations', device, `${scenario.id}.json`)
  await mkdir(path.dirname(screenshotPath), { recursive: true })
  await mkdir(path.dirname(observationPath), { recursive: true })
  if (screenshotTarget) {
    await screenshotTarget.screenshot({ path: screenshotPath, animations: 'disabled', caret: 'hide' })
  } else {
    await page.screenshot({ path: screenshotPath, animations: 'disabled', caret: 'hide' })
  }
  const visualComparison = await compareScreenshot(scenario, testInfo, page, screenshotTarget)

  observations.set(`${device}/${scenario.id}`, {
    screenshot: path.relative(regressionOutput, screenshotPath),
    ...(visualComparison ? { visualComparison } : {}),
    ...details,
  })
}

async function openScoreSettings(page: Page): Promise<{ content: Locator; screenshotTarget: Locator }> {
  await page.getByRole('button', { name: '点数設定', exact: true }).first().click()
  const content = page.getByTestId('score-settings-content')
  await expect(content).toBeVisible()
  // フォームの高さは表示領域を超えるため、撮影にはスクロール枠の親パネルを使う
  return { content, screenshotTarget: content.locator('xpath=..') }
}

async function openUnitSimulator(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: '最適編成', exact: true }).first().click()
  const optimizeButton = page.getByRole('button', { name: '最適編成を計算', exact: true })
  await expect(optimizeButton).toBeVisible()
  return optimizeButton
}

async function openMoreMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'その他', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'サポート追加', exact: true })).toBeVisible()
}

async function openMoreMenuItem(page: Page, label: string): Promise<void> {
  await openMoreMenu(page)
  await page.getByRole('button', { name: label, exact: true }).click()
}

/** 表示合計を数値化し、回帰実行では保存済みの内部計算結果と照合する */
async function readOptimizerTotal(resultPanel: Locator, scenarioId: string): Promise<number> {
  const resultText = await resultPanel.innerText()
  const displayedTotalMatch = resultText.match(/合計パラメータ上昇量\s*([\d,]+)/)
  expect(displayedTotalMatch).not.toBeNull()
  const displayedTotal = Number(displayedTotalMatch?.[1].replaceAll(',', ''))
  expect(Number.isFinite(displayedTotal)).toBe(true)

  if (regressionOutput) {
    // 回帰実行時は、画面表示と内部計算の合計値を照合する
    const calculationPath = path.join(regressionOutput, 'calculations', `${scenarioId}.json`)
    const calculation: unknown = JSON.parse(await readFile(calculationPath, 'utf8'))
    expect(displayedTotal).toBe(readInternalNumber(calculation, 'totalScore'))
  }

  return displayedTotal
}

/** 結果欄が先に表示されても、計算ボタンが待機状態へ戻るまで待つ */
async function expectOptimizerReady(optimizeButton: Locator): Promise<void> {
  await expect(optimizeButton).toHaveText('最適編成を計算', { timeout: 120_000 })
}

// 失敗時の画面も残せるよう、テスト終了後に状態と観測ファイルを保存する
test.afterEach(async ({ page }, testInfo) => {
  const scenario = scenarios[testInfo.title]
  // 観測出力が無効なローカル実行でも、シナリオ登録漏れは検出する
  if (!scenario) throw new Error(`No regression scenario registered for E2E test "${testInfo.title}"`)
  if (!regressionOutput) return

  const device = testInfo.project.name
  const observationPath = path.join(regressionOutput, 'observations', device, `${scenario.id}.json`)
  const existingObservation = observations.get(`${device}/${scenario.id}`)
  let failureScreenshot: string | undefined

  if (testInfo.status !== testInfo.expectedStatus && !existingObservation?.screenshot) {
    const screenshotPath = path.join(regressionOutput, 'visual', device, `${scenario.id}.png`)
    await mkdir(path.dirname(screenshotPath), { recursive: true })
    // 途中までの撮影に失敗したケースでも、画面状態を調査できるよう再取得する
    try {
      await page.screenshot({ path: screenshotPath, animations: 'disabled', caret: 'hide' })
      failureScreenshot = path.relative(regressionOutput, screenshotPath)
    } catch (error) {
      console.warn(`Failed to capture ${scenario.id} after a test failure`, error)
    }
  }

  await mkdir(path.dirname(observationPath), { recursive: true })
  // skippedをfailedへまとめず、Playwrightの実行状態をそのまま比較へ渡す
  await writeFile(
    observationPath,
    JSON.stringify(
      {
        id: scenario.id,
        description: scenario.description,
        semanticInput: scenario.semanticInput,
        scenarioHash: scenarioHash(scenario),
        device,
        status: testInfo.status === 'passed' ? 'passed' : testInfo.status === 'skipped' ? 'skipped' : 'failed',
        ...(existingObservation ?? {}),
        ...(failureScreenshot ? { screenshot: failureScreenshot } : {}),
      },
      null,
      2,
    ),
  )
})

// 一覧・検索・カード詳細の基本動作
/** 保存データが空の初期状態で検索欄とサポート一覧が表示されることを確認する */
test('home-default', async ({ page }, testInfo) => {
  await openApp(page)
  await expect(page.getByRole('searchbox', { name: 'サポート名 / Pアイテム / スキルカード' })).toBeVisible()
  await saveObservation(scenarios['home-default'], testInfo, page)
})

/** 名前検索で対象カードだけに絞られ、検索解除で一覧表示へ戻ることを確認する */
test('support-card-search-basic', async ({ page }, testInfo) => {
  await openApp(page)
  await page.getByRole('searchbox', { name: 'サポート名 / Pアイテム / スキルカード' }).fill(targetCardName)
  const card = page
    .getByTestId('support-card')
    .filter({ has: page.getByRole('heading', { name: targetCardName, exact: true }) })
  await expect(card).toHaveCount(1)
  await saveObservation(scenarios['support-card-search-basic'], testInfo, page)
  await page.getByRole('button', { name: '検索をクリア', exact: true }).click()
  await expect(page.getByTestId('support-card')).not.toHaveCount(1)
})

/** 対象カードの詳細ダイアログが開き、カード情報を表示することを確認する */
test('support-card-detail', async ({ page }, testInfo) => {
  await openApp(page)
  await page.getByRole('searchbox', { name: 'サポート名 / Pアイテム / スキルカード' }).fill(targetCardName)
  await page.getByRole('heading', { name: targetCardName, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: `${targetCardName}の詳細を表示` })
  await expect(dialog).toBeVisible()
  await saveObservation(scenarios['support-card-detail'], testInfo, page, undefined, dialog)
})

/** 点数行から内訳を開き、合計を表示して閉じられることを確認する */
test('support-card-score-detail', async ({ page }, testInfo) => {
  await openApp(page)
  await page.getByRole('searchbox', { name: 'サポート名 / Pアイテム / スキルカード' }).fill(targetCardName)
  const card = page
    .getByTestId('support-card')
    .filter({ has: page.getByRole('heading', { name: targetCardName, exact: true }) })
  await card.getByTestId('support-card-score').click()
  const dialog = page.getByRole('dialog', { name: `${targetCardName}の点数内訳を表示` })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('合計', { exact: true })).toBeVisible()
  await saveObservation(scenarios['support-card-score-detail'], testInfo, page, undefined, dialog)
  await dialog.getByRole('button', { name: '閉じる', exact: true }).click()
  await expect(dialog).toBeHidden()
})

/** 凸数の変更が保存値へ反映され、カード詳細を開けることを確認する */
test('support-card-uncap-edit', async ({ page }, testInfo) => {
  await openApp(page)
  await page.getByRole('navigation', { name: '主要メニュー' }).getByRole('button', { name: /凸数/ }).click()
  await page.getByRole('searchbox', { name: 'サポート名 / Pアイテム / スキルカード' }).fill(targetCardName)
  const card = page
    .getByTestId('support-card')
    .filter({ has: page.getByRole('heading', { name: targetCardName, exact: true }) })
  const readSavedUncap = () =>
    page.evaluate(
      ({ cardName, storageKey }) => {
        const saved = window.localStorage.getItem(storageKey)
        if (!saved) return null
        return (JSON.parse(saved) as Record<string, number>)[cardName] ?? null
      },
      { cardName: targetCardName, storageKey: appStorageKeys.uncaps },
    )

  // 既定値の4凸を押し直すだけにならないよう、保存値が変わる往復を確認する
  await card.getByRole('button', { name: '3凸', exact: true }).click()
  await expect.poll(readSavedUncap).toBe(enums.UncapType.Three)
  await card.getByRole('button', { name: '4凸', exact: true }).click()
  await expect.poll(readSavedUncap).toBe(enums.UncapType.Four)
  await saveObservation(scenarios['support-card-uncap-edit'], testInfo, page, undefined, card)
  await card.getByRole('heading', { name: targetCardName, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: `${targetCardName}の詳細を表示` })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: '閉じる', exact: true }).click()
})

/** ソートと複数種のフィルターを切り替え、条件を一括解除できることを確認する */
test('filter-sort-actions', async ({ page }, testInfo) => {
  await openApp(page)
  await page.getByRole('button', { name: '降順', exact: true }).first().click()
  await page.getByRole('button', { name: 'レア度順', exact: true }).first().click()
  const dialog = page.getByRole('dialog', { name: 'フィルタ・ソート' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'ソート', exact: true }).click()
  await dialog.getByRole('button', { name: '点数順', exact: true }).click()
  await dialog.getByRole('button', { name: '昇順', exact: true }).click()
  await dialog.getByRole('button', { name: 'フィルタ', exact: true }).click()
  const rarity = dialog.getByRole('button', { name: 'SSR', exact: true })
  await rarity.click()
  await expect(rarity).toHaveAttribute('aria-pressed', 'true')
  await dialog.getByRole('button', { name: 'SP発生率', exact: true }).click()
  await dialog.getByRole('button', { name: '4凸', exact: true }).click()
  await dialog.getByRole('button', { name: '除外中', exact: true }).click()
  await dialog.getByRole('button', { name: 'スキルカード', exact: true }).click()
  await dialog.getByRole('button', { name: '恒常', exact: true }).click()
  await dialog.getByRole('button', { name: '未調整', exact: true }).click()
  await expect(dialog.getByRole('button', { name: '条件をクリア', exact: true })).toBeVisible()
  await saveObservation(scenarios['filter-sort-actions'], testInfo, page, undefined, dialog)
  await dialog.getByRole('button', { name: '条件をクリア', exact: true }).click()
  await expect(dialog.getByRole('button', { name: '条件をクリア', exact: true })).toBeHidden()
  await dialog.getByRole('button', { name: '閉じる', exact: true }).click()
})

/** 一覧の点数表示が既定設定の内部計算結果と一致することを確認する */
test('support-card-score-basic', async ({ page }, testInfo) => {
  await openApp(page)
  await page.getByRole('searchbox', { name: 'サポート名 / Pアイテム / スキルカード' }).fill(targetCardName)
  const card = page
    .getByTestId('support-card')
    .filter({ has: page.getByRole('heading', { name: targetCardName, exact: true }) })
  const displayedText = await card.getByTestId('support-card-score').innerText()
  const displayedTotal = Number(displayedText.replace(/[^\d-]/g, ''))
  expect(Number.isFinite(displayedTotal)).toBe(true)

  if (regressionOutput) {
    const calculationPath = path.join(regressionOutput, 'calculations', 'support-card-score-basic.json')
    const calculation: unknown = JSON.parse(await readFile(calculationPath, 'utf8'))
    expect(displayedTotal).toBe(readInternalNumber(calculation, 'total'))
  }

  await saveObservation(scenarios['support-card-score-basic'], testInfo, page, { ui: { displayedTotal } }, card)
})

// 点数設定パネルの既定値、編集、プリセット保存を確認する
/** 初期シナリオ・難易度・計算オプションが既定値で選択されていることを確認する */
test('score-settings-default', async ({ page }, testInfo) => {
  await openApp(page)
  const { content: panel, screenshotTarget } = await openScoreSettings(page)
  await expect(panel.getByRole('button', { name: '初', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(panel.getByRole('button', { name: 'レジェンド', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const selectedOptions = await panel.locator('[aria-pressed="true"]').allTextContents()
  await saveObservation(
    scenarios['score-settings-default'],
    testInfo,
    page,
    { ui: { selectedOptions } },
    screenshotTarget,
  )
})

/** シナリオ・スケジュール・回数・オプションの切替と、回数変更の復元を確認する */
test('score-settings-actions', async ({ page }, testInfo) => {
  await openApp(page)
  const { content: panel, screenshotTarget } = await openScoreSettings(page)

  const hifScenario = panel.getByRole('button', { name: 'H.I.F', exact: true })
  await hifScenario.click()
  await expect(hifScenario).toHaveAttribute('aria-pressed', 'true')
  const hajimeScenario = panel.getByRole('button', { name: '初', exact: true })
  await hajimeScenario.click()
  await expect(hajimeScenario).toHaveAttribute('aria-pressed', 'true')
  const legendDifficulty = panel.getByRole('button', { name: 'レジェンド', exact: true })
  await legendDifficulty.click()
  await expect(legendDifficulty).toHaveAttribute('aria-pressed', 'true')

  const scheduleSection = panel.getByRole('button', { name: /スケジュール/ }).first()
  await scheduleSection.click()
  await expect(scheduleSection).toHaveAttribute('aria-expanded', 'true')

  const scheduleContent = scheduleSection.locator('xpath=../..')
  const alternateActivity = scheduleContent.locator('button[aria-pressed="false"]').first()
  await expect(alternateActivity).toBeVisible()
  await alternateActivity.click()

  const scheduleAuto = panel.getByRole('checkbox', { name: 'スケジュールに基づく回数を自動設定' })
  // 自動回数を止めて手動変更できることと、変更した回数を戻せることを確認する
  await scheduleAuto.uncheck()
  await expect(scheduleAuto).not.toBeChecked()

  const actionCounts = panel.getByRole('button', { name: /アクション回数/ }).first()
  const actionCountContent = actionCounts.locator('xpath=../..')
  const firstActionCount = actionCountContent.locator('input[type="number"]').first()
  const originalCount = Number(await firstActionCount.inputValue())
  await actionCountContent.getByRole('button', { name: '+', exact: true }).first().click()
  await expect(firstActionCount).toHaveValue(String(originalCount + 1))
  await actionCountContent.getByRole('button', { name: '−', exact: true }).first().click()
  await expect(firstActionCount).toHaveValue(String(originalCount))

  await scheduleAuto.check()

  await actionCounts.click()
  await expect(actionCounts).toHaveAttribute('aria-expanded', 'false')
  await actionCounts.click()
  await expect(actionCounts).toHaveAttribute('aria-expanded', 'true')

  const options = panel.getByRole('button', { name: /オプション/ }).first()
  await options.click()
  const includePItem = panel.getByRole('checkbox', { name: 'Pアイテムの効果を点数計算に含める' })
  await includePItem.uncheck()
  await includePItem.check()
  await saveObservation(
    scenarios['score-settings-actions'],
    testInfo,
    page,
    { ui: { includePItem: true } },
    screenshotTarget,
  )

  // モバイルでは設定パネルをタブで切り替え、PCではモーダルを閉じる
  if (testInfo.project.name !== 'desktop') {
    const panelSwitcher = page.getByRole('tablist', { name: '設定パネルの切り替え' })
    await panelSwitcher.getByRole('tab', { name: '最適編成', exact: true }).click()
    await expect(page.getByRole('button', { name: '最適編成を計算', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '閉じる', exact: true }).click()
    await expect(page.getByRole('button', { name: '最適編成を計算', exact: true })).toBeHidden()
  } else {
    await page.getByRole('button', { name: '閉じる', exact: true }).click()
    await expect(panel).toBeHidden()
  }
})

/** プリセットの保存・読込・上書き・削除が画面と保存値へ反映されることを確認する */
test('score-preset-actions', async ({ page }, testInfo) => {
  await openApp(page)
  const { content: panel, screenshotTarget } = await openScoreSettings(page)
  const options = panel.getByRole('button', { name: /オプション/ }).first()
  await options.click()
  const includePItem = panel.getByRole('checkbox', { name: 'Pアイテムの効果を点数計算に含める' })
  await includePItem.uncheck()

  await panel
    .getByRole('button', { name: /プリセット/ })
    .first()
    .click()
  const presetName = 'PR回帰確認'
  const nameInput = panel.getByPlaceholder('プリセット名')
  await nameInput.fill(presetName)
  await panel.getByRole('button', { name: '保存', exact: true }).click()

  const presetSelector = panel.locator('select').first()
  await expect(presetSelector).toHaveValue(presetName)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const presets = JSON.parse(window.localStorage.getItem('gaku-navi-score-presets') ?? '[]') as { name: string }[]
        return presets.some((preset) => preset.name === 'PR回帰確認')
      }),
    )
    .toBe(true)

  await includePItem.check()
  await panel.getByRole('button', { name: '読込', exact: true }).click()
  await expect(includePItem).not.toBeChecked()
  await includePItem.check()
  await panel.getByRole('button', { name: '上書き', exact: true }).click()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const presets = JSON.parse(window.localStorage.getItem('gaku-navi-score-presets') ?? '[]') as {
          name: string
          settings: { includePItem: boolean }
        }[]
        return presets.find((preset) => preset.name === 'PR回帰確認')?.settings.includePItem
      }),
    )
    .toBe(true)
  await panel.getByRole('button', { name: '削除', exact: true }).click()
  await expect(presetSelector).toHaveValue('')
  await expect
    .poll(() =>
      page.evaluate(() => {
        const presets = JSON.parse(window.localStorage.getItem('gaku-navi-score-presets') ?? '[]') as { name: string }[]
        return presets.some((preset) => preset.name === 'PR回帰確認')
      }),
    )
    .toBe(false)
  await saveObservation(
    scenarios['score-preset-actions'],
    testInfo,
    page,
    { ui: { presetRemoved: true } },
    screenshotTarget,
  )
})

/** カスタム上昇値を入力し、画面の点数が内部計算結果と一致することを確認する */
test('score-settings-custom', async ({ page }, testInfo) => {
  await openApp(page)
  await page.getByRole('searchbox', { name: 'サポート名 / Pアイテム / スキルカード' }).fill(targetCardName)
  const card = page
    .getByTestId('support-card')
    .filter({ has: page.getByRole('heading', { name: targetCardName, exact: true }) })
  const { content: panel, screenshotTarget } = await openScoreSettings(page)
  await panel.getByRole('button', { name: 'カスタム', exact: true }).click()
  await panel.getByRole('button').filter({ hasText: 'パラメータ上昇設定' }).click()
  const addRowButton = panel.getByRole('button', { name: '追加', exact: true })
  for (let index = 1; index < testCustomScoreSettingsValues.customParamBonusRows.length; index += 1) {
    await addRowButton.click()
  }
  const parameterTypes = Object.values(enums.ParameterType)
  const customValues = [
    ...testCustomScoreSettingsValues.customParamBonusRows.flatMap((row) =>
      parameterTypes.map((parameter) => row[parameter]),
    ),
    ...parameterTypes.map((parameter) => testCustomScoreSettingsValues.customClassBonus[parameter]),
    ...parameterTypes.map((parameter) => testCustomScoreSettingsValues.customNonBonusGain[parameter]),
  ]
  const customInputs = panel.locator('input[type="number"]')
  for (const [index, value] of customValues.entries()) {
    await customInputs.nth(index).fill(String(value))
  }
  const displayedTotal = Number((await card.getByTestId('support-card-score').innerText()).replace(/[^\d-]/g, ''))
  expect(Number.isFinite(displayedTotal)).toBe(true)

  if (regressionOutput) {
    const calculationPath = path.join(regressionOutput, 'calculations', 'score-settings-custom.json')
    const calculation: unknown = JSON.parse(await readFile(calculationPath, 'utf8'))
    expect(displayedTotal).toBe(readInternalNumber(calculation, 'total'))
  }

  const displayedCustomValues = await customInputs.evaluateAll(
    (inputs, count) => inputs.slice(0, count).map((input) => Number((input as HTMLInputElement).value)),
    customValues.length,
  )
  const parameterValuesPerRow = parameterTypes.length
  const rowInputCount = testCustomScoreSettingsValues.customParamBonusRows.length * parameterValuesPerRow
  const classBonusStart = rowInputCount
  const nonBonusGainStart = classBonusStart + parameterValuesPerRow
  await saveObservation(
    scenarios['score-settings-custom'],
    testInfo,
    page,
    {
      ui: {
        displayedTotal,
        selectedOptions: await panel.locator('[aria-pressed="true"]').allTextContents(),
        customParamBonusRows: Array.from(
          { length: testCustomScoreSettingsValues.customParamBonusRows.length },
          (_, index) => displayedCustomValues.slice(index * parameterValuesPerRow, (index + 1) * parameterValuesPerRow),
        ),
        customClassBonus: displayedCustomValues.slice(classBonusStart, nonBonusGainStart),
        customNonBonusGain: displayedCustomValues.slice(nonBonusGainStart),
      },
    },
    screenshotTarget,
  )
})

// 最適編成の既定条件と、タイプ・プラン・ボーナスを変えた条件を比較する
/** 既定候補数で計算し、表示合計と内部値、内訳、カード固定を確認する */
test('optimization-basic', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  // 代表シナリオは通常利用と同じ候補数で、画面値と内部値を照合する
  await openOptimizerApp(page)
  const optimizeButton = await openUnitSimulator(page)
  await page.getByRole('button', { name: 'オプション', exact: true }).click()
  const candidateLimitInput = page.getByRole('spinbutton').last()
  await expect(candidateLimitInput).toHaveValue(String(testScoreSettingsOptions.unitSettings.exhaustiveCandidateLimit))
  await optimizeButton.click()
  const resultPanel = page.getByTestId('unit-result-panel')
  await expect(resultPanel).toBeVisible({ timeout: 120_000 })
  await expectOptimizerReady(optimizeButton)
  const displayedTotal = await readOptimizerTotal(resultPanel, 'optimization-basic')
  await saveObservation(scenarios['optimization-basic'], testInfo, page, { ui: { displayedTotal } }, resultPanel)

  // 計算結果の観測後に、内訳表示とカード固定の操作も確認する
  await resultPanel.getByText('合計パラメータ上昇量', { exact: true }).click()
  await expect(resultPanel.getByText('初期パラ', { exact: true })).toBeVisible()
  const firstMember = resultPanel.locator('div.border-l-4').first()
  const lockButton = firstMember.getByRole('button').first()
  await lockButton.click()
  await expect(lockButton).toHaveAttribute('title', '固定')
  await lockButton.click()
  await expect(lockButton).toHaveAttribute('title', '')
})

/** アシストタイプを除外すると、その条件で最適編成が再計算されることを確認する */
test('optimization-filtered', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await openOptimizerApp(page)
  const optimizeButton = await openUnitSimulator(page)
  const assistType = page.getByRole('button', { name: 'アシスト', exact: true })
  await expect(assistType).toHaveAttribute('aria-pressed', 'true')
  await assistType.click()
  await expect(assistType).toHaveAttribute('aria-pressed', 'false')
  await optimizeButton.click()
  const resultPanel = page.getByTestId('unit-result-panel')
  await expect(resultPanel).toBeVisible({ timeout: 120_000 })
  await expectOptimizerReady(optimizeButton)
  const displayedTotal = await readOptimizerTotal(resultPanel, 'optimization-filtered')

  await saveObservation(
    scenarios['optimization-filtered'],
    testInfo,
    page,
    { ui: { displayedTotal, excludedType: enums.CardType.Assist } },
    resultPanel,
  )
})

/** ロジックプランを選んだ最適編成の合計値を記録する */
test('optimization-logic', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await openOptimizerApp(page)
  const optimizeButton = await openUnitSimulator(page)
  const logicPlan = page.getByRole('button', { name: 'ロジック', exact: true })
  await logicPlan.click()
  await expect(logicPlan).toHaveAttribute('aria-pressed', 'true')
  await optimizeButton.click()
  const resultPanel = page.getByTestId('unit-result-panel')
  await expect(resultPanel).toBeVisible({ timeout: 120_000 })
  await expectOptimizerReady(optimizeButton)
  const displayedTotal = await readOptimizerTotal(resultPanel, 'optimization-logic')
  await saveObservation(
    scenarios['optimization-logic'],
    testInfo,
    page,
    { ui: { displayedTotal, plan: enums.PlanType.Logic } },
    resultPanel,
  )
})

/** アノマリープランを選んだ最適編成の合計値を記録する */
test('optimization-anomaly', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await openOptimizerApp(page)
  const optimizeButton = await openUnitSimulator(page)
  const anomalyPlan = page.getByRole('button', { name: 'アノマリー', exact: true })
  await anomalyPlan.click()
  await expect(anomalyPlan).toHaveAttribute('aria-pressed', 'true')
  await optimizeButton.click()
  const resultPanel = page.getByTestId('unit-result-panel')
  await expect(resultPanel).toBeVisible({ timeout: 120_000 })
  await expectOptimizerReady(optimizeButton)
  const displayedTotal = await readOptimizerTotal(resultPanel, 'optimization-anomaly')
  await saveObservation(
    scenarios['optimization-anomaly'],
    testInfo,
    page,
    { ui: { displayedTotal, plan: enums.PlanType.Anomaly } },
    resultPanel,
  )
})

/** Daパラメータボーナスを加えた条件で最適編成を再計算する */
test('optimization-dance-bonus', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await openOptimizerApp(page)
  const optimizeButton = await openUnitSimulator(page)
  const bonusSection = page.getByRole('heading', { name: 'パラメータボーナス' }).locator('..')
  const danceBonusInput = bonusSection.getByText('ダンス', { exact: true }).locator('..').getByRole('spinbutton')
  await danceBonusInput.fill('40')
  await expect(danceBonusInput).toHaveValue('40')
  await optimizeButton.click()
  const resultPanel = page.getByTestId('unit-result-panel')
  await expect(resultPanel).toBeVisible({ timeout: 120_000 })
  await expectOptimizerReady(optimizeButton)
  const displayedTotal = await readOptimizerTotal(resultPanel, 'optimization-dance-bonus')
  await saveObservation(
    scenarios['optimization-dance-bonus'],
    testInfo,
    page,
    { ui: { displayedTotal, paramBonusPercent: parameterValues(30, 40, 30) } },
    resultPanel,
  )
})

/** Vo・Da・Viの上限・下限を各2枚にして、編成結果の枚数を確認する */
test('optimization-type-balance', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await openOptimizerApp(page)
  const optimizeButton = await openUnitSimulator(page)

  // 最小枚数と最大枚数を揃え、各タイプがちょうど2枚になるよう指定する
  for (const heading of [/タイプ別 最小枚数/, /タイプ別 最大枚数/]) {
    const countInputs = page.getByRole('heading', { name: heading }).locator('..').getByRole('spinbutton')
    await expect(countInputs).toHaveCount(3)
    for (const input of await countInputs.all()) await input.fill('2')
  }

  await optimizeButton.click()
  const resultPanel = page.getByTestId('unit-result-panel')
  await expect(resultPanel).toBeVisible({ timeout: 120_000 })
  await expectOptimizerReady(optimizeButton)
  const displayedTotal = await readOptimizerTotal(resultPanel, 'optimization-type-balance')

  const memberCards = resultPanel.locator('div.border-l-4')
  await expect(memberCards).toHaveCount(6)
  const typeCounts = await Promise.all(
    ['Vo', 'Da', 'Vi'].map(async (label) => {
      let count = 0
      for (const memberCard of await memberCards.all()) {
        if ((await memberCard.getByText(label, { exact: true }).count()) > 0) count += 1
      }
      return count
    }),
  )
  expect(typeCounts).toEqual([2, 2, 2])

  await saveObservation(
    scenarios['optimization-type-balance'],
    testInfo,
    page,
    { ui: { displayedTotal, typeCounts: parameterValues(2, 2, 2) } },
    resultPanel,
  )
})

// ヘッダーから開く補助画面、データ管理、アチーブ画面の操作を確認する
/** 画面幅に応じてその他メニューを開閉し、補助画面への入口を確認する */
test('header-more-menu', async ({ page }, testInfo) => {
  await openApp(page)
  await openMoreMenu(page)
  for (const label of [
    'サポート追加',
    'アチーブ計算機',
    'データ管理',
    'オプション',
    '使い方ガイド',
    'このサイトについて',
  ]) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
  }
  await saveObservation(scenarios['header-more-menu'], testInfo, page)
  if (testInfo.project.name === 'desktop') {
    await page.keyboard.press('Escape')
  } else {
    await page.getByRole('dialog', { name: 'その他' }).getByRole('button', { name: '閉じる', exact: true }).click()
    const headerMenuButton = page.getByRole('button', { name: 'メニュー', exact: true })
    await headerMenuButton.click()
    // 下部ナビにも同名の項目があるため、右上メニュー内に絞って確認する
    const headerMenu = headerMenuButton.locator('xpath=..')
    await expect(headerMenu.getByRole('button', { name: '点数設定', exact: true })).toBeVisible()
    await expect(headerMenu.getByRole('button', { name: '凸数設定', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
  }
  await expect(page.getByRole('button', { name: 'サポート追加', exact: true })).toBeHidden()
})

/** ユーザーサポートを作成して編集・削除し、一覧へ反映されることを確認する */
test('user-card-form-actions', async ({ page }, testInfo) => {
  await openApp(page)
  await openMoreMenuItem(page, 'サポート追加')
  const dialog = page.getByRole('dialog', { name: 'サポート追加' })
  await expect(dialog).toBeVisible()
  // 作成後に一覧で編集・削除まで行い、各操作が表示へ反映されることを確認する
  await dialog.getByPlaceholder('サポート名を入力').fill('回帰確認用サポート')
  const abilitiesSection = dialog.getByRole('button', { name: 'サポートアビリティ', exact: true })
  await abilitiesSection.click()
  await expect(abilitiesSection).toHaveAttribute('aria-expanded', 'false')
  await abilitiesSection.click()
  await expect(abilitiesSection).toHaveAttribute('aria-expanded', 'true')
  const abilitySelectors = dialog.locator('select')
  for (const slot of [0, 1, 3, 4]) {
    await abilitySelectors.nth(slot).selectOption({ index: 1 })
  }
  await expect(dialog.getByRole('button', { name: '保存', exact: true })).toBeEnabled()
  await saveObservation(
    scenarios['user-card-form-actions'],
    testInfo,
    page,
    { ui: { formName: '回帰確認用サポート', abilitiesFilled: true } },
    dialog,
  )
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect(dialog).toBeHidden()

  const search = page.getByRole('searchbox', { name: 'サポート名 / Pアイテム / スキルカード' })
  await search.fill('回帰確認用サポート')
  const createdCard = page
    .getByTestId('support-card')
    .filter({ has: page.getByRole('heading', { name: '回帰確認用サポート', exact: true }) })
  await expect(createdCard).toHaveCount(1)
  await createdCard.getByRole('heading', { name: '回帰確認用サポート', exact: true }).click()
  const detail = page.getByRole('dialog', { name: '回帰確認用サポートの詳細を表示' })
  await expect(detail).toBeVisible()
  await detail.getByRole('button', { name: '編集', exact: true }).click()

  const editDialog = page.getByRole('dialog', { name: 'サポート編集' })
  await expect(editDialog).toBeVisible()
  await editDialog.getByPlaceholder('サポート名を入力').fill('回帰編集済みサポート')
  await editDialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect(editDialog).toBeHidden()

  await search.fill('回帰編集済みサポート')
  const editedCard = page
    .getByTestId('support-card')
    .filter({ has: page.getByRole('heading', { name: '回帰編集済みサポート', exact: true }) })
  await expect(editedCard).toHaveCount(1)
  await editedCard.getByRole('heading', { name: '回帰編集済みサポート', exact: true }).click()
  const editedDetail = page.getByRole('dialog', { name: '回帰編集済みサポートの詳細を表示' })
  await editedDetail.getByRole('button', { name: '削除', exact: true }).click()
  await expect(editedDetail.getByText('このサポートを削除しますか？')).toBeVisible()
  await editedDetail.getByRole('button', { name: '削除する', exact: true }).click()
  await expect(editedDetail).toBeHidden()
  await expect(editedCard).toHaveCount(0)
})

/** オプション各区分の開閉とチェック設定が操作できることを確認する */
test('options-modal-actions', async ({ page }, testInfo) => {
  await openApp(page)
  await openMoreMenuItem(page, 'オプション')
  const dialog = page.getByRole('dialog', { name: 'オプション' })
  await expect(dialog).toBeVisible()

  const bottomNavigation = dialog.getByRole('checkbox', { name: 'スマホで下部メニューを表示' })
  await bottomNavigation.uncheck()
  await expect(bottomNavigation).not.toBeChecked()
  await bottomNavigation.check()

  const unitSection = dialog.getByRole('button', { name: '最適編成', exact: true })
  await unitSection.click()
  await expect(unitSection).toHaveAttribute('aria-expanded', 'false')
  await unitSection.click()
  await expect(unitSection).toHaveAttribute('aria-expanded', 'true')
  const excludeSkills = dialog.getByRole('checkbox', { name: 'スキルカード持ちを除外' })
  await excludeSkills.check()
  await excludeSkills.uncheck()

  const scoreSection = dialog.getByRole('button', { name: '点数設定', exact: true })
  await scoreSection.click()
  await expect(scoreSection).toHaveAttribute('aria-expanded', 'false')
  await scoreSection.click()
  await expect(scoreSection).toHaveAttribute('aria-expanded', 'true')
  const includePItem = dialog.getByRole('checkbox', { name: 'Pアイテムの効果を点数計算に含める' })
  await includePItem.uncheck()
  await includePItem.check()

  await saveObservation(scenarios['options-modal-actions'], testInfo, page, { ui: { sectionsOperated: 3 } }, dialog)
  await dialog.getByRole('button', { name: '閉じる', exact: true }).click()
  await expect(dialog).toBeHidden()
})

/** JSONファイルと文字列の出力・取込を行い、不正形式のエラーを確認する */
test('data-management-actions', async ({ page }, testInfo) => {
  await openApp(page)
  await openMoreMenuItem(page, 'データ管理')
  const dialog = page.getByRole('dialog', { name: 'データ管理' })
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: /対象データ/ }).click()
  await dialog.getByRole('button', { name: '全解除', exact: true }).click()
  await dialog.getByRole('button', { name: '全選択', exact: true }).click()

  const downloadPromise = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'エクスポート', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.json$/)

  const fileChooserPromise = page.waitForEvent('filechooser')
  await dialog.getByRole('button', { name: 'インポート', exact: true }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"invalid":true}'),
  })
  // ファイル取込は確認ダイアログではなく、ファイル欄に形式エラーを表示する
  await expect(dialog.getByText(/データ形式が正しくありません/)).toBeVisible()

  await dialog.getByRole('button', { name: /JSON文字列/ }).click()
  const jsonInput = dialog.getByRole('textbox', { name: 'ユーザーデータのJSON文字列' })
  await jsonInput.fill('{')
  await dialog.getByRole('button', { name: 'JSONを反映', exact: true }).click()
  await expect(dialog.getByText(/JSON全体の構文が正しくありません/)).toBeVisible()
  await dialog.getByRole('button', { name: '現在値に戻す', exact: true }).click()
  await saveObservation(scenarios['data-management-actions'], testInfo, page, undefined, dialog)
  await dialog.getByRole('button', { name: '閉じる', exact: true }).click()
})

/** ヘルプの節を開閉し、About画面を表示して閉じられることを確認する */
test('help-about-actions', async ({ page }, testInfo) => {
  await openApp(page)
  await openMoreMenuItem(page, '使い方ガイド')
  const helpDialog = page.getByRole('dialog', { name: '使い方ガイド' })
  await expect(helpDialog).toBeVisible()
  await helpDialog.getByRole('button', { name: 'フィルター', exact: true }).click()
  await expect(helpDialog.getByText(/レアリティ・タイプ・プラン/)).toBeVisible()
  await helpDialog.getByRole('button', { name: '閉じる', exact: true }).click()
  await expect(helpDialog).toBeHidden()

  await openMoreMenuItem(page, 'このサイトについて')
  const aboutDialog = page.getByRole('dialog', { name: 'このサイトについて' })
  await expect(aboutDialog).toBeVisible()
  await saveObservation(
    scenarios['help-about-actions'],
    testInfo,
    page,
    { ui: { helpAndAboutOpened: true } },
    aboutDialog,
  )
  await aboutDialog.getByRole('button', { name: '閉じる', exact: true }).click()
  await expect(aboutDialog).toBeHidden()
})

/** アチーブのタブ切替、経験値補正、進捗更新、一覧への復帰を確認する */
test('achievement-calculator-actions', async ({ page }, testInfo) => {
  await openApp(page)
  await openMoreMenuItem(page, 'アチーブ計算機')
  await expect(page.getByRole('heading', { name: 'アチーブ計算機', exact: true })).toBeVisible()

  const tabList = page.getByRole('tablist', { name: 'アチーブメントカテゴリ' })
  await tabList.getByRole('tab', { name: 'プロデュース', exact: true }).click()
  await expect(tabList.getByRole('tab', { name: 'プロデュース' })).toHaveAttribute('aria-selected', 'true')
  await tabList.getByRole('tab', { name: 'その他', exact: true }).click()
  await expect(page.getByRole('tabpanel', { name: 'その他' })).toBeVisible()

  const direction = page.getByRole('button', { name: 'その他の経験値の補正方向: 加算', exact: true })
  await direction.click()
  await expect(page.getByRole('button', { name: 'その他の経験値の補正方向: 減算', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  // 入力欄は絶対値表示なので、減算方向を選んだ値が負数で保存されることも確認する
  const otherExperience = page.getByRole('spinbutton', { name: 'その他の経験値' })
  await otherExperience.fill('1200')
  await expect(otherExperience).toHaveValue('1200')
  const progressGroup = page.getByRole('group', { name: '積み重なる経験' })
  const progressInput = progressGroup.getByRole('spinbutton', { name: '積み重なる経験 現在値' })
  const previousProgress = Number(await progressInput.inputValue())
  await progressGroup.getByRole('button', { name: '積み重なる経験を次の報酬まで進める' }).click()
  await expect.poll(async () => Number(await progressInput.inputValue())).toBeGreaterThan(previousProgress)

  const readSavedOtherExperience = () =>
    page.evaluate((storageKey) => {
      const saved = window.localStorage.getItem(storageKey)
      if (!saved) return null
      const otherExp = (JSON.parse(saved) as { otherExp?: unknown }).otherExp
      return typeof otherExp === 'number' ? otherExp : null
    }, appStorageKeys.achievementCalculator)
  await expect.poll(readSavedOtherExperience).toBe(-1200)
  const savedOtherExperience = await readSavedOtherExperience()
  await saveObservation(scenarios['achievement-calculator-actions'], testInfo, page, {
    ui: { activeTab: 'その他', otherExperience: savedOtherExperience },
  })

  const achievementHeading = page.getByRole('heading', { name: 'アチーブ計算機', exact: true })
  await page.getByRole('button', { name: 'サポート一覧へ戻る', exact: true }).click()
  await expect(achievementHeading).toBeHidden()
  await expect(page.getByRole('searchbox', { name: 'サポート名 / Pアイテム / スキルカード' })).toBeVisible()
})

// 最適編成パネルの条件変更と手動のカード選択を確認する
/** プラン・タイプ・数値・除外設定を変更できることを確認する */
test('unit-settings-actions', async ({ page }, testInfo) => {
  await openApp(page)
  await openUnitSimulator(page)
  const logicPlan = page.getByRole('button', { name: 'ロジック', exact: true })
  await logicPlan.click()
  await expect(logicPlan).toHaveAttribute('aria-pressed', 'true')

  const assistType = page.getByRole('button', { name: 'アシスト', exact: true })
  await assistType.click()
  await expect(assistType).toHaveAttribute('aria-pressed', 'false')

  const numberInputs = page.locator('input[type="number"]')
  await numberInputs.nth(0).fill('1')
  await numberInputs.nth(9).fill('100')
  await expect(numberInputs.nth(0)).toHaveValue('1')
  await expect(numberInputs.nth(9)).toHaveValue('100')

  const options = page.getByRole('button', { name: 'オプション', exact: true })
  await options.click()
  const ignoreExclusions = page.getByRole('checkbox', { name: '除外設定を無視' })
  await ignoreExclusions.check()
  await expect(ignoreExclusions).toBeChecked()
  await saveObservation(scenarios['unit-settings-actions'], testInfo, page, {
    ui: {
      plan: enums.PlanType.Logic,
      allowedTypes: [enums.CardType.Vocal, enums.CardType.Dance, enums.CardType.Visual],
      spVocal: 1,
      initialVocal: 100,
    },
  })
  await page.getByRole('button', { name: '閉じる', exact: true }).click()
  await expect(page.getByRole('button', { name: '最適編成を計算', exact: true })).toBeHidden()
})

/** 手動編成の空き枠にカードを追加してから取り外せることを確認する */
test('unit-manual-selection', async ({ page }, testInfo) => {
  await openApp(page)
  await openUnitSimulator(page)
  // 一覧から空き枠へカードを追加し、その枠から解除できることを確認する
  await page.getByRole('button', { name: '空き枠', exact: true }).first().click()
  await expect(page.getByRole('button', { name: '完了', exact: true })).toBeVisible()

  const targetCard = page
    .getByTestId('support-card')
    .filter({ has: page.getByRole('heading', { name: targetCardName, exact: true }) })
  await targetCard.getByRole('heading', { name: targetCardName, exact: true }).click()
  await expect(page.getByRole('button', { name: '完了', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '完了', exact: true }).click()

  const optimizeButton = page.getByRole('button', { name: '最適編成を計算', exact: true })
  if (!(await optimizeButton.isVisible())) {
    await page.getByRole('navigation', { name: '主要メニュー' }).getByRole('button', { name: '最適編成' }).click()
  }
  await expect(optimizeButton).toBeVisible()
  await expect(page.getByText(targetCardName, { exact: true })).toHaveCount(2)
  await saveObservation(scenarios['unit-manual-selection'], testInfo, page)

  const selectedCard = page
    .getByTestId('unit-result-panel')
    .locator('div.border-l-4')
    .filter({ hasText: targetCardName })
  await expect(selectedCard).toHaveCount(1)
  await selectedCard.getByRole('button').nth(1).click()
  await expect(page.getByText(targetCardName, { exact: true })).toHaveCount(1)
})

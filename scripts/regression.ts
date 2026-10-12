/** ブランチごとのPlaywright観測を保存し、画面・計算結果を比較する */
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeRegressionSummary } from './regressionSummary.js'
import {
  type JsonObject,
  RegressionDevice,
  isMissingFileError,
  isRecord,
  regressionDeviceLabels,
  regressionDevices,
} from './regressionShared.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

/** Vitestが保存する、入力条件と内部計算結果を含むシナリオ観測 */
interface CalculationObservation {
  id: string
  description?: string
  semanticInput?: JsonObject
  scenarioHash?: string
  calculation?: JsonObject
}

/** Playwrightの画像比較で得られる差分量 */
interface VisualComparison {
  matches: boolean
  changedPixels?: number
  changedRatio?: number
  dimensionsMismatch?: boolean
}

/** 1シナリオを1端末で実行したときの画面観測 */
interface DeviceObservation {
  status: string
  screenshot?: string
  visualComparison?: VisualComparison
  ui?: JsonObject
}

/** Playwrightが端末別に保存するシナリオ観測JSON */
interface ScenarioObservation {
  id: string
  description?: string
  semanticInput?: JsonObject
  scenarioHash?: string
  status: string
  screenshot?: string
  visualComparison?: VisualComparison
  ui?: JsonObject
  calculation?: JsonObject
}

/** 計算観測と、端末ごとの画面観測を統合した比較単位 */
interface ScenarioReport {
  id: string
  description?: string
  semanticInput?: JsonObject
  scenarioHash?: string
  devices: Partial<Record<RegressionDevice, DeviceObservation>>
  calculation?: JsonObject
}

/** Playwrightの実行結果から取り出す件数 */
interface TestSummary {
  passed: number
  failed: number
  skipped: number
  flaky: number
  total: number
}

/** 1ブランチ分のcapture結果をまとめるmanifest */
interface Manifest {
  schemaVersion?: number
  generatedAt?: string
  branch?: string
  commit?: string
  e2e?: TestSummary | null
  scenarios: ScenarioReport[]
}

/** JSON値の比較で検出した1項目分の差分 */
interface ValueChange {
  path: string
  before?: unknown
  after?: unknown
  delta?: number
  removed?: string[]
  added?: string[]
  reordered?: boolean
}

/** 画面差分の対象となったシナリオと端末 */
interface DeviceChange {
  scenarioId: string
  device: RegressionDevice
}

/** PRコメントで新旧画像を並べるための画面差分 */
interface VisualChange extends VisualComparison {
  scenarioId: string
  description?: string
  device: RegressionDevice
  baseScreenshot?: string
  headScreenshot?: string
}

/** base/headのcapture結果を比較して作るPRレポート */
interface RegressionReport {
  schemaVersion: number
  baselineAvailable: boolean
  base: { branch?: string; commit?: string } | null
  head: { branch?: string; commit?: string }
  validation: { head: string }
  e2e: TestSummary | null
  comparedScenarioCount: number
  newScenarios: Array<{ id: string; description?: string }>
  removedScenarios: Array<{ id: string; description?: string }>
  definitionChanges: Array<{ id: string; baseHash?: string; headHash?: string }>
  visualChanges: VisualChange[]
  visualComparisonCount: Record<RegressionDevice, number>
  calculationChanges: Array<{ scenarioId: string; changes: ValueChange[] }>
  uiChanges: Array<{ scenarioId: string; device: RegressionDevice; changes: ValueChange[] }>
  captureFailures: { base: number; head: number }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStringArray(value: unknown[]): value is string[] {
  return value.every((entry) => typeof entry === 'string')
}

/** 比較対象のIDに、ファイル名として扱えない文字が含まれていないことを確認する */
function isValidScenarioId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
}

/** Playwrightの差分情報が比較レポートで扱える形か検証する */
function readVisualComparison(value: unknown): VisualComparison | undefined {
  if (!isRecord(value) || typeof value.matches !== 'boolean') return undefined
  return {
    matches: value.matches,
    ...(typeof value.changedPixels === 'number' ? { changedPixels: value.changedPixels } : {}),
    ...(typeof value.changedRatio === 'number' ? { changedRatio: value.changedRatio } : {}),
    ...(typeof value.dimensionsMismatch === 'boolean' ? { dimensionsMismatch: value.dimensionsMismatch } : {}),
  }
}

/** 計算観測JSONを読み込み、必須IDと任意項目の型を確認する */
function parseCalculationObservation(value: unknown): CalculationObservation {
  if (!isRecord(value) || typeof value.id !== 'string') {
    throw new Error('Invalid calculation observation')
  }
  if (!isValidScenarioId(value.id)) throw new Error(`Invalid calculation scenarioId: ${value.id}`)

  return {
    id: value.id,
    ...(typeof value.description === 'string' ? { description: value.description } : {}),
    ...(isRecord(value.semanticInput) ? { semanticInput: value.semanticInput } : {}),
    ...(typeof value.scenarioHash === 'string' ? { scenarioHash: value.scenarioHash } : {}),
    ...(isRecord(value.calculation) ? { calculation: value.calculation } : {}),
  }
}

/** 端末別のE2E観測JSONから、レポート作成に使う項目を取り出す */
function parseScenarioObservation(value: unknown): ScenarioObservation {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.status !== 'string') {
    throw new Error('Invalid E2E scenario observation')
  }
  if (!isValidScenarioId(value.id)) throw new Error(`Invalid scenarioId in observation: ${value.id}`)

  const visualComparison = readVisualComparison(value.visualComparison)
  return {
    id: value.id,
    ...(typeof value.description === 'string' ? { description: value.description } : {}),
    ...(isRecord(value.semanticInput) ? { semanticInput: value.semanticInput } : {}),
    ...(typeof value.scenarioHash === 'string' ? { scenarioHash: value.scenarioHash } : {}),
    status: value.status,
    ...(typeof value.screenshot === 'string' ? { screenshot: value.screenshot } : {}),
    ...(visualComparison ? { visualComparison } : {}),
    ...(isRecord(value.ui) ? { ui: value.ui } : {}),
    ...(isRecord(value.calculation) ? { calculation: value.calculation } : {}),
  }
}

/** manifest内のscenarioが持つ端末別観測を検証する */
function parseScenarioReport(value: unknown): ScenarioReport {
  if (!isRecord(value) || typeof value.id !== 'string' || !isRecord(value.devices)) {
    throw new Error('Invalid scenario in regression manifest')
  }
  if (!isValidScenarioId(value.id)) throw new Error(`Invalid scenario in regression manifest: ${value.id}`)

  const scenarioDevices: Partial<Record<RegressionDevice, DeviceObservation>> = {}
  for (const device of regressionDevices) {
    const observation = value.devices[device]
    if (!isRecord(observation) || typeof observation.status !== 'string') continue
    const visualComparison = readVisualComparison(observation.visualComparison)
    scenarioDevices[device] = {
      status: observation.status,
      ...(typeof observation.screenshot === 'string' ? { screenshot: observation.screenshot } : {}),
      ...(visualComparison ? { visualComparison } : {}),
      ...(isRecord(observation.ui) ? { ui: observation.ui } : {}),
    }
  }

  return {
    id: value.id,
    ...(typeof value.description === 'string' ? { description: value.description } : {}),
    ...(isRecord(value.semanticInput) ? { semanticInput: value.semanticInput } : {}),
    ...(typeof value.scenarioHash === 'string' ? { scenarioHash: value.scenarioHash } : {}),
    devices: scenarioDevices,
    ...(isRecord(value.calculation) ? { calculation: value.calculation } : {}),
  }
}

/** manifestの最低限の形を検証し、欠けたデータを比較処理へ渡さない */
function parseManifest(value: unknown): Manifest {
  if (!isRecord(value) || !Array.isArray(value.scenarios)) {
    throw new Error('Invalid regression manifest')
  }

  return {
    ...(typeof value.schemaVersion === 'number' ? { schemaVersion: value.schemaVersion } : {}),
    ...(typeof value.generatedAt === 'string' ? { generatedAt: value.generatedAt } : {}),
    ...(typeof value.branch === 'string' ? { branch: value.branch } : {}),
    ...(typeof value.commit === 'string' ? { commit: value.commit } : {}),
    e2e: value.e2e === null ? null : parseTestSummary(value.e2e),
    scenarios: value.scenarios.map(parseScenarioReport),
  }
}

/** E2E件数がそろっている場合だけレポートへ含める */
function parseTestSummary(value: unknown): TestSummary | null {
  if (!isRecord(value)) return null
  if (
    !isFiniteNumber(value.passed) ||
    !isFiniteNumber(value.failed) ||
    !isFiniteNumber(value.skipped) ||
    !isFiniteNumber(value.flaky) ||
    !isFiniteNumber(value.total)
  ) {
    return null
  }

  return {
    passed: value.passed,
    failed: value.failed,
    skipped: value.skipped,
    flaky: value.flaky,
    total: value.total,
  }
}

/**
 * 計算観測とPlaywright観測を順番に採取し、シナリオIDごとのmanifestへまとめる
 * 前段階が失敗したら後続を止め、その終了状態をプロセス終了コードへ引き継ぐ
 */
async function capture() {
  const branch = process.env.REGRESSION_BRANCH ?? 'local'
  const outputDirectory = process.env.REGRESSION_OUTPUT ?? `tmp/regression-results/local-${Date.now()}`
  const outputRoot = path.resolve(projectRoot, outputDirectory)
  const observationsRoot = path.join(outputRoot, 'observations')
  const calculationRoot = path.join(outputRoot, 'calculations')
  const cliPath = path.join(projectRoot, 'node_modules/@playwright/test/cli.js')
  const typecheckPath = path.join(projectRoot, 'node_modules/typescript/bin/tsc')
  const vitestPath = path.join(projectRoot, 'node_modules/vitest/vitest.mjs')

  await mkdir(observationsRoot, { recursive: true })
  // 内部計算を先に保存し、後からE2Eが出す画面観測と同じシナリオIDで統合する
  const calculationRun = spawnSync(
    process.execPath,
    [vitestPath, 'run', 'src/__tests__/regressionObservations.test.ts'],
    {
      cwd: projectRoot,
      env: { ...process.env, REGRESSION_OUTPUT: outputRoot },
      stdio: 'inherit',
    },
  )
  // ブラウザー起動前にE2E設定を型検査し、前段の失敗時はPlaywrightを実行しない
  const typecheck =
    calculationRun.status === 0
      ? spawnSync(process.execPath, [typecheckPath, '-p', 'tests/tsconfig.e2e.json', '--noEmit'], {
          cwd: projectRoot,
          env: { ...process.env, REGRESSION_OUTPUT: outputRoot },
          stdio: 'inherit',
        })
      : calculationRun
  const playwrightStarted = typecheck.status === 0
  const testRun = playwrightStarted
    ? spawnSync(process.execPath, [cliPath, 'test', 'tests/e2e/scenarios.spec.ts'], {
        cwd: projectRoot,
        env: { ...process.env, REGRESSION_OUTPUT: outputRoot },
        stdio: 'inherit',
      })
    : typecheck

  const scenarios = new Map<string, ScenarioReport>()
  const calculations = new Map<string, CalculationObservation>()
  let calculationFiles: string[] = []
  // 計算テストが未実行でも、後続のE2E観測だけでmanifestを組み立てられるようにする
  try {
    calculationFiles = await readdir(calculationRoot)
  } catch {
    calculationFiles = []
  }
  for (const filename of calculationFiles.filter((entry) => entry.endsWith('.json'))) {
    const observation = parseCalculationObservation(
      JSON.parse(await readFile(path.join(calculationRoot, filename), 'utf8')),
    )
    calculations.set(observation.id, observation)
  }
  for (const [id, observation] of calculations) {
    // 入力条件やhashが欠けた結果は、再現可能な比較対象として扱わない
    if (!observation.description || !observation.semanticInput || !observation.scenarioHash) continue
    scenarios.set(id, {
      id,
      description: observation.description,
      semanticInput: observation.semanticInput,
      scenarioHash: observation.scenarioHash,
      devices: {},
      calculation: observation.calculation,
    })
  }

  let e2eSummary: TestSummary | null = null
  if (playwrightStarted) {
    try {
      // Playwright設定の固定パスから件数を読み、画面・計算観測はREGRESSION_OUTPUT配下から別に集める
      const playwrightReport: unknown = JSON.parse(
        await readFile(path.join(projectRoot, 'tmp/test-results/e2e/report.json'), 'utf8'),
      )
      const stats = isRecord(playwrightReport) ? playwrightReport.stats : undefined
      if (
        isRecord(stats) &&
        isFiniteNumber(stats.expected) &&
        isFiniteNumber(stats.unexpected) &&
        isFiniteNumber(stats.skipped) &&
        isFiniteNumber(stats.flaky)
      ) {
        e2eSummary = {
          passed: stats.expected + stats.flaky,
          failed: stats.unexpected,
          skipped: stats.skipped,
          flaky: stats.flaky,
          total: stats.expected + stats.unexpected + stats.skipped + stats.flaky,
        }
      }
    } catch {
      // Playwrightがreport.jsonを出す前に失敗した場合は、件数サマリーを省略する
    }
  }

  for (const device of regressionDevices) {
    const deviceDirectory = path.join(observationsRoot, device)
    let filenames: string[] = []
    // 未実行の端末フォルダーがあっても、他端末で採れた観測は引き続き集める
    try {
      filenames = await readdir(deviceDirectory)
    } catch {
      continue
    }

    for (const filename of filenames.filter((entry) => entry.endsWith('.json')).sort()) {
      const observation = parseScenarioObservation(
        JSON.parse(await readFile(path.join(deviceDirectory, filename), 'utf8')),
      )
      // 計算とE2Eは別々に出力するため、シナリオIDで既存結果へ端末別の値を追加する
      const scenario = scenarios.get(observation.id) ?? {
        id: observation.id,
        ...(observation.description ? { description: observation.description } : {}),
        ...(observation.semanticInput ? { semanticInput: observation.semanticInput } : {}),
        ...(observation.scenarioHash ? { scenarioHash: observation.scenarioHash } : {}),
        devices: {},
        ...(calculations.get(observation.id)?.calculation
          ? { calculation: calculations.get(observation.id)?.calculation }
          : {}),
      }
      scenario.devices[device] = {
        status: observation.status,
        ...(observation.screenshot ? { screenshot: observation.screenshot } : {}),
        ...(observation.visualComparison ? { visualComparison: observation.visualComparison } : {}),
        ...(observation.ui ? { ui: observation.ui } : {}),
      }
      // E2E側に計算の補足値がある場合は、先に採取した内部結果へ統合する
      if (observation.calculation) {
        scenario.calculation = { ...(scenario.calculation ?? {}), ...observation.calculation }
      }
      scenarios.set(observation.id, scenario)
    }
  }

  let commit = process.env.REGRESSION_COMMIT
  if (!commit) {
    const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' })
    commit = revision.status === 0 ? revision.stdout.trim() : 'unknown'
  }

  const manifest: Manifest = {
    schemaVersion: 1,
    branch,
    commit,
    generatedAt: new Date().toISOString(),
    e2e: e2eSummary,
    scenarios: [...scenarios.values()].sort((left, right) => left.id.localeCompare(right.id)),
  }
  if (scenarios.size === 0) {
    process.exitCode = testRun.status ?? 1
    return
  }
  await writeFile(path.join(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2))

  // 観測を保存した後で起動エラーを再送出し、部分結果とCIの失敗を両方残す
  if (testRun.error) throw testRun.error
  process.exitCode = testRun.status ?? 1
}

/**
 * base/headの値を再帰比較し、集合の増減・並び替え・数値差を分けて記録する
 *
 * @param before - base側の値
 * @param after - head側の値
 * @param keyPath - 比較中の値があるJSON上のパス
 * @param changes - 再帰呼び出し間で共有する差分一覧
 * @returns 呼び出し元と共有している差分一覧
 */
function collectValueChanges(
  before: unknown,
  after: unknown,
  keyPath = '',
  changes: ValueChange[] = [],
): ValueChange[] {
  if (Object.is(before, after)) return changes

  if (typeof before === 'number' && typeof after === 'number') {
    changes.push({ path: keyPath, before, after, delta: after - before })
    return changes
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    // カード名の配列は集合で比較し、順序だけの変更は別に記録する
    if (isStringArray(before) && isStringArray(after)) {
      const beforeSet = new Set(before)
      const afterSet = new Set(after)
      const removed = before.filter((value) => !afterSet.has(value))
      const added = after.filter((value) => !beforeSet.has(value))
      if (removed.length || added.length) changes.push({ path: keyPath, removed, added })
      else if (before.some((value, index) => value !== after[index])) {
        changes.push({ path: keyPath, before, after, reordered: true })
      }
      return changes
    }

    const length = Math.max(before.length, after.length)
    for (let index = 0; index < length; index += 1) {
      collectValueChanges(before[index], after[index], `${keyPath}[${index}]`, changes)
    }
    return changes
  }

  if (isRecord(before) && isRecord(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    for (const key of [...keys].sort()) {
      collectValueChanges(before[key], after[key], keyPath ? `${keyPath}.${key}` : key, changes)
    }
    return changes
  }

  changes.push({ path: keyPath, before, after })
  return changes
}

/** 同じシナリオに複数端末の差分がある場合、PC・iOS・Androidの順で代表を残す */
function selectRepresentativeDeviceChanges<T extends DeviceChange>(changes: readonly T[]): T[] {
  const scenariosWithDesktopChange = new Set(
    changes.filter((change) => change.device === RegressionDevice.Desktop).map((change) => change.scenarioId),
  )
  const scenariosWithIphoneChange = new Set(
    changes.filter((change) => change.device === RegressionDevice.IPhone).map((change) => change.scenarioId),
  )
  return changes.filter((change) => {
    if (change.device === RegressionDevice.Desktop) return true
    if (scenariosWithDesktopChange.has(change.scenarioId)) return false
    if (change.device === RegressionDevice.IPhone) return true
    return !scenariosWithIphoneChange.has(change.scenarioId)
  })
}

/**
 * base/headのmanifestを比較し、JSONとActions Summary用Markdownを保存する
 * base観測がない場合はheadの検証情報を出し、比較差分を省略する
 */
async function compare(): Promise<void> {
  const [baseArgument, headArgument, outputArgument] = process.argv.slice(3)
  const baseRoot = baseArgument ? path.resolve(projectRoot, baseArgument) : null
  const headRoot = path.resolve(projectRoot, headArgument ?? 'tmp/regression-results/head')
  const outputRoot = path.resolve(projectRoot, outputArgument ?? 'tmp/regression-results/diff')

  async function loadManifest(directory: string | null): Promise<Manifest | null> {
    if (!directory) return null
    try {
      const contents: unknown = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'))
      return parseManifest(contents)
    } catch (error) {
      // 初回導入時のbase manifest欠落は許容し、JSON破損などは比較エラーとして伝える
      if (isMissingFileError(error)) return null
      throw error
    }
  }

  // 端末ごとの失敗だけをcapture failureとして数え、skipはE2E件数に残す
  function countFailures(manifest: Manifest | null): number {
    return (manifest?.scenarios ?? []).reduce(
      (count, scenario) =>
        count +
        Object.values(scenario.devices).filter(
          (device): device is DeviceObservation => device !== undefined && device.status === 'failed',
        ).length,
      0,
    )
  }

  function buildMarkdown(report: RegressionReport): string {
    const lines = [
      '# Gaku-Navi PR Regression Report',
      '',
      `Base: ${report.base?.commit ?? 'unavailable'}`,
      `Head: ${report.head?.commit ?? 'unknown'}`,
      '',
      '## Validation',
      `Head build and regression: ${report.validation.head}`,
      `Head E2E: ${report.e2e ? `${report.e2e.passed} / ${report.e2e.total} passed` : 'not completed'}`,
      `Capture failures: base ${report.captureFailures.base}, head ${report.captureFailures.head}`,
      '',
    ]

    if (!report.baselineAvailable) {
      // 比較相手がない初回導入では、headのシナリオ一覧を情報表示する
      lines.push(
        'Base observations are unavailable. Visual comparison is skipped until a base capture succeeds.',
        '',
        `Scenarios captured for the initial baseline (informational): ${report.newScenarios.length}`,
        '',
      )
      if (report.newScenarios.length === 0) {
        lines.push('No scenarios were captured.', '')
      } else {
        for (const scenario of report.newScenarios) {
          lines.push(`- ${scenario.id}${scenario.description ? `: ${scenario.description}` : ''}`)
        }
        lines.push('')
      }
    } else {
      // 基準値がある場合は、シナリオ定義・画面・計算の差を分けて表示する
      lines.push(`Compared scenarios: ${report.comparedScenarioCount}`, '')
      lines.push(
        `New: ${report.newScenarios.length} · Removed: ${report.removedScenarios.length} · Definition changed: ${report.definitionChanges.length}`,
        '',
      )
      for (const scenario of report.newScenarios) lines.push(`- New: ${scenario.id}`)
      for (const scenario of report.removedScenarios) lines.push(`- Removed: ${scenario.id}`)
      for (const scenario of report.definitionChanges) lines.push(`- Definition changed: ${scenario.id}`)
      if (report.newScenarios.length || report.removedScenarios.length || report.definitionChanges.length)
        lines.push('')
      lines.push(
        'For each scenario, PC is shown when desktop changes; otherwise iOS represents both mobile viewports, and Android is shown only when it is the only changed device.',
        '',
      )
      // 成功した比較数は両モバイル端末分を保ち、差分の表示だけをシナリオごとに集約する
      const mobileVisualChanges = report.visualChanges.filter((change) => change.device !== RegressionDevice.Desktop)
      const displayedMobileVisualChanges = selectRepresentativeDeviceChanges(mobileVisualChanges)
      const visualGroups = [
        {
          title: 'Desktop (PC)',
          comparisonCount: report.visualComparisonCount[RegressionDevice.Desktop],
          comparisonSummary: `Compared screenshots: ${report.visualComparisonCount[RegressionDevice.Desktop]}`,
          changes: report.visualChanges.filter((change) => change.device === RegressionDevice.Desktop),
          hasSuppressedChanges: false,
        },
        {
          title: 'Mobile (iOS / Android)',
          comparisonCount:
            report.visualComparisonCount[RegressionDevice.IPhone] +
            report.visualComparisonCount[RegressionDevice.Android],
          comparisonSummary: `Compared screenshots: iOS ${report.visualComparisonCount[RegressionDevice.IPhone]} · Android ${report.visualComparisonCount[RegressionDevice.Android]}`,
          changes: displayedMobileVisualChanges,
          hasSuppressedChanges: displayedMobileVisualChanges.length < mobileVisualChanges.length,
        },
      ]
      for (const group of visualGroups) {
        lines.push(`## ${group.title}`, group.comparisonSummary, '')
        if (group.comparisonCount === 0) {
          lines.push('No base screenshots were available for comparison.', '')
          continue
        }
        if (group.changes.length === 0) {
          lines.push(
            group.hasSuppressedChanges
              ? 'Mobile changes are represented in the desktop section.'
              : 'No visual changes detected.',
            '',
          )
        }
        for (const change of group.changes) {
          const details =
            typeof change.changedPixels === 'number' && typeof change.changedRatio === 'number'
              ? `: ${(change.changedRatio * 100).toFixed(2)}% changed (${change.changedPixels} pixels)`
              : ': image dimensions changed'
          const deviceLabel = regressionDeviceLabels[change.device]
          lines.push(`- ${change.scenarioId} (${deviceLabel})${details}`, '')
        }
      }
      lines.push('## Calculation changes', '')
      if (report.calculationChanges.length === 0) lines.push('No calculation changes detected.', '')
      for (const change of report.calculationChanges) {
        lines.push(`### ${change.scenarioId}`, '')
        for (const field of change.changes) {
          if (field.removed || field.added) {
            if (field.removed?.length) lines.push(`- ${field.path} removed: ${field.removed.join(', ')}`)
            if (field.added?.length) lines.push(`- ${field.path} added: ${field.added.join(', ')}`)
            continue
          }
          const before = JSON.stringify(field.before) ?? 'undefined'
          const after = JSON.stringify(field.after) ?? 'undefined'
          const delta = typeof field.delta === 'number' ? ` (${field.delta >= 0 ? '+' : ''}${field.delta})` : ''
          lines.push(`- ${field.path}: ${before} → ${after}${delta}`)
        }
        lines.push('')
      }
      lines.push('## UI display changes', '')
      const displayedUiChanges = selectRepresentativeDeviceChanges(report.uiChanges)
      if (displayedUiChanges.length === 0) lines.push('No UI observation changes detected.', '')
      for (const change of displayedUiChanges) {
        lines.push(`### ${change.scenarioId} · ${change.device}`, '')
        for (const field of change.changes) {
          const before = JSON.stringify(field.before) ?? 'undefined'
          const after = JSON.stringify(field.after) ?? 'undefined'
          const delta = typeof field.delta === 'number' ? ` (${field.delta >= 0 ? '+' : ''}${field.delta})` : ''
          lines.push(`- ${field.path}: ${before} → ${after}${delta}`)
        }
        lines.push('')
      }
    }

    lines.push('Differences are informational and do not fail CI.', '')
    return `${lines.join('\n')}\n`
  }

  const [baseManifest, headManifest] = await Promise.all([loadManifest(baseRoot), loadManifest(headRoot)])
  if (!headManifest) throw new Error(`Head observation manifest not found under ${headRoot}`)

  await mkdir(outputRoot, { recursive: true })
  const report: RegressionReport = {
    schemaVersion: 2,
    baselineAvailable: Boolean(baseManifest),
    base: baseManifest ? { branch: baseManifest.branch, commit: baseManifest.commit } : null,
    head: { branch: headManifest.branch, commit: headManifest.commit },
    validation: { head: process.env.REGRESSION_VALIDATION_RESULT ?? 'unknown' },
    e2e: headManifest.e2e ?? null,
    comparedScenarioCount: 0,
    newScenarios: [],
    removedScenarios: [],
    definitionChanges: [],
    visualChanges: [],
    visualComparisonCount: {
      [RegressionDevice.Desktop]: 0,
      [RegressionDevice.IPhone]: 0,
      [RegressionDevice.Android]: 0,
    },
    calculationChanges: [],
    uiChanges: [],
    captureFailures: { base: countFailures(baseManifest), head: countFailures(headManifest) },
  }

  const baseScenarios = new Map(
    (baseManifest?.scenarios ?? []).map((scenario): [string, ScenarioReport] => [scenario.id, scenario]),
  )
  const headScenarios = new Map(
    headManifest.scenarios.map((scenario): [string, ScenarioReport] => [scenario.id, scenario]),
  )
  const scenarioIds = new Set([...baseScenarios.keys(), ...headScenarios.keys()])

  for (const id of [...scenarioIds].sort()) {
    const baseScenario = baseScenarios.get(id)
    const headScenario = headScenarios.get(id)
    if (!baseManifest) {
      // 初回導入ではheadのシナリオを比較差分ではなく、基準一覧として表示する
      if (headScenario) report.newScenarios.push({ id, description: headScenario.description })
      continue
    }
    if (!baseScenario) {
      // headだけに存在するscenarioは、新しい画面・検証項目として報告する
      if (headScenario) report.newScenarios.push({ id, description: headScenario.description })
      continue
    }
    if (!headScenario) {
      report.removedScenarios.push({ id, description: baseScenario.description })
      continue
    }

    report.comparedScenarioCount += 1
    if (baseScenario.scenarioHash !== headScenario.scenarioHash) {
      report.definitionChanges.push({ id, baseHash: baseScenario.scenarioHash, headHash: headScenario.scenarioHash })
    }

    for (const device of regressionDevices) {
      const baseDevice = baseScenario.devices?.[device]
      const headDevice = headScenario.devices?.[device]
      // 片側の取得失敗を仕様差分に見せないよう、両ブランチで成功した端末だけを比較する
      if (!baseDevice || !headDevice || baseDevice.status !== 'passed' || headDevice.status !== 'passed') continue
      // 画像はhead側でPlaywright比較し、画面値と計算値はbase/head間で照合する
      const visualComparison = headDevice.visualComparison
      if (visualComparison) {
        report.visualComparisonCount[device] += 1
        if (!visualComparison.matches) {
          report.visualChanges.push({
            scenarioId: id,
            ...(headScenario.description ? { description: headScenario.description } : {}),
            device,
            ...visualComparison,
            ...(baseDevice.screenshot ? { baseScreenshot: baseDevice.screenshot } : {}),
            ...(headDevice.screenshot ? { headScreenshot: headDevice.screenshot } : {}),
          })
        }
      }

      const uiChanges = collectValueChanges(baseDevice.ui, headDevice.ui)
      if (uiChanges.length > 0) report.uiChanges.push({ scenarioId: id, device, changes: uiChanges })
    }

    // 内部計算値は端末幅で変わらないため、端末ごとではなくシナリオごとに一度比較する
    const calculationChanges = collectValueChanges(baseScenario.calculation, headScenario.calculation)
    if (calculationChanges.length > 0) report.calculationChanges.push({ scenarioId: id, changes: calculationChanges })
  }

  // JSONは後続処理用、MarkdownはActions Summary表示用に同じ比較結果を保存する
  await writeFile(path.join(outputRoot, 'report.json'), JSON.stringify(report, null, 2))
  await writeFile(path.join(outputRoot, 'report.md'), buildMarkdown(report))
  console.log(`Regression report: ${path.relative(projectRoot, path.join(outputRoot, 'report.md'))}`)
  await writeRegressionSummary()
}

const command = process.argv[2]
if (command === 'capture') {
  await capture()
} else if (command === 'compare') {
  await compare()
} else {
  throw new Error('Usage: npm run regression -- <capture|compare> [arguments]')
}

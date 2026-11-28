/** base/headの数値計算観測だけを比較し、スクリーンショットジョブを待たずに報告する */
import { mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isMissingPathError, isRecord, isStringArray } from './regressionShared.js'
import { parameterTypeLabels, renderLineupTable } from './lineupSummary.js'

/** パース済みJSONのうち、名前付きプロパティを持つオブジェクト */
type JsonRecord = Record<string, unknown>

/** 編成表に表示するサポートカード1枚分 */
interface CalculationLineupMember {
  name: string
  parameterType?: string
  uncap?: number
  isRental?: boolean
  cardScore?: number
}

/** 最適編成の表示情報 */
interface CalculationLineup {
  totalScore?: number
  members: CalculationLineupMember[]
}

/** base/head間でシナリオIDを照合し、数値計算結果を比較するための1件分の観測 */
export interface CalculationObservation {
  /** base/headで同じ計算条件を対応付ける固定ID */
  id: string
  /** レポートに表示する条件の説明 */
  description?: string
  /** 計算に使った意味的入力を正規化して作ったhash */
  scenarioHash?: string
  /** 再現・差分確認に使う計算入力 */
  semanticInput?: JsonRecord
  /** アプリの計算器が返した結果。内部結果は`internal`に入る */
  calculation: unknown
  /** 最適編成のカード内訳 */
  lineup?: CalculationLineup
}

/** base/headで異なる計算値1項目の差分 */
interface ValueChange {
  /** 差分項目のJSON内パス */
  path: string
  /** base側の値 */
  before: unknown
  /** head側の値 */
  after: unknown
  /** 両方が数値の場合のhead - base */
  delta?: number
  /** 文字列配列から削除された値 */
  removed?: string[]
  /** 文字列配列へ追加された値 */
  added?: string[]
  /** 値は同じだが、文字列配列の順序が変わったことを示す */
  reordered?: boolean
}

/** 同じシナリオIDで見つかった計算差分 */
interface ScenarioChange {
  /** base/headで対応付いたシナリオID */
  id: string
  /** 条件の説明 */
  description?: string
  /** 計算条件に設定されているプラン */
  plan?: string
  /** 入力hashがbase/headで異なるか */
  inputChanged: boolean
  /** base側の総合点 */
  baseScore?: number
  /** head側の総合点 */
  headScore?: number
  /** base側の最適編成 */
  baseLineup?: CalculationLineup
  /** head側の最適編成 */
  headLineup?: CalculationLineup
  /** 内部計算結果の差分一覧 */
  changes: ValueChange[]
  /** ランダム条件の生成プロファイル */
  randomProfile?: JsonRecord
}

/** baseに存在しない条件についてhead側に記録された結果 */
interface NewScenarioResult {
  id: string
  description?: string
  headScore?: number
  headLineup?: CalculationLineup
}

/** seed付きランダム条件ごとのprofileと比較結果 */
interface RandomizedProfileChange {
  /** head側のランダム最適編成ID */
  id: string
  /** レポートに表示する条件名 */
  description?: string
  /** 条件の生成に使ったprofile。互換性確認用にコメントへ展開する */
  profile?: JsonRecord
  /** 計算条件に設定されているプラン */
  plan?: string
  /** base側の総合点 */
  baseScore?: number
  /** head側の総合点 */
  headScore?: number
  /** base側の最適編成 */
  baseLineup?: CalculationLineup
  /** head側の最適編成 */
  headLineup?: CalculationLineup
  /** base/headの計算入力が異なるか */
  inputChanged: boolean
  /** 内部計算結果の差分一覧 */
  changes: ValueChange[]
  /** baseにも同じシナリオIDの観測があるか */
  baselinePresent: boolean
  /** baseがない、または入力・計算値に差分があったか */
  changed: boolean
}

/** 計算比較の集計結果。MarkdownコメントとActions summaryの入力に使う */
export interface CalculationRegressionReport {
  /** 比較に使った乱数seed */
  seed: string
  /** base側の計算テスト実行状態 */
  baseStatus: string
  /** head側の計算テスト実行状態 */
  headStatus: string
  /** base側に比較可能な観測が1件以上あるか */
  baselineAvailable: boolean
  /** base側で読み込んだ観測数 */
  baseScenarioCount: number
  /** head側で読み込んだ観測数 */
  headScenarioCount: number
  /** base/headの両方に存在するシナリオ数 */
  comparedScenarioCount: number
  /** base/head両方に存在する全シナリオの結果 */
  comparedScenarios: ScenarioChange[]
  /** baseに存在せずheadに追加されたシナリオID */
  newScenarioIds: string[]
  /** headで追加されたシナリオの結果 */
  newScenarioResults: NewScenarioResult[]
  /** headに存在せずbaseから削除されたシナリオID */
  removedScenarioIds: string[]
  /** 入力または計算値に差分があったシナリオ */
  changes: ScenarioChange[]
  /** head側にあるseed付きランダム最適編成のシナリオID */
  randomizedScenarioIds: string[]
  /** ランダム条件ごとのプロファイルとbase/headの比較状態 */
  randomizedProfiles: RandomizedProfileChange[]
}

/** JSONから読み込んだ1件の観測を検証し、比較に必要な項目だけを取り出す */
function observationFrom(value: unknown, filename: string): CalculationObservation {
  if (!isRecord(value) || typeof value.id !== 'string' || !('calculation' in value)) {
    throw new Error(`Invalid calculation observation: ${filename}`)
  }

  const lineup = lineupFrom(value.lineup)
  return {
    id: value.id,
    ...(typeof value.description === 'string' ? { description: value.description } : {}),
    ...(typeof value.scenarioHash === 'string' ? { scenarioHash: value.scenarioHash } : {}),
    ...(isRecord(value.semanticInput) ? { semanticInput: value.semanticInput } : {}),
    calculation: value.calculation,
    ...(lineup ? { lineup } : {}),
  }
}

/** JSON観測の編成内訳を検証し、不正な値は省略する */
function lineupFrom(value: unknown): CalculationLineup | undefined {
  if (!isRecord(value) || !Array.isArray(value.members)) return undefined

  const members = value.members.flatMap((member): CalculationLineupMember[] => {
    if (!isRecord(member) || typeof member.name !== 'string') return []
    return [
      {
        name: member.name,
        ...(typeof member.parameterType === 'string' ? { parameterType: member.parameterType } : {}),
        ...(typeof member.uncap === 'number' && Number.isFinite(member.uncap) ? { uncap: member.uncap } : {}),
        ...(typeof member.isRental === 'boolean' ? { isRental: member.isRental } : {}),
        ...(typeof member.cardScore === 'number' && Number.isFinite(member.cardScore)
          ? { cardScore: member.cardScore }
          : {}),
      },
    ]
  })

  if (members.length === 0) return undefined
  return {
    ...(typeof value.totalScore === 'number' && Number.isFinite(value.totalScore)
      ? { totalScore: value.totalScore }
      : {}),
    members,
  }
}

/** 指定ディレクトリのJSON観測を読み、シナリオIDをキーにまとめる */
async function readObservations(directory: string): Promise<Map<string, CalculationObservation>> {
  let filenames: string[]
  try {
    filenames = await readdir(directory)
  } catch (error) {
    // 初回PRなどで出力ディレクトリがない場合は、観測0件として差分レポートを作れるようにする
    if (isMissingPathError(error)) return new Map()
    throw error
  }

  // ファイル順でレポートが揺れないよう名前順に読み、同じIDが重複した場合は不正な出力として失敗させる
  const observations = await Promise.all(
    filenames
      .filter((filename) => filename.endsWith('.json'))
      .sort()
      .map(async (filename) => {
        const contents: unknown = JSON.parse(await readFile(path.join(directory, filename), 'utf8'))
        return observationFrom(contents, filename)
      }),
  )
  const result = new Map(observations.map((observation) => [observation.id, observation]))
  if (result.size !== observations.length) throw new Error(`Duplicate calculation observation in ${directory}`)
  return result
}

/** base/headの値を再帰比較し、差分パスごとに値と数値差を記録する */
function collectValueChanges(
  before: unknown,
  after: unknown,
  keyPath = '',
  changes: ValueChange[] = [],
): ValueChange[] {
  if (Object.is(before, after)) return changes

  // 総合点や各パラメータは、表示で増減を読みやすくするためdeltaを付ける
  if (typeof before === 'number' && typeof after === 'number') {
    changes.push({ path: keyPath, before, after, delta: after - before })
    return changes
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    // 文字列配列は要素の追加・削除と並べ替えを区別し、それ以外の配列はindexごとに比較する
    if (isStringArray(before) && isStringArray(after)) {
      const beforeSet = new Set(before)
      const afterSet = new Set(after)
      const removed = before.filter((value) => !afterSet.has(value))
      const added = after.filter((value) => !beforeSet.has(value))
      if (removed.length || added.length) changes.push({ path: keyPath, before, after, removed, added })
      else if (before.some((value, index) => value !== after[index])) {
        changes.push({ path: keyPath, before, after, reordered: true })
      }
      return changes
    }

    for (let index = 0; index < Math.max(before.length, after.length); index += 1) {
      collectValueChanges(before[index], after[index], `${keyPath}[${index}]`, changes)
    }
    return changes
  }

  if (isRecord(before) && isRecord(after)) {
    // キー順に依存しない差分になるよう、両側に現れた全キーをソートして走査する
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    for (const key of [...keys].sort()) {
      collectValueChanges(before[key], after[key], keyPath ? `${keyPath}.${key}` : key, changes)
    }
    return changes
  }

  changes.push({ path: keyPath, before, after })
  return changes
}

/** 結果を外側の情報と`internal`計算結果で包む形式から比較対象の内部値を取り出す */
function calculationInternal(value: unknown): unknown {
  return isRecord(value) && 'internal' in value ? value.internal : value
}

/** 内部計算結果に総合点がある場合だけレポート用に返す */
function calculationScore(value: unknown): number | undefined {
  const internal = calculationInternal(value)
  return isRecord(internal) && typeof internal.totalScore === 'number' ? internal.totalScore : undefined
}

/** 観測された編成に計算結果の総合点を補う */
function lineupForObservation(observation: CalculationObservation | undefined): CalculationLineup | undefined {
  if (!observation?.lineup) return undefined

  const score = calculationScore(observation.calculation)
  return {
    ...observation.lineup,
    ...(observation.lineup.totalScore === undefined && score !== undefined ? { totalScore: score } : {}),
  }
}

/** 意味的入力に保存されたランダム生成プロファイルを取り出す */
function randomProfile(observation: CalculationObservation | undefined): JsonRecord | undefined {
  const input = observation?.semanticInput
  return input && isRecord(input.randomProfile) ? input.randomProfile : undefined
}

/** 意味的入力またはランダムprofileから最適化プランを取り出す */
function scenarioPlan(observation: CalculationObservation | undefined): string | undefined {
  const settings = observation?.semanticInput?.settings
  if (isRecord(settings) && typeof settings.plan === 'string') return planLabel(settings.plan)
  const profile = randomProfile(observation)
  if (typeof profile?.plan === 'string') return planLabel(profile.plan)
  const descriptionPlan = observation?.description
    ?.split(' / ')
    .find((part) => ['sense', 'logic', 'anomaly'].includes(part.toLowerCase()))
  return descriptionPlan ? planLabel(descriptionPlan) : undefined
}

/**
 * base/headの観測をシナリオIDで対応付け、入力hashと内部計算値の差分を集計する
 *
 * @param base base revisionで読み込んだ観測
 * @param head head revisionで読み込んだ観測
 * @param metadata seedと各revisionのテスト実行状態
 * @returns コメントとActions summaryへ表示する比較結果
 */
export function compareCalculationObservations(
  base: ReadonlyMap<string, CalculationObservation>,
  head: ReadonlyMap<string, CalculationObservation>,
  metadata: { seed: string; baseStatus: string; headStatus: string },
): CalculationRegressionReport {
  const ids = [...new Set([...base.keys(), ...head.keys()])].sort()
  const newScenarioIds = ids.filter((id) => !base.has(id))
  const removedScenarioIds = ids.filter((id) => !head.has(id))
  const randomizedScenarioIds = [...head.keys()].filter((id) => id.startsWith('optimization-random-')).sort()
  const changes: ScenarioChange[] = []
  const comparedScenarios: ScenarioChange[] = []

  // base/head両方に存在する条件だけを値比較し、新規・削除条件は別の一覧へ記録する
  for (const id of ids) {
    const before = base.get(id)
    const after = head.get(id)
    if (!before || !after) continue

    const changed = collectValueChanges(calculationInternal(before.calculation), calculationInternal(after.calculation))
    const inputChanged = before.scenarioHash !== after.scenarioHash
    const baseScore = calculationScore(before.calculation)
    const headScore = calculationScore(after.calculation)
    const baseLineup = lineupForObservation(before)
    const headLineup = lineupForObservation(after)
    const plan = scenarioPlan(after) ?? scenarioPlan(before)
    const comparison: ScenarioChange = {
      id,
      ...((after.description ?? before.description) ? { description: after.description ?? before.description } : {}),
      ...(plan ? { plan } : {}),
      inputChanged,
      ...(baseScore !== undefined ? { baseScore } : {}),
      ...(headScore !== undefined ? { headScore } : {}),
      ...(baseLineup ? { baseLineup } : {}),
      ...(headLineup ? { headLineup } : {}),
      changes: changed,
      ...(randomProfile(after) ? { randomProfile: randomProfile(after) } : {}),
    }
    comparedScenarios.push(comparison)
    if (changed.length > 0 || inputChanged) changes.push(comparison)
  }

  return {
    ...metadata,
    baselineAvailable: base.size > 0,
    baseScenarioCount: base.size,
    headScenarioCount: head.size,
    comparedScenarioCount: [...base.keys()].filter((id) => head.has(id)).length,
    comparedScenarios,
    newScenarioIds,
    newScenarioResults: newScenarioIds.flatMap((id) => {
      const observation = head.get(id)
      if (!observation) return []
      const lineup = lineupForObservation(observation)
      const score = calculationScore(observation.calculation)
      return [
        {
          id,
          ...(observation.description ? { description: observation.description } : {}),
          ...(score !== undefined ? { headScore: score } : {}),
          ...(lineup ? { headLineup: lineup } : {}),
        },
      ]
    }),
    removedScenarioIds,
    changes,
    randomizedScenarioIds,
    // 入力が同じで出力だけ変わった場合も、ランダム条件の一覧で個別に確認できるようにする
    randomizedProfiles: randomizedScenarioIds.flatMap((id) => {
      const baseObservation = base.get(id)
      const headObservation = head.get(id)
      const profile = randomProfile(headObservation) ?? randomProfile(baseObservation)
      const baselinePresent = base.has(id)
      const comparison = comparedScenarios.find((candidate) => candidate.id === id)
      const baseScore = comparison ? comparison.baseScore : calculationScore(baseObservation?.calculation)
      const headScore = comparison ? comparison.headScore : calculationScore(headObservation?.calculation)
      const baseLineup = comparison ? comparison.baseLineup : lineupForObservation(baseObservation)
      const headLineup = comparison ? comparison.headLineup : lineupForObservation(headObservation)
      const plan = comparison?.plan ?? scenarioPlan(headObservation) ?? scenarioPlan(baseObservation)
      const changed = !baselinePresent || changes.some((change) => change.id === id)
      return [
        {
          id,
          ...((headObservation?.description ?? baseObservation?.description)
            ? { description: headObservation?.description ?? baseObservation?.description }
            : {}),
          ...(profile ? { profile } : {}),
          ...(plan ? { plan } : {}),
          ...(baseScore !== undefined ? { baseScore } : {}),
          ...(headScore !== undefined ? { headScore } : {}),
          ...(baseLineup ? { baseLineup } : {}),
          ...(headLineup ? { headLineup } : {}),
          inputChanged: comparison?.inputChanged ?? false,
          changes: comparison?.changes ?? [],
          baselinePresent,
          changed,
        },
      ]
    }),
  }
}

/**
 * 差分の種類に合わせて数値・配列・その他の値をMarkdown 1行へ整形する
 *
 * @param change 表示する差分
 * @returns Markdownの箇条書き1行
 */
function formatChange(change: ValueChange): string {
  if (change.removed?.length || change.added?.length) {
    const details = [
      ...(change.removed?.length ? [`削除: ${change.removed.join('、')}`] : []),
      ...(change.added?.length ? [`追加: ${change.added.join('、')}`] : []),
    ]
    return `- ${change.path}: ${details.join(' / ')}`
  }

  const before = JSON.stringify(change.before) ?? 'undefined'
  const after = JSON.stringify(change.after) ?? 'undefined'
  const delta = typeof change.delta === 'number' ? `（${change.delta >= 0 ? '+' : ''}${change.delta}）` : ''
  const reordered = change.reordered ? '（順序変更）' : ''
  return `- ${change.path}: ${before} → ${after}${delta}${reordered}`
}

/** base/headの編成を同じ列構成で表示する */
function renderLineup(
  lineup: CalculationLineup | undefined,
  score: number | undefined,
  side: 'Base' | 'Head',
): string[] {
  const title = `**最適編成（${side} / アプリの結果）**`
  if (!lineup) return [title, '', '編成データがありません。']

  const totalScore = lineup.totalScore ?? score
  return [title, '', renderLineupTable(lineup.members, totalScore)]
}

/** プラン値を表示用のラベルへ変換する */
function planLabel(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '—'
  const labels: Record<string, string> = { sense: 'Sense', logic: 'Logic', anomaly: 'Anomaly' }
  return labels[value.toLowerCase()] ?? value
}

/** 条件説明からプランと凸数表記を分離し、比較表の条件欄を簡潔にする */
function conditionLabel(description: string | undefined, id: string, plan: string | undefined): string {
  const planValue = plan?.toLowerCase()
  const parts = (description ?? id)
    .split(' / ')
    .filter((part) => part.toLowerCase() !== planValue && part !== '全カード4凸')
  return parts.join(' / ')
}

/** ランダム設定を人が読める短い条件に整える */
function randomProfileLabel(profile: JsonRecord | undefined): string {
  if (!profile) return ''
  const parts: string[] = []
  if (typeof profile.sample === 'number' && Number.isInteger(profile.sample) && profile.sample > 0) {
    parts.push(`ランダム条件${profile.sample}`)
  }
  if (typeof profile.plan === 'string') parts.push(`プラン ${planLabel(profile.plan)}`)

  const lessonCounts = profile.lessonCounts
  if (isRecord(lessonCounts)) {
    const values = Object.entries(parameterTypeLabels).flatMap(([type, label]) => {
      const value = lessonCounts[type]
      return typeof value === 'number' && Number.isInteger(value) && value > 0 ? [`${label}${value}`] : []
    })
    if (values.length > 0) parts.push(`レッスン配分 ${values.join('・')}`)
  }

  const parameterBonus = profile.paramBonusPercent
  if (isRecord(parameterBonus)) {
    const values = Object.entries(parameterTypeLabels).flatMap(([type, label]) => {
      const value = parameterBonus[type]
      return typeof value === 'number' && Number.isFinite(value) ? [`${label} ${value}%`] : []
    })
    if (values.length > 0) parts.push(`パラメータボーナス ${values.join('・')}`)
  }

  if (profile.uncapProfile === 'all-four') parts.push('凸数 全カード4凸')
  else if (typeof profile.uncapProfile === 'string') parts.push(`凸数 ${profile.uncapProfile}`)
  return parts.join(' / ')
}

/** 条件ごとの総合点を一覧する */
function renderScoreComparisonTable(
  rows: Array<{
    id: string
    description?: string
    plan?: string
    profile?: JsonRecord
    baseScore?: number
    headScore?: number
    inputChanged: boolean
    changes: ValueChange[]
    baselinePresent: boolean
  }>,
): string {
  const lines = ['| 状態 | 条件 | プラン | Base総合点 | Head総合点 | 差 |', '| --- | --- | --- | ---: | ---: | ---: |']

  for (const row of rows) {
    const status = !row.baselinePresent
      ? '➕ 比較元なし'
      : row.inputChanged
        ? '⚠️ 入力差分'
        : row.changes.length > 0
          ? '⚠️ 計算差分'
          : '✅ 一致'
    const difference =
      row.baseScore !== undefined && row.headScore !== undefined ? row.headScore - row.baseScore : undefined
    const differenceLabel = difference === undefined ? '—' : difference > 0 ? `+${difference}` : String(difference)
    const label = conditionLabel(row.description, row.id, row.plan)
    lines.push(
      `| ${status} | ${label} | ${planLabel(row.plan ?? row.profile?.plan)} | ${row.baseScore ?? '—'} | ${row.headScore ?? '—'} | ${differenceLabel} |`,
    )
  }

  return lines.join('\n')
}

/** base/headで同じ編成なら1つにまとめ、差があれば両方を表示する */
function renderLineupComparison(
  baseLineup: CalculationLineup | undefined,
  headLineup: CalculationLineup | undefined,
  baseScore: number | undefined,
  headScore: number | undefined,
): string[] {
  const baseTable = baseLineup ? renderLineupTable(baseLineup.members, baseLineup.totalScore ?? baseScore) : undefined
  const headTable = headLineup ? renderLineupTable(headLineup.members, headLineup.totalScore ?? headScore) : undefined

  if (!baseLineup && !headLineup) return []
  if (baseTable && headTable && baseTable === headTable) {
    return ['**Base / Head共通の最適編成（アプリの結果）**', '', baseTable]
  }

  return [
    ...(baseLineup || baseScore !== undefined ? renderLineup(baseLineup, baseScore, 'Base') : []),
    ...(headLineup || headScore !== undefined ? ['', ...renderLineup(headLineup, headScore, 'Head')] : []),
  ]
}

/** 条件の点数、変更内容、編成を折りたたみの中で確認できるようにする */
function renderScenarioDetails(row: {
  id: string
  description?: string
  plan?: string
  profile?: JsonRecord
  baseScore?: number
  headScore?: number
  baseLineup?: CalculationLineup
  headLineup?: CalculationLineup
  inputChanged: boolean
  changes: ValueChange[]
  baselinePresent: boolean
}): string[] {
  const condition = conditionLabel(row.description, row.id, row.plan)
  const status = !row.baselinePresent
    ? '比較元なし'
    : row.inputChanged
      ? '入力差分あり'
      : row.changes.length > 0
        ? '計算差分あり'
        : 'Base / Head一致'
  const lines = [
    '<details>',
    `<summary>${condition} / ${planLabel(row.plan ?? row.profile?.plan)} / ${status}</summary>`,
    '',
  ]
  const profileLabel = randomProfileLabel(row.profile)
  if (profileLabel) lines.push(`条件設定: ${profileLabel}`, '')
  if (row.inputChanged) lines.push('入力条件がBaseとHeadで異なります。', '')

  if (row.changes.length > 0) {
    lines.push('**計算値の差分**', '', ...row.changes.map(formatChange), '')
  } else if (row.baselinePresent) {
    lines.push('BaseとHeadの計算結果は一致しました。', '')
  } else {
    lines.push('Baseに比較条件がありません。Headの結果を表示します。', '')
  }

  lines.push(...renderLineupComparison(row.baseLineup, row.headLineup, row.baseScore, row.headScore), '')
  if (row.profile) {
    lines.push(
      '<details>',
      '<summary>再現用プロフィール（JSON）</summary>',
      '',
      '```json',
      JSON.stringify(row.profile, null, 2),
      '```',
      '',
      '</details>',
      '',
    )
  }
  lines.push('</details>', '')
  return lines
}

/**
 * 計算比較結果をPRコメントとActions summaryに載せるMarkdownへ変換する
 *
 * @param report 比較済みの計算結果
 * @returns comment markerを含むMarkdown本文
 */
export function renderCalculationRegressionReport(report: CalculationRegressionReport): string {
  const lines = [
    '<!-- gaku-navi-calculation-regression -->',
    '# 計算回帰テスト',
    '',
    `実行: seed \`${report.seed}\``,
    `読み込んだ観測: base ${report.baseScenarioCount}件 / head ${report.headScenarioCount}件`,
    `比較できた条件: ${report.comparedScenarioCount}件 / ランダム条件: ${report.randomizedScenarioIds.length}件 / 計算差分: ${report.changes.length}件`,
    `新規条件: ${report.newScenarioIds.length}件 / 削除条件: ${report.removedScenarioIds.length}件`,
    `Vitest: base ${report.baseStatus} / head ${report.headStatus}`,
    '',
    '<details>',
    '<summary>結果の見方</summary>',
    '',
    '- 条件ごとの総合点・プラン・差を一覧し、カード編成も確認できます。',
    '- Base / Headで編成と点数が同じ場合も、共通編成を1つ表示します。',
    '- seed付きランダム条件は読みやすい設定概要を表示し、再現用JSONは折りたたんでいます。',
    '- 計算差分は情報表示です。Vitestの計算失敗はCIチェックで検出します。',
    '</details>',
    '',
  ]

  // 比較元がない初回実行では差分を捏造せず、headの観測が用意できたことを説明する
  if (!report.baselineAvailable) lines.push('baseの計算結果がないため、headの結果を基準として保存しました。', '')

  const newFixedScenarios = report.newScenarioResults.filter(({ id }) => !id.startsWith('optimization-random-'))
  if (newFixedScenarios.length > 0) {
    lines.push(
      '<details>',
      `<summary>headで追加された固定条件（${newFixedScenarios.length}件）</summary>`,
      '',
      '## 新規条件',
      '',
    )
    for (const scenario of newFixedScenarios) {
      lines.push(`### ${scenario.description ?? scenario.id}`, '', `ID: \`${scenario.id}\``, '')
      if (scenario.headLineup) lines.push(...renderLineup(scenario.headLineup, scenario.headScore, 'Head'), '')
    }
    lines.push('</details>', '')
  }

  if (report.removedScenarioIds.length) lines.push(`headで削除された条件: ${report.removedScenarioIds.join('、')}`, '')

  const fixedComparisons = report.comparedScenarios.filter(({ id }) => !id.startsWith('optimization-random-'))
  if (fixedComparisons.length > 0) {
    lines.push(
      '<details>',
      `<summary>固定条件の比較（${fixedComparisons.length}件 / 差分 ${report.changes.filter(({ id }) => !id.startsWith('optimization-random-')).length}件）</summary>`,
      '',
      '## 固定条件',
      '',
      renderScoreComparisonTable(fixedComparisons.map((comparison) => ({ ...comparison, baselinePresent: true }))),
      '',
    )
    for (const comparison of fixedComparisons)
      lines.push(...renderScenarioDetails({ ...comparison, baselinePresent: true }))
    lines.push('</details>', '')
  }

  if (report.randomizedScenarioIds.length > 0) {
    const changedRandomizedProfiles = report.randomizedProfiles.filter(({ changed }) => changed).length
    lines.push(
      '<details>',
      `<summary>seed付きランダム条件（${report.randomizedScenarioIds.length}件 / 差分 ${changedRandomizedProfiles}件）</summary>`,
      '',
      '## seed付きランダム条件',
      '',
      renderScoreComparisonTable(report.randomizedProfiles),
      '',
    )
    for (const comparison of report.randomizedProfiles) lines.push(...renderScenarioDetails(comparison))
    lines.push('</details>', '')
  }

  if (
    report.changes.length === 0 &&
    report.newScenarioIds.length === 0 &&
    report.removedScenarioIds.length === 0 &&
    report.baselineAvailable
  ) {
    lines.push('✅ 比較した計算結果に差分はありません。', '')
  }

  // 差分表示だけではCIを落とさず、計算そのものの失敗はVitestの終了状態で判定する
  return `${lines.join('\n')}\n`
}

/** CLI引数・Actions環境変数から比較対象を読み、Markdownレポートを書き出す */
async function compare(): Promise<void> {
  const [baseArgument, headArgument, outputArgument] = process.argv.slice(3)
  const baseDirectory = path.resolve(process.cwd(), baseArgument ?? 'tmp/pr-calculations/base/calculations')
  const headDirectory = path.resolve(process.cwd(), headArgument ?? 'tmp/pr-calculations/head/calculations')
  const outputDirectory = path.resolve(process.cwd(), outputArgument ?? 'tmp/pr-calculations/report')
  const seed = process.env.REGRESSION_RANDOM_SEED ?? 'unknown'
  const baseStatus = process.env.REGRESSION_BASE_TEST_RESULT ?? 'unknown'
  const headStatus = process.env.REGRESSION_HEAD_TEST_RESULT ?? 'unknown'
  const [base, head] = await Promise.all([readObservations(baseDirectory), readObservations(headDirectory)])
  const report = compareCalculationObservations(base, head, { seed, baseStatus, headStatus })

  await mkdir(outputDirectory, { recursive: true })
  await writeFile(path.join(outputDirectory, 'report.md'), renderCalculationRegressionReport(report))
}

// テストから関数をimportした場合にCLI処理を開始せず、直接実行したときだけcompareを起動する
const scriptPath = fileURLToPath(import.meta.url)
const invokedScriptPath = process.argv[1] ? await realpath(process.argv[1]) : undefined
if (invokedScriptPath === scriptPath) {
  if (process.argv[2] === 'compare') await compare()
  else
    throw new Error('Usage: node calculationRegression.js compare <base-directory> <head-directory> <report-directory>')
}

/** CP-SAT検証結果を復元し、ActionsレポートとPRコメントを準備する */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'

type JsonRecord = Record<string, unknown>

interface ReportCases {
  reportCount: number
  cases: JsonRecord[]
}

/** シャードごとのファイル順が実行環境で揺れて、同じ結果のコメント差分にならないよう整列する */
function findJsonFiles(directory: string): string[] {
  if (!existsSync(directory)) return []

  return readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry)
      if (statSync(path).isDirectory()) return findJsonFiles(path)
      return path.endsWith('.json') ? [path] : []
    })
    .sort((left, right) => left.localeCompare(right))
}

/** 独立したランナーからjob outputで受け取ったレポートを展開し、不正なシャードを除いて集計する */
function readReportsFromJobOutputs(): ReportCases | null {
  const reportOutputs: [string, string | undefined][] = [
    ['hif-7-1', process.env.CP_SAT_REPORT_HIF_7_1],
    ['hif-6-2', process.env.CP_SAT_REPORT_HIF_6_2],
    ['hif-8', process.env.CP_SAT_REPORT_HIF_8],
    ['hajime', process.env.CP_SAT_REPORT_HAJIME],
  ]
  if (!reportOutputs.some(([, encodedReport]) => encodedReport)) return null

  const cases: JsonRecord[] = []
  let reportCount = 0
  for (const [shard, encodedReport] of reportOutputs) {
    if (!encodedReport) continue

    try {
      // job outputの値はgzip後にBase64化されているため、形式を確認してからJSONへ戻す
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encodedReport)) throw new Error('report output is not valid base64')
      const reportJson = gunzipSync(Buffer.from(encodedReport, 'base64')).toString('utf8')
      const parsed: unknown = JSON.parse(reportJson)
      if (!isRecord(parsed) || !Array.isArray(parsed.cases)) throw new Error('report has no cases array')
      cases.push(...parsed.cases.filter(isRecord))
      reportCount += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Could not read CP-SAT report for ${shard}: ${message}`)
    }
  }

  return { reportCount, cases }
}

/** ローカル実行では保存済みJSONを読み、CIと同じ集計処理へ渡す */
function readReportsFromDirectory(directory: string): ReportCases {
  const reportFiles = findJsonFiles(directory)
  const cases: JsonRecord[] = []
  for (const path of reportFiles) {
    try {
      const report: unknown = JSON.parse(readFileSync(path, 'utf8'))
      if (isRecord(report) && Array.isArray(report.cases)) cases.push(...report.cases.filter(isRecord))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Could not read CP-SAT report ${path}: ${message}`)
    }
  }

  return { reportCount: reportFiles.length, cases }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function firstNumber(...values: unknown[]): number | undefined {
  return values.find((value): value is number => typeof value === 'number' && Number.isFinite(value))
}

function typeLabel(value: unknown): string {
  if (value === 'vocal') return 'Vo'
  if (value === 'dance') return 'Da'
  if (value === 'visual') return 'Vi'
  return ''
}

function formatLineup(value: unknown): string {
  if (!Array.isArray(value)) return '—'

  const members = value.flatMap((member): string[] => {
    if (!isRecord(member) || typeof member.name !== 'string') return []
    const parameterType = typeLabel(member.parameterType)
    const type = parameterType === '' ? '' : ` (${parameterType})`
    const rental = member.isRental === true ? ' [レンタル]' : ''
    return [`${member.name}${type}${rental}`]
  })

  return members.length > 0 ? members.join('、') : '—'
}

function formatTypeCounts(value: unknown): string {
  if (!Array.isArray(value)) return '—'
  const counts = { vocal: 0, dance: 0, visual: 0 }
  for (const member of value) {
    if (!isRecord(member)) continue
    if (member.parameterType === 'vocal') counts.vocal += 1
    if (member.parameterType === 'dance') counts.dance += 1
    if (member.parameterType === 'visual') counts.visual += 1
  }
  return `Vo${counts.vocal}/Da${counts.dance}/Vi${counts.visual}`
}

function escapeCell(value: unknown): string {
  return String(value)
    .replaceAll('|', '\\|')
    .replace(/[\r\n]/g, ' ')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function conditionLabel(result: JsonRecord): { scenario: string; variant: string; plan: string; label: string } {
  const scenario = typeof result.scenario === 'string' ? result.scenario : '不明'
  const variant = typeof result.variant === 'string' ? result.variant : '条件不明'
  const plan = typeof result.plan === 'string' ? result.plan : 'プラン不明'
  const fixedCount = Number.isInteger(result.mainTypeCount) ? ` 主属性${result.mainTypeCount}枚固定` : ''
  return { scenario, variant, plan, label: `${scenario} ${variant}${fixedCount}` }
}

function scoreFor(result: JsonRecord): number {
  return firstNumber(result.bestKnownScore, result.optimalScore, result.candidateScore) ?? Number.NEGATIVE_INFINITY
}

function renderScoreTable(results: JsonRecord[]): string {
  const rows = [...results].sort((left, right) => {
    const scoreDifference = scoreFor(right) - scoreFor(left)
    if (scoreDifference !== 0) return scoreDifference
    return conditionLabel(left).label.localeCompare(conditionLabel(right).label, 'ja')
  })

  const lines = [
    '| 順位 | 検証ベスト点 | アプリ点 | 条件 | プラン | 状態 | アプリ属性枚数 | CP-SAT属性枚数 | アプリ編成 | CP-SAT編成 |',
    '| ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | --- |',
  ]

  rows.forEach((result, index) => {
    const { label, plan } = conditionLabel(result)
    const appScore = firstNumber(result.candidateScore)
    const verifiedScore = firstNumber(result.bestKnownScore, result.optimalScore)
    lines.push(
      `| ${index + 1} | ${verifiedScore ?? '—'} | ${appScore ?? '—'} | ${escapeCell(label)} | ${escapeCell(plan)} | ${escapeCell(result.status ?? '不明')} | ${formatTypeCounts(result.appOptimizerLineup)} | ${formatTypeCounts(result.bestLineup)} | ${escapeCell(formatLineup(result.appOptimizerLineup))} | ${escapeCell(formatLineup(result.bestLineup))} |`,
    )
  })

  return lines.join('\n')
}

function renderCardFrequency(results: JsonRecord[]): string {
  const cards = new Map<string, { name: string; type: string; count: number; rentalCount: number }>()
  for (const result of results) {
    if (!Array.isArray(result.appOptimizerLineup)) continue
    for (const member of result.appOptimizerLineup) {
      if (!isRecord(member) || typeof member.name !== 'string') continue
      const type = typeof member.parameterType === 'string' ? member.parameterType : ''
      const key = `${type}\0${member.name}`
      const usage = cards.get(key) ?? { name: member.name, type, count: 0, rentalCount: 0 }
      usage.count += 1
      if (member.isRental === true) usage.rentalCount += 1
      cards.set(key, usage)
    }
  }

  const rows = [...cards.values()].sort(
    (left, right) =>
      right.count - left.count || left.name.localeCompare(right.name, 'ja') || left.type.localeCompare(right.type),
  )
  if (rows.length === 0) return '採用編成データがありません。'

  return [
    '| 順位 | カード | 採用回数 | レンタル回数 |',
    '| ---: | --- | ---: | ---: |',
    ...rows.map(
      (card, index) =>
        `| ${index + 1} | ${escapeCell(card.name)}${typeLabel(card.type) ? ` (${typeLabel(card.type)})` : ''} | ${card.count} | ${card.rentalCount} |`,
    ),
  ].join('\n')
}

/** Actions表示とPRコメントで共通の結果を使い、実行情報だけを出し分ける */
function renderReport(reportCount: number, results: JsonRecord[], forPrComment: boolean): string {
  const lines: string[] = []
  if (forPrComment) lines.push('<!-- cp-sat-optimizer-report -->')
  lines.push('# 最適編成検証サマリー')

  // 実行ごとに変わる情報はActions側だけに出し、PRコメントを結果だけで比較できるようにする
  if (!forPrComment && process.env.GITHUB_RUN_ID && process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY) {
    const attempt = process.env.GITHUB_RUN_ATTEMPT ? `（試行 ${process.env.GITHUB_RUN_ATTEMPT}）` : ''
    const runUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    lines.push('', `実行: [Run #${process.env.GITHUB_RUN_ID}${attempt}](${runUrl})`)
  }
  lines.push('', `読み込んだレポート: ${reportCount}件 / 検証ケース: ${results.length}件`)

  if (results.length === 0) {
    lines.push('', 'レポートが見つかりませんでした。')
    return `${lines.join('\n')}\n`
  }

  const scenarios: Record<string, JsonRecord[]> = {
    初レジェンド: results.filter((result) => conditionLabel(result).scenario === '初レジェンド'),
    HIF: results.filter((result) => conditionLabel(result).scenario === 'HIF'),
    総合: results,
  }
  const statusCounts = new Map<string, number>()
  for (const result of results) {
    const status = typeof result.status === 'string' ? result.status : '不明'
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1)
  }

  lines.push(
    '',
    `結果: ${[...statusCounts]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, count]) => `${status} ${count}件`)
      .join('、')}`,
  )
  lines.push(
    '',
    '採用回数はアプリ最適編成を集計し、レンタルも1回として数えています。点数ランキングは検証ベスト点の降順です。',
    '',
    '<details>',
    forPrComment ? `<summary>検証結果を表示（${results.length}件）</summary>` : '<summary>検証結果を表示</summary>',
    '',
  )

  // 表示量を抑えるため、ランキングと採用回数の詳細は折りたたんでおく
  if (forPrComment) {
    lines.push(
      `## 全条件（${results.length}件）`,
      '',
      '### 点数順',
      renderScoreTable(results),
      '',
      '## カード採用回数順',
    )
    for (const [group, groupResults] of Object.entries(scenarios)) {
      lines.push('', `### ${group}（${groupResults.length}件）`, renderCardFrequency(groupResults))
    }
  } else {
    for (const [group, groupResults] of Object.entries(scenarios)) {
      lines.push(
        `## ${group}（${groupResults.length}件）`,
        '',
        '### 点数順',
        renderScoreTable(groupResults),
        '',
        '### カード採用回数順',
        renderCardFrequency(groupResults),
        '',
      )
    }
  }

  lines.push('</details>')
  return `${lines.join('\n')}\n`
}

const outputRoot = resolve(process.argv[2] ?? 'tmp/cp-sat-summary')
const localReportRoot = resolve(process.argv[3] ?? 'tmp/optimizer-validation')

// 全シャードのケースをメモリ上でまとめてから順位と採用回数を計算し、中間JSONファイルは作らない
const report = readReportsFromJobOutputs() ?? readReportsFromDirectory(localReportRoot)

mkdirSync(outputRoot, { recursive: true })
const summaryPath = join(outputRoot, 'report.md')
const commentPath = join(outputRoot, 'comment.md')
// regressionと同じく、Actions表示用とPR投稿用を別ファイルにして後続stepから利用する
writeFileSync(summaryPath, renderReport(report.reportCount, report.cases, false))
writeFileSync(commentPath, renderReport(report.reportCount, report.cases, true))
console.log(`CP-SAT report: ${relative(process.cwd(), summaryPath)}`)

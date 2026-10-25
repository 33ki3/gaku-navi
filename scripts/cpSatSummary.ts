/** CP-SAT検証結果を復元し、ActionsレポートとPRコメントを準備する */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'

type JsonRecord = Record<string, unknown>

// summaryはJSONでシリアライズされた値を読む独立スクリプトなので、表示名と属性キーをここで対応付ける
const parameterTypeLabels = {
  vocal: 'Vo',
  dance: 'Da',
  visual: 'Vi',
} as const
const parameterTypeSortOrder: Record<string, number> = { vocal: 0, dance: 1, visual: 2 }

interface ReportCases {
  reportCount: number
  cases: JsonRecord[]
  randomizedProfiles: JsonRecord[]
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
    ['hajime-4-1', process.env.CP_SAT_REPORT_HAJIME_4_1],
    ['hajime-5', process.env.CP_SAT_REPORT_HAJIME_5],
    ['hif-6-2', process.env.CP_SAT_REPORT_HIF_6_2],
    ['hif-7-1', process.env.CP_SAT_REPORT_HIF_7_1],
    ['hif-8', process.env.CP_SAT_REPORT_HIF_8],
  ]
  if (!reportOutputs.some(([, encodedReport]) => encodedReport)) return null

  const cases: JsonRecord[] = []
  const randomizedProfiles: JsonRecord[] = []
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
      if (isRecord(parsed.randomizedProfile)) randomizedProfiles.push(parsed.randomizedProfile)
      reportCount += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Could not read CP-SAT report for ${shard}: ${message}`)
    }
  }

  return { reportCount, cases, randomizedProfiles }
}

/** ローカル実行では保存済みJSONを読み、CIと同じ集計処理へ渡す */
function readReportsFromDirectory(directory: string): ReportCases {
  const reportFiles = findJsonFiles(directory)
  const cases: JsonRecord[] = []
  const randomizedProfiles: JsonRecord[] = []
  for (const path of reportFiles) {
    try {
      const report: unknown = JSON.parse(readFileSync(path, 'utf8'))
      if (isRecord(report) && Array.isArray(report.cases)) {
        cases.push(...report.cases.filter(isRecord))
        if (isRecord(report.randomizedProfile)) randomizedProfiles.push(report.randomizedProfile)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Could not read CP-SAT report ${path}: ${message}`)
    }
  }

  return { reportCount: reportFiles.length, cases, randomizedProfiles }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function firstNumber(...values: unknown[]): number | undefined {
  return values.find((value): value is number => typeof value === 'number' && Number.isFinite(value))
}

function typeLabel(value: unknown): string {
  return typeof value === 'string' && Object.hasOwn(parameterTypeLabels, value)
    ? parameterTypeLabels[value as keyof typeof parameterTypeLabels]
    : ''
}

function escapeCell(value: unknown): string {
  return String(value)
    .replaceAll('|', '\\|')
    .replace(/[\r\n]/g, ' ')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function lessonCountLabel(value: unknown): string {
  if (!isRecord(value)) return ''
  return Object.entries(parameterTypeLabels)
    .flatMap(([type, label]) => {
      const count = value[type]
      return typeof count === 'number' && count > 0 ? [`${label}${count}`] : []
    })
    .join('・')
}

function conditionLabel(result: JsonRecord): { scenario: string; variant: string; plan: string; label: string } {
  const scenario = typeof result.scenario === 'string' ? result.scenario : '不明'
  const variant = typeof result.variant === 'string' ? result.variant : '条件不明'
  const plan = typeof result.plan === 'string' ? result.plan : 'プラン不明'
  const lessonCounts = lessonCountLabel(result.lessonCounts)
  const classType = typeLabel(result.classType)
  const splitMode = result.hifLessonSplitSub === true ? '半分割' : result.hifLessonSplitSub === false ? 'サブ指定' : ''
  const label = [
    scenario,
    lessonCounts || variant,
    classType ? `授業${classType}` : '',
    scenario === 'HIF' ? splitMode : '',
    Number.isInteger(result.mainTypeCount) ? `主属性${result.mainTypeCount}枚固定` : '',
  ]
    .filter(Boolean)
    .join(' / ')
  return { scenario, variant, plan, label }
}

function scoreFor(result: JsonRecord): number {
  return firstNumber(result.bestKnownScore, result.optimalScore, result.candidateScore) ?? Number.NEGATIVE_INFINITY
}

function statusLabel(value: unknown): string {
  if (value === 'optimal') return '🟢 optimal'
  if (value === 'non_optimal') return '🔴 non_optimal'
  if (value === 'unknown') return '🟡 unknown'
  return `🔴 ${typeof value === 'string' ? value : '不明'}`
}

function theoryScore(result: JsonRecord): number | undefined {
  return firstNumber(result.bestKnownScore, result.optimalScore)
}

function renderScoreTable(results: JsonRecord[]): string {
  const rows = [...results].sort((left, right) => {
    const scoreDifference = scoreFor(right) - scoreFor(left)
    if (scoreDifference !== 0) return scoreDifference
    const conditionDifference = conditionLabel(left).label.localeCompare(conditionLabel(right).label, 'ja')
    if (conditionDifference !== 0) return conditionDifference
    return (
      ['Sense', 'Logic', 'Anomaly'].indexOf(String(left.plan)) -
      ['Sense', 'Logic', 'Anomaly'].indexOf(String(right.plan))
    )
  })

  const lines = [
    '| 状態 | 順位 | 条件 | プラン | 理論編成点 | 最適編成点 | 差 |',
    '| --- | ---: | --- | --- | ---: | ---: | ---: |',
  ]

  rows.forEach((result, index) => {
    const { label, plan } = conditionLabel(result)
    const optimalLineupScore = firstNumber(result.candidateScore)
    const theoryLineupScore = theoryScore(result)
    const difference =
      theoryLineupScore !== undefined && optimalLineupScore !== undefined
        ? theoryLineupScore - optimalLineupScore
        : undefined
    const cells = [
      statusLabel(result.status),
      String(index + 1),
      escapeCell(label),
      escapeCell(plan),
      theoryLineupScore ?? '—',
      optimalLineupScore ?? '—',
      difference === undefined ? '—' : difference > 0 ? `+${difference}` : String(difference),
    ]
    lines.push(`| ${cells.join(' | ')} |`)
  })

  return lines.join('\n')
}

function renderCardFrequency(results: JsonRecord[], includeRentalCount: boolean): string {
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

  const rows = [...cards.values()].sort((left, right) => {
    const countDifference = right.count - left.count
    if (countDifference !== 0) return countDifference
    const nameDifference = left.name.localeCompare(right.name, 'ja')
    return nameDifference !== 0 ? nameDifference : left.type.localeCompare(right.type)
  })
  if (rows.length === 0) return '採用編成データがありません。'

  const header = includeRentalCount
    ? '| 順位 | タイプ | カード | 採用回数 | レンタル回数 |'
    : '| 順位 | タイプ | カード | 採用回数 |'
  const divider = includeRentalCount ? '| ---: | --- | --- | ---: | ---: |' : '| ---: | --- | --- | ---: |'
  const markdownRows = rows.map((card, index) => {
    const cells = [String(index + 1), typeLabel(card.type) || '—', escapeCell(card.name), String(card.count)]
    if (includeRentalCount) cells.push(String(card.rentalCount))
    return `| ${cells.join(' | ')} |`
  })
  return [header, divider, ...markdownRows].join('\n')
}

function uncapLabel(value: unknown): string {
  if (value === -1) return '未所持'
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 4) return `${value}凸`
  return '不明'
}

function renderLineupTable(value: unknown, totalScore?: number): string {
  if (!Array.isArray(value)) return '編成データがありません。'
  const members = value.filter(isRecord)
  if (members.length === 0) return '編成データがありません。'
  const sortedMembers = [...members].sort((left, right) => {
    const leftTypeOrder = typeof left.parameterType === 'string' ? (parameterTypeSortOrder[left.parameterType] ?? 3) : 3
    const rightTypeOrder =
      typeof right.parameterType === 'string' ? (parameterTypeSortOrder[right.parameterType] ?? 3) : 3
    if (leftTypeOrder !== rightTypeOrder) return leftTypeOrder - rightTypeOrder
    const leftName = typeof left.name === 'string' ? left.name : '名称不明'
    const rightName = typeof right.name === 'string' ? right.name : '名称不明'
    return leftName.localeCompare(rightName, 'ja')
  })
  const cardScores = sortedMembers.map((member) => firstNumber(member.cardScore))
  const cardScoreTotal = cardScores.every((score): score is number => score !== undefined)
    ? cardScores.reduce((total, score) => total + score, 0)
    : undefined

  return [
    '| タイプ | カード | 凸数 | カード点（連携込み） |',
    '| --- | --- | ---: | ---: |',
    ...sortedMembers.map((member) => {
      const type = typeLabel(member.parameterType) || '—'
      const rentalLabel = member.isRental === true ? '（レンタル）' : ''
      const cardScore = firstNumber(member.cardScore)
      return `| ${type} | ${escapeCell(typeof member.name === 'string' ? member.name : '名称不明')} | ${uncapLabel(member.uncap)}${rentalLabel} | ${cardScore ?? '—'} |`
    }),
    `|  | カード点合計 |  | ${cardScoreTotal ?? '未集計'} |`,
    `|  | 総合点 |  | ${totalScore ?? '未確定'} |`,
  ].join('\n')
}

/** 折り返しの多い編成名は点数表から分離し、ケースごとの詳細にまとめる */
function renderLineupDetails(results: JsonRecord[], title: string): string {
  if (results.length === 0) return ''

  const rows = [...results].sort((left, right) => {
    const conditionDifference = conditionLabel(left).label.localeCompare(conditionLabel(right).label, 'ja')
    if (conditionDifference !== 0) return conditionDifference
    return (
      ['Sense', 'Logic', 'Anomaly'].indexOf(String(left.plan)) -
      ['Sense', 'Logic', 'Anomaly'].indexOf(String(right.plan))
    )
  })

  return [
    '<details>',
    `<summary>${title}（${results.length}件）</summary>`,
    '',
    ...rows.flatMap((result) => {
      const { label, plan } = conditionLabel(result)
      const status = statusLabel(result.status)
      const appScore = firstNumber(result.candidateScore)
      const solverScore = theoryScore(result)
      return [
        '<details>',
        `<summary>${escapeCell(label)} / ${escapeCell(plan)} / ${status}</summary>`,
        '',
        '**最適編成（アプリの結果）**',
        '',
        renderLineupTable(result.appOptimizerLineup, appScore),
        '',
        '**理論編成（CP-SATの結果）**',
        '',
        renderLineupTable(result.bestLineup, solverScore),
        '',
        '</details>',
        '',
      ]
    }),
    '</details>',
  ].join('\n')
}

function dedupeProfiles(profiles: JsonRecord[]): JsonRecord[] {
  const unique = new Map<string, JsonRecord>()
  for (const profile of profiles) {
    const key = String(profile.runSeed ?? profile.settingsSeed ?? JSON.stringify(profile))
    if (!unique.has(key)) unique.set(key, profile)
  }
  return [...unique.values()]
}

/** 共通設定とカードごとの凸数を、シャード間で重複しない形で表示する */
function renderRandomizedProfiles(profiles: JsonRecord[]): string {
  const uniqueProfiles = dedupeProfiles(profiles)
  if (uniqueProfiles.length === 0) return '共通ランダム設定はレポートに記録されていません。'

  return uniqueProfiles
    .map((profile, index) => {
      const { cardUncaps, ...settings } = profile
      const cardsByUncap = new Map<string, string[]>()
      if (isRecord(cardUncaps)) {
        for (const [name, uncap] of Object.entries(cardUncaps)) {
          const label = uncapLabel(uncap)
          const names = cardsByUncap.get(label) ?? []
          names.push(name)
          cardsByUncap.set(label, names)
        }
      }
      const uncapOrder = ['未所持', '0凸', '1凸', '2凸', '3凸', '4凸', '不明']
      const cardList = uncapOrder.flatMap((label) => {
        const names = cardsByUncap.get(label)
        if (!names || names.length === 0) return []
        return [
          `### ${label}（${names.length}枚）`,
          '',
          ...names.sort((left, right) => left.localeCompare(right, 'ja')).map((name) => `- ${escapeCell(name)}`),
          '',
        ]
      })

      return [
        `### 共通設定 ${index + 1}`,
        '',
        '<details>',
        '<summary>点数・育成設定</summary>',
        '',
        '```json',
        JSON.stringify(settings, null, 2),
        '```',
        '',
        '</details>',
        '',
        '<details>',
        `<summary>カードごとの凸数（${isRecord(cardUncaps) ? Object.keys(cardUncaps).length : 0}枚）</summary>`,
        '',
        ...(cardList.length > 0 ? cardList : ['凸数データがありません。']),
        '</details>',
      ].join('\n')
    })
    .join('\n\n')
}

/** レッスン配分ごとに異なるスケジュール、パラメータボーナス、自動調整済み回数を一度ずつ表示する */
function renderRandomizedScheduleSettings(results: JsonRecord[]): string {
  const uniqueSettings = new Map<string, { label: string; settings: JsonRecord }>()
  for (const result of results) {
    if (!isRecord(result.randomizedSettings)) continue
    const { scenario, variant, label } = conditionLabel(result)
    const key = [scenario, JSON.stringify(result.lessonCounts), result.classType, result.hifLessonSplitSub].join(':')
    const currentSettings = result.randomizedSettings
    const settings = {
      scheduleSelections: currentSettings.scheduleSelections,
      parameterBonusBase: currentSettings.parameterBonusBase,
      actionCounts: currentSettings.actionCounts,
    }
    if (!uniqueSettings.has(key)) {
      uniqueSettings.set(key, { label: `${label} / ${variant}`, settings })
    }
  }
  if (uniqueSettings.size === 0) return 'ランダムスケジュール設定は記録されていません。'

  return [
    '<details>',
    `<summary>配分ごとのスケジュール・自動調整値（${uniqueSettings.size}条件）</summary>`,
    '',
    ...[...uniqueSettings.values()].flatMap(({ label, settings }) => [
      `### ${escapeCell(label)}`,
      '',
      '```json',
      JSON.stringify(settings, null, 2),
      '```',
      '',
    ]),
    '</details>',
  ].join('\n')
}

function statusSummary(results: JsonRecord[]): string {
  const statusCounts = new Map<string, number>()
  for (const result of results) {
    const status = typeof result.status === 'string' ? result.status : '不明'
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1)
  }
  return (
    [...statusCounts]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, count]) => `${status} ${count}件`)
      .join('、') || '結果なし'
  )
}

/** Actions表示とPRコメントで共通の結果を使い、実行情報だけを出し分ける */
function renderReport(
  reportCount: number,
  results: JsonRecord[],
  randomizedProfiles: JsonRecord[],
  forPrComment: boolean,
): string {
  const lines: string[] = []
  if (forPrComment) lines.push('<!-- cp-sat-optimizer-report -->')
  lines.push('# 最適編成検証サマリー')

  // 実行ごとに変わる情報はActions側だけに出し、PRコメントを結果だけで比較できるようにする
  if (!forPrComment && process.env.GITHUB_RUN_ID && process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY) {
    const attempt = process.env.GITHUB_RUN_ATTEMPT ? `（試行 ${process.env.GITHUB_RUN_ATTEMPT}）` : ''
    const runUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    lines.push('', `実行: [Run #${process.env.GITHUB_RUN_ID}${attempt}](${runUrl})`)
  }
  const fixedResults = results.filter((result) => result.kind !== 'randomized')
  const randomizedResults = results.filter((result) => result.kind === 'randomized')
  lines.push(
    '',
    `読み込んだレポート: ${reportCount}件 / 固定4凸: ${fixedResults.length}件 / ランダム検証: ${randomizedResults.length}件`,
  )

  if (results.length === 0 && randomizedProfiles.length === 0) {
    lines.push('', 'レポートが見つかりませんでした。')
    return `${lines.join('\n')}\n`
  }

  const fixedScenarios: Record<string, JsonRecord[]> = {
    初レジェンド: fixedResults.filter((result) => conditionLabel(result).scenario === '初レジェンド'),
    HIF: fixedResults.filter((result) => conditionLabel(result).scenario === 'HIF'),
    総合: fixedResults,
  }
  const randomizedScenarios: Record<string, JsonRecord[]> = {
    初レジェンド: randomizedResults.filter((result) => conditionLabel(result).scenario === '初レジェンド'),
    HIF: randomizedResults.filter((result) => conditionLabel(result).scenario === 'HIF'),
    総合: randomizedResults,
  }
  lines.push(
    '',
    `固定4凸の結果: ${statusSummary(fixedResults)}`,
    `ランダム検証の結果: ${statusSummary(randomizedResults)}`,
    '',
    '「最適編成」はアプリ側の探索結果、「理論編成」はCP-SATの探索結果です。optimalは最適性を証明済み、non_optimalは制限時間内に証明できなかった状態です。',
    '固定4凸とランダム検証は別々に点数順位・カード採用回数を集計します。採用回数にはレンタル枠のカードも含みます。',
    '各条件をSense・Logic・Anomalyの3プランで検証するため、点数表にプランを表示します。',
    '編成表のカード点はカード本体点と編成内連携点の合計です。総合点には初期パラ・パラボなど編成全体の点も含まれます。',
  )

  if (fixedResults.length > 0) {
    lines.push(
      '',
      '<details>',
      forPrComment
        ? `<summary>固定4凸の検証結果を表示（${fixedResults.length}件）</summary>`
        : '<summary>固定4凸の検証結果</summary>',
      '',
    )
    lines.push(
      `## 全条件（${fixedResults.length}件）`,
      '',
      '### 点数順位',
      renderScoreTable(fixedResults),
      '',
      '### 編成一覧',
      renderLineupDetails(fixedResults, '固定4凸の編成'),
      '',
      '## カード採用回数',
    )
    for (const [group, groupResults] of Object.entries(fixedScenarios)) {
      lines.push('', `### ${group}（${groupResults.length}件）`, renderCardFrequency(groupResults, false))
    }
    lines.push('</details>')
  } else {
    lines.push('', '固定4凸の検証結果はありません。')
  }

  lines.push(
    '',
    '<details>',
    forPrComment
      ? `<summary>ランダム検証の結果を表示（${randomizedResults.length}件）</summary>`
      : `<summary>ランダム検証（${randomizedResults.length}件）</summary>`,
    '',
    '固定4凸の結果とは別に、ランダム検証だけの点数順位とカード採用回数を集計します。全シャード共通の手動点数設定・初期値・カード凸数と、配分ごとのスケジュールおよび自動調整値を記録します。',
    '',
    renderRandomizedProfiles(randomizedProfiles),
    '',
    renderRandomizedScheduleSettings(randomizedResults),
  )
  if (randomizedResults.length > 0) {
    lines.push(
      '',
      '### 点数順位（ランダム検証内）',
      renderScoreTable(randomizedResults),
      '',
      renderLineupDetails(randomizedResults, 'ランダム検証の編成'),
      '',
      '### カード採用回数（ランダム検証内）',
    )
    for (const [group, groupResults] of Object.entries(randomizedScenarios)) {
      lines.push('', `#### ${group}（${groupResults.length}件）`, renderCardFrequency(groupResults, true))
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
writeFileSync(summaryPath, renderReport(report.reportCount, report.cases, report.randomizedProfiles, false))
writeFileSync(commentPath, renderReport(report.reportCount, report.cases, report.randomizedProfiles, true))
console.log(`CP-SAT report: ${relative(process.cwd(), summaryPath)}`)

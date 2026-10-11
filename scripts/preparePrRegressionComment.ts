/** base/head比較結果からPRコメントと添付画像を準備する */
import { copyFile, lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type RegressionDevice,
  isMissingFileError,
  isRecord,
  isRegressionDevice,
  regressionDeviceLabels,
} from './regressionShared.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const workspaceRoot = path.resolve(projectRoot, '..')
const checkoutRoots = {
  base: path.join(workspaceRoot, 'base'),
  head: projectRoot,
}
const reportRoot = path.join(projectRoot, 'tmp/regression-results/report')
const outputRoot = path.join(projectRoot, 'tmp/pr-comment-assets')
const imagesRoot = path.join(outputRoot, 'images')
const summaryMarker = '<!-- pr-regression-visual-report -->'
// GitHub CLIの1コメントあたりの画像添付上限に合わせ、Base/Head比較は最大25件にする。
const maxAttachedImages = 50
const maxVisualChangesInComment = Math.floor(maxAttachedImages / 2)

interface VisualChangeInput {
  scenarioId: string
  description?: string
  device: RegressionDevice
  changedRatio?: number
  baseScreenshot?: string
  headScreenshot?: string
}

interface VisualChange extends Omit<VisualChangeInput, 'baseScreenshot' | 'headScreenshot'> {
  baseImage: string | null
  headImage: string | null
}

interface TestSummary {
  passed: number
  total: number
}

interface CommentSummary {
  reportAvailable: boolean
  baselineAvailable: boolean
  validation: string
  e2e: TestSummary | null
  visualChanges: VisualChange[]
  totalVisualChangeCount: number
  omittedVisualChangeCount: number
}

/** 比較レポートがまだ作成されていない場合だけnullを返す */
async function readJson(filename: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(filename, 'utf8'))
  } catch (error) {
    if (isMissingFileError(error)) return null
    throw error
  }
}

/** GitHubコメントに埋め込むラベルのHTML特殊文字を置き換える */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replace(/[\r\n]+/g, ' ')
}

/** 比較JSONから画面差分として使う項目だけを検証して取り出す */
function parseVisualChange(value: unknown): VisualChangeInput | null {
  if (
    !isRecord(value) ||
    typeof value.scenarioId !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value.scenarioId) ||
    !isRegressionDevice(value.device)
  ) {
    return null
  }

  return {
    scenarioId: value.scenarioId,
    ...(typeof value.description === 'string' ? { description: value.description } : {}),
    device: value.device,
    ...(typeof value.changedRatio === 'number' && Number.isFinite(value.changedRatio)
      ? { changedRatio: value.changedRatio }
      : {}),
    ...(typeof value.baseScreenshot === 'string' ? { baseScreenshot: value.baseScreenshot } : {}),
    ...(typeof value.headScreenshot === 'string' ? { headScreenshot: value.headScreenshot } : {}),
  }
}

/** シナリオIDと端末名が一致する通常ファイルだけをコメント添付用ディレクトリへ複製する */
async function copyScreenshot(
  sourceRoot: string,
  screenshot: string | undefined,
  expectedPath: string,
  destination: string,
): Promise<string | null> {
  if (screenshot !== expectedPath) return null

  const source = path.resolve(sourceRoot, screenshot)
  const root = `${path.resolve(sourceRoot)}${path.sep}`
  if (!source.startsWith(root)) return null

  try {
    const fileStat = await lstat(source)
    if (!fileStat.isFile()) return null
    await copyFile(source, destination)
    return path.relative(outputRoot, destination)
  } catch (error) {
    if (isMissingFileError(error)) return null
    throw error
  }
}

function escapeMarkdownAlt(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replace(/[\r\n]+/g, ' ')
}

function createImageCell(imagePath: string | null, label: string): string {
  if (!imagePath) return '画像を用意できませんでした'

  // GitHub CLIがローカル画像参照を添付URLへ置き換えられるよう、workspace相対のMarkdownにする
  const attachmentPath = path.relative(workspaceRoot, path.join(outputRoot, imagePath)).split(path.sep).join('/')
  return `![${escapeMarkdownAlt(label)}](${attachmentPath})`
}

function parseTestSummary(value: unknown): TestSummary | null {
  if (
    !isRecord(value) ||
    typeof value.passed !== 'number' ||
    !Number.isFinite(value.passed) ||
    typeof value.total !== 'number' ||
    !Number.isFinite(value.total)
  ) {
    return null
  }

  return { passed: value.passed, total: value.total }
}

function getRunUrl(): string | null {
  return process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null
}

function getRunLabel(): string {
  if (!process.env.GITHUB_RUN_ID) return 'ローカル実行'

  const attempt = process.env.GITHUB_RUN_ATTEMPT
  return attempt ? `Run #${process.env.GITHUB_RUN_ID}（試行 ${attempt}）` : `Run #${process.env.GITHUB_RUN_ID}`
}

function createCommentBody(summary: CommentSummary): string {
  const lines = [summaryMarker, '## 回帰テスト結果', '', `実行: ${getRunLabel()}`, '']
  const runUrl = getRunUrl()

  if (!summary.reportAvailable) {
    lines.push('回帰レポートを作成できませんでした。', '')
  } else if (!summary.baselineAvailable) {
    lines.push('ベースブランチに基準画像がないため、新旧の画面比較は行われていません。', '')
  } else if (summary.totalVisualChangeCount === 0) {
    lines.push('画面差分は検出されませんでした。', '')
  } else {
    lines.push(`差分を検出した画面・端末の組み合わせ: ${summary.totalVisualChangeCount} 件`, '')

    if (summary.omittedVisualChangeCount > 0) {
      lines.push(
        `画像添付の上限に合わせて${summary.visualChanges.length}件を掲載し、残り${summary.omittedVisualChangeCount}件を省略しました。`,
        '',
      )
    }
  }

  if (summary.e2e) {
    lines.push(`E2E: ${summary.e2e.passed}/${summary.e2e.total} 件成功 · 検証 ${escapeHtml(summary.validation)}`, '')
  } else if (summary.validation) {
    lines.push(`検証: ${escapeHtml(summary.validation)}`, '')
  }
  if (runUrl) lines.push(`[Actionsの実行結果](${runUrl})`, '')

  lines.push('## 画面差分', '')
  if (!summary.reportAvailable || !summary.baselineAvailable) {
    lines.push('比較画像はありません。', '')
  } else if (summary.totalVisualChangeCount === 0) {
    lines.push('画面差分は検出されませんでした。', '')
  } else {
    for (const change of summary.visualChanges) {
      const title = `${change.scenarioId}${change.description ? ` · ${change.description}` : ''}`
      const deviceLabel = regressionDeviceLabels[change.device]
      const changedRatio =
        typeof change.changedRatio === 'number' && Number.isFinite(change.changedRatio)
          ? ` · 差分 ${(change.changedRatio * 100).toFixed(2)}%`
          : ''
      const imageTitle = `${title} · ${deviceLabel}`

      lines.push(
        `### ${escapeHtml(title)}`,
        `端末: ${deviceLabel}${changedRatio}`,
        '',
        '| Base | Head |',
        '| --- | --- |',
      )
      lines.push(
        `| ${createImageCell(change.baseImage, `${imageTitle} base`)} | ${createImageCell(change.headImage, `${imageTitle} head`)} |`,
        '',
      )
    }
  }

  return `${lines.join('\n')}\n`
}

/** 比較レポートとbase/head画像から、同じジョブ内で投稿するPRコメントを準備する */
export async function preparePrRegressionComment(): Promise<void> {
  // 比較レポートがない場合も、失敗したことを示すコメント用データを作る
  const report = await readJson(path.join(reportRoot, 'report.json'))

  // ローカル再実行で前回分の画像が混ざらないよう、生成先だけを作り直す
  await rm(imagesRoot, { recursive: true, force: true })
  await mkdir(imagesRoot, { recursive: true })

  // レポート内の画像パスは固定形式に照合し、base/headの別checkoutから安全に複製する
  const commentVisualChanges: VisualChange[] = []
  const reportChanges = isRecord(report) && Array.isArray(report.visualChanges) ? report.visualChanges : []
  const parsedChanges = reportChanges.flatMap((rawChange) => {
    const change = parseVisualChange(rawChange)
    return change ? [change] : []
  })
  const limitedChanges = parsedChanges.slice(0, maxVisualChangesInComment)

  for (const change of limitedChanges) {
    const imageDirectory = path.join(imagesRoot, change.scenarioId, change.device)
    await mkdir(imageDirectory, { recursive: true })
    const expectedPath = `visual/${change.device}/${change.scenarioId}.png`
    const baseImage = await copyScreenshot(
      path.join(checkoutRoots.base, 'tmp/regression-results/base'),
      change.baseScreenshot,
      expectedPath,
      path.join(imageDirectory, 'base.png'),
    )
    const headImage = await copyScreenshot(
      path.join(checkoutRoots.head, 'tmp/regression-results/head'),
      change.headScreenshot,
      expectedPath,
      path.join(imageDirectory, 'head.png'),
    )

    commentVisualChanges.push({
      scenarioId: change.scenarioId,
      ...(change.description ? { description: change.description } : {}),
      device: change.device,
      ...(change.changedRatio !== undefined ? { changedRatio: change.changedRatio } : {}),
      baseImage,
      headImage,
    })
  }

  const validation =
    report === null
      ? ''
      : isRecord(report) && isRecord(report.validation) && typeof report.validation.head === 'string'
        ? report.validation.head
        : 'unknown'
  const summary: CommentSummary = {
    reportAvailable: report !== null,
    baselineAvailable: isRecord(report) && report.baselineAvailable === true,
    validation,
    e2e: isRecord(report) ? parseTestSummary(report.e2e) : null,
    visualChanges: commentVisualChanges,
    totalVisualChangeCount: parsedChanges.length,
    omittedVisualChangeCount: Math.max(0, parsedChanges.length - commentVisualChanges.length),
  }

  // サマリーと画面差分を一つのコメント本文にまとめる
  await writeFile(path.join(outputRoot, 'comment.md'), createCommentBody(summary))
}

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
const commentWithoutImagesPath = path.join(outputRoot, 'comment-no-images.md')
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
  skipped: number
  total: number
}

interface SupportCardDataChanges {
  available: boolean
  added: string[]
  removed: string[]
  updated: string[]
}

interface PIdolReference {
  id: string
  idolId: string
  name: string
}

interface PIdolDataChanges {
  available: boolean
  added: PIdolReference[]
  removed: PIdolReference[]
  updated: PIdolReference[]
}

interface IdolSelectorChanges {
  available: boolean
  added: string[]
  removed: string[]
}

interface CommentSummary {
  reportAvailable: boolean
  baselineAvailable: boolean
  validation: string
  e2e: TestSummary | null
  supportCardDataChanges: SupportCardDataChanges | null
  pIdolDataChanges: PIdolDataChanges | null
  idolSelectorChanges: IdolSelectorChanges | null
  visualChanges: VisualChange[]
  totalVisualChangeCount: number
  totalVisualComparisonCount: number
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

/** 比較JSONからサポートカードデータの追加・削除・更新を取り出す */
function parseSupportCardDataChanges(value: unknown): SupportCardDataChanges | null {
  if (
    !isRecord(value) ||
    typeof value.available !== 'boolean' ||
    !Array.isArray(value.added) ||
    !value.added.every((name: unknown) => typeof name === 'string') ||
    !Array.isArray(value.removed) ||
    !value.removed.every((name: unknown) => typeof name === 'string') ||
    !Array.isArray(value.updated) ||
    !value.updated.every((name: unknown) => typeof name === 'string')
  ) {
    return null
  }

  return {
    available: value.available,
    added: value.added.filter((name: unknown): name is string => typeof name === 'string'),
    removed: value.removed.filter((name: unknown): name is string => typeof name === 'string'),
    updated: value.updated.filter((name: unknown): name is string => typeof name === 'string'),
  }
}

/** 比較JSONからPアイドルの追加・削除・更新を取り出す */
function parsePIdolDataChanges(value: unknown): PIdolDataChanges | null {
  if (!isRecord(value) || typeof value.available !== 'boolean') return null
  const parseReferences = (entries: unknown): PIdolReference[] | null => {
    if (
      !Array.isArray(entries) ||
      !entries.every(
        (entry: unknown) =>
          isRecord(entry) &&
          typeof entry.id === 'string' &&
          typeof entry.idolId === 'string' &&
          typeof entry.name === 'string',
      )
    ) {
      return null
    }
    return entries.map((entry: unknown) => ({
      id: (entry as Record<string, string>).id,
      idolId: (entry as Record<string, string>).idolId,
      name: (entry as Record<string, string>).name,
    }))
  }

  const added = parseReferences(value.added)
  const removed = parseReferences(value.removed)
  const updated = parseReferences(value.updated)
  if (!added || !removed || !updated) return null
  return { available: value.available, added, removed, updated }
}

/** 比較JSONからアイドル選択対象の追加・削除を取り出す */
function parseIdolSelectorChanges(value: unknown): IdolSelectorChanges | null {
  if (
    !isRecord(value) ||
    typeof value.available !== 'boolean' ||
    !Array.isArray(value.added) ||
    !value.added.every((idolId: unknown) => typeof idolId === 'string') ||
    !Array.isArray(value.removed) ||
    !value.removed.every((idolId: unknown) => typeof idolId === 'string')
  ) {
    return null
  }

  return {
    available: value.available,
    added: value.added.filter((idolId: unknown): idolId is string => typeof idolId === 'string'),
    removed: value.removed.filter((idolId: unknown): idolId is string => typeof idolId === 'string'),
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

function createImageCell(imagePath: string | null, label: string, includeImageAttachments: boolean): string {
  if (!includeImageAttachments) return '画像を添付できませんでした'
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
    typeof value.skipped !== 'number' ||
    !Number.isFinite(value.skipped) ||
    typeof value.total !== 'number' ||
    !Number.isFinite(value.total) ||
    value.skipped > value.total
  ) {
    return null
  }

  return { passed: value.passed, skipped: value.skipped, total: value.total }
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

function createCommentBody(summary: CommentSummary, includeImageAttachments: boolean): string {
  const lines = [summaryMarker, '## 回帰テスト結果', '', `実行: ${getRunLabel()}`, '']
  const runUrl = getRunUrl()

  if (!summary.reportAvailable) {
    lines.push('❌ 回帰レポートを作成できませんでした。', '')
  } else if (!summary.baselineAvailable) {
    lines.push('⚠️ ベースブランチに基準画像がないため、画面比較は行われていません。', '')
  } else if (summary.totalVisualComparisonCount === 0) {
    lines.push('⚠️ 比較できる基準画像がありません。', '')
  } else if (summary.totalVisualChangeCount === 0) {
    lines.push('✅ 画面差分はありません。', '')
  } else {
    lines.push(`❌ 画面差分あり: ${summary.totalVisualChangeCount} 件`, '')

    if (summary.omittedVisualChangeCount > 0) {
      lines.push(
        `画像添付の上限に合わせて${summary.visualChanges.length}件を掲載し、残り${summary.omittedVisualChangeCount}件を省略しました。`,
        '',
      )
    }
  }

  const cardDataChanges = summary.supportCardDataChanges
  if (cardDataChanges?.available) {
    const changedCardCount =
      cardDataChanges.added.length + cardDataChanges.removed.length + cardDataChanges.updated.length
    if (changedCardCount > 0) {
      lines.push(
        `サポカデータ: 追加 ${cardDataChanges.added.length}件・削除 ${cardDataChanges.removed.length}件・更新 ${cardDataChanges.updated.length}件`,
      )
      for (const name of cardDataChanges.added) lines.push(`- 追加: ${escapeHtml(name)}`)
      for (const name of cardDataChanges.removed) lines.push(`- 削除: ${escapeHtml(name)}`)
      for (const name of cardDataChanges.updated) lines.push(`- 更新: ${escapeHtml(name)}`)
      lines.push('')
    }
  }

  const pIdolDataChanges = summary.pIdolDataChanges
  if (pIdolDataChanges?.available) {
    const changedPIdolCount =
      pIdolDataChanges.added.length + pIdolDataChanges.removed.length + pIdolDataChanges.updated.length
    if (changedPIdolCount > 0) {
      lines.push(
        `Pアイドルアチーブ: 追加 ${pIdolDataChanges.added.length}件・削除 ${pIdolDataChanges.removed.length}件・更新 ${pIdolDataChanges.updated.length}件`,
      )
      for (const pIdol of pIdolDataChanges.added) {
        lines.push(`- 追加: ${escapeHtml(pIdol.idolId)} / ${escapeHtml(pIdol.name)}`)
      }
      for (const pIdol of pIdolDataChanges.removed) {
        lines.push(`- 削除: ${escapeHtml(pIdol.idolId)} / ${escapeHtml(pIdol.name)}`)
      }
      for (const pIdol of pIdolDataChanges.updated) {
        lines.push(`- 更新: ${escapeHtml(pIdol.idolId)} / ${escapeHtml(pIdol.name)}`)
      }
      lines.push('')
    }
  }

  const idolSelectorChanges = summary.idolSelectorChanges
  if (idolSelectorChanges?.available) {
    const changedIdolCount = idolSelectorChanges.added.length + idolSelectorChanges.removed.length
    if (changedIdolCount > 0) {
      lines.push(
        `アイドル選択: 追加 ${idolSelectorChanges.added.length}件・削除 ${idolSelectorChanges.removed.length}件`,
      )
      for (const idolId of idolSelectorChanges.added) lines.push(`- 追加: ${escapeHtml(idolId)}`)
      for (const idolId of idolSelectorChanges.removed) lines.push(`- 削除: ${escapeHtml(idolId)}`)
      lines.push('')
    }
  }

  if (summary.e2e) {
    const executed = summary.e2e.total - summary.e2e.skipped
    const skipped = summary.e2e.skipped > 0 ? ` · ${summary.e2e.skipped} 件スキップ` : ''
    lines.push(`E2E: ${summary.e2e.passed}/${executed} 件成功${skipped} · 検証 ${escapeHtml(summary.validation)}`, '')
  } else if (summary.validation) {
    lines.push(`検証: ${escapeHtml(summary.validation)}`, '')
  }
  if (runUrl) lines.push(`[Actionsの実行結果](${runUrl})`, '')

  if (!includeImageAttachments && summary.totalVisualChangeCount > 0) {
    lines.push('比較画像は添付されていません。Actions の設定を確認してください。', '')
  }

  const visualStatus =
    !summary.reportAvailable || !summary.baselineAvailable || summary.totalVisualComparisonCount === 0
      ? '⚠️ 未比較'
      : summary.totalVisualChangeCount === 0
        ? '✅ なし'
        : '❌ あり'
  lines.push('<details>', `<summary>画面差分 ${visualStatus}</summary>`, '', '## 画面差分', '')
  if (!summary.reportAvailable || !summary.baselineAvailable) {
    lines.push('比較画像はありません。', '')
  } else if (summary.totalVisualComparisonCount === 0) {
    lines.push('比較できる基準画像はありません。', '')
  } else if (summary.totalVisualChangeCount === 0) {
    lines.push('✅ 画面差分はありません。', '')
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
        `### ❌ ${escapeHtml(title)}`,
        `端末: ${deviceLabel}${changedRatio}`,
        '',
        '| Base | Head |',
        '| --- | --- |',
      )
      lines.push(
        `| ${createImageCell(change.baseImage, `${imageTitle} base`, includeImageAttachments)} | ${createImageCell(change.headImage, `${imageTitle} head`, includeImageAttachments)} |`,
        '',
      )
    }
  }

  lines.push('</details>', '')
  return `${lines.join('\n')}\n`
}

/** 比較レポートとbase/head画像から、PRコメント用サマリーを保存する */
export async function writeRegressionSummary(): Promise<void> {
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
  const visualComparisonCount =
    isRecord(report) && isRecord(report.visualComparisonCount)
      ? Object.values(report.visualComparisonCount).reduce<number>(
          (total, count) => total + (typeof count === 'number' && Number.isFinite(count) ? count : 0),
          0,
        )
      : 0
  const summary: CommentSummary = {
    reportAvailable: report !== null,
    baselineAvailable: isRecord(report) && report.baselineAvailable === true,
    validation,
    e2e: isRecord(report) ? parseTestSummary(report.e2e) : null,
    supportCardDataChanges: isRecord(report) ? parseSupportCardDataChanges(report.supportCardDataChanges) : null,
    pIdolDataChanges: isRecord(report) ? parsePIdolDataChanges(report.pIdolDataChanges) : null,
    idolSelectorChanges: isRecord(report) ? parseIdolSelectorChanges(report.idolSelectorChanges) : null,
    visualChanges: commentVisualChanges,
    totalVisualChangeCount: parsedChanges.length,
    totalVisualComparisonCount: visualComparisonCount,
    omittedVisualChangeCount: Math.max(0, parsedChanges.length - commentVisualChanges.length),
  }

  // GITHUB_TOKENで画像を添付できない場合も、リンク切れのないコメント本文を用意する
  await writeFile(path.join(outputRoot, 'comment.md'), createCommentBody(summary, true))
  await writeFile(commentWithoutImagesPath, createCommentBody(summary, false))
}

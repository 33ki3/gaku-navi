/** PRのテキストコメントを固有マーカーで作成・更新する */
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isRecord } from './regressionShared.js'

interface IssueComment {
  /** Existing commentをPATCHするURLに含めるGitHub側のcomment ID */
  id: number
  /** マーカーを含むコメント本文 */
  body: string
  /** 同じマーカーのコメントが複数ある場合に新旧を判定する作成日時 */
  created_at: string
}

/** GitHub REST API呼び出しに必要なリポジトリ・認証・PR情報 */
interface GitHubApiConfig {
  /** GitHub.comまたはGitHub EnterpriseのREST API root */
  apiUrl: string
  /** issue commentの取得・作成・更新に使うtoken */
  token: string
  /** `owner/repository`形式の対象リポジトリ */
  repository: string
  /** issue commentを作成・更新するPR番号 */
  pullRequestNumber: number
}

/** GitHub APIの未知のJSON値がコメント取得に必要な形を満たすか判定する */
function isIssueComment(value: unknown): value is IssueComment {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.body === 'string' &&
    typeof value.created_at === 'string'
  )
}

/**
 * 同じマーカーのコメントが複数ある場合は、最も新しいものを選ぶ
 *
 * @param comments GitHubから取得したissue comments
 * @param marker コメント本文に含める一意なHTML comment marker
 * @returns 最新のmarker付きコメント。該当がなければundefined
 */
export function findMarkedComment(comments: readonly IssueComment[], marker: string): IssueComment | undefined {
  return comments
    .filter((comment) => comment.body.includes(marker))
    .sort((left, right) => right.created_at.localeCompare(left.created_at))[0]
}

/**
 * Actions環境変数を検証してGitHub API設定を作る。tokenの値はエラーやログに含めない
 *
 * @returns API root、認証token、repository、PR番号の検証済み設定
 * @throws 必須環境変数が欠ける、またはPR番号が正の整数でない場合
 */
function readApiConfig(): GitHubApiConfig {
  const token = process.env.GH_TOKEN
  const repository = process.env.GITHUB_REPOSITORY
  const pullRequestNumber = Number(process.env.PR_NUMBER)
  if (!token || !repository || !Number.isInteger(pullRequestNumber) || pullRequestNumber < 1) {
    throw new Error('GH_TOKEN, GITHUB_REPOSITORY, and PR_NUMBER are required')
  }

  return {
    apiUrl: (process.env.GITHUB_API_URL ?? 'https://api.github.com').replace(/\/+$/, ''),
    token,
    repository,
    pullRequestNumber,
  }
}

/**
 * `owner/repository`をREST APIのrepository pathへ変換し、各要素をURL encodeする
 *
 * @param repository GitHubのowner/repository名
 * @returns `/repos/{owner}/{repository}`形式のAPI path
 * @throws ownerまたはrepository名が空の場合
 */
function repositoryPath(repository: string): string {
  const [owner, repositoryName] = repository.split('/')
  if (!owner || !repositoryName) throw new Error('GITHUB_REPOSITORY must use the owner/repository format')
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repositoryName)}`
}

/**
 * GitHub REST APIへJSONリクエストを送り、成功本文を返す。
 * APIエラーはstatusと本文の先頭だけを例外へ含め、成功responseの形は呼び出し側で検証する。
 *
 * @param config 対象リポジトリと認証情報
 * @param endpoint API rootからの相対path
 * @param method HTTP method。読み取りはGET、既存コメント更新はPATCH、新規作成はPOST
 * @param body JSON request body。GETでは省略する
 * @returns response body。204など空本文の場合はundefined
 * @throws APIが2xx以外を返す、またはresponse本文が不正なJSONの場合
 */
async function requestGitHub(
  config: GitHubApiConfig,
  endpoint: string,
  method = 'GET',
  body?: unknown,
): Promise<unknown> {
  const response = await fetch(`${config.apiUrl}${endpoint}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const responseText = await response.text()
  if (!response.ok) {
    // GitHubの長いエラー本文をログやPR commentへ丸ごと出さないよう、例外へ含める量を制限する
    throw new Error(`GitHub API ${method} ${endpoint} failed with ${response.status}: ${responseText.slice(0, 500)}`)
  }
  // 利用するendpointごとにresponse形が異なるため、呼び出し側でunknownとして検証する
  return responseText ? JSON.parse(responseText) : undefined
}

/**
 * PR issue commentsを100件ずつ全ページ取得し、必要な型を満たす項目だけ返す
 *
 * @param config 対象PRとGitHub認証情報
 * @returns id、body、created_atを持つissue comments
 * @throws APIが不正な一覧を返す、または100ページ分取得しても最終ページに到達しない場合
 */
async function listIssueComments(config: GitHubApiConfig): Promise<IssueComment[]> {
  const comments: IssueComment[] = []
  const issuePath = repositoryPath(config.repository)
  for (let page = 1; page <= 100; page += 1) {
    // PRのコメントもissue comments endpointから取得する。Per-pageを最大値にしてAPI呼び出し数を抑える
    const pageComments = await requestGitHub(
      config,
      `${issuePath}/issues/${config.pullRequestNumber}/comments?per_page=100&page=${page}`,
    )
    if (!Array.isArray(pageComments)) throw new Error('GitHub returned an invalid issue-comment list')
    comments.push(...pageComments.filter(isIssueComment))
    // 返却件数が100未満なら最終ページ。固定上限を超えるPRでは、曖昧な更新をせず失敗させる
    if (pageComments.length < 100) return comments
  }
  throw new Error('PR has more than 10,000 comments; marker lookup stopped')
}

/**
 * マーカー付き本文を作成または更新し、並行runでもコメントが増殖しないよう既存コメントを優先する
 *
 * @throws 必須設定・本文・GitHub APIのいずれかが不正な場合
 */
async function upsertComment(): Promise<void> {
  const config = readApiConfig()
  const marker = process.env.PR_COMMENT_MARKER
  const bodyFile = process.env.PR_COMMENT_BODY_FILE
  if (!marker || !bodyFile) throw new Error('PR_COMMENT_MARKER and PR_COMMENT_BODY_FILE are required')

  const body = await readFile(path.resolve(bodyFile), 'utf8')
  if (!body.includes(marker)) throw new Error(`Comment body does not contain its marker: ${marker}`)
  const outputFile = process.env.PR_COMMENT_OUTPUT_FILE
  if (outputFile) {
    // APIへ送る最終本文をCI workspaceにも保存し、Step Summaryや失敗時の確認に使えるようにする
    const resolvedOutputFile = path.resolve(outputFile)
    await mkdir(path.dirname(resolvedOutputFile), { recursive: true })
    await writeFile(resolvedOutputFile, body)
  }

  const comments = await listIssueComments(config)
  const issuePath = repositoryPath(config.repository)
  const existingComment = findMarkedComment(comments, marker)
  // 既存のmarkerコメントがあればPATCHで1件を更新し、なければPRのissue commentsにPOSTする
  const endpoint = existingComment
    ? `${issuePath}/issues/comments/${existingComment.id}`
    : `${issuePath}/issues/${config.pullRequestNumber}/comments`
  await requestGitHub(config, endpoint, existingComment ? 'PATCH' : 'POST', { body })

  console.log(`${existingComment ? 'Updated' : 'Created'} PR comment for marker ${marker}`)
}

// import時にはGitHubへアクセスせず、nodeでこのファイルを直接実行した場合だけコメントを同期する
const scriptPath = fileURLToPath(import.meta.url)
const invokedScriptPath = process.argv[1] ? await realpath(process.argv[1]) : undefined
if (invokedScriptPath === scriptPath) await upsertComment()

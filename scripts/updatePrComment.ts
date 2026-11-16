/** PRコメントを固有マーカーで更新し、画像を同じコメントへ添付する */
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isRecord } from './regressionShared.js'

interface IssueComment {
  /** Existing commentをPATCHするURLに含めるGitHub側のcomment ID */
  id: number
  /** マーカーと添付画像を含むコメント本文 */
  body: string
  /** 同じマーカーのコメントが複数ある場合に新旧を判定する作成日時 */
  created_at: string
}

/** GitHub REST API呼び出しに必要なリポジトリ・認証・PR情報 */
interface GitHubApiConfig {
  /** GitHub.comまたはGitHub EnterpriseのREST API root */
  apiUrl: string
  /** issue comment更新と画像アップロードに使うtoken */
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
 * 本文内のローカル画像リンクを、アップロード後のGitHub asset URLへ差し替える
 *
 * @param body PR commentのMarkdown本文
 * @param attachmentPath 本文内のローカル画像path
 * @param assetUrl GitHub user attachment uploadが返したURL
 * @returns ローカル参照をasset URLへ置き換えた本文
 */
export function replaceAttachmentReference(body: string, attachmentPath: string, assetUrl: string): string {
  const localReference = `](${attachmentPath})`
  if (!body.includes(localReference))
    throw new Error(`Comment body does not reference the attachment: ${attachmentPath}`)
  return body.replaceAll(localReference, `](${assetUrl})`)
}

/** 画像アップロードに失敗した添付を、壊れたローカルリンクを残さず代替テキストに置き換える */
function replaceUnavailableAttachmentReference(body: string, attachmentPath: string): string {
  const localReference = `](${attachmentPath})`
  const referenceStart = body.indexOf(localReference)
  if (referenceStart < 0) throw new Error(`Comment body does not reference the attachment: ${attachmentPath}`)
  const imageStart = body.lastIndexOf('![', referenceStart)
  if (imageStart < 0) throw new Error(`Comment body does not contain an image for the attachment: ${attachmentPath}`)
  const altText = body.slice(imageStart + 2, referenceStart)
  const referenceEnd = referenceStart + localReference.length
  return `${body.slice(0, imageStart)}${altText}（画像を添付できませんでした）${body.slice(referenceEnd)}`
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
 * 拡張子からGitHub attachment endpointへ送るMIME typeを決める
 *
 * @param filename 添付画像のpath
 * @returns GitHubへ送信するContent-Type
 * @throws 対応していない拡張子の場合
 */
function imageContentType(filename: string): string {
  const contentTypeByExtension: Record<string, string> = {
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  }
  const contentType = contentTypeByExtension[path.extname(filename).toLowerCase()]
  if (!contentType) throw new Error(`Unsupported image attachment type: ${filename}`)
  return contentType
}

/**
 * GitHub.com / GHE用のユーザー添付アップロードURLを作る
 *
 * @returns 画像添付用のHTTPS URL
 * @throws GitHub.com / GHE以外のserver URLの場合
 */
function userAssetUploadUrl(): URL {
  const serverUrl = process.env.GITHUB_SERVER_URL ?? 'https://github.com'
  const hostname = new URL(serverUrl).hostname
  if (hostname !== 'github.com' && !hostname.endsWith('.ghe.com')) {
    throw new Error(`GitHub image attachments are not supported on ${hostname}`)
  }
  const uploadHostname = hostname === 'github.com' ? 'uploads.github.com' : `uploads.${hostname}`
  return new URL('/user-attachments/assets', `https://${uploadHostname}`)
}

/**
 * 画像をGitHub user attachmentへbinary uploadし、返された公開URLを検証して返す
 *
 * @param config 対象repositoryと認証情報
 * @param repositoryId GitHub repository APIが返す数値ID
 * @param filename workspace内の画像path
 * @param contentType 拡張子から検証済みのMIME type
 * @returns Markdownに使用できるasset URL
 * @throws 画像が10 MiBを超える、uploadに失敗する、responseにURLがない場合
 */
async function uploadImage(
  config: GitHubApiConfig,
  repositoryId: number,
  filename: string,
  contentType: string,
): Promise<string> {
  const contents = await readFile(filename)
  // 大きすぎる添付を送信する前に止め、APIの上限超過応答をそのまま受けないようにする
  if (contents.byteLength > 10 * 1024 * 1024) throw new Error(`Image attachment exceeds 10 MiB: ${filename}`)

  const uploadUrl = userAssetUploadUrl()
  uploadUrl.searchParams.set('name', path.basename(filename))
  uploadUrl.searchParams.set('content_type', contentType)
  uploadUrl.searchParams.set('repository_id', String(repositoryId))

  // 添付upload endpointはbinary bodyを受け取るため、JSON request helperを通さずContent-Typeを直接指定する
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/octet-stream',
    },
    body: Uint8Array.from(contents),
  })
  const responseText = await response.text()
  if (!response.ok) {
    // upload endpointはJSON APIと別hostなので、エラーには本文の先頭だけを残す
    throw new Error(`GitHub image upload failed with ${response.status}: ${responseText.slice(0, 500)}`)
  }

  const uploadedAsset: unknown = JSON.parse(responseText)
  if (!isRecord(uploadedAsset) || typeof uploadedAsset.url !== 'string') {
    throw new Error('GitHub returned an invalid image upload URL')
  }
  return uploadedAsset.url
}

/**
 * 添付一覧を検証し、画像を順番にuploadして本文のローカル参照をasset URLへ置き換える
 *
 * @param config 対象repositoryと認証情報
 * @param body PR commentのMarkdown本文
 * @param attachmentsFile 1行ごとにworkspace相対pathを記載した添付一覧
 * @returns upload後URLまたは添付失敗時の代替テキストを含む本文
 * @throws 添付数・path・本文参照が不正、またはrepository情報を検証できない場合
 */
async function addImageAttachments(config: GitHubApiConfig, body: string, attachmentsFile: string): Promise<string> {
  // Workflowが画像一覧stepで作る1行1pathのファイルを読み、空行は無視する
  const attachments = (await readFile(path.resolve(attachmentsFile), 'utf8'))
    .split(/\r?\n/)
    .map((filename) => filename.trim())
    .filter(Boolean)
  if (attachments.length === 0) return body
  // GitHubのPR comment 1件に添付できる枚数を超える場合、部分更新せず送信前に止める
  if (attachments.length > 50) throw new Error('A PR comment can include at most 50 image attachments')

  const repository = await requestGitHub(config, repositoryPath(config.repository))
  if (!isRecord(repository) || typeof repository.id !== 'number' || !Number.isInteger(repository.id)) {
    throw new Error('GitHub returned an invalid repository ID for image upload')
  }

  const workspaceRoot = await realpath(process.cwd())
  const localAttachments = await Promise.all(
    attachments.map(async (attachment) => {
      const requestedPath = path.resolve(workspaceRoot, attachment)
      const requestedRelativePath = path.relative(workspaceRoot, requestedPath)
      if (
        requestedRelativePath === '..' ||
        requestedRelativePath.startsWith(`..${path.sep}`) ||
        path.isAbsolute(requestedRelativePath)
      ) {
        throw new Error(`Image attachment is outside the workflow workspace: ${attachment}`)
      }
      // symlinkを解決した実pathも確認し、workspace外のファイルを添付として読まない
      const localPath = await realpath(requestedPath)
      const localRelativePath = path.relative(workspaceRoot, localPath)
      if (
        localRelativePath === '..' ||
        localRelativePath.startsWith(`..${path.sep}`) ||
        path.isAbsolute(localRelativePath)
      ) {
        throw new Error(`Image attachment is outside the workflow workspace: ${attachment}`)
      }
      const contentType = imageContentType(localPath)
      const markdownPath = requestedRelativePath.split(path.sep).join('/')
      // 本文に参照されない画像はuploadせず、pathとMarkdown参照の組み合わせを事前に確認する
      if (!body.includes(`](${markdownPath})`)) {
        throw new Error(`Comment body does not reference the attachment: ${markdownPath}`)
      }
      return { localPath, markdownPath, contentType }
    }),
  )

  let commentBody = body
  // 順番にuploadし、各成功直後に本文を更新する。途中失敗時も成功分のURLを保持できる
  for (const [index, attachment] of localAttachments.entries()) {
    try {
      const assetUrl = await uploadImage(config, repository.id, attachment.localPath, attachment.contentType)
      commentBody = replaceAttachmentReference(commentBody, attachment.markdownPath, assetUrl)
    } catch (error) {
      console.warn(`Image upload stopped after ${index} successful files: ${String(error)}`)
      // 未upload分のローカルpathはPRから参照できないため、画像alt textと失敗表示に置換する
      for (const unavailable of localAttachments.slice(index)) {
        commentBody = replaceUnavailableAttachmentReference(commentBody, unavailable.markdownPath)
      }
      return `${commentBody}\n\n⚠️ 画像のアップロードに失敗しました。添付できた画像とテキストで結果を記載します。\n`
    }
  }
  return commentBody
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

  const rawBody = await readFile(path.resolve(bodyFile), 'utf8')
  if (!rawBody.includes(marker)) throw new Error(`Comment body does not contain its marker: ${marker}`)
  const body = process.env.PR_COMMENT_ATTACHMENTS_FILE
    ? await addImageAttachments(config, rawBody, process.env.PR_COMMENT_ATTACHMENTS_FILE)
    : rawBody
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

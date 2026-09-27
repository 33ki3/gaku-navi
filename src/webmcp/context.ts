/**
 * WebMCPツール間で共有する実行状態と補助処理
 *
 * 確認トークン・取り消し・表示同期など、ツール間で共有する実行補助をまとめる
 */
import type { ImportPreview as ApplicationImportPreview } from '../application/command/importCommand'
import * as constant from '../constant'
import type { ExportKey } from '../data/ui'
import type { DomainIssue } from '../types/application'
import { DomainIssueCode } from '../types/application'
import type { SupportCard } from '../types/card'
import { prepareImportText } from '../utils/exportImport'
import type { ScorePreset } from '../utils/presetHelpers'
import { isRecord } from '../utils/valueValidation'
import type { WebMcpErrorCodeType, WebMcpPendingOperationType, WebMcpRuntime, WebMcpToolExecuteOptions } from './types'
import { WebMcpErrorCode, WebMcpPendingOperation } from './types'

/** ツール実行時に返す入力エラーの形式 */
export interface WebMcpToolError {
  error: {
    /** WebMCPで定義したエラーコード */
    code: WebMcpErrorCodeType
    /** 利用者へ返す説明文 */
    message: string
  }
}

/** WebMCP操作の事前確認結果。成功側に失敗値、失敗側に準備値を持たせない */
export type WebMcpPreparation<TPrepared> =
  | { ok: true; prepared: TPrepared; error?: never }
  | { ok: false; prepared?: never; error: WebMcpToolError }

/** 取り消し対象の変更 */
export interface UndoOperation {
  /** 取り消す操作の説明 */
  description: string
  /** 操作前の状態へ戻す処理 */
  undo: () => boolean | void | Promise<boolean | void>
  /** 現在の状態が取り消し可能か判定する処理 */
  canUndo?: () => boolean
  /** 取り消し後に状態が戻ったか確認する処理 */
  isRestored?: () => boolean | Promise<boolean>
}

/** 確認トークンで保留している、削除やインポートなどの操作 */
export type PendingOperation =
  | {
      /** 保留している操作の種類 */
      kind: typeof WebMcpPendingOperation.DeleteUserSupportCard
      /** 確認に使うトークン */
      token: string
      /** 削除対象のカード名 */
      cardName: string
      /** 確認時点のカード内容 */
      card: SupportCard
      /** トークンの有効期限（Unix epochミリ秒） */
      expiresAt: number
    }
  | {
      /** 保留している操作の種類 */
      kind: typeof WebMcpPendingOperation.DeleteScorePreset
      /** 確認に使うトークン */
      token: string
      /** 削除対象のプリセット */
      preset: ScorePreset
      /** トークンの有効期限（Unix epochミリ秒） */
      expiresAt: number
    }
  | {
      /** 保留している操作の種類 */
      kind: typeof WebMcpPendingOperation.ImportUserData
      /** 確認に使うトークン */
      token: string
      /** 確認時点のインポート内容 */
      preview: ReturnType<typeof prepareImportText>
      /** 確認時点の保存処理の情報 */
      commandPreview?: ApplicationImportPreview
      /** インポート対象として選択した保存キー */
      selectedKeys: ExportKey[]
      /** トークンの有効期限（Unix epochミリ秒） */
      expiresAt: number
    }

/** ツール定義へ渡す共通の実行情報と補助処理 */
export interface WebMcpToolFactoryContext {
  /** 現在のアプリ状態と保存処理を返す関数 */
  getRuntime: () => WebMcpRuntime
  /** WebMCP共通のエラーを作る関数 */
  createToolError: (code: WebMcpErrorCodeType, message: string) => WebMcpToolError
  /** ツール実行の中断状態を判定する関数 */
  isExecutionAborted: (options: WebMcpToolExecuteOptions | undefined) => boolean
  /** 画面への反映が完了するまで待つ関数 */
  waitForStateCondition: (condition: () => boolean) => Promise<boolean>
  /** 確認待ちの操作を保持する一覧 */
  pendingOperations: Map<string, PendingOperation>
  /** 破壊的操作の確認トークンを発行する関数 */
  createPendingToken: (kind: WebMcpPendingOperationType) => string
  /** 取り消し対象の操作を登録する関数 */
  setUndoOperation: (operation: UndoOperation) => void
  /** 確認トークンから期限内の操作を取り出す関数 */
  takePendingOperation: <K extends WebMcpPendingOperationType>(
    token: string,
    kind: K,
  ) => Extract<PendingOperation, { kind: K }> | null
  /** 現在保持している取り消し対象を読む関数 */
  getUndoOperation: () => UndoOperation | null
  /** 取り消し対象を破棄する関数 */
  clearUndoOperation: () => void
}

/**
 * 確認トークンを作る
 *
 * トークンはデータそのものを持たず、ページ内でだけ有効にする
 *
 * @param kind - 保留する操作の種類
 * @returns 操作種類を含む確認トークン
 */
export function createConfirmationToken(kind: WebMcpPendingOperationType): string {
  // トークンにカードやJSON本体を含めず、確認用の短い印だけを外部へ返す
  const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${kind}_${randomPart}`
}

/**
 * インポート後の保存値が、取り消し対象の内容と一致するか確認する
 *
 * @param entries - 比較する保存キーとJSON文字列
 * @returns すべての保存値が一致する場合はtrue
 */
export function storageEntriesMatch(entries: ReadonlyArray<readonly [ExportKey, string]>): boolean {
  try {
    // インポート後に別の変更が入っていない場合だけ、保存前の値へ戻せるようにする
    return entries.every(([key, value]) => localStorage.getItem(key) === value)
  } catch {
    return false
  }
}

/**
 * ツールへ渡された値がオブジェクトか確認する
 *
 * @param value - 検証対象の値
 * @returns レコードならその値、そうでなければnull
 */
export function asInputRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

/**
 * 入力エラーを作る
 *
 * @param code - WebMCPで返すエラーコード
 * @param message - 利用者へ返す説明文
 * @returns WebMCPエラー
 */
export function createToolError(code: WebMcpErrorCodeType, message: string): WebMcpToolError {
  // すべての入力・保存・計算エラーを同じ形式で返し、呼び出し側がcodeで分岐できるようにする
  return { error: { code, message } }
}

/**
 * 保存処理の構造化エラーをWebMCPのエラー形式へ変換する
 *
 * @param result - 保存処理の失敗結果
 * @param message - 利用者へ返す説明文
 * @returns WebMCPエラー
 */
export function createCommandToolError(result: { ok: false; error: DomainIssue }, message: string): WebMcpToolError {
  const error: DomainIssue = result.error
  const code = error.code === DomainIssueCode.StaleRevision ? WebMcpErrorCode.Stale : error.code
  return createToolError(code, message)
}

/**
 * 中断情報が省略された実行環境でもツールを継続できるように判定する
 *
 * @param options - ツール実行オプション
 * @returns 中断済みならtrue
 */
export function isExecutionAborted(options: WebMcpToolExecuteOptions | undefined): boolean {
  // 中断情報を渡さない呼び出し元でも、例外を起こさず通常どおり実行できるようにする
  return options?.signal?.aborted ?? false
}

/**
 * 固定回数の待機ではなく、読み取り値が期待値になるまで状態を確認する
 *
 * @param condition - 状態反映を確認する関数
 * @returns 期限内に条件を満たした場合はtrue
 */
export async function waitForStateCondition(condition: () => boolean): Promise<boolean> {
  // すでに反映済みなら待機せず、すぐに値を返す
  if (condition()) return true
  const deadline = Date.now() + constant.STATE_SYNC_TIMEOUT_MS
  while (Date.now() < deadline) {
    // 画面の更新を待ち、固定時間の経過ではなく期待した値になるまで確認する
    await new Promise((resolve) => setTimeout(resolve, 10))
    if (condition()) return true
  }
  return condition()
}

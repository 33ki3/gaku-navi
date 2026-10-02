/**
 * WebMCPツールの組み立てとブラウザ登録
 *
 * ツール集合の生成と登録のライフサイクルをここで管理する
 */
import * as constant from '../constant'
import i18n from '../i18n'
import type { PendingOperation, UndoOperation, WebMcpToolFactoryContext } from './context'
import { createConfirmationToken, createToolError, isExecutionAborted, waitForStateCondition } from './context'
import { createWebMcpRegistrationTool } from './manifest'
import { createCapabilityTools } from './tools/capabilityTools'
import { createCardTools } from './tools/cardTools'
import { createComparisonTools } from './tools/comparisonTools'
import { createDataTools } from './tools/dataTools'
import { createPresetTools } from './tools/presetTools'
import { createSettingsTools } from './tools/settingsTools'
import { createUiTools } from './tools/uiTools'
import { createUndoTools } from './tools/undoTools'
import { createUserSupportTools } from './tools/userSupportTools'
import type { WebMcpPendingOperationType, WebMcpRuntime, WebMcpToolDefinition } from './types'

/**
 * 保留中の操作が指定した種類か判定する
 *
 * @param operation - 判定対象の保留中操作
 * @param kind - 確認する操作種別
 * @returns 指定した種別の場合はtrue
 */
function isPendingOperationKind<K extends WebMcpPendingOperationType>(
  operation: PendingOperation,
  kind: K,
): operation is Extract<PendingOperation, { kind: K }> {
  return operation.kind === kind
}

/**
 * 登録するすべてのページツールを作る
 *
 * @param getRuntime - 最新のアプリ状態と保存処理を取得する関数
 * @returns 登録対象のWebMCPツール定義
 */
export function createWebMcpTools(getRuntime: () => WebMcpRuntime): WebMcpToolDefinition[] {
  // 確認トークンと取り消し情報は、このページで登録したツールだけから使えるようにする
  const pendingOperations = new Map<string, PendingOperation>()
  let undoOperation: UndoOperation | null = null

  const context: WebMcpToolFactoryContext = {
    getRuntime,
    createToolError,
    isExecutionAborted,
    waitForStateCondition,
    pendingOperations,
    createPendingToken: (kind) => {
      const now = Date.now()
      // 同種プレビューは最新1件だけを有効にし、大きなインポート内容が期限内に蓄積しないようにする
      for (const [token, operation] of pendingOperations) {
        if (operation.expiresAt <= now || operation.kind === kind) pendingOperations.delete(token)
      }
      return createConfirmationToken(kind)
    },
    setUndoOperation: (operation) => {
      // 取り消し情報は直前の1件だけを保持し、新しい変更が行われたら古い操作を上書きする
      undoOperation = operation
    },
    takePendingOperation: <K extends WebMcpPendingOperationType>(token: string, kind: K) => {
      // トークンは確認に成功した時点で消費し、同じ削除・インポートを再実行できないようにする
      const operation = pendingOperations.get(token)
      if (!operation || !isPendingOperationKind(operation, kind)) return null
      pendingOperations.delete(token)
      if (operation.expiresAt <= Date.now()) return null
      return operation
    },
    getUndoOperation: () => undoOperation,
    clearUndoOperation: () => {
      undoOperation = null
    },
  }

  return [
    ...createCardTools(context),
    ...createCapabilityTools(context),
    ...createSettingsTools(context),
    ...createPresetTools(context),
    ...createComparisonTools(context),
    ...createUserSupportTools(context),
    ...createDataTools(context),
    ...createUiTools(context),
    ...createUndoTools(context),
  ]
}

/**
 * 対応ブラウザへページツールを登録する
 *
 * @param getRuntime - 最新のアプリ状態と保存処理を取得する関数
 * @param signal - この登録を無効にする中断通知
 * @returns 非同期の登録処理
 */
export async function registerWebMcpTools(getRuntime: () => WebMcpRuntime, signal: AbortSignal): Promise<void> {
  // SSRなどdocumentが存在しない実行環境では、登録処理自体を何もしない
  if (typeof document === 'undefined' || signal.aborted) return
  const modelContext = document.modelContext
  // 対応APIを持たないブラウザでも、アプリ本体の画面操作は継続できるようにする
  if (!modelContext) return

  // 一部だけ登録された状態を残さないよう、登録したツールをまとめて解除できるようにする
  const registrationController = new AbortController()
  const abortRegistration = () => registrationController.abort()
  signal.addEventListener(constant.ABORT_EVENT_NAME, abortRegistration, { once: true })
  const tools = createWebMcpTools(getRuntime)
  // 各ツールを独立して登録し、1件の失敗を記録したうえで全体を確認する
  const results = await Promise.allSettled(
    tools.map((tool) => {
      // 入力項目の型・制約は保ったまま、重複するschema説明を公開時だけ省く
      const registrationTool = createWebMcpRegistrationTool(tool)
      try {
        return Promise.resolve(
          modelContext.registerTool(registrationTool, { signal: registrationController.signal }),
        ).catch((error: unknown) => {
          if (!signal.aborted) {
            console.warn(i18n.t('webmcp.messages.registration_failed', { toolName: registrationTool.name }), error)
          }
          throw error
        })
      } catch (error) {
        if (!signal.aborted) {
          console.warn(i18n.t('webmcp.messages.registration_failed', { toolName: registrationTool.name }), error)
        }
        return Promise.reject(error)
      }
    }),
  )
  if (results.some((result) => result.status === constant.PROMISE_REJECTED_STATUS)) {
    // 1件でも失敗した場合は登録済みのツールをすべて解除し、
    // 次の読み込みで登録し直す
    registrationController.abort()
  }
}

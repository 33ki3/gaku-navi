/**
 * WebMCPツールの組み立てとブラウザ登録
 *
 * ツール集合の生成と登録のライフサイクルをここで管理する
 */
import type { PendingOperation, UndoOperation, WebMcpToolFactoryContext } from './context'
import { createConfirmationToken, createToolError, isExecutionAborted, waitForStateCondition } from './context'
import { registerPageTools } from './registration'
import { createAchievementTools } from './tools/achievementTools'
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
  // 確認トークンと取り消し情報は、この登録期間のツールだけから使えるようにする
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
    ...createAchievementTools(context),
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

/** アプリ全体のツール集合を、共通の登録処理へ渡す */
export async function registerWebMcpTools(getRuntime: () => WebMcpRuntime, signal: AbortSignal): Promise<void> {
  await registerPageTools(createWebMcpTools(getRuntime), signal)
}

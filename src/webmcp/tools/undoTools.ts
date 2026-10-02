/** 直前の変更を取り消すWebMCPツール */
import i18n from '../../i18n'
import type { WebMcpToolFactoryContext } from '../context'
import { updateAnnotations } from '../schemas'
import { WebMcpErrorCode, WebMcpSchemaField, type WebMcpToolDefinition, WebMcpToolName } from '../types'

/**
 * 直前の保存変更を取り消すツールを返す
 *
 * @param context - 取り消し対象と確認エラーを含む共通の操作情報
 * @returns 保存変更の取り消し用WebMCPツール定義
 */
export function createUndoTools(context: WebMcpToolFactoryContext): WebMcpToolDefinition[] {
  return [
    {
      name: WebMcpToolName.UndoLastChange,
      title: i18n.t('webmcp.tools.undo_last_change.title'),
      description: i18n.t('webmcp.tools.undo_last_change.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.Confirmation]: { const: true, description: i18n.t('webmcp.schema.undo_confirmation') },
        },
        required: [WebMcpSchemaField.Confirmation],
        additionalProperties: false,
      },
      annotations: updateAnnotations,
      execute: async (input) => {
        // 取り消し自体も保存内容を変えるため、明示確認なしでは実行しない
        if (input.confirmation !== true) {
          return context.createToolError(
            WebMcpErrorCode.ConfirmationRequired,
            i18n.t('webmcp.messages.undo_confirmation_required'),
          )
        }
        const operation = context.getUndoOperation()
        if (operation === null)
          return context.createToolError(WebMcpErrorCode.NotFound, i18n.t('webmcp.messages.undo_not_found'))
        // 変更後に別の操作が入っていた場合は、別データを上書きする取り消しを実行しない
        if (operation.canUndo && !operation.canUndo()) {
          context.clearUndoOperation()
          return context.createToolError(WebMcpErrorCode.StateChanged, i18n.t('webmcp.messages.undo_state_changed'))
        }
        try {
          const restored = await operation.undo()
          if (restored === false || (operation.isRestored && !(await operation.isRestored()))) {
            return context.createToolError(WebMcpErrorCode.RollbackFailed, i18n.t('webmcp.messages.undo_failed'))
          }
        } catch {
          return context.createToolError(WebMcpErrorCode.RollbackFailed, i18n.t('webmcp.messages.undo_failed'))
        }
        // 復元を確認できた操作だけを消費し、失敗時は再試行できるよう保持する
        context.clearUndoOperation()
        return { applied: true, undone: operation.description }
      },
    },
  ]
}

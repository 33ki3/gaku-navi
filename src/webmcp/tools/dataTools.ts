/** ユーザーデータの書き出しとインポートを行うWebMCPツール */
import i18n from '../../i18n'
import { StorageTransactionOutcome } from '../../types/storage'
import { exportUserData, getUserDataJson, prepareImportText } from '../../utils/exportImport'
import { createStorageSnapshot, restoreStorageSnapshot } from '../../utils/storageTransaction'
import * as webMcpConstant from '../constants'
import type { WebMcpToolFactoryContext } from '../context'
import { createCommandToolError, storageEntriesMatch } from '../context'
import { parseExportKeys } from '../input'
import { readOnlyAnnotations, selectedExportKeysSchema, updateAnnotations } from '../schemas'
import type { WebMcpToolExecuteOptions } from '../types'
import {
  WebMcpErrorCode,
  WebMcpPendingOperation,
  WebMcpSchemaField,
  type WebMcpToolDefinition,
  WebMcpToolName,
} from '../types'
import { uiAnnotations } from '../ui'

/** 確認済みインポートを保存し、取り消し情報を登録する */
async function executeApplyUserDataImport(
  context: WebMcpToolFactoryContext,
  input: Record<string, unknown>,
  options?: WebMcpToolExecuteOptions,
) {
  // インポートはプレビュー済みの内容に対する明示確認だけを受け付ける
  if (context.isExecutionAborted(options))
    return context.createToolError(WebMcpErrorCode.Aborted, i18n.t('webmcp.messages.import_aborted'))
  if (typeof input.previewToken !== 'string' || input.confirmation !== true) {
    return context.createToolError(
      WebMcpErrorCode.ConfirmationRequired,
      i18n.t('webmcp.messages.import_confirmation_required'),
    )
  }
  const pending = context.takePendingOperation(input.previewToken, WebMcpPendingOperation.ImportUserData)
  if (pending === null || pending.preview.entries === null) {
    return context.createToolError(
      WebMcpErrorCode.InvalidConfirmation,
      i18n.t('webmcp.messages.import_preview_invalid'),
    )
  }

  const entries = pending.preview.entries
  const runtime = context.getRuntime()
  // 上書き対象の元値を退避し、インポート後に他の変更がなければ取り消し可能にする
  const snapshot = createStorageSnapshot(entries)
  if (snapshot === null) {
    return context.createToolError(WebMcpErrorCode.StorageError, i18n.t('webmcp.messages.storage_snapshot_failed'))
  }
  const importCommand = runtime.applicationCommands?.importData
  if (importCommand === undefined || pending.commandPreview === undefined) {
    return context.createToolError(WebMcpErrorCode.Unsupported, i18n.t('webmcp.messages.import_command_failed'))
  }
  const beforeImportState = importCommand.getSnapshot()
  const commandResult = await importCommand.apply(pending.commandPreview, { signal: options?.signal })
  if (!commandResult.ok) {
    return createCommandToolError(commandResult, i18n.t('webmcp.messages.import_command_failed'))
  }
  await runtime.refreshFromStorage()
  context.setUndoOperation({
    description: i18n.t('webmcp.undo.apply_user_data_import'),
    undo: async () => {
      const restored = restoreStorageSnapshot(snapshot)
      if (restored.outcome !== StorageTransactionOutcome.RolledBack) return false
      const mirrorRestored = await importCommand.restoreState(beforeImportState.value, {
        expectedRevision: commandResult.revision,
      })
      if (!mirrorRestored.ok) return false
      await context.getRuntime().refreshFromStorage()
      return true
    },
    canUndo: () => storageEntriesMatch(entries) && importCommand.getSnapshot().revision === commandResult.revision,
  })
  return {
    success: true,
    message: i18n.t('webmcp.messages.import_applied'),
    importedKeys: pending.preview.importedKeys,
    warnings: pending.preview.warnings,
    applied: true,
    selectedKeys: pending.selectedKeys,
    undoAvailable: true,
    reloadRequired: false,
    stateSynchronized: true,
  }
}

/**
 * ユーザーデータ入出力のツールを返す
 *
 * @param context - 現在のアプリ状態と保存処理を含む共通の操作情報
 * @returns ユーザーデータの書き出し・インポート用WebMCPツール定義
 */
export function createDataTools(context: WebMcpToolFactoryContext): WebMcpToolDefinition[] {
  return [
    {
      name: WebMcpToolName.GetUserDataExport,
      title: i18n.t('webmcp.tools.get_user_data_export.title'),
      description: i18n.t('webmcp.tools.get_user_data_export.description'),
      inputSchema: {
        type: 'object',
        properties: { [WebMcpSchemaField.SelectedKeys]: selectedExportKeysSchema },
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (input) => {
        // 選択キーを検証してから、画面のデータ管理と同じJSON生成処理を呼び出す
        const selectedKeys = parseExportKeys(input.selectedKeys)
        if (selectedKeys === null)
          return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.selected_keys_invalid'))
        const json = getUserDataJson(new Date(), selectedKeys)
        return { selectedKeys, json, bytes: new TextEncoder().encode(json).byteLength }
      },
    },
    {
      name: WebMcpToolName.DownloadUserDataExport,
      title: i18n.t('webmcp.tools.download_user_data_export.title'),
      description: i18n.t('webmcp.tools.download_user_data_export.description'),
      inputSchema: {
        type: 'object',
        properties: { [WebMcpSchemaField.SelectedKeys]: selectedExportKeysSchema },
        additionalProperties: false,
      },
      annotations: uiAnnotations,
      execute: (input) => {
        // ダウンロード対象のキーだけを検証し、既存のファイル出力処理へ通す
        const selectedKeys = parseExportKeys(input.selectedKeys)
        if (selectedKeys === null)
          return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.selected_keys_invalid'))
        exportUserData(selectedKeys)
        return { applied: true, selectedKeys }
      },
    },
    {
      name: WebMcpToolName.PreviewUserDataImport,
      title: i18n.t('webmcp.tools.preview_user_data_import.title'),
      description: i18n.t('webmcp.tools.preview_user_data_import.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.Json]: { type: 'string', description: i18n.t('webmcp.schema.import_json') },
          [WebMcpSchemaField.SelectedKeys]: selectedExportKeysSchema,
        },
        required: [WebMcpSchemaField.Json],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (input) => {
        // 大きすぎる入力を先に拒否し、指定キー以外を読み込まない
        if (typeof input.json !== 'string' || input.json.length > webMcpConstant.WEB_MCP_MAX_IMPORT_JSON_LENGTH) {
          return context.createToolError(
            WebMcpErrorCode.InvalidInput,
            i18n.t('webmcp.messages.json_too_large', { max: webMcpConstant.WEB_MCP_MAX_IMPORT_JSON_LENGTH }),
          )
        }
        const selectedKeys = parseExportKeys(input.selectedKeys)
        if (selectedKeys === null)
          return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.selected_keys_invalid'))
        const preview = prepareImportText(input.json, selectedKeys)
        if (!preview.canImport) {
          // JSONの構文・保存値検証に失敗した場合は確認トークンを発行しない
          return {
            canImport: false,
            message: preview.message,
            importedKeys: 0,
            importedItems: [],
            warnings: preview.warnings,
          }
        }
        let commandPreview
        const importCommand = context.getRuntime().applicationCommands?.importData
        if (importCommand && preview.entries !== null) {
          const result = importCommand.preview(preview.entries)
          if (!result.ok) return createCommandToolError(result, i18n.t('webmcp.messages.import_preview_invalid'))
          commandPreview = result.value
        }
        const token = context.createPendingToken(WebMcpPendingOperation.ImportUserData)
        // プレビュー内容と対象キーをページ内に保存し、確認時に入力JSONを再解釈しない
        context.pendingOperations.set(token, {
          kind: WebMcpPendingOperation.ImportUserData,
          token,
          preview,
          commandPreview,
          selectedKeys,
          expiresAt: Date.now() + webMcpConstant.WEB_MCP_CONFIRMATION_TTL_MS,
        })
        return {
          canImport: true,
          confirmationRequired: true,
          previewToken: token,
          expiresInSeconds: webMcpConstant.WEB_MCP_CONFIRMATION_TTL_MS / 1000,
          message: preview.message,
          importedKeys: preview.importedKeys,
          importedItems: preview.importedItems,
          warnings: preview.warnings,
        }
      },
    },
    {
      name: WebMcpToolName.ApplyUserDataImport,
      title: i18n.t('webmcp.tools.apply_user_data_import.title'),
      description: i18n.t('webmcp.tools.apply_user_data_import.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.PreviewToken]: { type: 'string' },
          [WebMcpSchemaField.Confirmation]: { const: true, description: i18n.t('webmcp.schema.import_confirmation') },
        },
        required: [WebMcpSchemaField.PreviewToken, WebMcpSchemaField.Confirmation],
        additionalProperties: false,
      },
      annotations: updateAnnotations,
      execute: (input, options) => executeApplyUserDataImport(context, input, options),
    },
  ]
}

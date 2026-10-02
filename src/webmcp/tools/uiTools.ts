/** 画面操作を行うWebMCPツール */
import i18n from '../../i18n'
import * as enums from '../../types/enums'
import type { WebMcpToolFactoryContext } from '../context'
import type { WebMcpToolDefinition } from '../types'
import { WebMcpErrorCode, WebMcpToolName } from '../types'
import { isWebMcpUiCommandApplied, parseWebMcpUiCommand, uiAnnotations, uiCommandSchema } from '../ui'

/**
 * 画面を操作するツールを返す
 *
 * @param context - 現在の画面状態と画面操作を含む共通の操作情報
 * @returns 画面操作用WebMCPツール定義
 */
export function createUiTools(context: WebMcpToolFactoryContext): WebMcpToolDefinition[] {
  return [
    {
      name: WebMcpToolName.ControlAppUi,
      title: i18n.t('webmcp.tools.control_app_ui.title'),
      description: i18n.t('webmcp.tools.control_app_ui.description'),
      inputSchema: uiCommandSchema,
      annotations: uiAnnotations,
      execute: async (input) => {
        // 画面操作の入力を確認してから、対象カードが存在するかを調べる
        const command = parseWebMcpUiCommand(input)
        if (command === null) {
          return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.ui_command_invalid'))
        }
        if (
          command.action === enums.ApplicationUiAction.ShowCard ||
          command.action === enums.ApplicationUiAction.ShowCardScore
        ) {
          if (!context.getRuntime().getCardByName().has(command.cardName)) {
            return context.createToolError(
              WebMcpErrorCode.NotFound,
              i18n.t('webmcp.messages.card_not_found', { cardName: command.cardName }),
            )
          }
        }
        if (command.action === enums.ApplicationUiAction.EditUserSupportForm) {
          if (
            !context
              .getRuntime()
              .getUserSupports()
              .some((card) => card.name === command.cardName)
          ) {
            return context.createToolError(
              WebMcpErrorCode.NotFound,
              i18n.t('webmcp.messages.user_support_not_found', { cardName: command.cardName }),
            )
          }
        }
        const runtime = context.getRuntime()
        const beforeUi = runtime.getUiState()
        if (isWebMcpUiCommandApplied(command, beforeUi)) {
          return { applied: true, changed: false, ui: { ...beforeUi } }
        }
        runtime.controlUi(command)
        const synchronized = await context.waitForStateCondition(() =>
          isWebMcpUiCommandApplied(command, context.getRuntime().getUiState()),
        )
        const ui = context.getRuntime().getUiState()
        if (!synchronized) {
          return context.createToolError(WebMcpErrorCode.StateSyncTimeout, i18n.t('webmcp.messages.ui_sync_timeout'))
        }
        return { applied: true, changed: true, ui: { ...ui } }
      },
    },
  ]
}

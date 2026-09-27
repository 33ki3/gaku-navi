/** ユーザー定義サポートを扱うWebMCPツール */
import type { UserSupportCommand } from '../../application/command/userSupportCommand'
import i18n from '../../i18n'
import type { SupportCard } from '../../types/card'
import * as webMcpConstant from '../constants'
import type { WebMcpPreparation, WebMcpToolFactoryContext } from '../context'
import { createCommandToolError } from '../context'
import { parseSearchLimit, parseSearchOffset, parseUserSupportCard } from '../input'
import { createCardSummary, createPageInfo } from '../results'
import { readOnlyAnnotations, supportCardInputSchema, updateAnnotations } from '../schemas'
import {
  WebMcpErrorCode,
  WebMcpMutationOperation,
  type WebMcpMutationOperationType,
  WebMcpPendingOperation,
  WebMcpSchemaField,
  type WebMcpToolDefinition,
  type WebMcpToolExecuteOptions,
  WebMcpToolName,
} from '../types'

/** サポート保存前に確認した値と、保存・Undoに使うcommand */
interface PreparedUserSupportUpsert {
  /** 検証済みの保存カード */
  card: SupportCard
  /** 編集時の旧名。新規作成ではundefined */
  oldName: string | undefined
  /** 保存前の一覧。Undo時に復元する */
  before: SupportCard[]
  /** 新規追加か既存カードの更新か */
  operation: WebMcpMutationOperationType
  /** 保存とUndoのrevision確認に使うcommand */
  command: UserSupportCommand
}

/** 保存入力の検証結果 */
type UserSupportUpsertPreparation = WebMcpPreparation<PreparedUserSupportUpsert>

/** サポート削除前に確認した対象と、削除・Undoに使うcommand */
interface PreparedUserSupportDelete {
  /** 削除するサポート名 */
  cardName: string
  /** 削除前の一覧。Undo時に復元する */
  before: SupportCard[]
  /** 削除とrevision確認に使うcommand */
  command: UserSupportCommand
}

/** 削除確認の検証結果 */
type UserSupportDeletePreparation = WebMcpPreparation<PreparedUserSupportDelete>

/**
 * ユーザー定義サポートの入力と更新対象を確認する
 *
 * @param context - 現在のサポート状態を取得するWebMCP操作情報
 * @param input - WebMCPから受け取ったカードと更新前の名前
 * @returns 保存に必要な状態、または入力エラー
 */
function prepareUserSupportUpsert(
  context: WebMcpToolFactoryContext,
  input: Record<string, unknown>,
): UserSupportUpsertPreparation {
  const card = parseUserSupportCard(input.card)
  if (card === null) {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.user_support_invalid')),
    }
  }
  const oldName = input.oldName
  if (oldName !== undefined && (typeof oldName !== 'string' || oldName.trim() === '')) {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.old_name_invalid')),
    }
  }

  const runtime = context.getRuntime()
  const before = [...runtime.getUserSupports()]
  // 変更前の名前がある場合は既存カードの編集とし、対象が実在することを確認する
  const existingUserSupport = oldName === undefined ? undefined : before.find((candidate) => candidate.name === oldName)
  if (oldName !== undefined && !existingUserSupport) {
    return {
      ok: false,
      error: context.createToolError(
        WebMcpErrorCode.NotFound,
        i18n.t('webmcp.messages.user_support_not_found', { cardName: oldName }),
      ),
    }
  }

  const existingCard = runtime.getCardByName().get(card.name)
  // 組み込みサポートや別のユーザー定義サポートとの名前衝突を保存前に拒否する
  if (existingCard && card.name !== oldName) {
    return {
      ok: false,
      error: context.createToolError(
        WebMcpErrorCode.Conflict,
        i18n.t('webmcp.messages.support_name_conflict', { cardName: card.name }),
      ),
    }
  }

  const command = runtime.applicationCommands?.userSupports
  if (command === undefined) {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.Unsupported, i18n.t('webmcp.messages.user_support_save_failed')),
    }
  }
  const operation = oldName === undefined ? WebMcpMutationOperation.Created : WebMcpMutationOperation.Updated
  return { ok: true, prepared: { card, oldName, before, operation, command } }
}

/**
 * ユーザー定義サポートを保存し、Undoと応答を作る
 *
 * @param context - 保存エラーとUndoを扱うWebMCP操作情報
 * @param prepared - 入力確認が済んだ更新情報
 * @param options - 中断通知
 * @returns 更新結果またはWebMCPエラー
 */
async function saveUserSupportUpsert(
  context: WebMcpToolFactoryContext,
  prepared: PreparedUserSupportUpsert,
  options: WebMcpToolExecuteOptions | undefined,
) {
  const { card, oldName, before, operation, command } = prepared
  const result =
    oldName === undefined
      ? await command.add(card, { signal: options?.signal })
      : await command.update(oldName, card, { signal: options?.signal })
  if (!result.ok) {
    return createCommandToolError(result, i18n.t('webmcp.messages.user_support_save_failed'))
  }

  context.setUndoOperation({
    description: i18n.t('webmcp.undo.upsert_user_support_card'),
    undo: async () => (await command.replace(before, { expectedRevision: result.revision })).ok,
    canUndo: () => command.getSnapshot().digest === result.digest,
  })
  return {
    applied: true,
    operation,
    cardName: card.name,
    previousCardName: oldName ?? null,
    userSupportNames: result.value.map((candidate) => candidate.name),
    revision: result.revision,
  }
}

/**
 * 削除確認と確認時点からの状態差分を検証する
 *
 * @param context - 確認トークンと現在状態を扱うWebMCP操作情報
 * @param input - 削除対象、確認トークン、明示確認
 * @returns 保存に必要な状態、または確認エラー
 */
function prepareUserSupportDelete(
  context: WebMcpToolFactoryContext,
  input: Record<string, unknown>,
): UserSupportDeletePreparation {
  if (typeof input.cardName !== 'string' || typeof input.previewToken !== 'string' || input.confirmation !== true) {
    return {
      ok: false,
      error: context.createToolError(
        WebMcpErrorCode.ConfirmationRequired,
        i18n.t('webmcp.messages.delete_confirmation_required'),
      ),
    }
  }
  const pending = context.takePendingOperation(input.previewToken, WebMcpPendingOperation.DeleteUserSupportCard)
  if (pending === null || pending.cardName !== input.cardName) {
    return {
      ok: false,
      error: context.createToolError(
        WebMcpErrorCode.InvalidConfirmation,
        i18n.t('webmcp.messages.delete_preview_invalid'),
      ),
    }
  }

  const runtime = context.getRuntime()
  const currentCard = runtime.getUserSupports().find((candidate) => candidate.name === input.cardName)
  if (!currentCard) {
    return {
      ok: false,
      error: context.createToolError(
        WebMcpErrorCode.NotFound,
        i18n.t('webmcp.messages.user_support_not_found', { cardName: input.cardName }),
      ),
    }
  }
  if (JSON.stringify(currentCard) !== JSON.stringify(pending.card)) {
    // プレビュー後に編集されたサポートを、古い内容の確認で削除しない
    return {
      ok: false,
      error: context.createToolError(
        WebMcpErrorCode.StateChanged,
        i18n.t('webmcp.messages.user_support_state_changed'),
      ),
    }
  }

  const command = runtime.applicationCommands?.userSupports
  if (command === undefined) {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.Unsupported, i18n.t('webmcp.messages.user_support_delete_failed')),
    }
  }
  return { ok: true, prepared: { cardName: input.cardName, before: [...runtime.getUserSupports()], command } }
}

/**
 * ユーザー定義サポートを削除し、Undoと応答を作る
 *
 * @param context - 保存エラーとUndoを扱うWebMCP操作情報
 * @param prepared - 確認済みの削除情報
 * @param options - 中断通知
 * @returns 削除結果またはWebMCPエラー
 */
async function saveUserSupportDelete(
  context: WebMcpToolFactoryContext,
  prepared: PreparedUserSupportDelete,
  options: WebMcpToolExecuteOptions | undefined,
) {
  const { cardName, before, command } = prepared
  const result = await command.remove(cardName, { signal: options?.signal })
  if (!result.ok) {
    return createCommandToolError(result, i18n.t('webmcp.messages.user_support_delete_failed'))
  }

  context.setUndoOperation({
    description: i18n.t('webmcp.undo.delete_user_support_card'),
    undo: async () => (await command.replace(before, { expectedRevision: result.revision })).ok,
    canUndo: () => command.getSnapshot().digest === result.digest,
  })
  return { applied: true, deletedCardName: cardName, undoAvailable: true, revision: result.revision }
}

/**
 * ユーザー定義サポートのツールを返す
 *
 * @param context - 現在のユーザー定義サポートと保存処理を含む共通の操作情報
 * @returns ユーザー定義サポート用WebMCPツール定義
 */
export function createUserSupportTools(context: WebMcpToolFactoryContext): WebMcpToolDefinition[] {
  return [
    {
      name: WebMcpToolName.GetUserSupportCards,
      title: i18n.t('webmcp.tools.get_user_support_cards.title'),
      description: i18n.t('webmcp.tools.get_user_support_cards.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.Limit]: {
            type: 'integer',
            minimum: 1,
            maximum: webMcpConstant.WEB_MCP_MAX_SEARCH_LIMIT,
            default: webMcpConstant.WEB_MCP_DEFAULT_SEARCH_LIMIT,
          },
          [WebMcpSchemaField.Offset]: {
            type: 'integer',
            minimum: 0,
            maximum: webMcpConstant.WEB_MCP_MAX_PAGE_OFFSET,
            default: 0,
          },
        },
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (input) => {
        // ユーザー定義サポートだけを返し、組み込みサポートと混ぜない
        const limit = parseSearchLimit(input.limit)
        const offset = parseSearchOffset(input.offset)
        if (limit === null || offset === null) {
          return context.createToolError(
            WebMcpErrorCode.InvalidInput,
            i18n.t('webmcp.messages.invalid_search_limit', { max: webMcpConstant.WEB_MCP_MAX_SEARCH_LIMIT }),
          )
        }
        const cards = context.getRuntime().getUserSupports()
        return {
          count: cards.length,
          cards: cards.slice(offset, offset + limit).map(createCardSummary),
          pagination: createPageInfo(offset, limit, cards.length),
        }
      },
    },
    {
      name: WebMcpToolName.UpsertUserSupportCard,
      title: i18n.t('webmcp.tools.upsert_user_support_card.title'),
      description: i18n.t('webmcp.tools.upsert_user_support_card.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.OldName]: { type: 'string', description: i18n.t('webmcp.schema.user_support_old_name') },
          [WebMcpSchemaField.Card]: supportCardInputSchema,
        },
        required: [WebMcpSchemaField.Card],
        additionalProperties: false,
      },
      annotations: updateAnnotations,
      execute: async (input, options) => {
        // 追加・更新は、ユーザー定義サポートフォームと同じ厳密な検証を通してから保存する
        if (context.isExecutionAborted(options))
          return context.createToolError(WebMcpErrorCode.Aborted, i18n.t('webmcp.messages.user_support_update_aborted'))
        const preparation = prepareUserSupportUpsert(context, input)
        if (!preparation.ok) return preparation.error
        return saveUserSupportUpsert(context, preparation.prepared, options)
      },
    },
    {
      name: WebMcpToolName.PreviewDeleteUserSupportCard,
      title: i18n.t('webmcp.tools.preview_delete_user_support_card.title'),
      description: i18n.t('webmcp.tools.preview_delete_user_support_card.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.CardName]: { type: 'string' },
        },
        required: [WebMcpSchemaField.CardName],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (input) => {
        // 削除対象のサポート本体を確認時点で保存し、後続の状態変更を検出できるようにする
        if (typeof input.cardName !== 'string' || input.cardName.trim() === '') {
          return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.card_name_required'))
        }
        const card = context
          .getRuntime()
          .getUserSupports()
          .find((candidate) => candidate.name === input.cardName)
        if (!card) {
          return context.createToolError(
            WebMcpErrorCode.NotFound,
            i18n.t('webmcp.messages.user_support_not_found', { cardName: input.cardName }),
          )
        }
        const token = context.createPendingToken(WebMcpPendingOperation.DeleteUserSupportCard)
        context.pendingOperations.set(token, {
          kind: WebMcpPendingOperation.DeleteUserSupportCard,
          token,
          cardName: card.name,
          card,
          expiresAt: Date.now() + webMcpConstant.WEB_MCP_CONFIRMATION_TTL_MS,
        })
        return {
          confirmationRequired: true,
          previewToken: token,
          expiresInSeconds: webMcpConstant.WEB_MCP_CONFIRMATION_TTL_MS / 1000,
          card: createCardSummary(card),
        }
      },
    },
    {
      name: WebMcpToolName.DeleteUserSupportCard,
      title: i18n.t('webmcp.tools.delete_user_support_card.title'),
      description: i18n.t('webmcp.tools.delete_user_support_card.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.CardName]: { type: 'string' },
          [WebMcpSchemaField.PreviewToken]: { type: 'string' },
          [WebMcpSchemaField.Confirmation]: { const: true, description: i18n.t('webmcp.schema.delete_confirmation') },
        },
        required: [WebMcpSchemaField.CardName, WebMcpSchemaField.PreviewToken, WebMcpSchemaField.Confirmation],
        additionalProperties: false,
      },
      annotations: updateAnnotations,
      execute: async (input, options) => {
        // 削除は確認トークン、対象名、confirmation:trueの3点を要求する
        if (context.isExecutionAborted(options))
          return context.createToolError(WebMcpErrorCode.Aborted, i18n.t('webmcp.messages.user_support_delete_aborted'))
        const preparation = prepareUserSupportDelete(context, input)
        if (!preparation.ok) return preparation.error
        return saveUserSupportDelete(context, preparation.prepared, options)
      },
    },
  ]
}

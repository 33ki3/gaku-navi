/** 点数設定プリセットを扱うWebMCPツール */
import type { CalculationCommand } from '../../application/command/calculationCommand'
import type { PresetCommand } from '../../application/command/presetCommand'
import i18n from '../../i18n'
import type { CommandSuccess } from '../../types/application'
import type { ScoreSettings } from '../../types/card'
import { validateScoreSettingsForCalculation } from '../../utils/calculationSnapshot'
import { type ScorePreset, loadPresets } from '../../utils/presetHelpers'
import * as webMcpConstant from '../constants'
import type { WebMcpPreparation, WebMcpToolFactoryContext } from '../context'
import { createCommandToolError } from '../context'
import { createScoreSettings } from '../results'
import { readOnlyAnnotations, updateAnnotations } from '../schemas'
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

/** プリセット保存前に確認した値と、保存・Undoに使うcommand */
interface PreparedPresetUpsert {
  /** 入力の前後空白を除いた保存名 */
  name: string
  /** 保存対象にする現在の点数設定 */
  settings: ScoreSettings
  /** 保存直前の一覧。Undo時に復元する */
  before: ScorePreset[]
  /** 新規作成か既存項目の上書きか */
  operation: WebMcpMutationOperationType
  /** 保存とUndoのrevision確認に使うcommand */
  command: PresetCommand
}

/** 保存入力の検証結果 */
type PresetUpsertPreparation = WebMcpPreparation<PreparedPresetUpsert>

/** プリセット読込前に確認した適用値と、変更前設定・command */
interface PreparedPresetLoad {
  /** 読み込んだプリセット名 */
  presetName: string
  /** 計算に適用できる形へ検証済みの設定 */
  settings: ScoreSettings
  /** Undoで戻す読み込み前の点数設定 */
  before: ScoreSettings
  /** 設定更新とrevision確認に使うcommand */
  command: CalculationCommand
}

/** 読込入力の検証結果 */
type PresetLoadPreparation = WebMcpPreparation<PreparedPresetLoad>

/** プリセット削除前に確認した一覧と、削除・Undoに使うcommand */
interface PreparedPresetDelete {
  /** 削除するプリセット名 */
  name: string
  /** 削除直前の一覧。Undo時に復元する */
  before: ScorePreset[]
  /** 削除とrevision確認に使うcommand */
  command: PresetCommand
}

/** 削除入力の確認結果 */
type PresetDeletePreparation = WebMcpPreparation<PreparedPresetDelete>

/** Undo登録にrevisionとdigestを使う、成功済みのプリセット一覧更新結果 */
type PresetCommandResult = CommandSuccess<ScorePreset[]>

/**
 * プリセット保存の入力を検証し、上書き対象と現在の設定を取得する
 *
 * @param context - 現在のプリセットを取得するWebMCP操作情報
 * @param input - WebMCPから受け取った保存名と上書き指定
 * @returns 保存に必要な状態、または入力エラー
 */
function preparePresetUpsert(
  context: WebMcpToolFactoryContext,
  input: Record<string, unknown>,
): PresetUpsertPreparation {
  if (
    typeof input.name !== 'string' ||
    input.name.trim() === '' ||
    input.name.length > webMcpConstant.WEB_MCP_MAX_PRESET_NAME_LENGTH
  ) {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.name_length_invalid')),
    }
  }
  if (input.overwrite !== undefined && typeof input.overwrite !== 'boolean') {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.overwrite_boolean')),
    }
  }

  const name = input.name.trim()
  const runtime = context.getRuntime()
  const command = runtime.applicationCommands?.presets
  const before = command?.getSnapshot().value ?? loadPresets()
  const existing = before.find((preset) => preset.name === name)
  const operation = existing ? WebMcpMutationOperation.Overwritten : WebMcpMutationOperation.Created
  if (existing && input.overwrite !== true) {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.Conflict, i18n.t('webmcp.messages.preset_conflict', { name })),
    }
  }

  const settings = runtime.getCalculationSnapshot().scoreSettings
  if (command === undefined) {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.Unsupported, i18n.t('webmcp.messages.preset_save_failed')),
    }
  }
  return { ok: true, prepared: { name, settings, before, operation, command } }
}

/**
 * プリセットを保存し、Undoと応答を作る
 *
 * @param context - 保存エラーとUndoを扱うWebMCP操作情報
 * @param prepared - 入力確認が済んだ保存情報
 * @param input - 上書き指定
 * @param options - 中断通知
 * @returns 保存結果またはWebMCPエラー
 */
function savePresetUpsert(
  context: WebMcpToolFactoryContext,
  prepared: PreparedPresetUpsert,
  input: Record<string, unknown>,
  options: WebMcpToolExecuteOptions | undefined,
) {
  const { name, settings, before, operation, command } = prepared
  return command
    .save(name, settings, { overwrite: input.overwrite === true, signal: options?.signal })
    .then((result) => {
      if (!result.ok) {
        return createCommandToolError(result, i18n.t('webmcp.messages.preset_save_failed'))
      }
      registerPresetUndo(context, command, before, result, i18n.t('webmcp.undo.upsert_score_preset'))
      return {
        applied: true,
        operation,
        presetNames: result.value.map((preset) => preset.name),
        revision: result.revision,
      }
    })
}

/**
 * 点数設定プリセットを読み込む対象と適用値を確認する
 *
 * @param context - 現在の保存状態を取得するWebMCP操作情報
 * @param input - 読み込むプリセット名
 * @returns 保存に必要な状態、または入力エラー
 */
function preparePresetLoad(context: WebMcpToolFactoryContext, input: Record<string, unknown>): PresetLoadPreparation {
  if (typeof input.name !== 'string' || input.name.trim() === '') {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.name_required')),
    }
  }
  const runtime = context.getRuntime()
  const presetCommand = runtime.applicationCommands?.presets
  const preset = (presetCommand?.getSnapshot().value ?? loadPresets()).find(
    (candidate) => candidate.name === input.name,
  )
  if (!preset) {
    return {
      ok: false,
      error: context.createToolError(
        WebMcpErrorCode.NotFound,
        i18n.t('webmcp.messages.preset_not_found', { name: input.name }),
      ),
    }
  }

  const before = runtime.getCalculationSnapshot().scoreSettings
  // 保存形式に含まれる派生値や旧形式を計算可能な形へ正規化する
  const settings = validateScoreSettingsForCalculation(preset.settings)
  if (settings === null) {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.InvalidVariant, i18n.t('webmcp.messages.preset_invalid')),
    }
  }
  const calculationCommand = runtime.applicationCommands?.calculation
  if (calculationCommand === undefined) {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.Unsupported, i18n.t('webmcp.messages.preset_load_storage_failed')),
    }
  }
  return { ok: true, prepared: { presetName: preset.name, settings, before, command: calculationCommand } }
}

/**
 * プリセットの点数設定を適用し、Undoと応答を作る
 *
 * @param context - 保存エラーとUndoを扱うWebMCP操作情報
 * @param prepared - 読み込み対象と適用値
 * @param options - 中断通知
 * @returns 適用結果またはWebMCPエラー
 */
async function savePresetLoad(
  context: WebMcpToolFactoryContext,
  prepared: PreparedPresetLoad,
  options: WebMcpToolExecuteOptions | undefined,
) {
  const result = await prepared.command.patch({ scoreSettings: prepared.settings }, { signal: options?.signal })
  if (!result.ok) {
    return createCommandToolError(result, i18n.t('webmcp.messages.preset_load_storage_failed'))
  }
  context.setUndoOperation({
    description: i18n.t('webmcp.undo.load_score_preset'),
    undo: async () =>
      (await prepared.command.patch({ scoreSettings: prepared.before }, { expectedRevision: result.revision })).ok,
    canUndo: () => prepared.command.getSnapshot().digest === result.digest,
  })
  return {
    applied: true,
    presetName: prepared.presetName,
    settings: createScoreSettings(result.value.scoreSettings),
    revision: result.revision,
  }
}

/**
 * プリセット削除の確認状態と現在値を照合する
 *
 * @param context - 確認トークンと現在状態を扱うWebMCP操作情報
 * @param input - 削除対象、確認トークン、明示確認
 * @returns 保存に必要な状態、または確認エラー
 */
function preparePresetDelete(
  context: WebMcpToolFactoryContext,
  input: Record<string, unknown>,
): PresetDeletePreparation {
  if (typeof input.name !== 'string' || typeof input.previewToken !== 'string' || input.confirmation !== true) {
    return {
      ok: false,
      error: context.createToolError(
        WebMcpErrorCode.ConfirmationRequired,
        i18n.t('webmcp.messages.delete_confirmation_required'),
      ),
    }
  }
  const pending = context.takePendingOperation(input.previewToken, WebMcpPendingOperation.DeleteScorePreset)
  if (pending === null || pending.preset.name !== input.name) {
    return {
      ok: false,
      error: context.createToolError(
        WebMcpErrorCode.InvalidConfirmation,
        i18n.t('webmcp.messages.delete_preview_invalid'),
      ),
    }
  }

  const command = context.getRuntime().applicationCommands?.presets
  const before = command?.getSnapshot().value ?? loadPresets()
  const current = before.find((preset) => preset.name === input.name)
  // プレビュー後に同名プリセットが変更されていれば、古い確認で削除しない
  if (!current || JSON.stringify(current) !== JSON.stringify(pending.preset)) {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.StateChanged, i18n.t('webmcp.messages.preset_state_changed')),
    }
  }
  if (command === undefined) {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.Unsupported, i18n.t('webmcp.messages.preset_delete_failed')),
    }
  }
  return { ok: true, prepared: { name: input.name, before, command } }
}

/**
 * プリセットを削除し、Undoと応答を作る
 *
 * @param context - 保存エラーとUndoを扱うWebMCP操作情報
 * @param prepared - 確認済みの削除情報
 * @param options - 中断通知
 * @returns 削除結果またはWebMCPエラー
 */
function savePresetDelete(
  context: WebMcpToolFactoryContext,
  prepared: PreparedPresetDelete,
  options: WebMcpToolExecuteOptions | undefined,
) {
  const { name, before, command } = prepared
  return command.remove(name, { signal: options?.signal }).then((result) => {
    if (!result.ok) {
      return createCommandToolError(result, i18n.t('webmcp.messages.preset_delete_failed'))
    }
    registerPresetUndo(context, command, before, result, i18n.t('webmcp.undo.delete_score_preset'))
    return { applied: true, deletedPresetName: name, undoAvailable: true, revision: result.revision }
  })
}

/**
 * プリセット変更を取り消せるように登録する
 *
 * @param context - Undo操作を登録するWebMCP操作情報
 * @param command - プリセットcommand
 * @param before - 変更前の一覧
 * @param result - 保存に成功したcommand結果
 * @param description - Undo操作の説明文
 */
function registerPresetUndo(
  context: WebMcpToolFactoryContext,
  command: PresetCommand,
  before: ScorePreset[],
  result: PresetCommandResult,
  description: string,
): void {
  context.setUndoOperation({
    description,
    undo: async () => (await command.replace(before, { expectedRevision: result.revision })).ok,
    canUndo: () => command.getSnapshot().digest === result.digest,
  })
}

/** 外部公開用にプリセット情報から余分な内部値を除いて整形する */
function createPresetResult(preset: ReturnType<typeof loadPresets>[number]) {
  return { name: preset.name, settings: createScoreSettings(preset.settings) }
}

/**
 * 点数設定プリセットのツールを返す
 *
 * @param context - 現在のアプリ状態と保存処理を含む共通の操作情報
 * @returns 点数設定プリセット用WebMCPツール定義
 */
export function createPresetTools(context: WebMcpToolFactoryContext): WebMcpToolDefinition[] {
  return [
    {
      name: WebMcpToolName.GetScorePresets,
      title: i18n.t('webmcp.tools.get_score_presets.title'),
      description: i18n.t('webmcp.tools.get_score_presets.description'),
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: () => {
        // 一覧取得は保存ヘルパーの検証済みデータを読み取るだけで、状態を変更しない
        const presets = context.getRuntime().applicationCommands?.presets?.getSnapshot().value ?? loadPresets()
        return { count: presets.length, presets: presets.map(createPresetResult) }
      },
    },
    {
      name: WebMcpToolName.UpsertScorePreset,
      title: i18n.t('webmcp.tools.upsert_score_preset.title'),
      description: i18n.t('webmcp.tools.upsert_score_preset.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.Name]: { type: 'string', description: i18n.t('webmcp.schema.preset_name') },
          [WebMcpSchemaField.Overwrite]: { type: 'boolean', description: i18n.t('webmcp.schema.preset_overwrite') },
        },
        required: [WebMcpSchemaField.Name],
        additionalProperties: false,
      },
      annotations: updateAnnotations,
      execute: (input, options) => {
        // 同名上書きは明示指定を要求し、既存プリセットを誤って壊さない
        if (context.isExecutionAborted(options))
          return context.createToolError(WebMcpErrorCode.Aborted, i18n.t('webmcp.messages.preset_save_aborted'))
        const preparation = preparePresetUpsert(context, input)
        if (!preparation.ok) return preparation.error
        return savePresetUpsert(context, preparation.prepared, input, options)
      },
    },
    {
      name: WebMcpToolName.LoadScorePreset,
      title: i18n.t('webmcp.tools.load_score_preset.title'),
      description: i18n.t('webmcp.tools.load_score_preset.description'),
      inputSchema: {
        type: 'object',
        properties: { [WebMcpSchemaField.Name]: { type: 'string' } },
        required: [WebMcpSchemaField.Name],
        additionalProperties: false,
      },
      annotations: updateAnnotations,
      execute: async (input, options) => {
        // 保存済みプリセットを検証してから現在の点数設定へ渡す
        if (context.isExecutionAborted(options))
          return context.createToolError(WebMcpErrorCode.Aborted, i18n.t('webmcp.messages.preset_load_aborted'))
        const preparation = preparePresetLoad(context, input)
        if (!preparation.ok) return preparation.error
        return savePresetLoad(context, preparation.prepared, options)
      },
    },
    {
      name: WebMcpToolName.PreviewDeleteScorePreset,
      title: i18n.t('webmcp.tools.preview_delete_score_preset.title'),
      description: i18n.t('webmcp.tools.preview_delete_score_preset.description'),
      inputSchema: {
        type: 'object',
        properties: { [WebMcpSchemaField.Name]: { type: 'string' } },
        required: [WebMcpSchemaField.Name],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (input) => {
        // 削除前に対象プリセットの内容を保存し、確認操作へ渡す
        if (typeof input.name !== 'string' || input.name.trim() === '') {
          return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.name_required'))
        }
        const presetCommand = context.getRuntime().applicationCommands?.presets
        const preset = (presetCommand?.getSnapshot().value ?? loadPresets()).find(
          (candidate) => candidate.name === input.name,
        )
        if (!preset) {
          return context.createToolError(
            WebMcpErrorCode.NotFound,
            i18n.t('webmcp.messages.preset_not_found', { name: input.name }),
          )
        }
        const token = context.createPendingToken(WebMcpPendingOperation.DeleteScorePreset)
        // 確認トークンは対象名だけでなく、その時点の設定値にも紐付ける
        context.pendingOperations.set(token, {
          kind: WebMcpPendingOperation.DeleteScorePreset,
          token,
          preset,
          expiresAt: Date.now() + webMcpConstant.WEB_MCP_CONFIRMATION_TTL_MS,
        })
        return {
          confirmationRequired: true,
          previewToken: token,
          expiresInSeconds: webMcpConstant.WEB_MCP_CONFIRMATION_TTL_MS / 1000,
          preset: createPresetResult(preset),
        }
      },
    },
    {
      name: WebMcpToolName.DeleteScorePreset,
      title: i18n.t('webmcp.tools.delete_score_preset.title'),
      description: i18n.t('webmcp.tools.delete_score_preset.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.Name]: { type: 'string' },
          [WebMcpSchemaField.PreviewToken]: { type: 'string' },
          [WebMcpSchemaField.Confirmation]: { const: true, description: i18n.t('webmcp.schema.delete_confirmation') },
        },
        required: [WebMcpSchemaField.Name, WebMcpSchemaField.PreviewToken, WebMcpSchemaField.Confirmation],
        additionalProperties: false,
      },
      annotations: updateAnnotations,
      execute: (input, options) => {
        // 明示確認とプレビュー時点の内容が揃わない限り、削除対象へ触れない
        if (context.isExecutionAborted(options))
          return context.createToolError(WebMcpErrorCode.Aborted, i18n.t('webmcp.messages.preset_delete_aborted'))
        const preparation = preparePresetDelete(context, input)
        if (!preparation.ok) return preparation.error
        return savePresetDelete(context, preparation.prepared, options)
      },
    },
  ]
}

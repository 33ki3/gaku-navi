/** 表示設定と計算条件を扱うWebMCPツール */
import type { CalculationCommand, CalculationCommandUpdate } from '../../application/command/calculationCommand'
import * as constant from '../../constant'
import i18n from '../../i18n'
import type { AppPreferences, PersistedFilterState } from '../../types/app'
import type { CalculationSnapshot, CalculationVariantPatch } from '../../types/calculation'
import { applyCalculationVariant, createCalculationSnapshot } from '../../utils/calculationSnapshot'
import type { WebMcpPreparation, WebMcpToolFactoryContext } from '../context'
import { createCommandToolError } from '../context'
import {
  parseAppPreferencesPatch,
  parseCalculationVariantPatch,
  parseCurrentAppStateOptions,
  parseFilterStatePatch,
  parseStringArray,
} from '../input'
import { createCalculationState, createCurrentAppState, createFilterState } from '../results'
import {
  appPreferencesPatchSchema,
  calculationUpdateSchema,
  currentAppStateSchema,
  filterStatePatchSchema,
  readOnlyAnnotations,
  updateAnnotations,
} from '../schemas'
import {
  WebMcpErrorCode,
  type WebMcpRuntime,
  WebMcpSchemaField,
  type WebMcpToolDefinition,
  type WebMcpToolExecuteOptions,
  WebMcpToolName,
} from '../types'

/** 計算設定を保存する前に検証した入力と、変更前後のsnapshot */
interface PreparedCalculationUpdate {
  /** 更新対象の現在状態と保存commandを取得するruntime */
  runtime: WebMcpRuntime
  /** 競合確認とUndoに使う変更前の計算条件 */
  snapshot: CalculationSnapshot
  /** 入力patchを適用し、回数調整削除まで反映した保存値 */
  nextSnapshot: CalculationSnapshot
  /** 利用者が指定した計算条件の差分 */
  patch: CalculationVariantPatch
  /** 保存と同時に削除するカード別回数調整のカード名 */
  clearCardCountCustom: string[]
}

/** 入力検証結果 */
type CalculationUpdatePreparation = WebMcpPreparation<PreparedCalculationUpdate>

/** calculation commandから返った成功結果。Undo時のrevision照合にも使う */
type CalculationUpdateResult = Extract<Awaited<ReturnType<CalculationCommandUpdate>>, { ok: true }>

/**
 * 計算設定の入力を検証し、保存する次のsnapshotを組み立てる
 *
 * @param context - 現在の計算状態を取得するWebMCP操作情報
 * @param input - WebMCPから受け取った更新値
 * @returns 保存に必要な状態、または入力エラー
 */
function prepareCalculationUpdate(
  context: WebMcpToolFactoryContext,
  input: Record<string, unknown>,
): CalculationUpdatePreparation {
  // 明示削除項目はvariant差分とは別に検証し、残りの未知キーはparserで拒否する。
  const variantInput = { ...input }
  delete variantInput[WebMcpSchemaField.ClearCardCountCustom]
  const patch = parseCalculationVariantPatch(variantInput)
  if (patch === null) {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.calculation_patch_invalid')),
    }
  }

  const clearCardCountCustom =
    input.clearCardCountCustom === undefined ? [] : parseStringArray(input.clearCardCountCustom)
  if (clearCardCountCustom === null) {
    return {
      ok: false,
      error: context.createToolError(
        WebMcpErrorCode.InvalidInput,
        i18n.t('webmcp.messages.clear_card_count_custom_invalid'),
      ),
    }
  }
  if (Object.keys(patch).length === 0 && clearCardCountCustom.length === 0) {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.calculation_patch_empty')),
    }
  }

  const runtime = context.getRuntime()
  const snapshot = runtime.getCalculationSnapshot()
  // 回数調整を消すカード名も現在の一覧で確認し、存在しないカードの保存項目を作らない
  const missingCard = clearCardCountCustom.find((cardName) => !snapshot.cardByName.has(cardName))
  if (missingCard !== undefined) {
    return {
      ok: false,
      error: context.createToolError(
        WebMcpErrorCode.NotFound,
        i18n.t('webmcp.messages.card_not_found', { cardName: missingCard }),
      ),
    }
  }

  const variantSnapshot = applyCalculationVariant(snapshot, patch)
  if (variantSnapshot === null) {
    return {
      ok: false,
      error: context.createToolError(WebMcpErrorCode.InvalidVariant, i18n.t('webmcp.messages.calculation_invalid')),
    }
  }

  const nextCardCountCustom = { ...variantSnapshot.cardCountCustom }
  // 回数調整の削除は一時変更を反映した後に行い、設定変更と同じ保存にまとめる
  for (const cardName of clearCardCountCustom) delete nextCardCountCustom[cardName]
  const nextSnapshot =
    clearCardCountCustom.length === 0
      ? variantSnapshot
      : createCalculationSnapshot({ ...variantSnapshot, cardCountCustom: nextCardCountCustom })

  return { ok: true, prepared: { runtime, snapshot, nextSnapshot, patch, clearCardCountCustom } }
}

/**
 * 保存成功後に、計算条件を戻すUndoを登録する
 *
 * @param context - Undo操作を登録するWebMCP操作情報
 * @param command - 計算条件の保存command
 * @param before - 保存前の計算条件
 * @param result - 保存に成功したcommand結果
 */
function registerCalculationUpdateUndo(
  context: WebMcpToolFactoryContext,
  command: CalculationCommand,
  before: CalculationSnapshot,
  result: CalculationUpdateResult,
): void {
  context.setUndoOperation({
    description: i18n.t('webmcp.undo.update_calculation_settings'),
    undo: async () => {
      const restored = await command.update(
        {
          scoreSettings: before.scoreSettings,
          unitSimulatorSettings: before.unitSettings,
          cardUncaps: before.cardUncaps,
          cardCountCustom: before.cardCountCustom,
        },
        { expectedRevision: result.revision },
      )
      return restored.ok
    },
    canUndo: () => command.getSnapshot().digest === result.digest,
  })
}

/**
 * 更新後の計算条件をWebMCP結果へ変換する
 *
 * @param prepared - 入力確認とsnapshot作成が済んだ更新情報
 * @param result - 保存に成功したcommand結果
 * @returns WebMCPへ返す更新結果
 */
function createCalculationUpdateResult(prepared: PreparedCalculationUpdate, result: CalculationUpdateResult) {
  const { snapshot, nextSnapshot, patch, clearCardCountCustom } = prepared
  return {
    applied: true,
    undoAvailable: true,
    before: createCalculationState(snapshot),
    changed: {
      scoreSettings: patch.scoreSettings !== undefined,
      unitSettings: patch.unitSettings !== undefined,
      cardUncaps:
        patch.cardUncapAll !== undefined
          ? [...new Set([...snapshot.allCards.map((card) => card.name), ...Object.keys(patch.cardUncaps ?? {})])]
          : patch.cardUncaps
            ? Object.keys(patch.cardUncaps)
            : [],
      cardCountCustom: patch.cardCountCustom ? Object.keys(patch.cardCountCustom) : [],
      clearedCardCountCustom: clearCardCountCustom,
    },
    settings: createCalculationState(nextSnapshot),
    revision: result.revision,
  }
}

/**
 * 計算条件を保存し、Undoと応答を作る
 *
 * @param context - 保存エラーとUndoを扱うWebMCP操作情報
 * @param prepared - 保存する計算条件
 * @param options - 中断通知
 * @returns 更新結果またはWebMCPエラー
 */
async function saveCalculationUpdate(
  context: WebMcpToolFactoryContext,
  prepared: PreparedCalculationUpdate,
  options: WebMcpToolExecuteOptions | undefined,
) {
  const calculationCommand = prepared.runtime.applicationCommands?.calculation
  if (calculationCommand === undefined) {
    return context.createToolError(WebMcpErrorCode.Unsupported, i18n.t('webmcp.messages.calculation_update_failed'))
  }
  const { nextSnapshot } = prepared
  const result = await calculationCommand.update(
    {
      scoreSettings: nextSnapshot.scoreSettings,
      unitSimulatorSettings: nextSnapshot.unitSettings,
      cardUncaps: nextSnapshot.cardUncaps,
      cardCountCustom: nextSnapshot.cardCountCustom,
    },
    { signal: options?.signal },
  )
  if (!result.ok) {
    return createCommandToolError(result, i18n.t('webmcp.messages.calculation_update_failed'))
  }

  registerCalculationUpdateUndo(context, calculationCommand, prepared.snapshot, result)
  return createCalculationUpdateResult(prepared, result)
}

/**
 * 表示設定・計算条件のツールを返す
 *
 * @param context - 現在のアプリ状態と保存処理を含む共通の操作情報
 * @returns 表示設定・計算条件用WebMCPツール定義
 */
export function createSettingsTools(context: WebMcpToolFactoryContext): WebMcpToolDefinition[] {
  return [
    {
      name: WebMcpToolName.GetCurrentAppState,
      title: i18n.t('webmcp.tools.get_current_app_state.title'),
      description: i18n.t('webmcp.tools.get_current_app_state.description'),
      inputSchema: currentAppStateSchema,
      annotations: readOnlyAnnotations,
      execute: (input) => {
        const options = parseCurrentAppStateOptions(input)
        if (options === null)
          return context.createToolError(
            WebMcpErrorCode.InvalidInput,
            i18n.t('webmcp.messages.app_state_options_invalid'),
          )
        return createCurrentAppState(context.getRuntime(), options)
      },
    },
    {
      name: WebMcpToolName.UpdateCardFilters,
      title: i18n.t('webmcp.tools.update_card_filters.title'),
      description: i18n.t('webmcp.tools.update_card_filters.description'),
      inputSchema: filterStatePatchSchema,
      annotations: updateAnnotations,
      execute: async (input, options) => {
        // 保存を始める前にキャンセル状態を確認し、途中で中止された呼び出しを変更扱いにしない
        if (context.isExecutionAborted(options))
          return context.createToolError(WebMcpErrorCode.Aborted, i18n.t('webmcp.messages.filters_update_aborted'))
        const clearFilters = input.clearFilters
        if (clearFilters !== undefined && typeof clearFilters !== 'boolean') {
          return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.clear_filters_boolean'))
        }
        const patch = parseFilterStatePatch(input)
        if (patch === null)
          return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.filters_patch_invalid'))
        if (Object.keys(patch).length === 0 && clearFilters !== true) {
          return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.filters_patch_empty'))
        }

        const runtime = context.getRuntime()
        const before = createFilterState(runtime)
        // 全解除は画面の既定状態を基準にし、それ以外は現在値を基準に差分を適用する
        const base = clearFilters === true ? constant.DEFAULT_FILTER_STATE : before
        const after: PersistedFilterState = {
          ...base,
          ...patch,
          rarities: [...(patch.rarities ?? base.rarities)],
          types: [...(patch.types ?? base.types)],
          plans: [...(patch.plans ?? base.plans)],
          abilityKeywords: [...(patch.abilityKeywords ?? base.abilityKeywords)],
          eventFilters: [...(patch.eventFilters ?? base.eventFilters)],
          sources: [...(patch.sources ?? base.sources)],
          uncaps: [...(patch.uncaps ?? base.uncaps)],
          countCustom: [...(patch.countCustom ?? base.countCustom)],
          cardExclusionFilters: [...(patch.cardExclusionFilters ?? base.cardExclusionFilters)],
        }
        const filterCommand = runtime.applicationCommands?.filters
        if (filterCommand === undefined) {
          return context.createToolError(WebMcpErrorCode.Unsupported, i18n.t('webmcp.messages.filters_save_failed'))
        }
        const result = await filterCommand.update(after, { signal: options?.signal })
        if (!result.ok) {
          return createCommandToolError(result, i18n.t('webmcp.messages.filters_save_failed'))
        }
        context.setUndoOperation({
          description: i18n.t('webmcp.undo.update_card_filters'),
          undo: async () => (await filterCommand.update(before, { expectedRevision: result.revision })).ok,
          canUndo: () => filterCommand.getSnapshot().digest === result.digest,
        })
        return { applied: true, before, after: result.value, revision: result.revision }
      },
    },
    {
      name: WebMcpToolName.UpdateAppPreferences,
      title: i18n.t('webmcp.tools.update_app_preferences.title'),
      description: i18n.t('webmcp.tools.update_app_preferences.description'),
      inputSchema: appPreferencesPatchSchema,
      annotations: updateAnnotations,
      execute: async (input, options) => {
        // 表示設定も、保存結果を確認してから画面への反映を待つ
        if (context.isExecutionAborted(options))
          return context.createToolError(WebMcpErrorCode.Aborted, i18n.t('webmcp.messages.preferences_update_aborted'))
        const patch = parseAppPreferencesPatch(input)
        if (patch === null || Object.keys(patch).length === 0) {
          return context.createToolError(
            WebMcpErrorCode.InvalidInput,
            i18n.t('webmcp.messages.preferences_patch_empty'),
          )
        }
        const runtime = context.getRuntime()
        const before = { ...runtime.getPreferences() }
        const after: AppPreferences = { ...before, ...patch }
        const preferencesCommand = runtime.applicationCommands?.preferences
        if (preferencesCommand === undefined) {
          return context.createToolError(WebMcpErrorCode.Unsupported, i18n.t('webmcp.messages.preferences_save_failed'))
        }
        const result = await preferencesCommand.update(after, { signal: options?.signal })
        if (!result.ok) {
          return createCommandToolError(result, i18n.t('webmcp.messages.preferences_save_failed'))
        }
        context.setUndoOperation({
          description: i18n.t('webmcp.undo.update_app_preferences'),
          undo: async () => (await preferencesCommand.update(before, { expectedRevision: result.revision })).ok,
          canUndo: () => preferencesCommand.getSnapshot().digest === result.digest,
        })
        return { applied: true, before, after: result.value, revision: result.revision }
      },
    },
    {
      name: WebMcpToolName.UpdateCalculationSettings,
      title: i18n.t('webmcp.tools.update_calculation_settings.title'),
      description: i18n.t('webmcp.tools.update_calculation_settings.description'),
      inputSchema: calculationUpdateSchema,
      annotations: updateAnnotations,
      execute: async (input, options) => {
        // 計算設定は、入力確認・条件作成・保存・画面反映の順で更新する
        if (context.isExecutionAborted(options))
          return context.createToolError(WebMcpErrorCode.Aborted, i18n.t('webmcp.messages.calculation_update_aborted'))
        const preparation = prepareCalculationUpdate(context, input)
        if (!preparation.ok) return preparation.error
        if (context.isExecutionAborted(options))
          return context.createToolError(WebMcpErrorCode.Aborted, i18n.t('webmcp.messages.calculation_update_aborted'))
        return saveCalculationUpdate(context, preparation.prepared, options)
      },
    },
  ]
}

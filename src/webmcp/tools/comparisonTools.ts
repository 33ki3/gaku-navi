/** サポートカード点数と最適編成を比較するWebMCPツール */
import type { CalculationCardVariant } from '../../application/query/calculationQuery'
import { createCalculationDigest, createCalculationQuery } from '../../application/query/calculationQuery'
import type { UnitOptimizationVariant } from '../../application/query/unitOptimizationQuery'
import { createUnitOptimizationQuery } from '../../application/query/unitOptimizationQuery'
import * as constant from '../../constant'
import i18n from '../../i18n'
import { ApplicationOperationStatus } from '../../types/application'
import type { UnitSimulatorSettings } from '../../types/unit'
import * as webMcpConstant from '../constants'
import type { WebMcpToolError, WebMcpToolFactoryContext } from '../context'
import { asInputRecord } from '../context'
import { parseCalculationVariantPatch, parseSupportCardComparisonPatch } from '../input'
import { createCardSummary, createScoreResult, createUnitResultSummary } from '../results'
import { calculationVariantPatchSchema, readOnlyAnnotations, supportCardComparisonPatchSchema } from '../schemas'
import type { WebMcpToolExecuteOptions } from '../types'
import { WebMcpErrorCode, WebMcpSchemaField, type WebMcpToolDefinition, WebMcpToolName } from '../types'

/** 入力配列上の位置と、検証済みvariant配列上の位置を対応付けた点数比較項目 */
type ParsedScoreVariant =
  | { ok: true; index: number; validIndex: number; label: string; error?: never }
  | { ok: false; index: number; validIndex?: never; label?: string; error: WebMcpToolError }

/** 入力配列上の位置と、検証済みvariant配列上の位置を対応付けた最適編成比較項目 */
type ParsedUnitVariant =
  | { ok: true; index: number; validIndex: number; label: string; error?: never }
  | { ok: false; index: number; validIndex?: never; label?: string; error: WebMcpToolError }

/**
 * 最適編成の候補が存在しない理由を、入力不備と区別できる形で返す
 *
 * @param settings - 判定対象の最適編成設定
 * @param context - エラー生成を含む共通の操作情報
 * @returns 実行不能理由を表すツールエラー
 */
function createNoFeasibleUnitError(settings: UnitSimulatorSettings, context: WebMcpToolFactoryContext) {
  // SP条件の合計が編成上限を超える場合は、SP条件が原因の実行不能として返す
  const spTotal = settings.spConstraint.vocal + settings.spConstraint.dance + settings.spConstraint.visual
  if (spTotal > constant.SP_TOTAL_MAX) {
    return context.createToolError(
      WebMcpErrorCode.NoFeasibleUnit,
      i18n.t('webmcp.messages.no_feasible_sp_total', { unitSize: constant.UNIT_SIZE }),
    )
  }

  // タイプ別の下限合計が編成枚数を超える場合は、下限制約が原因の実行不能として返す
  const typeMinTotal = Object.values(settings.typeCountMin).reduce((sum, value) => sum + value, 0)
  if (typeMinTotal > constant.UNIT_SIZE) {
    return context.createToolError(
      WebMcpErrorCode.NoFeasibleUnit,
      i18n.t('webmcp.messages.no_feasible_type_min_total', { unitSize: constant.UNIT_SIZE }),
    )
  }
  // タイプ別の上限合計が編成枚数に届かない場合は、上限制約が原因の実行不能として返す
  const typeMaxTotal = Object.values(settings.typeCountMax).reduce((sum, value) => sum + value, 0)
  if (typeMaxTotal < constant.UNIT_SIZE) {
    return context.createToolError(
      WebMcpErrorCode.NoFeasibleUnit,
      i18n.t('webmcp.messages.no_feasible_type_max_total', { unitSize: constant.UNIT_SIZE }),
    )
  }

  return context.createToolError(WebMcpErrorCode.NoFeasibleUnit, i18n.t('webmcp.messages.no_feasible_constraints'))
}

/**
 * 現在条件が変わった比較結果を、再実行が必要なエラーへ変換する
 *
 * @param context - エラー生成を含む共通の操作情報
 * @returns 条件が変わったため再実行が必要なツールエラー
 */
function createScoreComparisonStaleError(context: WebMcpToolFactoryContext) {
  return context.createToolError(WebMcpErrorCode.Stale, i18n.t('webmcp.messages.score_comparison_stale'))
}

/**
 * 現在条件が変わった最適編成比較を、再実行が必要なエラーへ変換する
 *
 * @param context - エラー生成を含む共通の操作情報
 * @returns 条件が変わったため再実行が必要なツールエラー
 */
function createUnitComparisonStaleError(context: WebMcpToolFactoryContext) {
  return context.createToolError(WebMcpErrorCode.Stale, i18n.t('webmcp.messages.unit_comparison_stale'))
}

/** サポートカード比較の入力を検証し、保存値を変更せずに各variantを計算する */
function executeCompareSupportCardScores(
  context: WebMcpToolFactoryContext,
  input: Record<string, unknown>,
  options?: WebMcpToolExecuteOptions,
) {
  // 比較開始時点の条件を基準に固定し、
  // 各比較条件が互いの変更を引き継がないようにする
  if (typeof input.cardName !== 'string' || input.cardName.trim() === '') {
    return context.createToolError(
      WebMcpErrorCode.InvalidInput,
      i18n.t('webmcp.messages.comparison_card_name_required'),
    )
  }
  if (
    !Array.isArray(input.variants) ||
    input.variants.length < 1 ||
    input.variants.length > webMcpConstant.WEB_MCP_MAX_SCORE_COMPARISON_VARIANTS
  ) {
    return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.score_variants_range'))
  }

  const runtime = context.getRuntime()
  const snapshot = runtime.getCalculationSnapshot()
  const baseCard = snapshot.cardByName.get(input.cardName)
  if (!baseCard) {
    return context.createToolError(
      WebMcpErrorCode.NotFound,
      i18n.t('webmcp.messages.card_not_found', { cardName: input.cardName }),
    )
  }

  const query = createCalculationQuery(snapshot, {
    getCurrentDigest: () => createCalculationDigest(runtime.getCalculationSnapshot()),
  })
  const parsedVariants: ParsedScoreVariant[] = []
  const validVariants: CalculationCardVariant[] = []
  for (const [index, rawVariant] of input.variants.entries()) {
    // 比較条件ごとに中止を確認し、条件数が多くても中止要求へ応答する
    if (context.isExecutionAborted(options))
      return context.createToolError(WebMcpErrorCode.Aborted, i18n.t('webmcp.messages.score_comparison_aborted'))
    const variantInput = asInputRecord(rawVariant)
    if (variantInput === null || variantInput.patch === undefined) {
      parsedVariants.push({
        ok: false,
        index,
        error: context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.patch_required')),
      })
      continue
    }
    const label = variantInput.label === undefined ? `variant_${index + 1}` : variantInput.label
    if (typeof label !== 'string') {
      parsedVariants.push({
        ok: false,
        index,
        error: context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.label_string')),
      })
      continue
    }
    const patch = parseSupportCardComparisonPatch(variantInput.patch)
    if (patch === null) {
      parsedVariants.push({
        ok: false,
        index,
        label,
        error: context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.score_patch_invalid')),
      })
      continue
    }
    const validIndex = validVariants.length
    validVariants.push({ label, patch })
    parsedVariants.push({ ok: true, index, validIndex, label })
  }

  const comparison = query.compareCardScores(input.cardName, validVariants, { signal: options?.signal })
  if (comparison.status === ApplicationOperationStatus.Aborted) {
    return context.createToolError(WebMcpErrorCode.Aborted, i18n.t('webmcp.messages.score_comparison_aborted'))
  }
  if (comparison.status === ApplicationOperationStatus.Stale) return createScoreComparisonStaleError(context)

  const variants = parsedVariants.map((parsedVariant) => {
    if (!parsedVariant.ok) {
      return {
        index: parsedVariant.index,
        ...(parsedVariant.label === undefined ? {} : { label: parsedVariant.label }),
        valid: false,
        error: parsedVariant.error,
      }
    }

    const result = comparison.variants.find((candidate) => candidate.index === parsedVariant.validIndex)
    if (!result || !result.valid) {
      return {
        index: parsedVariant.index,
        label: parsedVariant.label,
        valid: false,
        error: context.createToolError(WebMcpErrorCode.InvalidVariant, i18n.t('webmcp.messages.score_variant_invalid')),
      }
    }

    return {
      index: parsedVariant.index,
      label: parsedVariant.label,
      valid: true,
      ...createScoreResult(result.snapshot ?? query.baseline.snapshot, baseCard),
    }
  })

  return {
    card: createCardSummary(baseCard),
    current: createScoreResult(query.baseline.snapshot, baseCard),
    variants,
  }
}

/** 最適編成の比較入力を検証し、保存値を変更せずに各variantを計算する */
async function executeCompareUnitOptimizations(
  context: WebMcpToolFactoryContext,
  input: Record<string, unknown>,
  options?: WebMcpToolExecuteOptions,
) {
  // 最適編成比較も同じ基準条件から開始し、保存値や前の比較条件を変更しない
  if (
    !Array.isArray(input.variants) ||
    input.variants.length < 1 ||
    input.variants.length > webMcpConstant.WEB_MCP_MAX_UNIT_COMPARISON_VARIANTS
  ) {
    return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.unit_variants_range'))
  }

  const runtime = context.getRuntime()
  const snapshot = runtime.getCalculationSnapshot()
  const query = createUnitOptimizationQuery(snapshot, {
    getCurrentDigest: () => createCalculationDigest(runtime.getCalculationSnapshot()),
  })
  const parsedVariants: ParsedUnitVariant[] = []
  const validVariants: UnitOptimizationVariant[] = []
  for (const [index, rawVariant] of input.variants.entries()) {
    // 総当たり計算は時間がかかるため、各比較条件の開始前に中止を確認する
    if (context.isExecutionAborted(options))
      return context.createToolError(WebMcpErrorCode.Aborted, i18n.t('webmcp.messages.unit_comparison_aborted'))
    const variantInput = asInputRecord(rawVariant)
    if (variantInput === null || variantInput.patch === undefined) {
      parsedVariants.push({
        ok: false,
        index,
        error: context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.patch_required')),
      })
      continue
    }
    const label = variantInput.label === undefined ? `variant_${index + 1}` : variantInput.label
    if (typeof label !== 'string') {
      parsedVariants.push({
        ok: false,
        index,
        error: context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.label_string')),
      })
      continue
    }
    const patch = parseCalculationVariantPatch(variantInput.patch)
    if (patch === null) {
      parsedVariants.push({
        ok: false,
        index,
        label,
        error: context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.unit_patch_invalid')),
      })
      continue
    }
    const validIndex = validVariants.length
    validVariants.push({ label, patch })
    parsedVariants.push({ ok: true, index, validIndex, label })
  }

  const comparison = await query.compare(validVariants, { signal: options?.signal })
  if (comparison.status === ApplicationOperationStatus.Aborted) {
    return context.createToolError(WebMcpErrorCode.Aborted, i18n.t('webmcp.messages.unit_comparison_aborted'))
  }
  if (comparison.status === ApplicationOperationStatus.Stale) return createUnitComparisonStaleError(context)

  const variants = parsedVariants.map((parsedVariant) => {
    if (!parsedVariant.ok) {
      return {
        index: parsedVariant.index,
        ...(parsedVariant.label === undefined ? {} : { label: parsedVariant.label }),
        valid: false,
        error: parsedVariant.error,
      }
    }

    const result = comparison.variants.find((candidate) => candidate.index === parsedVariant.validIndex)
    if (!result || !result.valid) {
      return {
        index: parsedVariant.index,
        label: parsedVariant.label,
        valid: false,
        error: context.createToolError(WebMcpErrorCode.InvalidVariant, i18n.t('webmcp.messages.unit_variant_invalid')),
      }
    }
    if (result.result === undefined) {
      return {
        index: parsedVariant.index,
        label: parsedVariant.label,
        valid: false,
        error: context.createToolError(WebMcpErrorCode.InvalidVariant, i18n.t('webmcp.messages.unit_variant_invalid')),
      }
    }
    if (result.result === null) {
      return {
        index: parsedVariant.index,
        label: parsedVariant.label,
        valid: false,
        error: createNoFeasibleUnitError(
          result.snapshot?.unitSettings ?? query.baseline.snapshot.unitSettings,
          context,
        ),
      }
    }

    return {
      index: parsedVariant.index,
      label: parsedVariant.label,
      valid: true,
      result: createUnitResultSummary(result.result),
    }
  })

  return { variants }
}

/**
 * 条件比較・最適編成比較のツールを返す
 *
 * @param context - 現在の計算状態とエラー生成を含む共通の操作情報
 * @returns カード点数・最適編成比較のWebMCPツール定義
 */
export function createComparisonTools(context: WebMcpToolFactoryContext): WebMcpToolDefinition[] {
  return [
    {
      name: WebMcpToolName.CompareSupportCardScores,
      title: i18n.t('webmcp.tools.compare_support_card_scores.title'),
      description: i18n.t('webmcp.tools.compare_support_card_scores.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.CardName]: { type: 'string', description: i18n.t('webmcp.schema.comparison_card_name') },
          [WebMcpSchemaField.Variants]: {
            type: 'array',
            minItems: 1,
            maxItems: webMcpConstant.WEB_MCP_MAX_SCORE_COMPARISON_VARIANTS,
            items: {
              type: 'object',
              properties: {
                [WebMcpSchemaField.Label]: { type: 'string' },
                [WebMcpSchemaField.Patch]: supportCardComparisonPatchSchema,
              },
              required: [WebMcpSchemaField.Patch],
              additionalProperties: false,
            },
          },
        },
        required: [WebMcpSchemaField.CardName, WebMcpSchemaField.Variants],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (input, options) => executeCompareSupportCardScores(context, input, options),
    },
    {
      name: WebMcpToolName.CompareUnitOptimizations,
      title: i18n.t('webmcp.tools.compare_unit_optimizations.title'),
      description: i18n.t('webmcp.tools.compare_unit_optimizations.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.Variants]: {
            type: 'array',
            minItems: 1,
            maxItems: webMcpConstant.WEB_MCP_MAX_UNIT_COMPARISON_VARIANTS,
            items: {
              type: 'object',
              properties: {
                [WebMcpSchemaField.Label]: { type: 'string' },
                [WebMcpSchemaField.Patch]: calculationVariantPatchSchema,
              },
              required: [WebMcpSchemaField.Patch],
              additionalProperties: false,
            },
          },
        },
        required: [WebMcpSchemaField.Variants],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (input, options) => executeCompareUnitOptimizations(context, input, options),
    },
  ]
}

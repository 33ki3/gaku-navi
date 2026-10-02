/**
 * 同じ計算条件を基準に、最適編成の条件を比較する問い合わせ処理
 *
 * 各比較条件は同じ基準から独立して作り、保存状態や通常画面の設定を変更しない
 * 重い探索は画面操作とWebMCPが共有する計算処理へ渡す
 */
import { ApplicationOperationStatus, DomainIssueCode } from '../../types/application'
import type {
  CalculationRevision,
  CalculationSnapshot,
  CalculationSnapshotEnvelope,
  CalculationVariantPatch,
} from '../../types/calculation'
import type { UnitResult } from '../../types/unit'
import { createOptimizeInput } from '../../utils/calculationSnapshot'
import { runUnitOptimizer } from '../unitOptimizerRunner'
import {
  type CalculationQueryExecutionState,
  type CalculationQueryFactoryOptions,
  type CalculationQueryRunOptions,
  type CalculationQueryStatus,
  createCalculationQuery,
} from './calculationQuery'

/** 最適編成比較の1条件 */
export interface UnitOptimizationVariant {
  /** 結果へ表示する任意のラベル */
  label?: string
  /** 基準条件へ適用する一時差分 */
  patch: CalculationVariantPatch
}

/** 最適編成の比較条件ごとの結果 */
interface UnitOptimizationVariantResult {
  /** 入力配列内の位置 */
  index: number
  /** 入力で指定されたラベル */
  label?: string
  /** 計算可能な比較条件か */
  valid: boolean
  /** 最適編成結果。候補がない場合はnull */
  result?: UnitResult | null
  /** 計算に使った条件。不正な条件ではundefined */
  snapshot?: CalculationSnapshot
  /** 不正理由。詳細な表示文言への変換は利用側が担当する */
  error?: typeof DomainIssueCode.InvalidVariant
}

/** 最適編成比較の実行設定 */
interface UnitOptimizationQueryRunOptions extends CalculationQueryRunOptions {
  /** 比較条件ごとの進捗通知 */
  onProgress?: (variantIndex: number, done: number, total: number) => void
  /** 探索途中の最良結果通知 */
  onBetter?: (variantIndex: number, result: UnitResult) => void
}

/** 最適編成比較結果 */
interface UnitOptimizationComparisonResult extends CalculationRevision {
  /** 問い合わせの終了状態 */
  status: CalculationQueryStatus
  /** 条件を固定した後に現在の設定が変わったか */
  stale: boolean
  /** 各比較条件の結果。中断・古い結果の場合は含めない */
  variants: UnitOptimizationVariantResult[]
}

/** 問い合わせ開始時点の計算条件を使う最適編成問い合わせ */
interface UnitOptimizationQuery {
  /** 問い合わせ開始時点で固定した基準条件 */
  readonly baseline: CalculationSnapshotEnvelope
  /**
   * 現在の設定と基準条件を比較し、古い結果かを返す
   *
   * @param options - 中断通知
   * @returns 現在状態との比較結果
   */
  getState(options?: CalculationQueryRunOptions): CalculationQueryExecutionState
  /**
   * 基準条件から比較用の一時条件を作る
   *
   * @param patch - 基準条件へ適用する一時差分
   * @returns 比較用の一時条件。不正な差分ならnull
   */
  applyVariant(patch: CalculationVariantPatch): CalculationSnapshot | null
  /**
   * 複数条件を同じ基準条件から独立して最適化する
   *
   * @param variants - 基準条件へ順番に適用する比較条件
   * @param options - 中断・進捗通知の設定
   * @returns 最適編成条件の比較結果
   */
  compare(
    variants: readonly UnitOptimizationVariant[],
    options?: UnitOptimizationQueryRunOptions,
  ): Promise<UnitOptimizationComparisonResult>
}

/**
 * 最適編成問い合わせを作る
 *
 * @param snapshot - 問い合わせ開始時点の計算条件
 * @param options - 現在の設定を確認する方法
 * @returns 固定した基準条件を使う最適編成問い合わせ
 */
export function createUnitOptimizationQuery(
  snapshot: CalculationSnapshot,
  options: CalculationQueryFactoryOptions = {},
): UnitOptimizationQuery {
  const calculationQuery = createCalculationQuery(snapshot, options)

  /**
   * 基準条件から最適編成を条件ごとに計算する
   *
   * @param variants - 基準条件へ順番に適用する比較条件
   * @param runOptions - 中断・進捗通知の設定
   * @returns 最適編成条件の比較結果
   */
  const compare = async (
    variants: readonly UnitOptimizationVariant[],
    runOptions: UnitOptimizationQueryRunOptions = {},
  ): Promise<UnitOptimizationComparisonResult> => {
    // 計算開始時点の状態を確認し、すでに変更された条件では探索を始めない
    const initialState = calculationQuery.getState(runOptions)
    const emptyResult = createComparisonResult(initialState, [])
    if (initialState.status !== ApplicationOperationStatus.Complete) return emptyResult

    const results: UnitOptimizationVariantResult[] = []
    for (const [index, variant] of variants.entries()) {
      // 各条件の開始前にも確認し、比較中の設定変更を古い結果として扱う
      const stateBeforeVariant = calculationQuery.getState(runOptions)
      if (stateBeforeVariant.status !== ApplicationOperationStatus.Complete)
        return createComparisonResult(stateBeforeVariant, [])

      // 前の条件を引き継がず、同じ基準条件から比較用の条件を作る
      const variantSnapshot = calculationQuery.applyVariant(variant.patch)
      if (variantSnapshot === null) {
        results.push({ index, label: variant.label, valid: false, error: DomainIssueCode.InvalidVariant })
        continue
      }

      // 重い探索を共通処理へ渡し、画面表示と外部操作で同じ計算結果を使う
      const runResult = await runUnitOptimizer({
        input: createOptimizeInput(variantSnapshot),
        signal: runOptions.signal,
        onProgress: (done, total) => runOptions.onProgress?.(index, done, total),
        onBetter: (result) => runOptions.onBetter?.(index, result),
      })
      if (runResult.status !== ApplicationOperationStatus.Complete) {
        const state = calculationQuery.getState(runOptions)
        return createComparisonResult(
          state,
          [],
          state.status === ApplicationOperationStatus.Complete ? ApplicationOperationStatus.Aborted : undefined,
        )
      }

      // 探索中に画面の設定が変わっていないことを確認してから結果を残す
      const stateAfterVariant = calculationQuery.getState(runOptions)
      if (stateAfterVariant.status !== ApplicationOperationStatus.Complete)
        return createComparisonResult(stateAfterVariant, [])
      results.push({ index, label: variant.label, valid: true, result: runResult.result, snapshot: variantSnapshot })
    }

    // 全条件の終了後にも確認し、最後の探索中に入った変更を見落とさない
    return createComparisonResult(calculationQuery.getState(runOptions), results)
  }

  return {
    baseline: calculationQuery.baseline,
    getState: calculationQuery.getState,
    applyVariant: calculationQuery.applyVariant,
    compare,
  }
}

/**
 * 計算開始時点の状態番号と内容の印を比較結果へ付ける
 *
 * @param state - 比較処理の現在状態
 * @param variants - 比較対象の結果一覧
 * @param forcedStatus - 強制する終了状態
 * @returns 状態番号と内容の印を付けた比較結果
 */
function createComparisonResult(
  state: CalculationQueryExecutionState,
  variants: UnitOptimizationVariantResult[],
  forcedStatus?: CalculationQueryStatus,
): UnitOptimizationComparisonResult {
  return {
    revision: state.revision,
    digest: state.digest,
    status: forcedStatus ?? state.status,
    stale: state.stale || forcedStatus === ApplicationOperationStatus.Stale,
    variants,
  }
}

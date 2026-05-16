/**
 * 総当たり最適化Workerで使用するメッセージ型
 *
 * フックとWorker間の通信フォーマットを1箇所に集約し、
 * 型の重複とインライン定義の複雑化を防ぐ。
 */
import type { SupportCard, ScoreSettings } from './card'
import type { UncapType } from './enums'
import type { CardCountCustom } from '../hooks/useCardCountCustom'
import type { ExhaustiveProgress, UnitResult, UnitSimulatorSettings } from './unit'

/** Workerへ渡す最適化入力（Mapは構造化複製しやすい配列へ変換する） */
export interface UnitOptimizerWorkerInput {
  settings: UnitSimulatorSettings
  scoreSettings: ScoreSettings
  cardUncaps: Record<string, UncapType>
  cardCountCustom?: CardCountCustom
  allCards: SupportCard[]
  cardByNameEntries: Array<[string, SupportCard]>
}

/** Worker通信メッセージ種別 */
export const UnitOptimizerWorkerMessageType = {
  Start: 'start',
  Progress: 'progress',
  Better: 'better',
  Done: 'done',
  Error: 'error',
} as const

/** Worker開始要求 */
export interface UnitOptimizerWorkerStartRequest {
  type: (typeof UnitOptimizerWorkerMessageType)['Start']
  payload: {
    input: UnitOptimizerWorkerInput
  }
}

/** Worker進捗通知 */
export interface UnitOptimizerWorkerProgressResponse {
  type: (typeof UnitOptimizerWorkerMessageType)['Progress']
  payload: ExhaustiveProgress
}

/** Worker中間最良結果通知 */
export interface UnitOptimizerWorkerBetterResponse {
  type: (typeof UnitOptimizerWorkerMessageType)['Better']
  payload: {
    result: UnitResult | null
  }
}

/** Worker完了通知 */
export interface UnitOptimizerWorkerDoneResponse {
  type: (typeof UnitOptimizerWorkerMessageType)['Done']
  payload: {
    result: UnitResult | null
  }
}

/** Worker異常通知 */
export interface UnitOptimizerWorkerErrorResponse {
  type: (typeof UnitOptimizerWorkerMessageType)['Error']
  payload: {
    message: string
  }
}

/** Worker要求メッセージ */
export type UnitOptimizerWorkerRequestMessage = UnitOptimizerWorkerStartRequest

/** Worker応答メッセージ */
export type UnitOptimizerWorkerResponseMessage =
  | UnitOptimizerWorkerProgressResponse
  | UnitOptimizerWorkerBetterResponse
  | UnitOptimizerWorkerDoneResponse
  | UnitOptimizerWorkerErrorResponse

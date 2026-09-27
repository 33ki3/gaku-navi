/**
 * バックグラウンド総当たり計算で使うメッセージ型
 *
 * 画面とバックグラウンド計算の間で同じ形式を使い、
 * 計算開始・進捗・完了の通知を取り違えないようにする
 */
import type { CardCountCustom, ScoreSettings, SupportCard } from './card'
import type { UncapType } from './enums'
import type { ExhaustiveProgress, UnitResult, UnitSimulatorSettings } from './unit'

/** バックグラウンド計算へ渡す最適化入力。カード一覧は名前から探せる形に整える */
export interface UnitOptimizerWorkerInput {
  settings: UnitSimulatorSettings
  scoreSettings: ScoreSettings
  cardUncaps: Record<string, UncapType>
  cardCountCustom?: CardCountCustom
  allCards: SupportCard[]
  /** 最適編成から除外するサポート名 */
  excludedCardNames: readonly string[]
}

/** バックグラウンド計算との通信メッセージ種別 */
export const UnitOptimizerWorkerMessageType = {
  Start: 'start',
  Progress: 'progress',
  Better: 'better',
  Done: 'done',
  Error: 'error',
} as const

/** バックグラウンド計算の開始要求 */
export interface UnitOptimizerWorkerStartRequest {
  type: (typeof UnitOptimizerWorkerMessageType)['Start']
  payload: {
    input: UnitOptimizerWorkerInput
  }
}

/** バックグラウンド計算の進捗通知 */
export interface UnitOptimizerWorkerProgressResponse {
  type: (typeof UnitOptimizerWorkerMessageType)['Progress']
  payload: ExhaustiveProgress
}

/** バックグラウンド計算中に見つかった最良結果の通知 */
export interface UnitOptimizerWorkerBetterResponse {
  type: (typeof UnitOptimizerWorkerMessageType)['Better']
  payload: {
    result: UnitResult | null
  }
}

/** バックグラウンド計算の完了通知 */
export interface UnitOptimizerWorkerDoneResponse {
  type: (typeof UnitOptimizerWorkerMessageType)['Done']
  payload: {
    result: UnitResult | null
  }
}

/** バックグラウンド計算の異常通知 */
export interface UnitOptimizerWorkerErrorResponse {
  type: (typeof UnitOptimizerWorkerMessageType)['Error']
  payload: {
    message: string
  }
}

/** バックグラウンド計算へ送るメッセージ */
export type UnitOptimizerWorkerRequestMessage = UnitOptimizerWorkerStartRequest

/** バックグラウンド計算から受け取るメッセージ */
export type UnitOptimizerWorkerResponseMessage =
  | UnitOptimizerWorkerProgressResponse
  | UnitOptimizerWorkerBetterResponse
  | UnitOptimizerWorkerDoneResponse
  | UnitOptimizerWorkerErrorResponse

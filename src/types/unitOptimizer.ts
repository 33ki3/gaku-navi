/**
 * 最適編成計算の実行入力と入力構築関数の型
 *
 * 画面側・バックグラウンド計算・比較処理で同じ入力を使えるようにする
 */
import type { CardCountCustom, ScoreSettings, SupportCard } from './card'
import type { UncapType } from './enums'
import type { UnitSimulatorSettings } from './unit'

/** 最適編成計算へ渡す実行入力 */
export interface OptimizeInput {
  /** 最適編成設定 */
  settings: UnitSimulatorSettings
  /** 点数設定 */
  scoreSettings: ScoreSettings
  /** サポートごとの凸数 */
  cardUncaps: Record<string, UncapType>
  /** サポートごとの回数調整 */
  cardCountCustom?: CardCountCustom
  /** ユーザー追加分を含む全サポート */
  allCards: SupportCard[]
  /** サポート名からサポートを探す表 */
  cardByName: Map<string, SupportCard>
  /** 最適編成から除外するサポート名 */
  excludedCardNames: readonly string[]
}

/** 設定と回数調整から最適編成の実行入力を作る関数 */
export type BuildUnitRuntimeInput = (
  settings: UnitSimulatorSettings,
  customCardCount?: CardCountCustom,
) => OptimizeInput

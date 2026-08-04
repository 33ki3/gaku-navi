/**
 * 最適編成計算の実行入力と入力構築関数の型。
 *
 * 計算ユーティリティ・Worker・状態hookで共有するため、実装層ではなくtypesへ置く。
 */
import type { CardCountCustom } from '../hooks/useCardCountCustom'
import type { ScoreSettings, SupportCard } from './card'
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
  /** サポート名からサポートを引くマップ */
  cardByName: Map<string, SupportCard>
}

/** 設定と回数調整から最適編成の実行入力を作る関数 */
export type BuildUnitRuntimeInput = (
  settings: UnitSimulatorSettings,
  customCardCount?: CardCountCustom,
) => OptimizeInput

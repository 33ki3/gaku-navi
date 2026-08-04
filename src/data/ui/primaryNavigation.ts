/**
 * PC・スマホの主要ナビゲーション表示順を定義するUIマスタ。
 * 項目のラベル・操作・選択状態は描画側から受け取る。
 */
import { PrimaryNavigationKey } from '../../types/enums'

/** PC・ヘッダー用の標準順 */
export const DESKTOP_PRIMARY_NAVIGATION_ORDER: readonly PrimaryNavigationKey[] = [
  PrimaryNavigationKey.Uncap,
  PrimaryNavigationKey.Simulator,
  PrimaryNavigationKey.ScoreSettings,
]

/** スマホ下部メニュー用の順序。最適編成を中央へ置く */
export const MOBILE_PRIMARY_NAVIGATION_ORDER: readonly PrimaryNavigationKey[] = [
  PrimaryNavigationKey.Uncap,
  PrimaryNavigationKey.ScoreSettings,
  PrimaryNavigationKey.Simulator,
]

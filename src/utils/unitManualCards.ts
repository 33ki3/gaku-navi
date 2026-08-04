/**
 * 手動編成のカード名と計算結果の対応を判定するユーティリティ。
 *
 * パネルを閉じた状態でカードを追加すると設定だけ先に保存され、計算結果は次回のマウントまで古いままになることがある。この判定を
 * 表示側と再計算側で共有し、古い結果を現在の編成として表示しない
 */
import type { UnitResult } from '../types/unit'

/**
 * 計算結果が手動編成のカード集合と一致しているか判定する
 *
 * @param result - 現在表示可能な計算結果
 * @param manualCards - スロット順の手動編成カード名（null は空き）
 * @returns カード枚数・スロット順・レンタル枠が一致している場合は true
 */
export function isUnitResultSynchronized(result: UnitResult | null, manualCards: readonly (string | null)[]): boolean {
  const manualNames = manualCards.filter((name): name is string => name !== null)
  if (result === null) return manualNames.length === 0
  if (result.members.length !== manualNames.length) return false

  // 計算結果はレンタル枠を末尾に揃えて保存するため、同じ順へ正規化して比較する
  const resultNames = [
    ...result.members.filter((member) => !member.isRental).map((member) => member.card.name),
    ...result.members.filter((member) => member.isRental).map((member) => member.card.name),
  ]
  return manualNames.every((name, index) => resultNames[index] === name)
}

/**
 * 手動編成のカード名と計算結果の対応を判定するユーティリティ。
 *
 * パネルを閉じた状態でカードを追加すると設定だけ先に保存され、計算結果は次回のマウントまで古いままになることがある。この判定を
 * 再計算側で使用し、現在の編成と異なる計算結果を表示し続けない
 */
import type { UnitResult } from '../types/unit'

/**
 * 現在の選択カード一覧・レンタル指定と、計算済みの編成メンバー・採用方法を比較する
 *
 * @param result - 現在表示可能な計算結果
 * @param selectedCards - 選択カード名（nullは未選択として扱う）
 * @param rentalCardName - レンタルとして選択したカード名
 * @returns カード集合と採用方法が一致している場合はtrue
 */
export function isUnitResultSynchronized(
  result: UnitResult | null,
  selectedCards: readonly (string | null)[],
  rentalCardName: string | null,
): boolean {
  const selectedNames = selectedCards.filter((name): name is string => name !== null)
  if (result === null) return selectedNames.length === 0
  if (result.members.length !== selectedNames.length) return false

  // 通常カードの順序は得点に影響しないが、レンタル指定は凸数や連携の評価を変える
  const resultNames = new Set(result.members.map((member) => member.card.name))
  const selectedRental = selectedNames.includes(rentalCardName ?? '') ? rentalCardName : null
  const resultRental = result.members.find((member) => member.isRental)?.card.name ?? null
  return resultRental === selectedRental && selectedNames.every((name) => resultNames.has(name))
}

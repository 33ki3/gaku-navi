/**
 * スコア内訳のカテゴリ別リストコンポーネント
 *
 * イベントブースト・アビリティ・パラメータボーナス・Pアイテムの
 * 内訳をセクションごとに表示する。
 * 何も内訳がない場合は何も描画しない。
 */
import type { CardCalculationResult } from '../../types/card'
import { EventBoostSection } from './EventBoostSection'
import { AbilitySection } from './AbilitySection'
import { PItemSection } from './PItemSection'

/** AbilityBreakdownList コンポーネントに渡すプロパティ */
interface AbilityBreakdownListProps {
  /** スコア計算結果 */
  result: CardCalculationResult
}

/** スコア内訳リスト */
export function AbilityBreakdownList({ result }: AbilityBreakdownListProps) {
  // アビリティ（nameKey あり）とPアイテム（displayName あり）に分ける
  const abilities = result.allAbilityDetails.filter((ab) => ab.nameKey != null)
  const pItems = result.allAbilityDetails.filter((ab) => ab.displayName != null)

  // 各セクションに表示するものがあるか判定
  const hasEvent = result.eventBoost > 0 || result.eventBoostBase > 0
  const hasParamBonus = result.paramBonusPercent > 0
  const hasAbilities = abilities.length > 0
  const hasPItems = pItems.length > 0

  // 全セクションが空（イベント効果もアビリティもPアイテムもない）なら何も表示しない
  if (!hasEvent && !hasParamBonus && !hasAbilities && !hasPItems) return null

  // 内訳をセクションごとに縦に並べる（該当するものだけ描画）
  return (
    <div className="space-y-2">
      {/* イベントブースト（イベントによるスコア加算） */}
      {hasEvent && <EventBoostSection result={result} />}
      {/* アビリティ＋パラメータボーナス */}
      {(hasAbilities || hasParamBonus) && (
        <AbilitySection result={result} abilities={abilities} hasParamBonus={hasParamBonus} />
      )}
      {/* Pアイテムによるパラメータ上昇 */}
      {hasPItems && <PItemSection pItems={pItems} />}
    </div>
  )
}

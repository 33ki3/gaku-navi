/**
 * 初編パラメータボーナス内訳コンポーネント
 *
 * 単一テーブルと合計フッターを表示する。
 */
import type { ParameterBonusBreakdownRow } from '../../../utils/calculator/parameterBonus'
import { BreakdownTableHeader } from '../BreakdownTableHeader'
import { ParamBonusBreakdownRow } from '../ParamBonusBreakdownRow'
import { BreakdownFooter } from '../BreakdownFooter'
import { HajimeKindCell } from './HajimeKindCell'

/** 初編内訳（単一テーブル + 合計フッター） */
interface HajimeParamBonusBreakdownProps {
  breakdown: ParameterBonusBreakdownRow[]
}

export function HajimeParamBonusBreakdown({ breakdown }: HajimeParamBonusBreakdownProps) {
  return (
    <>
      <div>
        <table className="w-full text-[10px]">
          <BreakdownTableHeader />
          <tbody>
            {breakdown.map((row, i) => (
              <ParamBonusBreakdownRow
                key={String(i)}
                row={row}
                weekLabel={row.week}
                kindCell={<HajimeKindCell row={row} />}
              />
            ))}
          </tbody>
        </table>
      </div>
      <BreakdownFooter rows={breakdown} />
    </>
  )
}

/**
 * HIF 内訳テーブルのステージ別表示コンポーネント。
 *
 * 選抜または本選の週内訳を1テーブルとして表示する。
 */
import type { ParameterBonusBreakdownRow } from '../../../utils/calculator/parameterBonus'
import * as enums from '../../../types/enums'

import { BreakdownTableHeader } from '../BreakdownTableHeader'
import { ParamBonusBreakdownRow } from '../ParamBonusBreakdownRow'
import { HifClassKindCell } from './HifClassKindCell'
import { HifExamKindCell } from './HifExamKindCell'
import { HifLessonKindCell } from './HifLessonKindCell'

/** HifStageTable コンポーネントに渡すプロパティ */
interface HifStageTableProps {
  /** ステージ表示ラベル */
  stageLabel: string
  /** 対象ステージの内訳行 */
  rows: ParameterBonusBreakdownRow[]
  /** 週番号表示オフセット */
  weekOffset: number
}

/**
 * HIF ステージテーブル（選抜または本選）を表示する。
 *
 * @param props - コンポーネントプロパティ
 * @returns ステージテーブル要素
 */
export function HifStageTable({ stageLabel, rows, weekOffset }: HifStageTableProps) {
  return (
    <div>
      <div className="text-slate-600 font-black text-[10px] mb-1">{stageLabel}</div>
      <table className="w-full text-[10px]">
        <BreakdownTableHeader />
        <tbody>
          {rows.map((row, i) => (
            <ParamBonusBreakdownRow
              key={String(i)}
              row={row}
              weekLabel={row.week - weekOffset}
              kindCell={
                !row.rowKind ? (
                  <HifLessonKindCell row={row} />
                ) : row.rowKind.kind === enums.BreakdownRowKindType.Exam ? (
                  <HifExamKindCell examIndex={row.rowKind.examIndex} />
                ) : (
                  <HifClassKindCell row={row} />
                )
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

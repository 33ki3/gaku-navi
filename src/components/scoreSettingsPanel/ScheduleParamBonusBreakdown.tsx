/**
 * スケジュール内訳テーブルのシナリオ別出し分けコンポーネント。
 *
 * HIF は選抜/本選の2段テーブル、初編/Nia は単一テーブルを表示する。
 */
import * as enums from '../../types/enums'
import type { ParameterBonusBreakdownRow } from '../../utils/calculator/parameterBonus'
import { filterByStage } from '../../utils/hifScheduleHelpers'
import { HifParamBonusBreakdown } from './hif/HifParamBonusBreakdown'
import { HajimeParamBonusBreakdown } from './hajime/HajimeParamBonusBreakdown'

/** ScheduleParamBonusBreakdown コンポーネントに渡すプロパティ */
interface ScheduleParamBonusBreakdownProps {
  /** 週ごとの内訳データ */
  breakdown: ParameterBonusBreakdownRow[]
  /** 内訳が空の場合に表示するラベル */
  emptyLabel: string
}

/**
 * スケジュール内訳テーブルをシナリオ別に出し分ける。
 *
 * @param props - コンポーネントプロパティ
 * @returns シナリオ別内訳テーブル要素
 */
export function ScheduleParamBonusBreakdown({ breakdown, emptyLabel }: ScheduleParamBonusBreakdownProps) {
  if (breakdown.length === 0) {
    return <p className="text-slate-500 text-center py-2">{emptyLabel}</p>
  }

  const isHifBreakdown = filterByStage(breakdown, enums.HifStage.Final).length > 0
  return isHifBreakdown ? (
    <HifParamBonusBreakdown breakdown={breakdown} />
  ) : (
    <HajimeParamBonusBreakdown breakdown={breakdown} />
  )
}

/**
 * HIF 専用パラメータボーナス内訳コンポーネント
 *
 * 選抜・本選の2ステージテーブルと合計フッターを表示する。
 */
import { useTranslation } from 'react-i18next'
import type { ParameterBonusBreakdownRow } from '../../../utils/calculator/parameterBonus'
import * as enums from '../../../types/enums'
import { filterByStage } from '../../../utils/hifScheduleHelpers'
import { BreakdownFooter } from '../BreakdownFooter'
import { HifStageTable } from './HifStageTable'

/** HIF内訳（選抜/本選の2ステージテーブル + 合計フッター） */
interface HifParamBonusBreakdownProps {
  breakdown: ParameterBonusBreakdownRow[]
}

/**
 * HIF内訳（選抜/本選）を表示する。
 *
 * @param props - コンポーネントプロパティ
 * @returns HIF内訳テーブル要素
 */
export function HifParamBonusBreakdown({ breakdown }: HifParamBonusBreakdownProps) {
  const { t } = useTranslation()
  const selectionRows = filterByStage(breakdown, enums.HifStage.Selection)
  const finalRows = filterByStage(breakdown, enums.HifStage.Final)
  const finalWeekOffset = finalRows[0] !== undefined ? finalRows[0].week - 1 : 0
  return (
    <>
      <HifStageTable stageLabel={t('ui.settings.hif_stage_selection')} rows={selectionRows} weekOffset={0} />
      <HifStageTable stageLabel={t('ui.settings.hif_stage_final')} rows={finalRows} weekOffset={finalWeekOffset} />
      <BreakdownFooter rows={breakdown} />
    </>
  )
}

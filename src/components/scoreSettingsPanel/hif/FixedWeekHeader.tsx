/**
 * HIF 固定週ヘッダー表示コンポーネント。
 *
 * 試験週はヘルプツールチップを表示し、固定活動週はラベルのみ表示する。
 */
import { useTranslation } from 'react-i18next'

import type { ScheduleWeekData } from '../../../data'
import { HelpTooltip } from '../../ui/HelpTooltip'
import { getHifFixedLabel } from '../../../utils/hifScheduleHelpers'

/** FixedWeekHeader コンポーネントに渡すプロパティ */
interface FixedWeekHeaderProps {
  /** 表示対象の週データ */
  week: ScheduleWeekData
  /** 試験インデックス（試験週でなければ -1） */
  examIndex: number
}

/**
 * HIF 固定週の見出しを表示する。
 *
 * @param props - コンポーネントプロパティ
 * @returns 固定週ヘッダー要素
 */
export function FixedWeekHeader({ week, examIndex }: FixedWeekHeaderProps) {
  const { t } = useTranslation()
  return examIndex >= 0 ? (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-slate-500 font-bold leading-tight">{getHifFixedLabel(t, week, examIndex)}</span>
      <HelpTooltip text={t('ui.settings.hif_exam_ratio_help')} />
    </div>
  ) : (
    <div className="text-[10px] text-slate-500 font-bold leading-tight">{getHifFixedLabel(t, week, examIndex)}</div>
  )
}

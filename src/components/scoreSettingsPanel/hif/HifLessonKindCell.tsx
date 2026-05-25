/**
 * HIF通常レッスン行の種別セルコンポーネント。
 */
import { useTranslation } from 'react-i18next'

import type { ParameterBonusBreakdownRow } from '../../../utils/calculator/parameterBonus'
import { PARAMETER_LABELS } from '../../../data/score/parameterLabels'
import { getParameterTextColor } from '../../../data/ui'

/** HifLessonKindCell コンポーネントに渡すプロパティ */
interface HifLessonKindCellProps {
  /** 内訳行データ */
  row: ParameterBonusBreakdownRow
}

/**
 * HIF通常レッスン行の種別セルを表示する。
 *
 * @param props - コンポーネントプロパティ
 * @returns 種別セル要素
 */
export function HifLessonKindCell({ row }: HifLessonKindCellProps) {
  const { t } = useTranslation()
  return <span className={getParameterTextColor(row.attribute)}>{t(PARAMETER_LABELS[row.attribute])}</span>
}

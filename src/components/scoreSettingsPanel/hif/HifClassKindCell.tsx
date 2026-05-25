/**
 * HIF固定授業行の種別セルコンポーネント。
 */
import { useTranslation } from 'react-i18next'

import type { ParameterBonusBreakdownRow } from '../../../utils/calculator/parameterBonus'
import { PARAMETER_LABELS } from '../../../data/score/parameterLabels'
import { getParameterTextColor } from '../../../data/ui'

/** HifClassKindCell コンポーネントに渡すプロパティ */
interface HifClassKindCellProps {
  /** 内訳行データ */
  row: ParameterBonusBreakdownRow
}

/**
 * HIF固定授業行の種別セルを表示する。
 *
 * @param props - コンポーネントプロパティ
 * @returns 種別セル要素
 */
export function HifClassKindCell({ row }: HifClassKindCellProps) {
  const { t } = useTranslation()
  return (
    <>
      <span className="text-slate-600">{t('ui.settings.hif_class_label')}（</span>
      <span className={getParameterTextColor(row.attribute)}>{t(PARAMETER_LABELS[row.attribute])}</span>
      <span className="text-slate-500">）</span>
    </>
  )
}

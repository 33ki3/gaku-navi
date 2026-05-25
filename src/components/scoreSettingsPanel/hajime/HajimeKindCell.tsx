/**
 * 初編内訳テーブルの種別セルコンポーネント。
 *
 * 単属性レッスンと複合属性レッスン（主属性+副属性）の
 * ラベル表示を担当する。
 */
import { useTranslation } from 'react-i18next'

import type { ParameterBonusBreakdownRow } from '../../../utils/calculator/parameterBonus'
import { PARAMETER_LABELS } from '../../../data/score/parameterLabels'
import { getParameterTextColor } from '../../../data/ui'

/** HajimeKindCell コンポーネントに渡すプロパティ */
interface HajimeKindCellProps {
  /** 内訳行データ */
  row: ParameterBonusBreakdownRow
}

/**
 * 初編レッスン行の種別セルを表示する。
 *
 * @param props - 種別セル表示に必要な内訳行データ
 * @returns 種別セル要素
 */
export function HajimeKindCell({ row }: HajimeKindCellProps) {
  const { t } = useTranslation()
  const mainLabel = t(PARAMETER_LABELS[row.attribute])
  const subLabel = row.subAttribute ? t(PARAMETER_LABELS[row.subAttribute]) : null
  if (subLabel) {
    return (
      <>
        <span className={getParameterTextColor(row.attribute)}>{mainLabel}</span>
        <span className="text-slate-500">（</span>
        <span className={getParameterTextColor(row.subAttribute!)}>{subLabel}</span>
        <span className="text-slate-500">）</span>
      </>
    )
  }
  return <span className={getParameterTextColor(row.attribute)}>{mainLabel}</span>
}

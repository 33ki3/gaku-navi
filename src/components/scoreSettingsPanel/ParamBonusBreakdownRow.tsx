/**
 * パラメータボーナス内訳テーブルの1行表示コンポーネント。
 *
 * 週番号・種別セル・Vo/Da/Vi 上昇値を1行で表示する。
 * 種別セルは呼び出し側で注入して HIF/初編の差分を吸収する。
 */
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

import * as enums from '../../types/enums'
import { getParameterTextColor } from '../../data/ui'
import type { ParameterBonusBreakdownRow } from '../../utils/calculator/parameterBonus'

/** ParamBonusBreakdownRow コンポーネントに渡すプロパティ */
interface BreakdownValueCellsProps {
  /** 内訳行データ */
  row: ParameterBonusBreakdownRow
  /** 表示する週番号 */
  weekLabel: number
  /** 種別セル（属性/試験名など） */
  kindCell: ReactNode
}

/**
 * 内訳1行（週・種別・Vo/Da/Vi）を表示する。
 *
 * @param props - 行表示に必要なセルデータ
 * @returns 内訳行要素
 */
export function ParamBonusBreakdownRow({ row, weekLabel, kindCell }: BreakdownValueCellsProps) {
  const { t } = useTranslation()
  const voColor = getParameterTextColor(enums.ParameterType.Vocal)
  const daColor = getParameterTextColor(enums.ParameterType.Dance)
  const viColor = getParameterTextColor(enums.ParameterType.Visual)
  return (
    <tr className="border-b border-slate-50">
      <td className="py-0.5 text-slate-600">
        {weekLabel}
        {t('ui.unit.week')}
      </td>
      <td className="py-0.5 font-bold">{kindCell}</td>
      <td className={`text-right py-0.5 px-2 ${row.vocal > 0 ? `font-bold ${voColor}` : 'text-slate-500'}`}>
        {t('ui.symbol.plus')}
        {row.vocal}
      </td>
      <td className={`text-right py-0.5 px-2 ${row.dance > 0 ? `font-bold ${daColor}` : 'text-slate-500'}`}>
        {t('ui.symbol.plus')}
        {row.dance}
      </td>
      <td className={`text-right py-0.5 px-2 ${row.visual > 0 ? `font-bold ${viColor}` : 'text-slate-500'}`}>
        {t('ui.symbol.plus')}
        {row.visual}
      </td>
    </tr>
  )
}

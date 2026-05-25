/**
 * パラメータボーナス内訳テーブルの合計フッターコンポーネント。
 *
 * 内訳行の Vo/Da/Vi を合算して、テーブル下部に合計値を表示する。
 */
import { useTranslation } from 'react-i18next'

import * as enums from '../../types/enums'
import type { ParameterBonusBreakdownRow } from '../../utils/calculator/parameterBonus'
import { getParameterTextColor } from '../../data/ui'

/** BreakdownFooter コンポーネントに渡すプロパティ */
interface BreakdownFooterProps {
  /** 合計対象の内訳行 */
  rows: ParameterBonusBreakdownRow[]
}
/**
 * 内訳行配列から合計値を計算してフッター表示する。
 *
 * @param props - 合計対象の内訳行
 * @returns 合計表示フッター要素
 */
export function BreakdownFooter({ rows }: BreakdownFooterProps) {
  const { t } = useTranslation()
  const voColor = getParameterTextColor(enums.ParameterType.Vocal)
  const daColor = getParameterTextColor(enums.ParameterType.Dance)
  const viColor = getParameterTextColor(enums.ParameterType.Visual)
  const total = rows.reduce(
    (acc, r) => ({ vocal: acc.vocal + r.vocal, dance: acc.dance + r.dance, visual: acc.visual + r.visual }),
    { vocal: 0, dance: 0, visual: 0 },
  )
  return (
    <div className="border-t border-slate-200 pt-1">
      <div className="text-slate-700 font-black text-[10px]">
        {t('ui.settings.total')}
        <span className={`ml-4 ${total.vocal > 0 ? voColor : 'text-slate-500'}`}>
          {t('ui.settings.attr_vo')} {total.vocal}
        </span>
        <span className={`ml-2 ${total.dance > 0 ? daColor : 'text-slate-500'}`}>
          {t('ui.settings.attr_da')} {total.dance}
        </span>
        <span className={`ml-2 ${total.visual > 0 ? viColor : 'text-slate-500'}`}>
          {t('ui.settings.attr_vi')} {total.visual}
        </span>
      </div>
    </div>
  )
}

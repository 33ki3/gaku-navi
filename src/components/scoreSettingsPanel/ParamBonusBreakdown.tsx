/**
 * パラメータボーナス内訳テーブルコンポーネント
 *
 * 週毎のレッスン選択がVo/Da/Viにどう影響するかを
 * テーブルで表示する。ScheduleSummary 内にインラインで配置される。
 */
import { useTranslation } from 'react-i18next'
import type { ParameterBonusBreakdownRow } from '../../utils/scoreSettings'
import type { ParameterValues } from '../../types/card'
import * as enums from '../../types/enums'
import { getParameterTextColor } from '../../data/ui'

/** ParamBonusBreakdown コンポーネントに渡すプロパティ */
interface ParamBonusBreakdownProps {
  /** 週毎のボーナス内訳 */
  breakdown: ParameterBonusBreakdownRow[]
  /** 合計ボーナス値 */
  bonusBase: ParameterValues
}

/** パラメータボーナス内訳テーブル */
export function ParamBonusBreakdown({ breakdown, bonusBase }: ParamBonusBreakdownProps) {
  const { t } = useTranslation()
  const voColor = getParameterTextColor(enums.ParameterType.Vocal)
  const daColor = getParameterTextColor(enums.ParameterType.Dance)
  const viColor = getParameterTextColor(enums.ParameterType.Visual)

  return (
    <div className="mt-1">
      {/* 週毎内訳テーブル */}
      <table className="w-full text-[10px]">
        <thead>
          <tr className="text-slate-400 border-b border-slate-100">
            <th className="text-left py-0.5 font-bold">{t('ui.settings.th_week')}</th>
            <th className="text-left py-0.5 font-bold">{t('ui.settings.th_select')}</th>
            <th className={`text-right py-0.5 font-bold ${voColor}`}>{t('ui.settings.attr_vo')}</th>
            <th className={`text-right py-0.5 font-bold ${daColor}`}>{t('ui.settings.attr_da')}</th>
            <th className={`text-right py-0.5 font-bold ${viColor}`}>{t('ui.settings.attr_vi')}</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((row, i) => (
            <tr key={i} className="border-b border-slate-50">
              <td className="py-0.5 text-slate-600">{row.week}{t('ui.unit.week')}</td>
              <td className={`py-0.5 font-bold ${getParameterTextColor(row.attribute)}`}>
                {row.attribute === enums.ParameterType.Vocal ? t('ui.settings.attr_vo')
                : row.attribute === enums.ParameterType.Dance ? t('ui.settings.attr_da')
                : t('ui.settings.attr_vi')}
              </td>
              {/* Vo/Da/Vi の値。対象属性のみ太字+カラー、その他は薄色 */}
              <td className={`text-right py-0.5 ${row.attribute === enums.ParameterType.Vocal ? `font-bold ${voColor}` : 'text-slate-400'}`}>
                {t('ui.symbol.plus')}{row.vocal}
              </td>
              <td className={`text-right py-0.5 ${row.attribute === enums.ParameterType.Dance ? `font-bold ${daColor}` : 'text-slate-400'}`}>
                {t('ui.symbol.plus')}{row.dance}
              </td>
              <td className={`text-right py-0.5 ${row.attribute === enums.ParameterType.Visual ? `font-bold ${viColor}` : 'text-slate-400'}`}>
                {t('ui.symbol.plus')}{row.visual}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 font-black">
            <td className="py-1 text-slate-600" colSpan={2}>{t('ui.settings.total')}</td>
            {/* フッター合計行: 各属性のボーナス合計値 */}
            <td className={`text-right py-1 ${voColor}`}>{bonusBase.vocal}</td>
            <td className={`text-right py-1 ${daColor}`}>{bonusBase.dance}</td>
            <td className={`text-right py-1 ${viColor}`}>{bonusBase.visual}</td>
          </tr>
        </tfoot>
      </table>
      {/* 全週がレッスン以外（お出かけ/休む等）のとき内訳が空になる */}
      {breakdown.length === 0 && (
        <p className="text-slate-400 text-center py-2">{t('ui.message.no_lessons')}</p>
      )}
    </div>
  )
}

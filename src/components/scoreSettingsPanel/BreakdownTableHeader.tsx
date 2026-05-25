/**
 * パラメータボーナス内訳テーブルのヘッダーコンポーネント。
 *
 * 週・選択種別・Vo/Da/Vi の列見出しを統一表示する。
 * HIF/初編のテーブルから共通利用される。
 */
import { useTranslation } from 'react-i18next'

import * as enums from '../../types/enums'
import { getParameterTextColor } from '../../data/ui'

/**
 * 内訳テーブルの列ヘッダー行を返す。
 *
 * @returns テーブルヘッダー要素
 */
export function BreakdownTableHeader() {
  const { t } = useTranslation()
  const voColor = getParameterTextColor(enums.ParameterType.Vocal)
  const daColor = getParameterTextColor(enums.ParameterType.Dance)
  const viColor = getParameterTextColor(enums.ParameterType.Visual)
  return (
    <thead>
      <tr className="text-slate-500 border-b border-slate-100">
        <th className="text-left py-0.5 font-bold">{t('ui.settings.th_week')}</th>
        <th className="text-left py-0.5 font-bold">{t('ui.settings.th_select')}</th>
        <th className={`text-right py-0.5 font-bold ${voColor}`}>{t('ui.settings.attr_vo')}</th>
        <th className={`text-right py-0.5 font-bold ${daColor}`}>{t('ui.settings.attr_da')}</th>
        <th className={`text-right py-0.5 font-bold ${viColor}`}>{t('ui.settings.attr_vi')}</th>
      </tr>
    </thead>
  )
}

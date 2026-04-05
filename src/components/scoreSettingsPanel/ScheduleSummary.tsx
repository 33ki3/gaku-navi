/**
 * スケジュールサマリーコンポーネント
 *
 * スケジュールから自動計算されたアクション回数と
 * パラメータボーナスの要約を表示する。
 * スケジュール有効時は週毎のボーナス内訳テーブルもインラインで表示する。
 */
import { useTranslation } from 'react-i18next'
import type { ScoreSettings } from '../../types/card'
import type { ParameterBonusBreakdownRow } from '../../utils/scoreSettings'
import { formatScheduleSummary } from '../../utils/scoreSettings'
import { getParameterTextColor } from '../../data/ui'
import { ParameterType } from '../../types/enums'
import type { ActionIdType } from '../../types/enums'
import { ParamBonusBreakdown } from './ParamBonusBreakdown'

/** ScheduleSummary コンポーネントに渡すプロパティ */
interface ScheduleSummaryProps {
  /** スケジュールから計算したアクション回数 */
  scheduleCounts: Partial<Record<ActionIdType, number>>
  /** 現在の設定値 */
  settings: ScoreSettings
  /** 週毎のボーナス内訳 */
  paramBonusBreakdown: ParameterBonusBreakdownRow[]
}

/** スケジュールの自動計算サマリー */
export function ScheduleSummary({ scheduleCounts, settings, paramBonusBreakdown }: ScheduleSummaryProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-blue-50 rounded-lg p-2 text-[10px] text-blue-700 font-medium">
      {/* 自動計算されたアクション回数サマリ（例: "ボーカルレッスン: 3回 ダンスレッスン: 2回"） */}
      <span className="font-black">{t('ui.settings.auto_values')}</span>
      {t('ui.format.summary_separator')}
      {formatScheduleSummary(scheduleCounts, t)}
      {settings.useScheduleLimits && (
        <div className="mt-1">
          {/* パラメータボーナス合計値（Vo/Da/Vi） */}
          <div>
            <span className="font-black">{t('ui.settings.param_bonus_header')}</span>
            {t('ui.format.summary_separator')}
            <span className={getParameterTextColor(ParameterType.Vocal)}>
              {t('ui.settings.attr_vo')} {settings.parameterBonusBase.vocal}
            </span>
            {t('ui.format.summary_separator')}
            <span className={getParameterTextColor(ParameterType.Dance)}>
              {t('ui.settings.attr_da')} {settings.parameterBonusBase.dance}
            </span>
            {t('ui.format.summary_separator')}
            <span className={getParameterTextColor(ParameterType.Visual)}>
              {t('ui.settings.attr_vi')} {settings.parameterBonusBase.visual}
            </span>
          </div>
          {/* 週毎のボーナス内訳テーブル */}
          <ParamBonusBreakdown breakdown={paramBonusBreakdown} bonusBase={settings.parameterBonusBase} />
        </div>
      )}
    </div>
  )
}

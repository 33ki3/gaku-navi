/**
 * ユニット計算結果のスコア内訳テーブルコンポーネント
 *
 * 合計スコアのクリックで開閉する内訳テーブルを表示する。
 */
import { useTranslation } from 'react-i18next'

import { ChevronRightIcon } from '../ui/icons'
import BreakdownRow from './BreakdownRow'
import * as enums from '../../types/enums'
import type { ScenarioType } from '../../types/enums'
import { SelectableTypeEntries } from '../../data/card'
import type { ParameterValues } from '../../types/unit'
import { CustomBreakdownRows } from './CustomBreakdownRows'
import { HifBreakdownRows } from './HifBreakdownRows'
import { StandardBreakdownRows } from './StandardBreakdownRows'

/** UnitResultBreakdown コンポーネントに渡すプロパティ */
interface UnitResultBreakdownProps {
  useCustomMode: boolean
  scenario: ScenarioType
  grandTotal: number
  showBreakdown: boolean
  onToggleBreakdown: () => void
  initialParams: ParameterValues
  outsideParamBonus: ParameterValues
  targetGain: ParameterValues
  customClassBonus: ParameterValues
  classParams: ParameterValues
  customNonBonusGain: ParameterValues
  hifSelectionExams: ParameterValues[]
  examData: { mid: ParameterValues; final: ParameterValues }
  supportScore: ParameterValues
  breakdownTotal: ParameterValues
  cappedTotal: ParameterValues
}

/**
 * ユニット結果の内訳テーブルを表示する。
 *
 * @param props - 内訳表示に必要な各値
 * @returns スコア内訳テーブル要素
 */
export function UnitResultBreakdown({
  useCustomMode,
  scenario,
  grandTotal,
  showBreakdown,
  onToggleBreakdown,
  initialParams,
  outsideParamBonus,
  targetGain,
  customClassBonus,
  classParams,
  customNonBonusGain,
  hifSelectionExams,
  examData,
  supportScore,
  breakdownTotal,
  cappedTotal,
}: UnitResultBreakdownProps) {
  const { t } = useTranslation()
  return (
    <div className="bg-slate-50 rounded-lg px-4 py-2.5 cursor-pointer" onClick={onToggleBreakdown}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* 合計スコアの展開アイコン */}
          <ChevronRightIcon
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showBreakdown ? 'rotate-90' : ''}`}
          />
          <span className="text-xs font-bold text-slate-500">{t('unit.result.total_score')}</span>
        </div>
        <span className="text-lg font-black text-slate-800">{grandTotal.toLocaleString()}</span>
      </div>
      {showBreakdown && (
        <div className="mt-2 border-t border-slate-200 pt-2">
          <div className="grid grid-cols-4 gap-1 mb-1">
            <span />
            {SelectableTypeEntries.map((entry) => (
              <span key={entry.parameterType} className={`text-[10px] font-bold text-center ${entry.text}`}>
                {t(entry.displayLabel)}
              </span>
            ))}
          </div>
          {/* 初期パラメータ */}
          <BreakdownRow label={t('unit.result.breakdown_initial_params')} values={initialParams} />
          {/* サポート外パラメータボーナス */}
          <BreakdownRow label={t('unit.result.breakdown_param_bonus')} values={outsideParamBonus} />
          {useCustomMode ? (
            <CustomBreakdownRows
              targetGain={targetGain}
              customClassBonus={customClassBonus}
              customNonBonusGain={customNonBonusGain}
            />
          ) : scenario === enums.ScenarioType.Hif ? (
            <HifBreakdownRows targetGain={targetGain} classParams={classParams} hifSelectionExams={hifSelectionExams} />
          ) : (
            <StandardBreakdownRows targetGain={targetGain} classParams={classParams} examData={examData} />
          )}
          {/* サポート由来スコア */}
          <BreakdownRow label={t('unit.result.breakdown_support')} values={supportScore} />
          <div className="grid grid-cols-4 gap-1 border-t border-slate-200 pt-1 mt-1">
            <span className="text-[10px] font-bold text-slate-600 shrink-0">{t('unit.result.breakdown_total')}</span>
            {SelectableTypeEntries.map((entry) => {
              const raw = breakdownTotal[entry.parameterType]
              const capped = cappedTotal[entry.parameterType]
              const overflow = raw - capped
              return (
                <span key={entry.parameterType} className="text-[10px] font-black text-slate-800 text-center">
                  {capped.toLocaleString()}
                  {overflow > 0 && <span className="text-red-500 text-[9px]">（-{overflow.toLocaleString()}）</span>}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

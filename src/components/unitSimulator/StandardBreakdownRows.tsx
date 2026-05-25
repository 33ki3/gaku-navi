/**
 * ユニット結果の通常シナリオ向け内訳行コンポーネント。
 *
 * SPレッスン・授業・中間試験・最終試験の上昇値を
 * スコア内訳テーブルの行として返す。
 */
import { useTranslation } from 'react-i18next'

import BreakdownRow from './BreakdownRow'
import type { ParameterValues } from '../../types/unit'

/** StandardBreakdownRows コンポーネントに渡すプロパティ */
interface StandardBreakdownRowsProps {
  /** SPレッスン由来上昇 */
  targetGain: ParameterValues
  /** 授業上昇 */
  classParams: ParameterValues
  /** 中間・最終試験上昇 */
  examData: { mid: ParameterValues; final: ParameterValues }
}

/**
 * 通常シナリオ向けの内訳行を返す。
 *
 * @param props - 通常シナリオの内訳値
 * @returns 通常シナリオ向け内訳行群
 */
export function StandardBreakdownRows({ targetGain, classParams, examData }: StandardBreakdownRowsProps) {
  const { t } = useTranslation()
  return (
    <>
      <BreakdownRow label={t('unit.result.breakdown_sp_lesson')} values={targetGain} />
      <BreakdownRow label={t('unit.result.breakdown_class')} values={classParams} />
      <BreakdownRow label={t('unit.result.breakdown_mid_exam')} values={examData.mid} />
      <BreakdownRow label={t('unit.result.breakdown_final_exam')} values={examData.final} />
    </>
  )
}

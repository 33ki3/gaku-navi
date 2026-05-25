/**
 * ユニット結果のHIFモード向け内訳行コンポーネント。
 *
 * SPレッスン・授業・選抜試験3回分の上昇値を
 * スコア内訳テーブルの行として返す。
 */
import { useTranslation } from 'react-i18next'

import BreakdownRow from './BreakdownRow'
import { HIF_EXAM_LABEL_KEYS } from '../../data/score'
import type { ParameterValues } from '../../types/unit'

/** HifBreakdownRows コンポーネントに渡すプロパティ */
interface HifBreakdownRowsProps {
  /** SPレッスン由来上昇 */
  targetGain: ParameterValues
  /** 授業上昇 */
  classParams: ParameterValues
  /** 選抜試験3回分の上昇 */
  hifSelectionExams: ParameterValues[]
}

/**
 * HIF 専用の内訳行を返す。
 *
 * @param props - HIF モードの内訳値
 * @returns HIF モード向け内訳行群
 */
export function HifBreakdownRows({ targetGain, classParams, hifSelectionExams }: HifBreakdownRowsProps) {
  const { t } = useTranslation()
  return (
    <>
      <BreakdownRow label={t('unit.result.breakdown_sp_lesson')} values={targetGain} />
      <BreakdownRow label={t('unit.result.breakdown_class')} values={classParams} />
      {hifSelectionExams.map((values, index) => (
        <BreakdownRow key={HIF_EXAM_LABEL_KEYS[index]} label={t(HIF_EXAM_LABEL_KEYS[index])} values={values} />
      ))}
    </>
  )
}

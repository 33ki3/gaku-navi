/**
 * ユニット結果のカスタムモード向け内訳行コンポーネント。
 *
 * カスタム入力の対象上昇・授業・非対象上昇を
 * スコア内訳テーブルの行として返す。
 */
import { useTranslation } from 'react-i18next'

import BreakdownRow from './BreakdownRow'
import type { ParameterValues } from '../../types/unit'

/** CustomBreakdownRows コンポーネントに渡すプロパティ */
interface CustomBreakdownRowsProps {
  /** パラボ対象上昇 */
  targetGain: ParameterValues
  /** カスタム授業上昇 */
  customClassBonus: ParameterValues
  /** カスタムのパラボ対象外上昇 */
  customNonBonusGain: ParameterValues
}

/** カスタムモード向けの内訳行群 */
/**
 * カスタムモード専用の内訳行を返す。
 *
 * @param props - カスタムモードの内訳値
 * @returns カスタムモード向け内訳行群
 */
export function CustomBreakdownRows({ targetGain, customClassBonus, customNonBonusGain }: CustomBreakdownRowsProps) {
  const { t } = useTranslation()
  return (
    <>
      <BreakdownRow label={t('unit.result.breakdown_custom_target_gain')} values={targetGain} />
      <BreakdownRow label={t('unit.result.breakdown_class')} values={customClassBonus} />
      <BreakdownRow label={t('ui.settings.custom_non_bonus_other')} values={customNonBonusGain} />
    </>
  )
}

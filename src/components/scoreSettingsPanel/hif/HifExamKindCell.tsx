/**
 * HIF選抜試験行の種別セルコンポーネント。
 */
import { useTranslation } from 'react-i18next'

import { HIF_EXAM_LABEL_KEYS } from '../../../data'

/** HifExamKindCell コンポーネントに渡すプロパティ */
interface HifExamKindCellProps {
  /** 試験インデックス */
  examIndex: number
}

/**
 * HIF選抜試験行の種別セルを表示する。
 *
 * @param props - コンポーネントプロパティ
 * @returns 種別セル要素
 */
export function HifExamKindCell({ examIndex }: HifExamKindCellProps) {
  const { t } = useTranslation()
  return <span className="text-slate-600">{t(HIF_EXAM_LABEL_KEYS[examIndex])}</span>
}

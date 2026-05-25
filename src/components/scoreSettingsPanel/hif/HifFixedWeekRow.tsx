/**
 * HIF固定週の表示コンポーネント。
 *
 * 試験週ヘッダーと比率入力行をまとめて表示する。
 */
import type { ParameterValues } from '../../../types/card'
import { ParameterType } from '../../../types/enums'
import type { ScheduleWeekData } from '../../../data'
import { useTranslation } from 'react-i18next'
import { FixedWeekHeader } from './FixedWeekHeader'
import { HifExamRatioRows } from './HifExamRatioRows'

/** HifFixedWeekRow コンポーネントに渡すプロパティ */
interface HifFixedWeekRowProps {
  /** 表示対象の週データ */
  week: ScheduleWeekData
  /** 週番号の表示オフセット */
  weekOffset: number
  /** 試験インデックス（試験週でなければ -1） */
  examIndex: number
  /** 正規化済みの試験比率配列 */
  normalizedExamRatios: ParameterValues[]
  /** 試験比率を変更したときのコールバック */
  onExamRatioChange: (examIndex: number, key: ParameterType, value: number) => void
}

/**
 * HIF固定週の1行表示を描画する。
 *
 * @param props - コンポーネントプロパティ
 * @returns 固定週表示要素
 */
export function HifFixedWeekRow({
  week,
  weekOffset,
  examIndex,
  normalizedExamRatios,
  onExamRatioChange,
}: HifFixedWeekRowProps) {
  const { t } = useTranslation()
  return (
    <>
      <div className="flex items-start gap-2">
        <span className="w-7 text-right text-[10px] font-black shrink-0 pt-0.5 text-slate-500">
          {week.week - weekOffset}
          {t('ui.unit.week')}
        </span>
        <FixedWeekHeader week={week} examIndex={examIndex} />
      </div>
      {examIndex >= 0 && (
        <HifExamRatioRows
          examIndex={examIndex}
          normalizedExamRatios={normalizedExamRatios}
          onExamRatioChange={onExamRatioChange}
        />
      )}
    </>
  )
}

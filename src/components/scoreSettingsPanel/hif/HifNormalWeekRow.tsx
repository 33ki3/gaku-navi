/**
 * HIF通常週の表示コンポーネント。
 *
 * 活動候補と休む（許可時）をトグルとして表示する。
 */
import type { ScheduleWeekData } from '../../../data'
import * as enums from '../../../types/enums'
import * as data from '../../../data'
import { useTranslation } from 'react-i18next'
import { NormalWeekSelector } from './NormalWeekSelector'

/** HifNormalWeekRow コンポーネントに渡すプロパティ */
interface HifNormalWeekRowProps {
  /** 表示対象の週データ */
  week: ScheduleWeekData
  /** 週番号の表示オフセット */
  weekOffset: number
  /** 現在の選択値 */
  selected: enums.ActivityIdType | undefined
  /** 活動選択時のコールバック */
  onSelect: (activityId: enums.ActivityIdType) => void
}

/**
 * HIF通常週の1行表示を描画する。
 *
 * @param props - コンポーネントプロパティ
 * @returns 通常週表示要素
 */
export function HifNormalWeekRow({ week, weekOffset, selected, onSelect }: HifNormalWeekRowProps) {
  const { t } = useTranslation()
  const allOptions = [...week.activities, ...(week.canRest ? [data.RestOption] : [])]
  return (
    <div className="flex items-start gap-2">
      <span className="w-7 text-right text-[10px] font-black shrink-0 pt-0.5 text-slate-600">
        {week.week - weekOffset}
        {t('ui.unit.week')}
      </span>
      <NormalWeekSelector options={allOptions} selected={selected} onSelect={onSelect} />
    </div>
  )
}

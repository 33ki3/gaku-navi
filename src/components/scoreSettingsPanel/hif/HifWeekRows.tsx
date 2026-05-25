/**
 * HIF週リスト表示コンポーネント。
 *
 * 呼び出し元から固定週・公開レッスン週・通常週の各行コンポーネントを
 * 直接使えるよう、週種別判定と行レンダリングをこのコンポーネントに集約する。
 */
import type { ParameterValues } from '../../../types/card'
import type { ScheduleWeekData } from '../../../data'
import * as enums from '../../../types/enums'
import { ParameterType } from '../../../types/enums'
import { resolveHifLessonPair } from '../../../utils/hifScheduleHelpers'
import { HifFixedWeekRow } from './HifFixedWeekRow'
import { HifLessonWeekRow } from './HifLessonWeekRow'
import { HifNormalWeekRow } from './HifNormalWeekRow'

/** HifWeekRows コンポーネントに渡すプロパティ */
interface HifWeekRowsProps {
  /** 表示対象の週データ配列 */
  weeks: ScheduleWeekData[]
  /** 週番号の表示オフセット（本選ステージ用） */
  weekOffset?: number
  /** 現在の選択（週番号 → アクティビティID） */
  scheduleSelections: Record<number, enums.ActivityIdType>
  /** HIF選抜試験週番号の配列 */
  hifExamWeeks: number[]
  /** 正規化済みの試験比率配列 */
  normalizedExamRatios: ParameterValues[]
  /** HIF公開レッスンのサブをメイン以外の2属性に半分ずつ割り振るか */
  hifLessonSplitSub: boolean
  /** 週ごとの活動選択時コールバック */
  onSelect: (week: number, activityId: enums.ActivityIdType) => void
  /** 試験比率を変更したときのコールバック */
  onExamRatioChange: (examIndex: number, key: ParameterType, value: number) => void
}

/**
 * 週リストを週種別ごとの行コンポーネントで描画する。
 *
 * @param props - コンポーネントプロパティ
 * @returns 週リストの描画結果
 */
export function HifWeekRows({
  weeks,
  weekOffset = 0,
  scheduleSelections,
  hifExamWeeks,
  normalizedExamRatios,
  hifLessonSplitSub,
  onSelect,
  onExamRatioChange,
}: HifWeekRowsProps) {
  return (
    <>
      {weeks.map((week) => {
        const selected = scheduleSelections[week.week]
        const isFixed = week.fixed && !week.canRest
        const isHifLessonWeek = week.activities.some((a) => resolveHifLessonPair(a.id) !== null)
        const examIndex = hifExamWeeks.indexOf(week.week)

        // 固定週（試験含む）は固定週コンポーネントを表示
        if (isFixed) {
          return (
            <div key={week.week}>
              <HifFixedWeekRow
                week={week}
                weekOffset={weekOffset}
                examIndex={examIndex}
                normalizedExamRatios={normalizedExamRatios}
                onExamRatioChange={onExamRatioChange}
              />
            </div>
          )
        }

        // 公開レッスン週は属性選択UIを表示
        if (isHifLessonWeek) {
          return (
            <div key={week.week}>
              <HifLessonWeekRow
                weekOffset={weekOffset}
                weekNumber={week.week}
                selected={selected}
                hifLessonSplitSub={hifLessonSplitSub}
                onSelect={(activityId) => onSelect(week.week, activityId)}
              />
            </div>
          )
        }

        // それ以外は通常週コンポーネントを表示
        return (
          <div key={week.week}>
            <HifNormalWeekRow
              week={week}
              weekOffset={weekOffset}
              selected={selected}
              onSelect={(activityId) => onSelect(week.week, activityId)}
            />
          </div>
        )
      })}
    </>
  )
}

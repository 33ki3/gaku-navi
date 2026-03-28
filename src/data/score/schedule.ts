/**
 * スケジュールマスタデータ。
 *
 * シナリオ×難易度ごとの週間スケジュールを定義する。
 */

import { ActivityIdType, ScenarioType, DifficultyType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'
import { getActivityLabel } from './activity'

/** スケジュール内の活動選択肢 */
interface ScheduleActivityOption {
  id: ActivityIdType
  label: TranslationKey
}

/** スケジュールの1週分のデータ */
export interface ScheduleWeekData {
  week: number
  activities: ScheduleActivityOption[]
  fixed: boolean
  canRest: boolean
}

/** JSON の週エントリ型 */
interface RawWeekEntry {
  week: number
  fixed: boolean
  can_rest: boolean
  activities: ActivityIdType[]
}

/** 難易度→週配列マップ */
type DifficultyMap = Record<DifficultyType, RawWeekEntry[]>

const data: Record<ScenarioType, DifficultyMap> = {
  [ScenarioType.Hajime]: {
    [DifficultyType.Regular]: [],
    [DifficultyType.Pro]: [],
    [DifficultyType.Master]: [],
    [DifficultyType.Legend]: [
      { week: 1, fixed: true, can_rest: false, activities: [ActivityIdType.Class] },
      { week: 2, fixed: true, can_rest: false, activities: [ActivityIdType.Class] },
      { week: 3, fixed: false, can_rest: false, activities: [ActivityIdType.Outing, ActivityIdType.ActivitySupply] },
      { week: 4, fixed: false, can_rest: true, activities: [ActivityIdType.VoLesson, ActivityIdType.DaLesson, ActivityIdType.ViLesson] },
      { week: 5, fixed: false, can_rest: true, activities: [ActivityIdType.Outing, ActivityIdType.Consult, ActivityIdType.ActivitySupply] },
      { week: 6, fixed: true, can_rest: true, activities: [ActivityIdType.Class] },
      { week: 7, fixed: false, can_rest: true, activities: [ActivityIdType.VoLesson, ActivityIdType.DaLesson, ActivityIdType.ViLesson] },
      { week: 8, fixed: false, can_rest: true, activities: [ActivityIdType.Consult] },
      { week: 9, fixed: true, can_rest: true, activities: [ActivityIdType.SpecialTraining] },
      { week: 10, fixed: true, can_rest: false, activities: [ActivityIdType.MidExam] },
      { week: 11, fixed: false, can_rest: true, activities: [ActivityIdType.Outing, ActivityIdType.ActivitySupply] },
      { week: 12, fixed: false, can_rest: true, activities: [ActivityIdType.VoLesson, ActivityIdType.DaLesson, ActivityIdType.ViLesson] },
      { week: 13, fixed: false, can_rest: true, activities: [ActivityIdType.Outing, ActivityIdType.Consult, ActivityIdType.ActivitySupply] },
      { week: 14, fixed: false, can_rest: true, activities: [ActivityIdType.VoLesson, ActivityIdType.DaLesson, ActivityIdType.ViLesson] },
      { week: 15, fixed: false, can_rest: true, activities: [ActivityIdType.Class] },
      { week: 16, fixed: false, can_rest: true, activities: [ActivityIdType.VoLesson, ActivityIdType.DaLesson, ActivityIdType.ViLesson] },
      { week: 17, fixed: false, can_rest: true, activities: [ActivityIdType.Consult, ActivityIdType.SpecialTraining] },
      { week: 18, fixed: true, can_rest: false, activities: [ActivityIdType.FinalExam] },
    ],
  },
  [ScenarioType.Nia]: {
    [DifficultyType.Regular]: [],
    [DifficultyType.Pro]: [],
    [DifficultyType.Master]: [],
    [DifficultyType.Legend]: [],
  },
}

/**
 * シナリオ × 難易度 → スケジュール一覧を取得する。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @returns ScheduleWeekData の配列
 */
export function getScheduleData(scenario: ScenarioType, difficulty: DifficultyType): ScheduleWeekData[] {
  const weeks = data[scenario][difficulty]
  // 各週の活動IDにラベルを付与して返す
  return weeks.map((entry) => ({
    week: entry.week,
    activities: entry.activities.map((id) => ({
      id,
      label: getActivityLabel(id),
    })),
    fixed: entry.fixed,
    canRest: entry.can_rest,
  }))
}

/**
 * スケジュールマスタデータ。
 *
 * シナリオ×難易度ごとの週間スケジュールを定義する。
 */

import rawData from '../json/schedule.json'
import { type ActivityIdType, type ScenarioType, type DifficultyType } from '../../types/enums'
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
  can_rest: boolean
}

/** JSON の週エントリ型 */
interface RawWeekEntry {
  week: number
  fixed: boolean
  can_rest: boolean
  activities: ActivityIdType[]
}

/** 難易度→週配列マップ */
type DifficultyMap = Record<string, RawWeekEntry[]>

const data = rawData as Record<string, DifficultyMap>

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
    can_rest: entry.can_rest,
  }))
}

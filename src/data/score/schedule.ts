/**
 * スケジュールマスタデータ。
 *
 * シナリオ×難易度ごとの週間スケジュールを定義する。
 */

import { ActivityIdType, HifStage, ScenarioType, DifficultyType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'
import { getActivityLabel } from './activity'

/** スケジュール内の活動選択肢 */
export interface ScheduleActivityOption {
  id: ActivityIdType
  label: TranslationKey
}

/** お休みアクティビティの選択肢（canRest週に追加される） */
export const RestOption: ScheduleActivityOption = {
  id: ActivityIdType.Rest,
  label: getActivityLabel(ActivityIdType.Rest),
}

/** スケジュールの1週分のデータ */
export interface ScheduleWeekData {
  week: number
  activities: ScheduleActivityOption[]
  fixed: boolean
  canRest: boolean
  /** HIF専用: 選抜/本選ステージ区分 */
  stage?: HifStage
  /** HIF特定週ラベル（選抜試験1〜3/本選ラウンド1/インターバル/ラウンド2） */
  weekLabel?: TranslationKey
}
/** JSON の週エントリ型 */
interface RawWeekEntry {
  week: number
  fixed: boolean
  can_rest: boolean
  activities: ActivityIdType[]
  /** HIF専用: 選抜/本選ステージ区分 */
  stage?: HifStage
  /** HIF特定週ラベル（選抜試験1〜3/本選ラウンド1/インターバル/ラウンド2） */
  week_label?: TranslationKey
}

/** 難易度→週配列マップ */
type DifficultyMap = Partial<Record<DifficultyType, RawWeekEntry[]>>

/** HIF公開レッスンのメイン/サブ選択肢 */
const HIF_LESSON_OPTIONS: ActivityIdType[] = [
  ActivityIdType.VoLessonDa,
  ActivityIdType.VoLessonVi,
  ActivityIdType.DaLessonVo,
  ActivityIdType.DaLessonVi,
  ActivityIdType.ViLessonVo,
  ActivityIdType.ViLessonDa,
]

const data: Record<ScenarioType, DifficultyMap> = {
  [ScenarioType.Hajime]: {
    [DifficultyType.Regular]: [],
    [DifficultyType.Pro]: [],
    [DifficultyType.Master]: [],
    [DifficultyType.Legend]: [
      {
        week: 1,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.ClassVo, ActivityIdType.ClassDa, ActivityIdType.ClassVi],
      },
      {
        week: 2,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.ClassVo, ActivityIdType.ClassDa, ActivityIdType.ClassVi],
      },
      { week: 3, fixed: false, can_rest: false, activities: [ActivityIdType.Outing, ActivityIdType.ActivitySupply] },
      {
        week: 4,
        fixed: false,
        can_rest: true,
        activities: [ActivityIdType.VoLesson, ActivityIdType.DaLesson, ActivityIdType.ViLesson],
      },
      {
        week: 5,
        fixed: false,
        can_rest: true,
        activities: [ActivityIdType.Outing, ActivityIdType.Consult, ActivityIdType.ActivitySupply],
      },
      {
        week: 6,
        fixed: false,
        can_rest: true,
        activities: [ActivityIdType.ClassVo, ActivityIdType.ClassDa, ActivityIdType.ClassVi],
      },
      {
        week: 7,
        fixed: false,
        can_rest: true,
        activities: [ActivityIdType.VoLesson, ActivityIdType.DaLesson, ActivityIdType.ViLesson],
      },
      { week: 8, fixed: false, can_rest: true, activities: [ActivityIdType.Consult] },
      { week: 9, fixed: true, can_rest: true, activities: [ActivityIdType.SpecialTraining] },
      { week: 10, fixed: true, can_rest: false, activities: [ActivityIdType.MidExam] },
      { week: 11, fixed: false, can_rest: true, activities: [ActivityIdType.Outing, ActivityIdType.ActivitySupply] },
      {
        week: 12,
        fixed: false,
        can_rest: true,
        activities: [ActivityIdType.VoLesson, ActivityIdType.DaLesson, ActivityIdType.ViLesson],
      },
      {
        week: 13,
        fixed: false,
        can_rest: true,
        activities: [ActivityIdType.Outing, ActivityIdType.Consult, ActivityIdType.ActivitySupply],
      },
      {
        week: 14,
        fixed: false,
        can_rest: true,
        activities: [ActivityIdType.VoLesson, ActivityIdType.DaLesson, ActivityIdType.ViLesson],
      },
      {
        week: 15,
        fixed: false,
        can_rest: true,
        activities: [ActivityIdType.ClassVo, ActivityIdType.ClassDa, ActivityIdType.ClassVi],
      },
      {
        week: 16,
        fixed: false,
        can_rest: true,
        activities: [ActivityIdType.VoLesson, ActivityIdType.DaLesson, ActivityIdType.ViLesson],
      },
      { week: 17, fixed: false, can_rest: true, activities: [ActivityIdType.Consult, ActivityIdType.SpecialTraining] },
      { week: 18, fixed: true, can_rest: false, activities: [ActivityIdType.FinalExam] },
    ],
  },
  // HIF の第1〜20週が選抜ステージ、第21〜29週が本選ステージ。
  // HIF は難易度の概念がないため None キーのみ使用する
  [ScenarioType.Hif]: {
    [DifficultyType.None]: [
      {
        week: 1,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.Consult, ActivityIdType.SupplyGift, ActivityIdType.SpecialTraining],
        stage: HifStage.Selection,
      },
      { week: 2, fixed: false, can_rest: false, activities: HIF_LESSON_OPTIONS, stage: HifStage.Selection },
      {
        week: 3,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.ClassVo, ActivityIdType.ClassDa, ActivityIdType.ClassVi],
        stage: HifStage.Selection,
      },
      { week: 4, fixed: false, can_rest: false, activities: HIF_LESSON_OPTIONS, stage: HifStage.Selection },
      {
        week: 5,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.Outing, ActivityIdType.Consult],
        stage: HifStage.Selection,
      },
      {
        week: 6,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.ClassVo, ActivityIdType.ClassDa, ActivityIdType.ClassVi],
        stage: HifStage.Selection,
      },
      {
        week: 7,
        fixed: true,
        can_rest: false,
        activities: [ActivityIdType.FinalExam],
        stage: HifStage.Selection,
        week_label: 'ui.settings.hif_exam_ratio_exam1',
      },
      {
        week: 8,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.Outing, ActivityIdType.SupplyGift],
        stage: HifStage.Selection,
      },
      { week: 9, fixed: false, can_rest: false, activities: HIF_LESSON_OPTIONS, stage: HifStage.Selection },
      {
        week: 10,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.ClassVo, ActivityIdType.ClassDa, ActivityIdType.ClassVi],
        stage: HifStage.Selection,
      },
      { week: 11, fixed: false, can_rest: false, activities: HIF_LESSON_OPTIONS, stage: HifStage.Selection },
      {
        week: 12,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.Consult, ActivityIdType.SpecialTraining],
        stage: HifStage.Selection,
      },
      {
        week: 13,
        fixed: true,
        can_rest: false,
        activities: [ActivityIdType.FinalExam],
        stage: HifStage.Selection,
        week_label: 'ui.settings.hif_exam_ratio_exam2',
      },
      {
        week: 14,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.Outing, ActivityIdType.SupplyGift],
        stage: HifStage.Selection,
      },
      { week: 15, fixed: false, can_rest: false, activities: HIF_LESSON_OPTIONS, stage: HifStage.Selection },
      {
        week: 16,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.Outing, ActivityIdType.Consult, ActivityIdType.SupplyGift],
        stage: HifStage.Selection,
      },
      {
        week: 17,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.ClassVo, ActivityIdType.ClassDa, ActivityIdType.ClassVi],
        stage: HifStage.Selection,
      },
      { week: 18, fixed: false, can_rest: false, activities: HIF_LESSON_OPTIONS, stage: HifStage.Selection },
      {
        week: 19,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.Consult, ActivityIdType.SpecialTraining],
        stage: HifStage.Selection,
      },
      {
        week: 20,
        fixed: true,
        can_rest: false,
        activities: [ActivityIdType.MidExam],
        stage: HifStage.Selection,
        week_label: 'ui.settings.hif_exam_ratio_exam3',
      },
      {
        week: 21,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.ClassVo, ActivityIdType.ClassDa, ActivityIdType.ClassVi],
        stage: HifStage.Final,
      },
      { week: 22, fixed: false, can_rest: false, activities: HIF_LESSON_OPTIONS, stage: HifStage.Final },
      {
        week: 23,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.Outing, ActivityIdType.SupplyGift],
        stage: HifStage.Final,
      },
      {
        week: 24,
        fixed: false,
        can_rest: false,
        activities: [ActivityIdType.ClassVo, ActivityIdType.ClassDa, ActivityIdType.ClassVi],
        stage: HifStage.Final,
      },
      { week: 25, fixed: false, can_rest: false, activities: HIF_LESSON_OPTIONS, stage: HifStage.Final },
      { week: 26, fixed: true, can_rest: false, activities: [ActivityIdType.Consult], stage: HifStage.Final },
      {
        week: 27,
        fixed: true,
        can_rest: false,
        activities: [ActivityIdType.FinalExam],
        stage: HifStage.Final,
        week_label: 'ui.settings.hif_final_round1',
      },
      {
        week: 28,
        fixed: true,
        can_rest: false,
        activities: [ActivityIdType.Interval],
        stage: HifStage.Final,
        week_label: 'ui.settings.hif_final_interval',
      },
      {
        week: 29,
        fixed: true,
        can_rest: false,
        activities: [ActivityIdType.FinalExam],
        stage: HifStage.Final,
        week_label: 'ui.settings.hif_final_round2',
      },
    ],
  },
  [ScenarioType.Nia]: {
    [DifficultyType.None]: [],
  },
  [ScenarioType.Custom]: {
    [DifficultyType.None]: [],
  },
}

/** HIF選抜試験1〜3の週ラベルキー（スケジュールマスタ由来） */
export const HIF_EXAM_LABEL_KEYS: readonly TranslationKey[] = (data[ScenarioType.Hif][DifficultyType.None] ?? [])
  .filter(
    (entry) =>
      entry.stage === HifStage.Selection &&
      entry.fixed &&
      entry.week_label !== undefined &&
      entry.activities.some((id) => id === ActivityIdType.MidExam || id === ActivityIdType.FinalExam),
  )
  .map((entry) => entry.week_label as TranslationKey)

/**
 * シナリオ × 難易度 → スケジュール一覧を取得する。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @returns ScheduleWeekData の配列
 */
export function getScheduleData(scenario: ScenarioType, difficulty: DifficultyType): ScheduleWeekData[] {
  const weeks = data[scenario][difficulty] ?? []
  // 各週の活動IDにラベルを付与して返す
  return weeks.map((entry) => ({
    week: entry.week,
    activities: entry.activities.map((id) => ({
      id,
      label: getActivityLabel(id),
    })),
    fixed: entry.fixed,
    canRest: entry.can_rest,
    ...(entry.stage !== undefined ? { stage: entry.stage } : {}),
    ...(entry.week_label !== undefined ? { weekLabel: entry.week_label } : {}),
  }))
}

/**
 * シナリオに難易度キーが定義されているかを返す。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @returns キーが存在する場合true
 */
export function hasScheduleDifficulty(scenario: ScenarioType, difficulty: DifficultyType): boolean {
  return Object.prototype.hasOwnProperty.call(data[scenario], difficulty)
}

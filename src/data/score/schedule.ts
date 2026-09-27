/**
 * シナリオ・難易度ごとの週間スケジュール
 *
 * 週ごとに選べる活動と、活動が計算へ与える分類を定義する
 */

import type { TranslationKey } from '../../i18n'
import { ActivityIdType, DifficultyType, HifStage, ScenarioType } from '../../types/enums'
import { getActivityLabel } from './activity'
import { HIF_LESSON_BASE_OPTIONS, HIF_LESSON_PAIR_MAP } from './hifScheduleMaster'

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
/** 保存データに含まれる1週分の形式 */
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

/** 難易度から週一覧を探す表 */
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
  // HIF の第1〜20週が選抜ステージ、第21〜29週が本選ステージ
  // HIFは難易度を持たないため、難易度なしの項目だけを定義する
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
 * シナリオ × 難易度 → スケジュール一覧を取得する
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
 * 指定した週でフォームから選択できる活動か判定する
 *
 * HIFは表示モードによって公開レッスンの保存形式が変わる
 * 通常の活動一覧に加えて、メイン属性だけのIDも必要に応じて許可する
 *
 * @param week - 判定対象の週
 * @param activityId - 判定する活動ID
 * @param scenario - シナリオ
 * @param hifLessonSplitSub - HIFのサブ属性を分割表示するか
 * @returns その週で選択可能ならtrue
 */
export function isScheduleActivityAllowed(
  week: ScheduleWeekData,
  activityId: ActivityIdType,
  scenario: ScenarioType,
  hifLessonSplitSub = true,
): boolean {
  // 休みは週側のcanRestを優先し、活動一覧に明示されない休みもフォーム選択として扱う
  if (week.canRest && activityId === ActivityIdType.Rest) return true

  const isHifLessonWeek =
    scenario === ScenarioType.Hif && week.activities.some((activity) => HIF_LESSON_PAIR_MAP[activity.id] !== undefined)
  if (isHifLessonWeek) {
    // HIFは表示モードにより、属性別IDかメイン属性IDのどちらを保存できるかが変わる
    return hifLessonSplitSub
      ? HIF_LESSON_BASE_OPTIONS.includes(activityId)
      : HIF_LESSON_PAIR_MAP[activityId] !== undefined
  }

  // 通常シナリオはその週の活動一覧に存在するIDだけを許可する
  return week.activities.some((activity) => activity.id === activityId)
}

/**
 * シナリオに難易度キーが定義されているかを返す
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @returns キーが存在する場合true
 */
export function hasScheduleDifficulty(scenario: ScenarioType, difficulty: DifficultyType): boolean {
  return Object.prototype.hasOwnProperty.call(data[scenario], difficulty)
}

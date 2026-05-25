/**
 * レッスンマスタデータ。
 *
 * シナリオ×難易度×週番号ごとのレッスン情報（SP / 追い込み）を定義する。
 * 通常レッスンは計算に不要のため含まない。
 */
import { LessonType, DifficultyType, ScenarioType, ActivityIdType, ParameterType } from '../../types/enums'
import type { ParameterValues } from '../../types/unit'

/** 1レッスンのデータ */
interface LessonEntry {
  type: LessonType
  main: number
  sub: number
}

/** 週ごとのレッスン集合 */
type WeekMap = Record<string, LessonEntry[]>

/** 難易度→週マップ */
type DifficultyMap = Partial<Record<DifficultyType, WeekMap>>

const data: Record<ScenarioType, DifficultyMap> = {
  [ScenarioType.Hajime]: {
    [DifficultyType.Regular]: {},
    [DifficultyType.Pro]: {},
    [DifficultyType.Master]: {},
    [DifficultyType.Legend]: {
      '4': [{ type: LessonType.Sp, main: 140, sub: 55 }],
      '7': [{ type: LessonType.Sp, main: 180, sub: 60 }],
      '12': [{ type: LessonType.Sp, main: 260, sub: 70 }],
      '14': [{ type: LessonType.Sp, main: 370, sub: 90 }],
      '16': [{ type: LessonType.Sp, main: 570, sub: 115 }],
    },
  },
  [ScenarioType.Hif]: {
    // HIF は難易度の概念がないため None キーのみ使用する
    [DifficultyType.None]: {
      '2': [{ type: LessonType.Sp, main: 60, sub: 20 }],
      '4': [{ type: LessonType.Sp, main: 80, sub: 50 }],
      '9': [{ type: LessonType.Sp, main: 80, sub: 20 }],
      '11': [{ type: LessonType.Sp, main: 100, sub: 60 }],
      '15': [{ type: LessonType.Sp, main: 100, sub: 20 }],
      '18': [{ type: LessonType.Sp, main: 120, sub: 70 }],
      '22': [{ type: LessonType.Sp, main: 120, sub: 20 }],
      '25': [{ type: LessonType.Sp, main: 140, sub: 80 }],
    },
  },
  [ScenarioType.Nia]: {
    [DifficultyType.None]: {},
  },
  [ScenarioType.Custom]: {
    [DifficultyType.None]: {},
  },
}

/** 1週分のレッスン情報（コンパイル済み構造） */
interface LessonData {
  week: number
  lessonTypes: LessonEntry[]
}

/**
 * シナリオ × 難易度 → レッスン一覧を取得する。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @returns LessonData の配列
 */
export function getLessonData(scenario: ScenarioType, difficulty: DifficultyType): LessonData[] {
  const weekMap = data[scenario][difficulty] ?? {}

  // 週番号を数値化し、各週のレッスン情報を配列として返す
  return Object.entries(weekMap).map(([weekStr, entries]) => ({
    week: Number(weekStr),
    lessonTypes: entries,
  }))
}

/** 活動IDからメインパラメータを判定するマップ */
const LESSON_MAIN_PARAM: Partial<Record<ActivityIdType, keyof ParameterValues>> = {
  [ActivityIdType.VoLesson]: ParameterType.Vocal,
  [ActivityIdType.DaLesson]: ParameterType.Dance,
  [ActivityIdType.ViLesson]: ParameterType.Visual,
  [ActivityIdType.VoLessonDa]: ParameterType.Vocal,
  [ActivityIdType.VoLessonVi]: ParameterType.Vocal,
  [ActivityIdType.DaLessonVo]: ParameterType.Dance,
  [ActivityIdType.DaLessonVi]: ParameterType.Dance,
  [ActivityIdType.ViLessonVo]: ParameterType.Visual,
  [ActivityIdType.ViLessonDa]: ParameterType.Visual,
}

/** 活動IDからサブパラメータを判定するマップ（指定がない場合は2軸同時扱い） */
const LESSON_SUB_PARAM: Partial<Record<ActivityIdType, keyof ParameterValues>> = {
  [ActivityIdType.VoLessonDa]: ParameterType.Dance,
  [ActivityIdType.VoLessonVi]: ParameterType.Visual,
  [ActivityIdType.DaLessonVo]: ParameterType.Vocal,
  [ActivityIdType.DaLessonVi]: ParameterType.Visual,
  [ActivityIdType.ViLessonVo]: ParameterType.Vocal,
  [ActivityIdType.ViLessonDa]: ParameterType.Dance,
}

/**
 * getSpLessonTotal はスケジュール選択に基づくSPレッスンのVoDaVi合計上昇量を返す。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @param scheduleSelections - 各週の選択活動ID
 * @returns VoDaVi の合計上昇量
 */
export function getSpLessonTotal(
  scenario: ScenarioType,
  difficulty: DifficultyType,
  scheduleSelections: Record<number, ActivityIdType>,
): ParameterValues {
  const lessons = getLessonData(scenario, difficulty)
  const total: ParameterValues = { vocal: 0, dance: 0, visual: 0 }

  for (const lesson of lessons) {
    const selection = scheduleSelections[lesson.week]
    const mainKey = selection ? LESSON_MAIN_PARAM[selection] : undefined
    if (!mainKey) continue

    const selectedSub = selection ? LESSON_SUB_PARAM[selection] : undefined

    for (const entry of lesson.lessonTypes) {
      // メインパラメータに main を加算する
      total[mainKey] += entry.main

      // サブパラメータが明示的に選択されている場合はその1軸のみに sub を加算する
      if (selectedSub) {
        total[selectedSub] += entry.sub
      } else {
        // 従来シナリオはサブ2軸同時上昇として扱う
        for (const key of Object.values(ParameterType)) {
          if (key !== mainKey) total[key] += entry.sub
        }
      }
    }
  }

  return total
}

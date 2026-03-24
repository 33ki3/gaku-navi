/**
 * パラメータボーナス計算ロジック
 *
 * スケジュールのレッスン選択（ボーカル/ダンス/ビジュアル/休み）から、
 * パラメータボーナスの対象となる値（Vo/Da/Vi）を推定する。
 * レッスンにはメイン属性（大きく上がる）とサブ属性（少し上がる）があり、
 * それをVo/Da/Viに振り分けて合計する。
 */

import type { ParameterValues, PerLessonParameterValues } from '../../types/card'
import * as data from '../../data'
import * as enums from '../../types/enums'

/**
 * レッスン週ごとの解析結果
 *
 * iterateLessonWeeks が返すデータ。
 * 各レッスン週で「何を選んだか」「メイン・サブでどれだけ上がるか」を保持する。
 */
interface LessonWeekResult {
  /** 何週目か（スケジュール上の週番号） */
  week: number
  /** ユーザーが選択したレッスン属性（VoLesson等） */
  activity: enums.ActivityIdType
  /** メイン属性の上昇量（選んだ属性が大きく上がる） */
  mainIncrease: number
  /** サブ属性の上昇量（選んでない属性が少し上がる） */
  subIncrease: number
}

/**
 * スケジュールの全レッスン週を順にたどり、有効なレッスン選択を抽出する
 *
 * スケジュールの中から「レッスン週」だけを取り出し、
 * ユーザーがその週にレッスン（Vo/Da/Vi）を選んでいたら
 * メイン・サブの上昇量とともに返す。
 * 休みや授業を選んだ週はスキップされる。
 *
 * @param selections - 週番号 → 選んだ活動ID のマッピング
 * @param scenario - シナリオ名（はじめ/ノクチル等）
 * @param difficulty - 難易度（レジェンド等）
 * @returns 有効なレッスン週の解析結果配列
 */
function iterateLessonWeeks(
  selections: Record<number, enums.ActivityIdType>,
  scenario: enums.ScenarioType,
  difficulty: enums.DifficultyType,
): LessonWeekResult[] {
  const results: LessonWeekResult[] = []

  // マスターデータからレッスン一覧を取得する
  const lessonList = data.getLessonData(scenario, difficulty)
  if (lessonList.length === 0) return results

  // レッスンとして定義された週を順番に処理する
  let lessonIndex = 0
  const lessonWeeks = lessonList.map((l) => l.week)
  for (const week of lessonWeeks) {
    const selectedActivity = selections[week]
    if (!selectedActivity) {
      lessonIndex++
      continue
    }

    // レッスン以外（休む、授業など）を選択していたらスキップ
    const isLesson =
      selectedActivity === enums.ActivityIdType.VoLesson ||
      selectedActivity === enums.ActivityIdType.DaLesson ||
      selectedActivity === enums.ActivityIdType.ViLesson
    if (!isLesson) {
      lessonIndex++
      continue
    }

    // このレッスン週の上昇量データを取得する
    const lessonData = lessonList[lessonIndex]
    if (!lessonData) {
      lessonIndex++
      continue
    }

    // lesson.ts では Normal を削除済みのため、SP データのみ存在する
    const spLesson = lessonData.lessonTypes.find((t) => t.type === enums.LessonType.Sp)
    const lesson = spLesson ?? lessonData.lessonTypes[0]
    if (!lesson) {
      lessonIndex++
      continue
    }

    results.push({
      week,
      activity: selectedActivity,
      mainIncrease: lesson.main,
      subIncrease: lesson.sub,
    })
    lessonIndex++
  }

  return results
}

/**
 * メイン/サブの上昇量を Vo/Da/Vi の3属性に振り分ける
 *
 * 例: ボーカルレッスンを選んだ場合:
 *   - Vo = メイン上昇量（大きい値）
 *   - Da = サブ上昇量（小さい値）
 *   - Vi = サブ上昇量（小さい値）
 *
 * @param activity - 選択したレッスン属性
 * @param mainIncrease - メイン属性の上昇量
 * @param subIncrease - サブ属性の上昇量
 * @returns Vo/Da/Vi ごとの上昇量
 */
function distributeIncrease(
  activity: enums.ActivityIdType,
  mainIncrease: number,
  subIncrease: number,
): ParameterValues {
  if (activity === enums.ActivityIdType.VoLesson) {
    return { vocal: mainIncrease, dance: subIncrease, visual: subIncrease }
  } else if (activity === enums.ActivityIdType.DaLesson) {
    return { vocal: subIncrease, dance: mainIncrease, visual: subIncrease }
  }
  // ビジュアルレッスン
  return { vocal: subIncrease, dance: subIncrease, visual: mainIncrease }
}

/**
 * スケジュールのレッスン選択からパラメータボーナス対象値を推定する
 *
 * 全レッスン週の上昇量を合計し、パラメータボーナスの計算で使う
 * 「パラメータ上昇量の合計」を返す。
 *
 * @param selections - 週番号 → 選んだ活動ID のマッピング
 * @param scenario - シナリオ名
 * @param difficulty - 難易度
 * @returns Vo/Da/Vi の合計上昇量
 */
export function calculateParameterBonusFromSchedule(
  selections: Record<number, enums.ActivityIdType>,
  scenario: enums.ScenarioType,
  difficulty: enums.DifficultyType,
): ParameterValues {
  const result: ParameterValues = { vocal: 0, dance: 0, visual: 0 }

  // 各レッスン週の上昇量を Vo/Da/Vi に振り分けて積算する
  for (const { activity, mainIncrease, subIncrease } of iterateLessonWeeks(selections, scenario, difficulty)) {
    const dist = distributeIncrease(activity, mainIncrease, subIncrease)
    result.vocal += dist.vocal
    result.dance += dist.dance
    result.visual += dist.visual
  }

  return result
}

/**
 * スケジュールのレッスン選択からレッスンごとの Vo/Da/Vi 上昇量を返す
 *
 * パラメータボーナスをレッスン1回ごとに切り捨て計算するために使う。
 * 各配列の i 番目の要素が i 番目のレッスンでの上昇量に対応する。
 *
 * @param selections - 週番号 → 選んだ活動ID のマッピング
 * @param scenario - シナリオ名
 * @param difficulty - 難易度
 * @returns レッスンごとの Vo/Da/Vi 上昇量配列
 */
export function getPerLessonParameterValues(
  selections: Record<number, enums.ActivityIdType>,
  scenario: enums.ScenarioType,
  difficulty: enums.DifficultyType,
): PerLessonParameterValues {
  const result: PerLessonParameterValues = { vocal: [], dance: [], visual: [] }

  for (const { activity, mainIncrease, subIncrease } of iterateLessonWeeks(selections, scenario, difficulty)) {
    const dist = distributeIncrease(activity, mainIncrease, subIncrease)
    result.vocal.push(dist.vocal)
    result.dance.push(dist.dance)
    result.visual.push(dist.visual)
  }

  return result
}

/**
 * パラメータボーナスの週ごとの内訳データ（1行分）
 *
 * UIでパラメータボーナスの計算過程を表として表示する際に使う。
 */
export interface ParameterBonusBreakdownRow {
  /** 何週目か */
  week: number
  /** 選択した属性（Vo/Da/Vi） */
  attribute: enums.ParameterType
  /** ボーカルへの上昇量 */
  vocal: number
  /** ダンスへの上昇量 */
  dance: number
  /** ビジュアルへの上昇量 */
  visual: number
}

/**
 * スケジュール選択からパラメータボーナスの週ごとの内訳を返す
 *
 * calculateParameterBonusFromSchedule は合計だけを返すが、
 * この関数は各週の内訳（どの属性を選んだか、各パラメータへの上昇量）
 * をテーブル表示用に返す。
 *
 * @param selections - 週番号 → 選んだ活動ID のマッピング
 * @param scenario - シナリオ名
 * @param difficulty - 難易度
 * @returns 週ごとの内訳配列
 */
export function getParameterBonusBreakdown(
  selections: Record<number, enums.ActivityIdType>,
  scenario: enums.ScenarioType,
  difficulty: enums.DifficultyType,
): ParameterBonusBreakdownRow[] {
  return iterateLessonWeeks(selections, scenario, difficulty).map(({ week, activity, mainIncrease, subIncrease }) => {
    // 選択したレッスン属性 → ParameterType の変換
    const attribute =
      activity === enums.ActivityIdType.VoLesson
        ? enums.ParameterType.Vocal
        : activity === enums.ActivityIdType.DaLesson
          ? enums.ParameterType.Dance
          : enums.ParameterType.Visual

    // メイン/サブの上昇量を Vo/Da/Vi に振り分ける
    const dist = distributeIncrease(activity, mainIncrease, subIncrease)

    return { week, attribute, ...dist }
  })
}

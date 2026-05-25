/**
 * パラメータボーナス計算ロジック
 *
 * スケジュールのレッスン選択（ボーカル/ダンス/ビジュアル）から、
 * パラメータボーナスの対象となる値（Vo/Da/Vi）を推定する。
 */

import type { ParameterValues, PerLessonParameterValues } from '../../types/card'
import * as data from '../../data'
import * as enums from '../../types/enums'
import { getHifSelectionExamData } from '../../data/score/exam'
import { LESSON_MAIN_PARAM_MAP, LESSON_SUB_PARAM_MAP } from '../../data/score/hifScheduleMaster'
import { getHifExamWeeks, normalizeHifLessonActivityForPairMode } from '../hifScheduleHelpers'

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

    // レッスン活動IDでない選択（休み、授業など）はスキップ
    if (!LESSON_MAIN_PARAM_MAP[selectedActivity]) {
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
 * @param activity - 選択したレッスン属性
 * @param mainIncrease - メイン属性の上昇量
 * @param subIncrease - サブ属性の上昇量
 * @param splitSub - サブ値を残り2属性に半分ずつ分配するか（HIF半分割り振りモード）
 * @returns Vo/Da/Vi ごとの上昇量
 */
function distributeIncrease(
  activity: enums.ActivityIdType,
  mainIncrease: number,
  subIncrease: number,
  splitSub = false,
): ParameterValues {
  const mainParam = LESSON_MAIN_PARAM_MAP[activity]
  if (mainParam == null) return { vocal: 0, dance: 0, visual: 0 }

  const result: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  result[mainParam] = mainIncrease

  if (splitSub) {
    // サブを半分ずつ残り2属性に分配する（端数は切り捨て）
    const half = Math.floor(subIncrease / 2)
    for (const key of Object.values(enums.ParameterType)) {
      if (key !== mainParam) result[key] += half
    }
    return result
  }

  const subParam = LESSON_SUB_PARAM_MAP[activity]

  // HIFの組み合わせ活動はサブ1軸のみ。従来活動はサブ2軸同時。
  if (subParam != null) {
    result[subParam] = subIncrease
  } else {
    for (const key of Object.values(enums.ParameterType)) {
      if (key !== mainParam) result[key] += subIncrease
    }
  }

  return result
}

/**
 * スケジュールのレッスン選択からパラメータボーナス対象値を推定する
 *
 * @param selections - 週番号 → 選んだ活動ID のマッピング
 * @param scenario - シナリオ名
 * @param difficulty - 難易度
 * @param splitSub - HIFサブ半分割り振りモードか
 * @returns Vo/Da/Vi の合計上昇量
 */
export function calculateParameterBonusFromSchedule(
  selections: Record<number, enums.ActivityIdType>,
  scenario: enums.ScenarioType,
  difficulty: enums.DifficultyType,
  splitSub = false,
  hifExamRatios?: ParameterValues[],
): ParameterValues {
  const shouldSplitSub = scenario === enums.ScenarioType.Hif && splitSub
  const result: ParameterValues = { vocal: 0, dance: 0, visual: 0 }

  // 各レッスン週の上昇量を Vo/Da/Vi に振り分けて積算する
  for (const { activity, mainIncrease, subIncrease } of iterateLessonWeeks(selections, scenario, difficulty)) {
    const effectiveActivity =
      scenario === enums.ScenarioType.Hif && !shouldSplitSub
        ? normalizeHifLessonActivityForPairMode(activity)
        : activity
    const dist = distributeIncrease(effectiveActivity, mainIncrease, subIncrease, shouldSplitSub)
    result.vocal += dist.vocal
    result.dance += dist.dance
    result.visual += dist.visual
  }

  // HIF の選抜試験上昇はパラメータボーナス対象値に含める
  if (scenario === enums.ScenarioType.Hif) {
    for (const exam of getHifSelectionExamData(hifExamRatios)) {
      result.vocal += exam.vocal
      result.dance += exam.dance
      result.visual += exam.visual
    }
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
 * @param splitSub - HIFサブ半分割り振りモードか
 * @returns レッスンごとの Vo/Da/Vi 上昇量配列
 */
export function getPerLessonParameterValues(
  selections: Record<number, enums.ActivityIdType>,
  scenario: enums.ScenarioType,
  difficulty: enums.DifficultyType,
  splitSub = false,
  hifExamRatios?: ParameterValues[],
): PerLessonParameterValues {
  const shouldSplitSub = scenario === enums.ScenarioType.Hif && splitSub
  const result: PerLessonParameterValues = { vocal: [], dance: [], visual: [] }

  for (const { activity, mainIncrease, subIncrease } of iterateLessonWeeks(selections, scenario, difficulty)) {
    const effectiveActivity =
      scenario === enums.ScenarioType.Hif && !shouldSplitSub
        ? normalizeHifLessonActivityForPairMode(activity)
        : activity
    const dist = distributeIncrease(effectiveActivity, mainIncrease, subIncrease, shouldSplitSub)
    result.vocal.push(dist.vocal)
    result.dance.push(dist.dance)
    result.visual.push(dist.visual)
  }

  // HIF の選抜試験は1回ごとに切り捨て計算できるよう配列へ個別に追加する
  if (scenario === enums.ScenarioType.Hif) {
    for (const exam of getHifSelectionExamData(hifExamRatios)) {
      result.vocal.push(exam.vocal)
      result.dance.push(exam.dance)
      result.visual.push(exam.visual)
    }
  }

  return result
}

/**
 * パラメータボーナス内訳行のラベル種別。
 *
 * discriminated union で行の種類を区別する。
 * 未指定（undefined）の場合は通常のレッスン行として扱う。
 */
export type BreakdownRowKind =
  | { kind: typeof enums.BreakdownRowKindType.Class }
  | { kind: typeof enums.BreakdownRowKindType.Exam; examIndex: number }

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
  /** HIFなどで表示するサブ属性（未設定なら undefined） */
  subAttribute?: enums.ParameterType
  /** レッスン以外の行の種別（未設定ならレッスン行として扱う） */
  rowKind?: BreakdownRowKind
  /** HIF専用: 選抜/本選ステージ区分 */
  stage?: enums.HifStage
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
 * @param hifExamRatios - HIF選抜試験比率
 * @param splitSub - HIFサブ半分割り振りモードか
 * @returns 週ごとの内訳配列
 */
export function getParameterBonusBreakdown(
  selections: Record<number, enums.ActivityIdType>,
  scenario: enums.ScenarioType,
  difficulty: enums.DifficultyType,
  hifExamRatios?: ParameterValues[],
  splitSub = false,
): ParameterBonusBreakdownRow[] {
  const shouldSplitSub = scenario === enums.ScenarioType.Hif && splitSub
  const lessonRows = iterateLessonWeeks(selections, scenario, difficulty).map(
    ({ week, activity, mainIncrease, subIncrease }) => {
      const effectiveActivity =
        scenario === enums.ScenarioType.Hif && !shouldSplitSub
          ? normalizeHifLessonActivityForPairMode(activity)
          : activity
      const dist = distributeIncrease(effectiveActivity, mainIncrease, subIncrease, shouldSplitSub)
      const attribute = LESSON_MAIN_PARAM_MAP[effectiveActivity] ?? enums.ParameterType.Vocal
      // HIFのsplitSubモードではサブ属性は表示不要
      const subAttribute = shouldSplitSub ? undefined : LESSON_SUB_PARAM_MAP[effectiveActivity]
      return { week, attribute, subAttribute, ...dist }
    },
  )

  const classRows = data.getClassBreakdown(scenario, difficulty, selections).map((row) => ({
    week: row.week,
    attribute: row.attribute,
    rowKind: { kind: enums.BreakdownRowKindType.Class },
    vocal: row.values.vocal,
    dance: row.values.dance,
    visual: row.values.visual,
  }))

  if (scenario !== enums.ScenarioType.Hif) {
    return [...lessonRows, ...classRows].sort((a, b) => a.week - b.week)
  }

  // HIFのみ: 選抜試験行を内訳へ追加するため、週→stage マッピングを構築
  const scheduleData = data.getScheduleData(scenario, difficulty)
  const weekStageMap = new Map<number, enums.HifStage>()
  for (const w of scheduleData) {
    if (w.stage !== undefined) weekStageMap.set(w.week, w.stage)
  }

  const selectionWeeks = getHifExamWeeks(scheduleData)
  const selectionRows = getHifSelectionExamData(hifExamRatios).map((values, index) => ({
    week: selectionWeeks[index],
    attribute: enums.ParameterType.Vocal,
    rowKind: { kind: enums.BreakdownRowKindType.Exam, examIndex: index },
    stage: weekStageMap.get(selectionWeeks[index]),
    vocal: values.vocal,
    dance: values.dance,
    visual: values.visual,
  }))

  const hifLessonRows = lessonRows.map((row) => ({ ...row, stage: weekStageMap.get(row.week) }))
  const hifClassRows = classRows.map((row) => ({ ...row, stage: weekStageMap.get(row.week) }))

  return [...hifLessonRows, ...hifClassRows, ...selectionRows].sort((a, b) => a.week - b.week)
}

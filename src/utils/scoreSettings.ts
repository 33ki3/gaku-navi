/**
 * スコア設定の管理ユーティリティ
 *
 * 点数設定（シナリオ・難易度・アクション回数・パラメータボーナス等）の
 * 初期値生成、localStorage への保存/読み込み、
 * スケジュール選択からのアクション回数集計を行う。
 */

import type { ScoreSettings } from '../types/card'
import type { TranslationKey } from '../i18n'
import * as data from '../data'
import type { ScheduleWeekData } from '../data'
import * as constant from '../constant'
import * as enums from '../types/enums'

export { calculateParameterBonusFromSchedule, getParameterBonusBreakdown } from './calculator/parameterBonus'
export type { ParameterBonusBreakdownRow } from './calculator/parameterBonus'

/**
 * デフォルトのスコア設定を作る
 * シナリオ=初、難易度=レジェンド で初期化し、
 * 固定スケジュール（試験等）は自動選択、自由選択週は空にする。
 * 自動計算チェックはON。
 */
function createDefaultSettings(): ScoreSettings {
  // 全アクションカテゴリの回数を0で初期化する
  const actionCounts: Partial<Record<enums.ActionIdType, number>> = {}
  for (const cat of data.ActionCategoryList) {
    actionCounts[cat.id] = 0
  }

  // 完全固定の週のみ自動選択する（試験等：fixed=true かつ 休めない週）
  const scheduleSelections: Record<number, enums.ActivityIdType> = {}
  const scheduleData = data.getScheduleData(constant.DEFAULT_SCENARIO, constant.DEFAULT_DIFFICULTY)
  for (const week of scheduleData) {
    if (week.fixed && !week.canRest && week.activities.length > 0) {
      scheduleSelections[week.week] = week.activities[0].id
    }
  }

  return {
    name: '',
    scenario: constant.DEFAULT_SCENARIO,
    difficulty: constant.DEFAULT_DIFFICULTY,
    parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    actionCounts,
    scheduleSelections,
    useScheduleLimits: true,
    includeSelfTrigger: true,
    includePItem: true,
    useFixedUncap: false,
  }
}

/**
 * ユーザーが全スケジュール週（完全固定以外）を設定済みか判定する。
 * 完全固定週（fixed=true かつ can_rest=false）は除外し、
 * 残りの全週に選択があれば true を返す。
 */
export function hasAllScheduleSelections(settings: ScoreSettings): boolean {
  const scheduleData = data.getScheduleData(settings.scenario, settings.difficulty)
  for (const week of scheduleData) {
    const isFullyFixed = week.fixed && !week.canRest
    if (!isFullyFixed && !settings.scheduleSelections[week.week]) {
      return false
    }
  }
  return true
}

/**
 * ユーザーの週ごとのスケジュール選択から、各アクションの実行回数を集計する
 *
 * 例: 1週目に「ボーカルレッスン」を選ぶと、
 * それに紐づくアクション（ボーカル練習など）の回数が +1 される。
 *
 * @param selections - 週番号 → 選んだ活動ID のマッピング
 * @param schedule - スケジュールの週データ配列
 * @returns アクションID → 実行回数のマッピング
 */
export function calculateCountsFromSchedule(
  selections: Record<number, enums.ActivityIdType>,
  schedule: ScheduleWeekData[],
): Partial<Record<enums.ActionIdType, number>> {
  const counts: Partial<Record<enums.ActionIdType, number>> = {}

  for (const week of schedule) {
    // その週でユーザーが選んだ活動を取得する
    const selected = selections[week.week]
    if (!selected) continue

    // 活動に紐づくアクションID一覧を取得する
    const mappings = data.ActivityActionMap[selected]
    if (!mappings) continue

    // 各アクションの回数をカウントアップする
    for (const actionId of mappings) {
      counts[actionId] = (counts[actionId] ?? 0) + 1
    }
  }

  return counts
}

/**
 * スケジュールの自動計算結果と、ユーザーが手動で入力した回数をマージする
 *
 * スケジュール自動計算が有効な場合、スケジュールで制御されるアクションは
 * 自動計算の値で上書きし、それ以外は手動入力の値をそのまま使う。
 *
 * @param settings - 現在のスコア設定
 * @param schedule - スケジュール週データ
 * @returns マージ後のアクション回数
 */
export function mergeScheduleCounts(settings: ScoreSettings, schedule: ScheduleWeekData[]): Partial<Record<enums.ActionIdType, number>> {
  // スケジュール自動計算が無効なら、手動入力の値をそのまま返す
  if (!settings.useScheduleLimits) {
    return settings.actionCounts
  }

  // スケジュール選択からアクション回数を計算する
  const scheduleCounts = calculateCountsFromSchedule(settings.scheduleSelections, schedule)

  // スケジュールで自動制御されるアクションIDの一覧を作る
  const scheduleControlledIds = new Set(Object.values(data.ActivityActionMap).flat())

  // 手動入力をベースに、自動制御分だけ上書きする
  const merged = { ...settings.actionCounts }
  for (const id of scheduleControlledIds) {
    merged[id] = scheduleCounts[id] ?? 0
  }

  // Vo/Da/Vi 分割されたカウントから合計値を集計する
  computeLessonTotals(merged)

  return merged
}

/**
 * Vo/Da/Vi 分割のレッスン回数から合計値を算出してマージ結果に書き込む
 *
 * - sp_lesson = sp_lesson_vo + sp_lesson_da + sp_lesson_vi
 * - normal_lesson = normal_lesson_vo + normal_lesson_da + normal_lesson_vi
 * - lesson_vo = sp_lesson_vo + normal_lesson_vo（属性別レッスン合計）
 * - lesson_da = sp_lesson_da + normal_lesson_da
 * - lesson_vi = sp_lesson_vi + normal_lesson_vi
 * - lesson = lesson_vo + lesson_da + lesson_vi
 */
function computeLessonTotals(merged: Partial<Record<enums.ActionIdType, number>>): void {
  // SPレッスン合計
  const spVo = merged[enums.ActionIdType.SpLessonVo] ?? 0
  const spDa = merged[enums.ActionIdType.SpLessonDa] ?? 0
  const spVi = merged[enums.ActionIdType.SpLessonVi] ?? 0
  const spTotal = spVo + spDa + spVi
  merged[enums.ActionIdType.SpLesson] = spTotal

  // 通常レッスン合計
  const nlVo = merged[enums.ActionIdType.NormalLessonVo] ?? 0
  const nlDa = merged[enums.ActionIdType.NormalLessonDa] ?? 0
  const nlVi = merged[enums.ActionIdType.NormalLessonVi] ?? 0
  merged[enums.ActionIdType.NormalLesson] = nlVo + nlDa + nlVi

  // 属性別レッスン合計（SP + 通常）
  merged[enums.ActionIdType.LessonVo] = spVo + nlVo
  merged[enums.ActionIdType.LessonDa] = spDa + nlDa
  merged[enums.ActionIdType.LessonVi] = spVi + nlVi

  // レッスン全属性合計
  merged[enums.ActionIdType.Lesson] = spTotal + nlVo + nlDa + nlVi
}

/**
 * localStorage からスコア設定を読み込む
 * 保存データがないか壊れている場合はデフォルト値を返す
 *
 * @returns 復元したスコア設定
 */
export function loadScoreSettings(): ScoreSettings {
  try {
    const raw = localStorage.getItem(constant.SCORE_SETTINGS_STORAGE_KEY)
    if (!raw) return createDefaultSettings()
    const parsed = JSON.parse(raw) as ScoreSettings
    const validScenarios = new Set(Object.values(enums.ScenarioType))
    const validDifficulties = new Set(Object.values(enums.DifficultyType))
    if (
      !parsed.scenario ||
      !parsed.difficulty ||
      !parsed.actionCounts ||
      !validScenarios.has(parsed.scenario) ||
      !validDifficulties.has(parsed.difficulty)
    ) {
      return createDefaultSettings()
    }
    return parsed
  } catch {
    return createDefaultSettings()
  }
}

/**
 * スコア設定を localStorage に保存する
 *
 * @param settings - 保存するスコア設定
 */
export function saveScoreSettings(settings: ScoreSettings): void {
  try {
    localStorage.setItem(constant.SCORE_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    /* 容量超過等は無視する */
  }
}

/**
 * スケジュール自動計算結果をサマリ文字列に変換する
 *
 * @example
 * // counts = { lesson: 3, outing: 2, rest: 1 } のとき
 * // => '授業3 おでかけ2 休む1'
 *
 * @param counts - アクションID → 回数のマッピング
 * @param t - i18n の翻訳関数
 * @returns サマリ文字列（回数0のアクションは除外）
 */
export function formatScheduleSummary(
  counts: Partial<Record<enums.ActionIdType, number>>,
  t: (key: TranslationKey, options?: Record<string, string | number>) => string,
): string {
  return data.ActionSummaryList.filter(({ id }) => (counts[id] ?? 0) > 0)
    .map(({ id, summaryLabel }) => t('ui.format.summary_entry', { label: t(summaryLabel), count: counts[id] ?? 0 }))
    .join(t('ui.format.summary_separator'))
}

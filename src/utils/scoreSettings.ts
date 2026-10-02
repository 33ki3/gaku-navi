/**
 * スコア設定の管理ユーティリティ
 *
 * 点数設定の初期値生成、ブラウザの保存領域への保存・読み込み、
 * スケジュール選択からのアクション回数集計を行う
 */

import * as constant from '../constant'
import type { ScheduleWeekData } from '../data'
import * as data from '../data'
import type { TranslationKey } from '../i18n'
import type { ScenarioScheduleSelections } from '../types/calculation'
import type {
  ActionCounts,
  ParameterValues,
  PerLessonParameterValues,
  ScoreSettings,
  ScoreSettingsBase,
} from '../types/card'
import * as enums from '../types/enums'
import { StorageOperationPhase, StorageTransactionOutcome, type StorageTransactionResult } from '../types/storage'
import { calculateParameterBonusFromSchedule } from './calculator/parameterBonus'
import { normalizeHifLessonActivityForPairMode, resolveHifLessonPair } from './hifScheduleHelpers'
import { isScoreSettings } from './scoreSettingsValidation'
import { isScenarioScheduleSelections } from './storageCollectionValidation'
import { applyStorageEntries, createStorageSnapshotResult } from './storageTransaction'
import { isRecord } from './valueValidation'

/**
 * 既定のスコア設定を作る
 * 初期値はシナリオ=初、難易度=レジェンド、全シナリオの週選択は空、自動計算はON
 *
 * @param scenario - 初期化するシナリオ
 * @returns 初期値で作成したスコア設定
 */
export function createDefaultSettings(scenario: enums.ScenarioType = constant.DEFAULT_SCENARIO): ScoreSettings {
  // シナリオごとに難易度の有無を決め、設定画面と同じ初期状態を作る
  const isNoneDifficultyScenario = scenario === enums.ScenarioType.Hif || scenario === enums.ScenarioType.Custom
  const scheduleDifficulty = isNoneDifficultyScenario ? enums.DifficultyType.None : constant.DEFAULT_DIFFICULTY

  // 全アクションカテゴリの回数を0で初期化する
  const actionCounts: Partial<Record<enums.ActionIdType, number>> = {}
  for (const cat of data.ActionCategoryList) {
    // 点数設定フォームに表示される全アクションを0回で用意する
    actionCounts[cat.id] = 0
  }

  const scheduleSelections: Record<number, enums.ActivityIdType> = {}

  return {
    name: '',
    scenario,
    difficulty: scheduleDifficulty,
    parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    actionCounts,
    scheduleSelections,
    useScheduleLimits: true,
    includeSelfTrigger: true,
    includePItem: true,
    useFixedUncap: false,
    useCustomMode: scenario === enums.ScenarioType.Custom,
    customParamBonusRows: [{ vocal: 0, dance: 0, visual: 0 }],
    customClassBonus: { vocal: 0, dance: 0, visual: 0 },
    customNonBonusGain: { vocal: 0, dance: 0, visual: 0 },
    hifExamRatios: [
      { vocal: 0, dance: 0, visual: 0 },
      { vocal: 0, dance: 0, visual: 0 },
      { vocal: 0, dance: 0, visual: 0 },
    ],
    hifLessonSplitSub: true,
  }
}

/**
 * 保存済みスコア設定へ、コード側の既定値を補完する
 *
 * 保存データに含まれる既知の設定値は保持する
 *
 * @param value - 保存データから読み込んだ値
 * @returns オブジェクトなら補完済み設定、それ以外は入力値
 */
export function fillScoreSettingsDefaults(value: unknown): unknown {
  if (!isRecord(value)) return value

  // シナリオが不正でも既定シナリオを基準にし、保存値に不足項目を補完する
  const scenario = Object.values(enums.ScenarioType).find((candidate) => candidate === value.scenario)
  const defaults = createDefaultSettings(scenario ?? constant.DEFAULT_SCENARIO)
  const actionCounts =
    value.actionCounts === undefined
      ? defaults.actionCounts
      : isRecord(value.actionCounts)
        ? { ...defaults.actionCounts, ...value.actionCounts }
        : value.actionCounts

  // 明示された既知値を優先しつつ、アクション回数だけは既定の0回と組み合わせる
  return {
    ...defaults,
    ...value,
    actionCounts,
  }
}

/**
 * 保存済み点数設定を既定値補完してから厳密に検証する
 *
 * @param value - 検証する保存値
 * @returns 検証済みのスコア設定。不正ならnull
 */
export function normalizeScoreSettings(value: unknown): ScoreSettings | null {
  // 補完後に共通の検証処理を通し、型だけ合う不完全な設定を除外する
  const normalized = fillScoreSettingsDefaults(value)
  return isScoreSettings(normalized) ? normalized : null
}

/** 保存時に自動計算値を任意項目として扱う型 */
type PersistedScoreSettings = ScoreSettingsBase & {
  parameterBonusBase?: ParameterValues
}

/**
 * シナリオに対して使用する難易度を解決する
 *
 * @param scenario - 対象シナリオ
 * @param difficulty - 保存または画面から渡された難易度
 * @returns シナリオに対応する難易度
 */
export function resolveScoreSettingsDifficulty(
  scenario: enums.ScenarioType,
  difficulty: enums.DifficultyType | null | undefined,
): enums.DifficultyType {
  // HIFとカスタムには難易度の選択欄がないため、保存値に何が入っていてもNoneへ寄せる
  if (scenario === enums.ScenarioType.Hif || scenario === enums.ScenarioType.Custom) {
    return enums.DifficultyType.None
  }

  return difficulty && difficulty !== enums.DifficultyType.None ? difficulty : constant.DEFAULT_DIFFICULTY
}

/**
 * スケジュール設定から派生する値を正規化する
 *
 * @param settings - 正規化するスコア設定
 * @returns 難易度とパラメータボーナスを正規化した設定
 */
export function normalizeScoreSettingsDerived(settings: ScoreSettings): ScoreSettings {
  // シナリオに合わせて難易度をそろえ、スケジュール連動時だけパラメータボーナスを再計算する
  const difficulty = resolveScoreSettingsDifficulty(settings.scenario, settings.difficulty)
  if (!settings.useScheduleLimits || settings.useCustomMode) {
    return { ...settings, difficulty }
  }

  return {
    ...settings,
    difficulty,
    parameterBonusBase: calculateParameterBonusFromSchedule(
      settings.scheduleSelections,
      settings.scenario,
      difficulty,
      settings.hifLessonSplitSub,
      settings.hifExamRatios,
    ),
  }
}

/**
 * 自動計算される値を保存せず、設定を保存形式へ変換する
 *
 * @param settings - 保存するスコア設定
 * @returns ブラウザの保存領域へ保存する形式のスコア設定
 */
export function getScoreSettingsForStorage(settings: ScoreSettings): PersistedScoreSettings {
  // 画面表示用の派生値とスケジュール連動アクションを、保存に必要な最小形式へ変換する
  const normalizedSettings = normalizeScoreSettingsDerived(settings)
  const useSchedule = normalizedSettings.useScheduleLimits && !normalizedSettings.useCustomMode
  const actionCounts: ActionCounts = {}
  for (const { id } of data.ActionCategoryList) {
    // スケジュールで自動計算する項目は保存せず、読み込み時に現在の予定から再構成する
    if (useSchedule && data.ScheduleControlledIds.has(id)) continue
    const count = normalizedSettings.actionCounts[id]
    if (count !== undefined) actionCounts[id] = count
  }

  if (!useSchedule) {
    // 手動・カスタムモードでは、アクション回数とパラメータボーナスを
    // 入力した内容のまま保存する
    return { ...normalizedSettings, actionCounts }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { parameterBonusBase: _parameterBonusBase, ...persistedSettings } = normalizedSettings
  return { ...persistedSettings, actionCounts }
}

/**
 * 保存領域の生データを安全に読み取り、スコア設定へ変換する
 *
 * @param raw - 保存領域から取得した文字列
 * @returns 検証済みのスコア設定。不正ならnull
 */
function parseStoredScoreSettings(raw: string | null): ScoreSettings | null {
  if (!raw) return null
  try {
    // 保存文字列を読み取り、既定値を補ってから共通の検証を通す
    return normalizeScoreSettings(JSON.parse(raw))
  } catch {
    return null
  }
}

/**
 * 指定シナリオの週データに存在する活動IDだけを残す
 *
 * @param scenario - シナリオ
 * @param difficulty - 難易度
 * @param selections - 週番号→活動ID
 * @param hifLessonSplitSub - HIFのレッスンをサブ属性へ分けるか
 * @returns 無効な活動IDを除外した選択マップ
 */
function sanitizeScheduleSelections(
  scenario: enums.ScenarioType,
  difficulty: enums.DifficultyType,
  selections: Record<number, enums.ActivityIdType>,
  hifLessonSplitSub = true,
): Record<number, enums.ActivityIdType> {
  // 現在のシナリオの週データを表にし、存在しない週の保存値を捨てる
  const scheduleData = data.getScheduleData(scenario, difficulty)
  const weekByNumber = new Map(scheduleData.map((week) => [week.week, week]))

  const sanitized: Record<number, enums.ActivityIdType> = {}
  for (const [weekRaw, activityId] of Object.entries(selections)) {
    const week = Number(weekRaw)
    const weekData = weekByNumber.get(week)
    if (!weekData) continue

    // HIFの保存形式を表示モードに合わせて現在のフォームへそろえる
    const normalizedActivityId =
      scenario === enums.ScenarioType.Hif
        ? hifLessonSplitSub && resolveHifLessonPair(activityId)
          ? resolveHifLessonPair(activityId)!.main
          : !hifLessonSplitSub
            ? normalizeHifLessonActivityForPairMode(activityId)
            : activityId
        : activityId
    if (data.isScheduleActivityAllowed(weekData, normalizedActivityId, scenario, hifLessonSplitSub)) {
      // 現在の週に存在する活動だけを採用する
      sanitized[week] = normalizedActivityId
    }
  }
  return sanitized
}

/**
 * 指定シナリオのスケジュール選択が、
 * 各週のフォーム選択肢だけで構成されているか確認する
 *
 * @param scenario - シナリオ
 * @param difficulty - 難易度
 * @param selections - 週番号→活動ID
 * @param hifLessonSplitSub - HIFのレッスンをサブ属性へ分けるか
 * @returns すべての選択が現在の候補に含まれる場合はtrue
 */
export function isValidScheduleSelections(
  scenario: enums.ScenarioType,
  difficulty: enums.DifficultyType,
  selections: Record<number, enums.ActivityIdType>,
  hifLessonSplitSub = true,
): boolean {
  // 保存値を破壊せず、全選択が現在の各週の候補に含まれるかだけを判定する
  const weekByNumber = new Map(data.getScheduleData(scenario, difficulty).map((week) => [week.week, week]))
  return Object.entries(selections).every(([weekRaw, activityId]) => {
    const weekNumber = Number(weekRaw)
    const week = weekByNumber.get(weekNumber)
    return (
      Number.isSafeInteger(weekNumber) &&
      week !== undefined &&
      data.isScheduleActivityAllowed(week, activityId, scenario, hifLessonSplitSub)
    )
  })
}

/**
 * 指定シナリオのスケジュール選択を読み込む
 * 未保存の場合は空選択を返す
 *
 * @param scenario - シナリオ
 * @param hifLessonSplitSub - HIFのレッスンをサブ属性へ分けるか
 * @returns 週番号 → 活動ID のマッピング
 */
export function loadScheduleSelections(
  scenario: enums.ScenarioType,
  hifLessonSplitSub = true,
): Record<number, enums.ActivityIdType> {
  try {
    // カスタムシナリオはスケジュールの概念がないため空を返す
    if (scenario === enums.ScenarioType.Custom) return {}
    // Niaは現行のスケジュール定義が空で、保存済みの週選択を計算へ使わない
    if (scenario === enums.ScenarioType.Nia) return {}

    // Hajime は共有キーの scheduleSelections を使用する
    if (scenario === enums.ScenarioType.Hajime) {
      // Hajimeの週選択は、点数設定と同じ保存データから読み込む
      const parsed = parseStoredScoreSettings(localStorage.getItem(constant.SCORE_SETTINGS_STORAGE_KEY))
      if (parsed?.scheduleSelections && Object.keys(parsed.scheduleSelections).length > 0) {
        return sanitizeScheduleSelections(scenario, constant.DEFAULT_DIFFICULTY, parsed.scheduleSelections)
      }
      return {}
    }

    // HIFはシナリオ別キーから現在有効な選択だけを復元する
    const raw = localStorage.getItem(constant.SCHEDULE_SELECTIONS_STORAGE_KEY)
    if (raw) {
      // それ以外のシナリオは、シナリオ別データから対象シナリオの選択だけを取り出す
      const parsed: unknown = JSON.parse(raw)
      if (!isScenarioScheduleSelections(parsed)) return {}
      const all = parsed
      const stored = all[scenario]
      if (stored && Object.keys(stored).length > 0) {
        return sanitizeScheduleSelections(
          scenario,
          scenario === enums.ScenarioType.Hif ? enums.DifficultyType.None : constant.DEFAULT_DIFFICULTY,
          stored,
          hifLessonSplitSub,
        )
      }
    }
    return {}
  } catch {
    // 保存データを使えない場合は、週を未選択として計算を続ける
  }

  return {}
}

/**
 * ユーザーが全スケジュール週（完全固定以外）を設定済みか判定する
 * 完全固定週（fixed=true かつ can_rest=false）を除き、全週に選択があればtrueを返す
 *
 * @param settings - 判定するスコア設定
 * @returns 固定週以外がすべて有効な選択ならtrue
 */
export function hasAllScheduleSelections(settings: ScoreSettings): boolean {
  // 固定週を除き、各週に現在有効な活動が選ばれているか確認する
  const scheduleData = data.getScheduleData(
    settings.scenario,
    resolveScoreSettingsDifficulty(settings.scenario, settings.difficulty),
  )
  for (const week of scheduleData) {
    const isFullyFixed = week.fixed && !week.canRest
    const selected = settings.scheduleSelections[week.week]
    const isValidSelection =
      selected !== undefined &&
      data.isScheduleActivityAllowed(week, selected, settings.scenario, settings.hifLessonSplitSub)
    if (!isFullyFixed && !isValidSelection) {
      // 1週でも未選択・無効なら、スケジュール由来の派生値は未確定とする
      return false
    }
  }
  return true
}

/**
 * 計算と画面表示で共有するスケジュール選択を作る
 *
 * 固定かつ休めない週はUIの選択欄がないため、
 * その週の先頭活動を計算用の選択として補う
 *
 * @param selections - ユーザーが選択した週番号→活動ID
 * @param schedule - 対象シナリオの週データ
 * @returns 固定週の活動を補った選択マップ
 */
export function getEffectiveScheduleSelections(
  selections: Record<number, enums.ActivityIdType>,
  schedule: ScheduleWeekData[],
): Record<number, enums.ActivityIdType> {
  const effectiveSelections = { ...selections }
  for (const week of schedule) {
    if (week.fixed && !week.canRest && week.activities.length > 0) {
      effectiveSelections[week.week] = week.activities[0].id
    }
  }
  return effectiveSelections
}

/**
 * ユーザーの週ごとのスケジュール選択から、各アクションの実行回数を集計する
 *
 * 例: 「ボーカルレッスン」を1週選ぶと、
 * 関連するアクション（ボーカル練習など）の回数が+1される
 *
 * @param selections - 週番号 → 選んだ活動ID のマッピング
 * @param schedule - スケジュールの週データ配列
 * @param scenario - 選択値を現在のシナリオ候補と照合する場合のシナリオ
 * @param hifLessonSplitSub - HIFのレッスンをサブ属性へ分けるか
 * @returns アクションID → 実行回数のマッピング
 */
export function calculateCountsFromSchedule(
  selections: Record<number, enums.ActivityIdType>,
  schedule: ScheduleWeekData[],
  scenario?: enums.ScenarioType,
  hifLessonSplitSub = true,
): Partial<Record<enums.ActionIdType, number>> {
  const counts: Partial<Record<enums.ActionIdType, number>> = {}
  const effectiveSelections = getEffectiveScheduleSelections(selections, schedule)

  for (const week of schedule) {
    const selected: enums.ActivityIdType | undefined = effectiveSelections[week.week]

    if (!selected) continue
    if (scenario !== undefined && !data.isScheduleActivityAllowed(week, selected, scenario, hifLessonSplitSub)) {
      // 保存値に残った「その週には存在しない活動」は計算へ渡さない
      continue
    }

    // 活動に紐づくアクションID一覧を取得する
    const mappings = data.ActivityActionMap[selected]
    // 活動に対応するアクション定義がないデータは、回数を増やさず無視する
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
 * スケジュール自動計算が有効なら制御対象を自動値で上書きし、
 * それ以外は手動入力を使う
 *
 * @param settings - 現在のスコア設定
 * @param schedule - スケジュール週データ
 * @returns マージ後のアクション回数
 */
export function mergeScheduleCounts(
  settings: ScoreSettings,
  schedule: ScheduleWeekData[],
): Partial<Record<enums.ActionIdType, number>> {
  const merged = { ...settings.actionCounts }

  if (settings.useScheduleLimits) {
    // スケジュール選択からアクション回数を計算する
    const scheduleCounts = calculateCountsFromSchedule(
      settings.scheduleSelections,
      schedule,
      settings.scenario,
      settings.hifLessonSplitSub,
    )

    // 手動入力をベースに、自動制御分だけ上書きする
    for (const id of data.ScheduleControlledIds) {
      // スケジュール管理対象だけ自動値で上書きし、手動入力対象はそのまま残す
      merged[id] = scheduleCounts[id] ?? 0
    }
  }

  // 自動・手動のどちらでも、合算値は通常/SPの内訳から作る
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
 *
 * @param merged - 合算値を書き込むアクション回数
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
 * ブラウザの保存領域からスコア設定を読み込む
 * 保存データがないか壊れている場合は既定値を返す
 *
 * @returns 復元したスコア設定
 */
export function loadScoreSettings(): ScoreSettings {
  try {
    // 共有設定を読み込み、シナリオ別スケジュールを正規化して
    // パラメータボーナスを再計算する
    const parsed = parseStoredScoreSettings(localStorage.getItem(constant.SCORE_SETTINGS_STORAGE_KEY))
    if (!parsed) return createDefaultSettings()
    const scheduleSelections =
      parsed.scenario === enums.ScenarioType.Hajime
        ? sanitizeScheduleSelections(
            parsed.scenario,
            resolveScoreSettingsDifficulty(parsed.scenario, parsed.difficulty),
            parsed.scheduleSelections,
            parsed.hifLessonSplitSub,
          )
        : parsed.scenario === enums.ScenarioType.Custom
          ? {}
          : loadScheduleSelections(parsed.scenario, parsed.hifLessonSplitSub)

    return normalizeScoreSettingsDerived({
      ...parsed,
      scheduleSelections,
    })
  } catch {
    return createDefaultSettings()
  }
}

/**
 * カスタムパラメータボーナス行配列を PerLessonParameterValues に変換する
 *
 * @param rows - カスタムパラメータボーナス行の配列
 * @returns レッスンごとの Vo/Da/Vi 配列
 */
export function customRowsToPerLessonValues(rows: ParameterValues[]): PerLessonParameterValues {
  // 行配列を計算器が使う属性別配列へ転置する
  return {
    vocal: rows.map((r) => r.vocal),
    dance: rows.map((r) => r.dance),
    visual: rows.map((r) => r.visual),
  }
}

/**
 * カスタムパラメータボーナス行配列の合計値を返す
 *
 * @param rows - カスタムパラメータボーナス行の配列
 * @returns Vo/Da/Vi の合計値
 */
export function sumCustomParamBonusRows(rows: ParameterValues[]): ParameterValues {
  // カスタム行をVo/Da/Viごとに合算し、表示と計算で同じ合計値を使う
  return {
    vocal: rows.reduce((s, r) => s + r.vocal, 0),
    dance: rows.reduce((s, r) => s + r.dance, 0),
    visual: rows.reduce((s, r) => s + r.visual, 0),
  }
}

/**
 * スコア設定をブラウザの保存領域へ保存する
 *
 * @param settings - 保存するスコア設定
 * @returns 保存できた場合はtrue
 */
export function saveScoreSettings(settings: ScoreSettings): boolean {
  return saveScoreSettingsWithOutcome(settings).outcome === StorageTransactionOutcome.Committed
}

/**
 * スコア設定保存の詳細結果。共通の保存処理は詳細を保ったままこちらを使う
 *
 * @param settings - 保存するスコア設定
 * @returns 保存処理の詳細結果
 */
function saveScoreSettingsWithOutcome(settings: ScoreSettings): StorageTransactionResult {
  // 点数設定とスケジュールを同じ保存処理で更新し、片方だけ新しくなる状態を防ぐ
  const entries = createScoreSettingsStorageEntries(settings)
  if (entries === null) {
    return {
      outcome: StorageTransactionOutcome.SnapshotFailed,
      changed: false,
      writtenKeys: [],
      issues: [{ phase: StorageOperationPhase.Snapshot }],
    }
  }

  const snapshotResult = createStorageSnapshotResult(entries)
  // 保存前の値を取得できない場合は書き込みを始めず、失敗したキーを詳細結果へ残す
  if (!snapshotResult.ok) {
    return {
      outcome: snapshotResult.outcome,
      changed: false,
      writtenKeys: [],
      issues: snapshotResult.issues,
    }
  }
  return applyStorageEntries(entries, snapshotResult.snapshot)
}

/**
 * 点数設定を保存するためのキーとJSON文字列を組み立てる
 *
 * @param settings - 保存するスコア設定
 * @returns 保存対象のキーとJSON文字列。不正な保存値ならnull
 */
function createScoreSettingsStorageEntries(settings: ScoreSettings): readonly [string, string][] | null {
  try {
    // 先に画面設定を保存形式へ変換し、シナリオによって書き込むキーを組み立てる
    const persistedSettings = getScoreSettingsForStorage(settings)
    const entries: [string, string][] = []

    // Hajime 以外（カスタム除く）の scheduleSelections はシナリオ別キーに保存する
    if (
      persistedSettings.scenario !== enums.ScenarioType.Custom &&
      persistedSettings.scenario !== enums.ScenarioType.Hajime
    ) {
      const rawSchedules = localStorage.getItem(constant.SCHEDULE_SELECTIONS_STORAGE_KEY)
      // 他シナリオの選択は残し、現在のシナリオ分だけ差し替える
      const allSchedules: ScenarioScheduleSelections = {}
      if (rawSchedules) {
        const parsed: unknown = JSON.parse(rawSchedules)
        if (isScenarioScheduleSelections(parsed)) Object.assign(allSchedules, parsed)
      }
      allSchedules[persistedSettings.scenario] = { ...persistedSettings.scheduleSelections }
      entries.push([constant.SCHEDULE_SELECTIONS_STORAGE_KEY, JSON.stringify(allSchedules)])
    }

    if (persistedSettings.scenario === enums.ScenarioType.Hajime) {
      // Hajime は scheduleSelections を含めて共有キーに保存する
      entries.push([constant.SCORE_SETTINGS_STORAGE_KEY, JSON.stringify(persistedSettings)])
    } else {
      // 他シナリオの選択を別に保存し、共通設定に残るHajimeの選択は保持する
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { scheduleSelections: _omit, ...settingsWithoutSchedule } = persistedSettings
      const previousShared = parseStoredScoreSettings(localStorage.getItem(constant.SCORE_SETTINGS_STORAGE_KEY))
      // 共通設定に残っているHajimeの週選択を、他シナリオ保存時も失わない
      const preservedHajimeSchedules = previousShared?.scheduleSelections
      const sharedPayload = preservedHajimeSchedules
        ? { ...settingsWithoutSchedule, scheduleSelections: preservedHajimeSchedules }
        : settingsWithoutSchedule
      entries.push([constant.SCORE_SETTINGS_STORAGE_KEY, JSON.stringify(sharedPayload)])
    }
    return entries
  } catch {
    return null
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
 * @param t - 翻訳処理を受け取る関数
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

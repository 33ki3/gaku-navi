/**
 * 点数設定ユーティリティのテスト
 *
 * 点数設定パネルのスケジュール選択判定・アクション回数集計・
 * 手動入力とスケジュール算出のマージ・localStorage への保存/読み込みを検証する。
 * スケジュールモード（useScheduleLimits=true）ではユーザーが各週の活動を選択し、
 * そこからアクション回数が自動算出される。スケジュール制御外のアクション
 * （スキル獲得等）は手動入力値がそのまま使われる。
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  hasAllScheduleSelections,
  calculateCountsFromSchedule,
  mergeScheduleCounts,
  loadScoreSettings,
  loadScheduleSelections,
  createDefaultSettings,
  resetScheduleSelectionsOnly,
  saveScoreSettings,
} from '../../utils/scoreSettings'
import type { ScoreSettings } from '../../types/card'
import type { ScheduleWeekData } from '../../data'
import * as data from '../../data'
import * as enums from '../../types/enums'
import * as constant from '../../constant'

/** createDefaultSettings のデフォルト選択仕様テスト */
describe('createDefaultSettings', () => {
  it('Hajime は空選択から開始する', () => {
    const defaults = createDefaultSettings(enums.ScenarioType.Hajime)
    expect(defaults.scheduleSelections).toEqual({})
  })

  it('HIF は空選択から開始する', () => {
    const defaults = createDefaultSettings(enums.ScenarioType.Hif)
    expect(defaults.scheduleSelections).toEqual({})
  })

  it('resetScheduleSelectionsOnly は scheduleSelections のみ初期化する', () => {
    const base = createDefaultSettings(enums.ScenarioType.Hif)
    const next = resetScheduleSelectionsOnly({
      ...base,
      name: 'preset',
      scheduleSelections: { 7: enums.ActivityIdType.MidExam },
      actionCounts: { [enums.ActionIdType.ClassWork]: 2 },
    })

    expect(next.scheduleSelections).toEqual({})
    expect(next.name).toBe('preset')
    expect(next.actionCounts[enums.ActionIdType.ClassWork]).toBe(2)
  })
})

// --- hasAllScheduleSelections ---

/** 全レッスン週が選択済みかの判定テスト */
describe('hasAllScheduleSelections', () => {
  // この関数はdata.getScheduleDataに依存するため、実データで検証する
  const baseSettings: ScoreSettings = {
    name: '',
    scenario: enums.ScenarioType.Hajime,
    difficulty: enums.DifficultyType.Legend,
    parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    actionCounts: {},
    scheduleSelections: {},
    useScheduleLimits: true,
    includeSelfTrigger: true,
    includePItem: true,
    useFixedUncap: false,
    useCustomMode: false,
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

  it('空のスケジュール選択は false', () => {
    expect(hasAllScheduleSelections(baseSettings)).toBe(false)
  })

  it('全週埋めれば true（完全固定週は自動で除外される）', () => {
    // 各週で選択可能な先頭活動を設定する
    const selections: Record<number, enums.ActivityIdType> = {}
    for (const week of data.getScheduleData(enums.ScenarioType.Hajime, enums.DifficultyType.Legend)) {
      if (week.activities.length > 0) {
        selections[week.week] = week.activities[0].id
      }
    }
    const settings = { ...baseSettings, scheduleSelections: selections }
    expect(hasAllScheduleSelections(settings)).toBe(true)
  })

  it('Hajimeで legacy class 値は未設定扱いになる', () => {
    const selections: Record<number, enums.ActivityIdType> = {}
    for (let week = 1; week <= 18; week++) {
      selections[week] = enums.ActivityIdType.VoLesson
    }
    selections[1] = enums.ActivityIdType.Class
    const settings = { ...baseSettings, scheduleSelections: selections }
    expect(hasAllScheduleSelections(settings)).toBe(false)
  })

  it('HIF公開レッスン週はメイン属性のみ選択でも全週選択扱いになる', () => {
    const hifSelections: Record<number, enums.ActivityIdType> = {}
    for (const week of data.getScheduleData(enums.ScenarioType.Hif, enums.DifficultyType.None)) {
      if (week.activities.length === 0) continue
      const first = week.activities[0].id
      if (
        first === enums.ActivityIdType.VoLessonDa ||
        first === enums.ActivityIdType.VoLessonVi ||
        first === enums.ActivityIdType.DaLessonVo ||
        first === enums.ActivityIdType.DaLessonVi ||
        first === enums.ActivityIdType.ViLessonVo ||
        first === enums.ActivityIdType.ViLessonDa
      ) {
        hifSelections[week.week] = enums.ActivityIdType.VoLesson
      } else {
        hifSelections[week.week] = first
      }
    }

    const settings: ScoreSettings = {
      ...baseSettings,
      scenario: enums.ScenarioType.Hif,
      difficulty: enums.DifficultyType.None,
      scheduleSelections: hifSelections,
      hifLessonSplitSub: true,
    }

    expect(hasAllScheduleSelections(settings)).toBe(true)
  })
})

// --- calculateCountsFromSchedule ---

/** スケジュール選択からアクション回数を集計するテスト */
describe('calculateCountsFromSchedule', () => {
  // 簡易的なスケジュールデータ
  const schedule: ScheduleWeekData[] = [
    { week: 1, fixed: false, canRest: false, activities: [{ id: enums.ActivityIdType.VoLesson, label: '' as never }] },
    { week: 2, fixed: false, canRest: false, activities: [{ id: enums.ActivityIdType.DaLesson, label: '' as never }] },
    { week: 3, fixed: false, canRest: false, activities: [{ id: enums.ActivityIdType.ViLesson, label: '' as never }] },
  ]

  it('選択なしの場合は空オブジェクト', () => {
    const result = calculateCountsFromSchedule({}, schedule)
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('選択した活動のアクションが集計される', () => {
    const selections = {
      1: enums.ActivityIdType.VoLesson,
      2: enums.ActivityIdType.DaLesson,
    }
    const result = calculateCountsFromSchedule(selections, schedule)
    // VoLesson→sp_lesson_vo, DaLesson→sp_lesson_da
    expect(result[enums.ActionIdType.SpLessonVo]).toBe(1)
    expect(result[enums.ActionIdType.SpLessonDa]).toBe(1)
    expect(result[enums.ActionIdType.ClassWork] ?? 0).toBe(0)
  })

  it('授業と特別指導が別アクションとして集計される', () => {
    const extendedSchedule: ScheduleWeekData[] = [
      ...schedule,
      { week: 4, fixed: false, canRest: false, activities: [{ id: enums.ActivityIdType.Class, label: '' as never }] },
      {
        week: 5,
        fixed: false,
        canRest: false,
        activities: [{ id: enums.ActivityIdType.SpecialTraining, label: '' as never }],
      },
    ]
    const selections = {
      4: enums.ActivityIdType.Class,
      5: enums.ActivityIdType.SpecialTraining,
    }

    const result = calculateCountsFromSchedule(selections, extendedSchedule)
    expect(result[enums.ActionIdType.ClassWork]).toBe(1)
    expect(result[enums.ActionIdType.SpecialTraining]).toBe(1)
    expect(result[enums.ActionIdType.Lesson] ?? 0).toBe(0)
    expect(result[enums.ActionIdType.NormalLesson] ?? 0).toBe(0)
    expect(result[enums.ActionIdType.SpLesson] ?? 0).toBe(0)
  })

  it('存在しない活動IDの場合はスキップ', () => {
    const selections = { 1: 'nonexistent' as enums.ActivityIdType }
    const result = calculateCountsFromSchedule(selections, schedule)
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('HIFのように複数のMidExam/FinalExam試験が混在していても、ExamPItemAcquireは指定されたMidExamのみで発動（1回など）になる', () => {
    const hifLikeSchedule: ScheduleWeekData[] = [
      {
        week: 7,
        fixed: true,
        canRest: false,
        activities: [{ id: enums.ActivityIdType.FinalExam, label: '' as never }],
        stage: enums.HifStage.Selection,
      },
      {
        week: 13,
        fixed: true,
        canRest: false,
        activities: [{ id: enums.ActivityIdType.FinalExam, label: '' as never }],
        stage: enums.HifStage.Selection,
      },
      {
        week: 20,
        fixed: true,
        canRest: false,
        activities: [{ id: enums.ActivityIdType.MidExam, label: '' as never }],
        stage: enums.HifStage.Selection,
      },
    ]
    const selections = {
      7: enums.ActivityIdType.FinalExam,
      13: enums.ActivityIdType.FinalExam,
      20: enums.ActivityIdType.MidExam,
    }
    const result = calculateCountsFromSchedule(selections, hifLikeSchedule)
    // 通常は3回分入るが、MidExamが1つだけで他がFinalExamのため上限が1回になる
    expect(result[enums.ActionIdType.ExamEnd]).toBe(3)
    expect(result[enums.ActionIdType.ExamPItemAcquire]).toBe(1)
  })
})

// --- mergeScheduleCounts ---

/** 手動入力とスケジュール算出のアクション回数マージテスト */
describe('mergeScheduleCounts', () => {
  const schedule: ScheduleWeekData[] = [
    { week: 1, fixed: false, canRest: false, activities: [{ id: enums.ActivityIdType.VoLesson, label: '' as never }] },
  ]

  const baseSettings: ScoreSettings = {
    name: '',
    scenario: enums.ScenarioType.Hajime,
    difficulty: enums.DifficultyType.Legend,
    parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    actionCounts: {
      [enums.ActionIdType.LessonVo]: 3,
      [enums.ActionIdType.LessonDa]: 2,
      [enums.ActionIdType.NormalLessonVo]: 1,
      [enums.ActionIdType.ClassWork]: 3,
      [enums.ActionIdType.SkillAcquire]: 10,
    },
    scheduleSelections: {},
    useScheduleLimits: true,
    includeSelfTrigger: true,
    includePItem: true,
    useFixedUncap: false,
    useCustomMode: false,
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

  it('useScheduleLimits = false の場合、手動入力の値をそのまま返す', () => {
    const settings = { ...baseSettings, useScheduleLimits: false }
    const result = mergeScheduleCounts(settings, schedule)
    expect(result[enums.ActionIdType.LessonVo]).toBe(3)
    expect(result[enums.ActionIdType.SkillAcquire]).toBe(10)
  })

  it('useScheduleLimits = true の場合、スケジュール制御外のアクションは手動値を維持', () => {
    const result = mergeScheduleCounts(baseSettings, schedule)
    // SkillAcquire はスケジュール制御外なので手動値が残る
    expect(result[enums.ActionIdType.SkillAcquire]).toBe(10)
  })

  it('useScheduleLimits = true で選択なし → スケジュール制御アクションは 0、合計が計算される', () => {
    const result = mergeScheduleCounts(baseSettings, schedule)
    // SP系はスケジュール制御対象で選択なしなので 0
    expect(result[enums.ActionIdType.SpLessonVo]).toBe(0)
    expect(result[enums.ActionIdType.SpLesson]).toBe(0)
    expect(result[enums.ActionIdType.ClassWork]).toBe(0)
    // レッスン合計: sp_lesson(0) + normal_lesson(1) = 1
    expect(result[enums.ActionIdType.Lesson]).toBe(1)
    // 属性別レッスン合計: lesson_vo = sp_vo(0) + nl_vo(1) = 1
    expect(result[enums.ActionIdType.LessonVo]).toBe(1)
    // 通常レッスン合計: normal_lesson_vo(1)
    expect(result[enums.ActionIdType.NormalLesson]).toBe(1)
  })

  it('SPレッスン選択時は sp_lesson_vo がカウントされ、合計に反映される', () => {
    const settings = {
      ...baseSettings,
      scheduleSelections: { 1: enums.ActivityIdType.VoLesson },
    }

    const result = mergeScheduleCounts(settings, schedule)
    // sp_lesson_vo=1 が自動カウントされ、sp_lesson合計=1、lesson合計にも加算
    expect(result[enums.ActionIdType.SpLessonVo]).toBe(1)
    expect(result[enums.ActionIdType.SpLesson]).toBe(1)
    // lesson_vo = sp_vo(1) + nl_vo(1) = 2, lesson = sp(1) + nl(1) = 2
    expect(result[enums.ActionIdType.LessonVo]).toBe(2)
    expect(result[enums.ActionIdType.Lesson]).toBe(2)
    expect(result[enums.ActionIdType.ClassWork]).toBe(0)
  })
})

// --- loadScoreSettings / saveScoreSettings ---

/** 点数設定の localStorage 保存・読み込みテスト */
describe('loadScoreSettings / saveScoreSettings', () => {
  const mockStorage: Record<string, string> = {}

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key]
      }),
      clear: vi.fn(() => {
        for (const k in mockStorage) delete mockStorage[k]
      }),
      length: 0,
      key: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    for (const k in mockStorage) delete mockStorage[k]
  })

  it('保存データがない場合はデフォルト設定を返す', () => {
    const settings = loadScoreSettings()
    expect(settings.scenario).toBe(enums.ScenarioType.Hajime)
    expect(settings.difficulty).toBe(enums.DifficultyType.Legend)
    expect(settings.useScheduleLimits).toBe(true)
    expect(settings.includeSelfTrigger).toBe(true)
  })

  it('保存→読み込みでデータが復元される', () => {
    const original = loadScoreSettings()
    original.name = 'テストプリセット'
    original.actionCounts[enums.ActionIdType.SkillAcquire] = 42
    saveScoreSettings(original)
    const loaded = loadScoreSettings()
    expect(loaded.name).toBe('テストプリセット')
    expect(loaded.actionCounts[enums.ActionIdType.SkillAcquire]).toBe(42)
  })

  it('壊れたJSONの場合はデフォルトを返す', () => {
    mockStorage[constant.SCORE_SETTINGS_STORAGE_KEY] = 'invalid json{'
    const settings = loadScoreSettings()
    expect(settings.scenario).toBe(enums.ScenarioType.Hajime)
  })

  it('必須フィールドが欠けた場合はデフォルトを返す', () => {
    mockStorage[constant.SCORE_SETTINGS_STORAGE_KEY] = JSON.stringify({ name: 'test' })
    const settings = loadScoreSettings()
    expect(settings.scenario).toBe(enums.ScenarioType.Hajime)
  })

  it('初は共有キー、追加シナリオはシナリオ別キーへ scheduleSelections を保存する', () => {
    const shared = loadScoreSettings()
    shared.scenario = enums.ScenarioType.Hajime
    shared.scheduleSelections = { 4: enums.ActivityIdType.VoLesson }
    saveScoreSettings(shared)

    const hif = {
      ...shared,
      scenario: enums.ScenarioType.Hif,
      scheduleSelections: { 10: enums.ActivityIdType.MidExam },
      hifExamRatios: [
        { vocal: 2, dance: 1, visual: 1 },
        { vocal: 1, dance: 2, visual: 1 },
        { vocal: 1, dance: 1, visual: 2 },
      ],
    }
    saveScoreSettings(hif)

    const sharedRaw = JSON.parse(mockStorage[constant.SCORE_SETTINGS_STORAGE_KEY]) as Partial<ScoreSettings>
    const schedulesRaw = JSON.parse(mockStorage[constant.SCHEDULE_SELECTIONS_STORAGE_KEY]) as Record<
      string,
      Record<number, enums.ActivityIdType>
    >

    // 共有キーには非HIFの scheduleSelections を保持する
    expect(sharedRaw.scheduleSelections).toEqual({ 4: enums.ActivityIdType.VoLesson })
    // シナリオ別キーにはHIFのみ保存する
    expect(schedulesRaw[enums.ScenarioType.Hif]).toEqual({ 10: enums.ActivityIdType.MidExam })
  })

  it('共有キーに保存されたHajime scheduleSelectionsはHIF保存後も共有キーに保持される', () => {
    const legacy = loadScoreSettings()
    mockStorage[constant.SCORE_SETTINGS_STORAGE_KEY] = JSON.stringify({
      ...legacy,
      scenario: enums.ScenarioType.Hajime,
      scheduleSelections: { 4: enums.ActivityIdType.VoLesson, 10: enums.ActivityIdType.MidExam },
    })
    delete mockStorage[constant.SCHEDULE_SELECTIONS_STORAGE_KEY]

    saveScoreSettings({
      ...legacy,
      scenario: enums.ScenarioType.Hif,
      difficulty: enums.DifficultyType.None,
      scheduleSelections: { 7: enums.ActivityIdType.MidExam },
    })

    const sharedRaw = JSON.parse(mockStorage[constant.SCORE_SETTINGS_STORAGE_KEY]) as Partial<ScoreSettings>
    const schedulesRaw = JSON.parse(mockStorage[constant.SCHEDULE_SELECTIONS_STORAGE_KEY]) as Record<
      string,
      Record<number, enums.ActivityIdType>
    >
    expect(sharedRaw.scheduleSelections).toEqual({
      4: enums.ActivityIdType.VoLesson,
      10: enums.ActivityIdType.MidExam,
    })
    expect(schedulesRaw[enums.ScenarioType.Hif]).toEqual({ 7: enums.ActivityIdType.MidExam })
  })

  it('共有キーに保存されたHajime複数週選択はHIF保存後も有効活動のみ復元できる', () => {
    const legacy = loadScoreSettings()
    const legacyHajimeSelections = {
      1: enums.ActivityIdType.Class,
      2: enums.ActivityIdType.Class,
      4: enums.ActivityIdType.DaLesson,
      8: enums.ActivityIdType.Consult,
      10: enums.ActivityIdType.MidExam,
      18: enums.ActivityIdType.FinalExam,
    }
    mockStorage[constant.SCORE_SETTINGS_STORAGE_KEY] = JSON.stringify({
      ...legacy,
      scenario: enums.ScenarioType.Hajime,
      scheduleSelections: legacyHajimeSelections,
    })
    delete mockStorage[constant.SCHEDULE_SELECTIONS_STORAGE_KEY]

    saveScoreSettings({
      ...legacy,
      scenario: enums.ScenarioType.Hif,
      difficulty: enums.DifficultyType.None,
      scheduleSelections: { 7: enums.ActivityIdType.MidExam },
    })

    expect(loadScheduleSelections(enums.ScenarioType.Hajime)).toEqual({
      4: enums.ActivityIdType.DaLesson,
      8: enums.ActivityIdType.Consult,
      10: enums.ActivityIdType.MidExam,
      18: enums.ActivityIdType.FinalExam,
    })
  })

  it('共有キーにHIFシナリオが保存されている場合はHIFとして読み込む', () => {
    const base = loadScoreSettings()
    mockStorage[constant.SCORE_SETTINGS_STORAGE_KEY] = JSON.stringify({
      ...base,
      scenario: enums.ScenarioType.Hif,
      hifExamRatios: [
        { vocal: 9, dance: 9, visual: 9 },
        { vocal: 9, dance: 9, visual: 9 },
        { vocal: 9, dance: 9, visual: 9 },
      ],
    })

    const loaded = loadScoreSettings()

    // 新設計では HIF も共有キーから読むのでシナリオが HIF で返る
    expect(loaded.scenario).toBe(enums.ScenarioType.Hif)
  })

  it('シナリオ別キーにHIFが無い場合、共有キーのscheduleSelectionsは採用せず既定値を使う', () => {
    const base = loadScoreSettings()
    mockStorage[constant.SCORE_SETTINGS_STORAGE_KEY] = JSON.stringify({
      ...base,
      scenario: enums.ScenarioType.Hif,
      scheduleSelections: { 7: enums.ActivityIdType.MidExam },
    })
    mockStorage[constant.SCHEDULE_SELECTIONS_STORAGE_KEY] = JSON.stringify({
      [enums.ScenarioType.Hajime]: { 4: enums.ActivityIdType.VoLesson },
    })

    const loaded = loadScoreSettings()
    expect(loaded.scenario).toBe(enums.ScenarioType.Hif)
    expect(loaded.scheduleSelections).toEqual(createDefaultSettings(enums.ScenarioType.Hif).scheduleSelections)
  })

  it('HIFの公開レッスンでメイン属性のみIDを保存していても再読込で消えない', () => {
    const base = loadScoreSettings()
    mockStorage[constant.SCORE_SETTINGS_STORAGE_KEY] = JSON.stringify({
      ...base,
      scenario: enums.ScenarioType.Hif,
      difficulty: enums.DifficultyType.None,
    })
    mockStorage[constant.SCHEDULE_SELECTIONS_STORAGE_KEY] = JSON.stringify({
      [enums.ScenarioType.Hif]: {
        2: enums.ActivityIdType.VoLesson,
      },
    })

    const loaded = loadScoreSettings()
    expect(loaded.scheduleSelections[2]).toBe(enums.ActivityIdType.VoLesson)
  })

  it('HIFのシナリオ別キーに無効活動が混ざる場合は無効分を読み込み時に除外する', () => {
    mockStorage[constant.SCHEDULE_SELECTIONS_STORAGE_KEY] = JSON.stringify({
      [enums.ScenarioType.Hif]: {
        20: enums.ActivityIdType.MidExam,
        8: enums.ActivityIdType.Class,
      },
    })

    const loadedSelections = loadScheduleSelections(enums.ScenarioType.Hif)
    expect(loadedSelections).toEqual({ 20: enums.ActivityIdType.MidExam })
  })

  // 共有キー側に残っている値を誤ってHIFへ流用しないことを確認する。
  it('共有キーがHIFでもシナリオ別キー未保存ならHIF既定スケジュールへフォールバックする', () => {
    const base = loadScoreSettings()
    mockStorage[constant.SCORE_SETTINGS_STORAGE_KEY] = JSON.stringify({
      ...base,
      scenario: enums.ScenarioType.Hif,
      scheduleSelections: {
        1: enums.ActivityIdType.ClassVo,
        10: enums.ActivityIdType.MidExam,
        18: enums.ActivityIdType.FinalExam,
      },
    })
    delete mockStorage[constant.SCHEDULE_SELECTIONS_STORAGE_KEY]

    const loadedSelections = loadScheduleSelections(enums.ScenarioType.Hif)
    expect(loadedSelections).toEqual(createDefaultSettings(enums.ScenarioType.Hif).scheduleSelections)
  })

  it('HIFシナリオ別キー未保存時はHIF既定スケジュールで読み込める', () => {
    delete mockStorage[constant.SCHEDULE_SELECTIONS_STORAGE_KEY]
    const loadedSelections = loadScheduleSelections(enums.ScenarioType.Hif)
    const defaults = createDefaultSettings(enums.ScenarioType.Hif).scheduleSelections
    expect(loadedSelections).toEqual(defaults)
  })

  // Hajimeはシナリオ別キーを読まない仕様を回帰で固定する。
  it('非HIFはシナリオ別キーにデータがあっても共有キーのscheduleSelectionsを優先する', () => {
    const base = loadScoreSettings()
    mockStorage[constant.SCORE_SETTINGS_STORAGE_KEY] = JSON.stringify({
      ...base,
      scenario: enums.ScenarioType.Hajime,
      scheduleSelections: { 4: enums.ActivityIdType.DaLesson },
    })
    mockStorage[constant.SCHEDULE_SELECTIONS_STORAGE_KEY] = JSON.stringify({
      [enums.ScenarioType.Hajime]: { 4: enums.ActivityIdType.VoLesson },
    })

    expect(loadScheduleSelections(enums.ScenarioType.Hajime)).toEqual({ 4: enums.ActivityIdType.DaLesson })
  })

  it('Hajime で保存データがない場合は空選択を返す', () => {
    delete mockStorage[constant.SCORE_SETTINGS_STORAGE_KEY]
    expect(loadScheduleSelections(enums.ScenarioType.Hajime)).toEqual({})
  })

  it('Hajime以外はシナリオ別キーのscheduleSelectionsを優先する', () => {
    const base = loadScoreSettings()
    const niaSchedule = data.getScheduleData(enums.ScenarioType.Nia, enums.DifficultyType.Legend)
    const niaWeek = niaSchedule.find((week) => week.activities.length > 0)
    const niaWeekNumber = niaWeek?.week ?? 1
    const niaActivity = niaWeek?.activities[0]?.id ?? enums.ActivityIdType.MidExam
    mockStorage[constant.SCORE_SETTINGS_STORAGE_KEY] = JSON.stringify({
      ...base,
      scenario: enums.ScenarioType.Hajime,
      scheduleSelections: { 4: enums.ActivityIdType.DaLesson },
    })
    mockStorage[constant.SCHEDULE_SELECTIONS_STORAGE_KEY] = JSON.stringify({
      [enums.ScenarioType.Nia]: { [niaWeekNumber]: niaActivity },
    })

    expect(loadScheduleSelections(enums.ScenarioType.Nia)).toEqual({ [niaWeekNumber]: niaActivity })
  })
})

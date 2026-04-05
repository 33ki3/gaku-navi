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
  saveScoreSettings,
} from '../../utils/scoreSettings'
import type { ScoreSettings } from '../../types/card'
import type { ScheduleWeekData } from '../../data'
import * as enums from '../../types/enums'

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
  }

  it('空のスケジュール選択は false', () => {
    expect(hasAllScheduleSelections(baseSettings)).toBe(false)
  })

  it('全週埋めれば true（完全固定週は自動で除外される）', () => {
    // 大量の選択をセット（全18週分を埋める）
    const selections: Record<number, enums.ActivityIdType> = {}
    for (let week = 1; week <= 18; week++) {
      selections[week] = enums.ActivityIdType.VoLesson
    }
    const settings = { ...baseSettings, scheduleSelections: selections }
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
    mockStorage['gaku-navi-score-settings'] = 'invalid json{'
    const settings = loadScoreSettings()
    expect(settings.scenario).toBe(enums.ScenarioType.Hajime)
  })

  it('必須フィールドが欠けた場合はデフォルトを返す', () => {
    mockStorage['gaku-navi-score-settings'] = JSON.stringify({ name: 'test' })
    const settings = loadScoreSettings()
    expect(settings.scenario).toBe(enums.ScenarioType.Hajime)
  })
})

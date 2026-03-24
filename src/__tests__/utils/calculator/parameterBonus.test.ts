import { describe, expect, it } from 'vitest'
import {
  calculateParameterBonusFromSchedule,
  getPerLessonParameterValues,
  getParameterBonusBreakdown,
} from '../../../utils/calculator/parameterBonus'
import * as enums from '../../../types/enums'

// テストデータは実際のシナリオ/難易度を使用（data/score/lesson.ts に依存）

const scenario = enums.ScenarioType.Hajime
const difficulty = enums.DifficultyType.Legend

/** スケジュール選択に基づくパラメータボーナス合計値の算出テスト */
describe('calculateParameterBonusFromSchedule', () => {
  it('レッスン選択なしの場合は全 0', () => {
    const result = calculateParameterBonusFromSchedule({}, scenario, difficulty)
    expect(result.vocal).toBe(0)
    expect(result.dance).toBe(0)
    expect(result.visual).toBe(0)
  })

  it('ボーカルレッスン選択でボーカルが上がる', () => {
    // 4週目にボーカルレッスンを選択（Hajime/Legend の最初のレッスン週）
    const selections = { 4: enums.ActivityIdType.VoLesson }
    const result = calculateParameterBonusFromSchedule(selections, scenario, difficulty)
    expect(result.vocal).toBeGreaterThan(result.dance)
    expect(result.vocal).toBeGreaterThan(result.visual)
  })

  it('ダンスレッスン選択でダンスが上がる', () => {
    const selections = { 4: enums.ActivityIdType.DaLesson }
    const result = calculateParameterBonusFromSchedule(selections, scenario, difficulty)
    expect(result.dance).toBeGreaterThan(result.vocal)
    expect(result.dance).toBeGreaterThan(result.visual)
  })

  it('ビジュアルレッスン選択でビジュアルが上がる', () => {
    const selections = { 4: enums.ActivityIdType.ViLesson }
    const result = calculateParameterBonusFromSchedule(selections, scenario, difficulty)
    expect(result.visual).toBeGreaterThan(result.vocal)
    expect(result.visual).toBeGreaterThan(result.dance)
  })

  it('休憩を選択した週は上昇量に含まれない', () => {
    const withRest = { 4: enums.ActivityIdType.Rest }
    const result = calculateParameterBonusFromSchedule(withRest, scenario, difficulty)
    expect(result.vocal).toBe(0)
    expect(result.dance).toBe(0)
    expect(result.visual).toBe(0)
  })

  it('複数週でレッスンを選択すると合算される', () => {
    const singleWeek = { 4: enums.ActivityIdType.VoLesson }
    const r1 = calculateParameterBonusFromSchedule(singleWeek, scenario, difficulty)

    const twoWeeks = {
      4: enums.ActivityIdType.VoLesson,
      7: enums.ActivityIdType.VoLesson,
    }
    const r2 = calculateParameterBonusFromSchedule(twoWeeks, scenario, difficulty)
    expect(r2.vocal).toBeGreaterThan(r1.vocal)
  })

  it('空スケジュール（仮データ）のシナリオは全 0', () => {
    const result = calculateParameterBonusFromSchedule(
      { 4: enums.ActivityIdType.VoLesson },
      enums.ScenarioType.Nia,
      enums.DifficultyType.Legend,
    )
    expect(result.vocal).toBe(0)
    expect(result.dance).toBe(0)
    expect(result.visual).toBe(0)
  })

  it('データが無いシナリオは全 0', () => {
    const selections = { 4: enums.ActivityIdType.VoLesson }
    const result = calculateParameterBonusFromSchedule(
      selections,
      enums.ScenarioType.Nia,
      enums.DifficultyType.Pro,
    )
    expect(result.vocal).toBe(0)
    expect(result.dance).toBe(0)
    expect(result.visual).toBe(0)
  })

  it('データが無い難易度は全 0', () => {
    const selections = { 3: enums.ActivityIdType.DaLesson }
    const result = calculateParameterBonusFromSchedule(
      selections,
      enums.ScenarioType.Hajime,
      enums.DifficultyType.Regular,
    )
    expect(result.dance).toBe(0)
    expect(result.vocal).toBe(0)
    expect(result.visual).toBe(0)
  })

  it('Hajime/Legend の全レッスン(Vo)でメイン値が正しく合算される', () => {
    // Hajime/Legend weeks: 4(140,55), 7(180,60), 12(260,70), 14(370,90), 16(570,115)
    const selections: Record<number, enums.ActivityIdType> = {
      4: enums.ActivityIdType.VoLesson,
      7: enums.ActivityIdType.VoLesson,
      12: enums.ActivityIdType.VoLesson,
      14: enums.ActivityIdType.VoLesson,
      16: enums.ActivityIdType.VoLesson,
    }
    const result = calculateParameterBonusFromSchedule(selections, scenario, difficulty)
    // vocal = 140+180+260+370+570 = 1520
    expect(result.vocal).toBe(1520)
    // dance/visual = sub values: 55+60+70+90+115 = 390
    expect(result.dance).toBe(390)
    expect(result.visual).toBe(390)
  })
})

/** レッスンごとのパラメータ上昇値取得テスト */
describe('getPerLessonParameterValues', () => {
  it('レッスン選択なしは空配列', () => {
    const result = getPerLessonParameterValues({}, scenario, difficulty)
    expect(result.vocal).toEqual([])
    expect(result.dance).toEqual([])
    expect(result.visual).toEqual([])
  })

  it('レッスン選択した分だけ要素が増える', () => {
    const selections = {
      4: enums.ActivityIdType.VoLesson,
      7: enums.ActivityIdType.DaLesson,
    }
    const result = getPerLessonParameterValues(selections, scenario, difficulty)
    expect(result.vocal.length).toBe(2)
    expect(result.dance.length).toBe(2)
    expect(result.visual.length).toBe(2)
  })

  it('ボーカルレッスンの場合、vocalがメイン値（大きい方）', () => {
    const selections = { 4: enums.ActivityIdType.VoLesson }
    const result = getPerLessonParameterValues(selections, scenario, difficulty)
    expect(result.vocal[0]).toBeGreaterThan(result.dance[0])
    expect(result.vocal[0]).toBeGreaterThan(result.visual[0])
  })

  it('ビジュアルレッスンの場合、visualがメイン値', () => {
    const selections = { 4: enums.ActivityIdType.ViLesson }
    const result = getPerLessonParameterValues(selections, scenario, difficulty)
    expect(result.visual[0]).toBeGreaterThan(result.vocal[0])
    expect(result.visual[0]).toBeGreaterThan(result.dance[0])
  })
})

/** パラメータボーナスの内訳（週・属性別）取得テスト */
describe('getParameterBonusBreakdown', () => {
  it('レッスン選択なしは空配列', () => {
    expect(getParameterBonusBreakdown({}, scenario, difficulty)).toEqual([])
  })

  it('ボーカルレッスンの内訳が正しい属性で返る', () => {
    const selections = { 4: enums.ActivityIdType.VoLesson }
    const result = getParameterBonusBreakdown(selections, scenario, difficulty)
    expect(result).toHaveLength(1)
    expect(result[0].week).toBe(4)
    expect(result[0].attribute).toBe(enums.ParameterType.Vocal)
    expect(result[0].vocal).toBeGreaterThan(result[0].dance)
  })

  it('異なる属性のレッスンで複数行返る', () => {
    const selections = {
      4: enums.ActivityIdType.VoLesson,
      7: enums.ActivityIdType.DaLesson,
    }
    const result = getParameterBonusBreakdown(selections, scenario, difficulty)
    expect(result).toHaveLength(2)
    expect(result[0].attribute).toBe(enums.ParameterType.Vocal)
    expect(result[1].attribute).toBe(enums.ParameterType.Dance)
  })
})

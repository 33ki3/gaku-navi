/** seed付きOptimizer条件の再現性を検証する */
import { describe, expect, it } from 'vitest'

import * as data from '../../data'
import * as enums from '../../types/enums'
import { createTestOptimizerScenarioInput } from '../../../tests/fixtures/testScoreSettings'
import {
  createSeededOptimizerProfile,
  seededOptimizerProfileCount,
} from '../../../tests/fixtures/seededOptimizerProfile'

describe('seed付きOptimizer点数設定', () => {
  it('同じseedは同じ設定を作り、別seedは別設定を作る', () => {
    const profile = createSeededOptimizerProfile('seed-a', 1)
    const input = createTestOptimizerScenarioInput({
      scoreSettings: { scheduleSelections: profile.scheduleSelections, hifLessonSplitSub: profile.hifLessonSplitSub },
    })

    expect(createSeededOptimizerProfile('seed-a', 1)).toEqual(profile)
    expect(createSeededOptimizerProfile('seed-b', 1)).not.toEqual(profile)
    expect(input.scoreSettings.scheduleSelections).toEqual(profile.scheduleSelections)
  })

  it('Vo7・Da1、Vo6・Da2、Da8を含む有効な配分とスケジュールを作る', () => {
    const schedule = data.getScheduleData(enums.ScenarioType.Hif, enums.DifficultyType.None)
    const lessonWeeks = data.getLessonData(enums.ScenarioType.Hif, enums.DifficultyType.None).map(({ week }) => week)
    const profiles = Array.from({ length: seededOptimizerProfileCount }, (_, index) =>
      createSeededOptimizerProfile('run-seed', index + 1),
    )

    const distributions = profiles.map(({ lessonCounts }) =>
      Object.values(lessonCounts)
        .filter((count) => count > 0)
        .sort((left, right) => right - left),
    )
    expect(distributions).toContainEqual([7, 1])
    expect(distributions).toContainEqual([6, 2])
    expect(distributions).toContainEqual([8])

    for (const profile of profiles) {
      expect(Object.keys(profile.scheduleSelections)).toHaveLength(schedule.length)
      expect(profile.lessonCounts.vocal + profile.lessonCounts.dance + profile.lessonCounts.visual).toBe(8)

      for (const week of schedule) {
        const selected = profile.scheduleSelections[week.week]
        expect(selected).toBeDefined()
        expect(
          data.isScheduleActivityAllowed(
            week,
            data.getScheduleActivityForMode(selected, enums.ScenarioType.Hif, profile.hifLessonSplitSub),
            enums.ScenarioType.Hif,
            profile.hifLessonSplitSub,
          ),
        ).toBe(true)
      }

      const actualLessonCounts = { vocal: 0, dance: 0, visual: 0 }
      for (const week of lessonWeeks) {
        const activity = data.getScheduleActivityForMode(profile.scheduleSelections[week], enums.ScenarioType.Hif, true)
        if (activity === enums.ActivityIdType.VoLesson) actualLessonCounts.vocal += 1
        if (activity === enums.ActivityIdType.DaLesson) actualLessonCounts.dance += 1
        if (activity === enums.ActivityIdType.ViLesson) actualLessonCounts.visual += 1
      }
      expect(actualLessonCounts).toEqual(profile.lessonCounts)
      expect(Object.values(profile.initialParams).every((value) => value >= 200 && value <= 300)).toBe(true)
      expect(
        Object.values(profile.paramBonusPercent).every(
          (value) => value >= 20 && value <= 30 && Math.abs(value * 10 - Math.round(value * 10)) < 1e-8,
        ),
      ).toBe(true)
    }
  })

  it('初レジェンドの4-1・5配分を含む有効なスケジュールを作る', () => {
    const scenario = enums.ScenarioType.Hajime
    const difficulty = enums.DifficultyType.Legend
    const schedule = data.getScheduleData(scenario, difficulty)
    const lessonActivities = new Set<enums.ActivityIdType>([
      enums.ActivityIdType.VoLesson,
      enums.ActivityIdType.DaLesson,
      enums.ActivityIdType.ViLesson,
    ])
    const lessonWeeks = schedule.filter((week) => week.activities.some(({ id }) => lessonActivities.has(id)))
    const profiles = Array.from({ length: seededOptimizerProfileCount }, (_, index) =>
      createSeededOptimizerProfile('run-seed', index + 1, scenario),
    )
    const hifProfile = createSeededOptimizerProfile('run-seed', 1, enums.ScenarioType.Hif)
    const distributions = profiles.map(({ lessonCounts }) =>
      Object.values(lessonCounts)
        .filter((count) => count > 0)
        .sort((left, right) => right - left),
    )

    expect(distributions).toContainEqual([4, 1])
    expect(distributions).toContainEqual([5])

    for (const profile of profiles) {
      expect(profile.scenario).toBe(scenario)
      expect(profile.difficulty).toBe(difficulty)
      expect(Object.keys(profile.scheduleSelections)).toHaveLength(schedule.length)
      expect(profile.lessonCounts.vocal + profile.lessonCounts.dance + profile.lessonCounts.visual).toBe(5)
      expect(profile.initialParams).toEqual(hifProfile.initialParams)
      expect(profile.paramBonusPercent).toEqual(hifProfile.paramBonusPercent)

      const input = createTestOptimizerScenarioInput({
        scoreSettings: { scenario, difficulty, scheduleSelections: profile.scheduleSelections },
      })
      expect(input.scoreSettings.scenario).toBe(scenario)
      expect(input.scoreSettings.scheduleSelections).toEqual(profile.scheduleSelections)

      for (const week of schedule) {
        const selected = profile.scheduleSelections[week.week]
        expect(selected).toBeDefined()
        expect(data.isScheduleActivityAllowed(week, selected, scenario, false)).toBe(true)
      }

      const actualLessonCounts = { vocal: 0, dance: 0, visual: 0 }
      for (const week of lessonWeeks) {
        const activity = profile.scheduleSelections[week.week]
        if (activity === enums.ActivityIdType.VoLesson) actualLessonCounts.vocal += 1
        if (activity === enums.ActivityIdType.DaLesson) actualLessonCounts.dance += 1
        if (activity === enums.ActivityIdType.ViLesson) actualLessonCounts.visual += 1
      }
      expect(actualLessonCounts).toEqual(profile.lessonCounts)
    }
  })
})

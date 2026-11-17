/** seedとsampleからOptimizerのテスト条件を作る */
import type { ParameterValues } from '../../src/types/card'
import * as enums from '../../src/types/enums'
import { testScoreSettingsOptions } from './testScoreSettings'
import {
  type HifLessonAllocation,
  type SeededHifVariant,
  buildSeededOptimizerRandomSettings,
  createSeededHifLessonSplitSub,
  createSeededRandom,
  createSeededSharedInitialParams,
  createSeededSharedParamBonusPercent,
  randomIntegerInRange,
} from './seededOptimizerRandom'
import {
  applyHajimeScheduleVariant,
  applyHifScheduleVariant,
  createScenarioScheduleSelections,
  randomizeOtherScheduleActivities,
  toParameterValues,
} from './seededOptimizerSchedule'

const profileCount = 5
const hifLessonAllocations: readonly HifLessonAllocation[] = ['hif-7-1', 'hif-6-2', 'hif-8']
const hajimeLessonAllocations = ['hajime-4-1', 'hajime-5'] as const

export type SeededOptimizerScenario = typeof enums.ScenarioType.Hif | typeof enums.ScenarioType.Hajime

/** シナリオ別の配分と共通の点数設定を含むOptimizer入力 */
export interface SeededOptimizerProfile {
  scenario: SeededOptimizerScenario
  difficulty: enums.DifficultyType
  lessonCounts: ParameterValues
  scheduleSelections: Record<number, enums.ActivityIdType>
  initialParams: ReturnType<typeof createSeededSharedInitialParams>
  paramBonusPercent: ReturnType<typeof createSeededSharedParamBonusPercent>
  mainType: enums.ParameterType
  classType: enums.ParameterType
  hifSubType?: enums.ParameterType
  hifLessonSplitSub?: boolean
}

/** seedとsampleからHIFまたは初のランダム条件を再現する */
export function createSeededOptimizerProfile(
  seed: string,
  sample: number,
  scenario: SeededOptimizerScenario = enums.ScenarioType.Hif,
): SeededOptimizerProfile {
  if (!Number.isInteger(sample) || sample < 1) throw new Error('sample must be a positive integer')

  const randomSettings = buildSeededOptimizerRandomSettings(seed)
  const settingsSeed = `${seed}:shared-settings`
  const initialParams = createSeededSharedInitialParams(`${settingsSeed}:initial-params`)
  const paramBonusPercent = createSeededSharedParamBonusPercent(`${settingsSeed}:param-bonus`)

  if (scenario === enums.ScenarioType.Hif) {
    const allocation = selectAllocation(
      `${seed}:optimizer-profile:hif:allocation`,
      sample,
      hifLessonAllocations,
      'HIF lesson allocation',
    )
    const hifLessonSplitSub = createSeededHifLessonSplitSub(seed)
    const lessonCounts =
      allocation === 'hif-7-1'
        ? { [randomSettings.mainType]: 7, [randomSettings.minorType]: 1 }
        : allocation === 'hif-6-2'
          ? { [randomSettings.mainType]: 6, [randomSettings.minorType]: 2 }
          : { [randomSettings.mainType]: 8 }
    const variant: SeededHifVariant = {
      mainType: randomSettings.mainType,
      lessonCounts,
      classType: randomSettings.classType,
      hifSubType: allocation === 'hif-8' ? randomSettings.classType : randomSettings.minorType,
      hifLessonSplitSub,
    }
    const seededSchedule = applyHifScheduleVariant(
      testScoreSettingsOptions.scenarioSchedules[enums.ScenarioType.Hif],
      variant,
    )
    const scheduleSelections = randomizeOtherScheduleActivities(
      seededSchedule,
      enums.ScenarioType.Hif,
      enums.DifficultyType.None,
      hifLessonSplitSub,
      `${seed}:optimizer-profile:hif:${sample}:schedule`,
    )

    return {
      scenario,
      difficulty: enums.DifficultyType.None,
      lessonCounts: toParameterValues(variant.lessonCounts),
      scheduleSelections,
      initialParams,
      paramBonusPercent,
      mainType: randomSettings.mainType,
      classType: randomSettings.classType,
      hifSubType: variant.hifSubType,
      hifLessonSplitSub,
    }
  }

  const allocation = selectAllocation(
    `${seed}:optimizer-profile:hajime:allocation`,
    sample,
    hajimeLessonAllocations,
    'Hajime lesson allocation',
  )
  const lessonCounts =
    allocation === 'hajime-4-1'
      ? { [randomSettings.mainType]: 4, [randomSettings.minorType]: 1 }
      : { [randomSettings.mainType]: 5 }
  const difficulty = enums.DifficultyType.Legend
  const seededSchedule = applyHajimeScheduleVariant(
    createScenarioScheduleSelections(scenario, difficulty),
    { mainType: randomSettings.mainType, lessonCounts, classType: randomSettings.classType },
    difficulty,
  )
  const scheduleSelections = randomizeOtherScheduleActivities(
    seededSchedule,
    scenario,
    difficulty,
    false,
    `${seed}:optimizer-profile:hajime:${sample}:schedule`,
  )

  return {
    scenario,
    difficulty,
    lessonCounts: toParameterValues(lessonCounts),
    scheduleSelections,
    initialParams,
    paramBonusPercent,
    mainType: randomSettings.mainType,
    classType: randomSettings.classType,
  }
}

/** seedから配分の開始位置を選び、sampleごとに全配分を巡回する */
function selectAllocation<T extends string>(seed: string, sample: number, allocations: readonly T[], label: string): T {
  const allocationOffset = randomIntegerInRange(
    { min: 0, max: allocations.length - 1 },
    createSeededRandom(seed),
    label,
  )
  const allocation = allocations[(allocationOffset + sample - 1) % allocations.length]
  if (!allocation) throw new Error(`No ${label} was selected for sample ${sample}`)
  return allocation
}

/** ランダム条件5件で各シナリオの配分を複数プランへ適用する */
export const seededOptimizerProfileCount = profileCount

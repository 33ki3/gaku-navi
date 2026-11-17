/** Optimizer検証で共用するスケジュール生成 */
import * as data from '../../src/data'
import type { ParameterValues } from '../../src/types/card'
import * as enums from '../../src/types/enums'
import type { SeededHifVariant } from './seededOptimizerRandom'
import { createSeededRandom } from './seededOptimizerRandom'

/** 初のレッスン配分と授業属性 */
interface SeededHajimeVariant {
  mainType: enums.ParameterType
  lessonCounts: Partial<Record<enums.ParameterType, number>>
  classType: enums.ParameterType
}

const lessonActivities = new Set<enums.ActivityIdType>([
  enums.ActivityIdType.VoLesson,
  enums.ActivityIdType.DaLesson,
  enums.ActivityIdType.ViLesson,
  enums.ActivityIdType.VoLessonDa,
  enums.ActivityIdType.VoLessonVi,
  enums.ActivityIdType.DaLessonVo,
  enums.ActivityIdType.DaLessonVi,
  enums.ActivityIdType.ViLessonVo,
  enums.ActivityIdType.ViLessonDa,
])

const classActivities = new Set<enums.ActivityIdType>([
  enums.ActivityIdType.Class,
  enums.ActivityIdType.ClassVo,
  enums.ActivityIdType.ClassDa,
  enums.ActivityIdType.ClassVi,
])

const parameterTypes = [enums.ParameterType.Vocal, enums.ParameterType.Dance, enums.ParameterType.Visual]

/** 活動IDが通常または複合レッスンかを返す */
export function isLessonActivity(activity: enums.ActivityIdType): boolean {
  return lessonActivities.has(activity)
}

/** 活動IDが授業かを返す */
export function isClassActivity(activity: enums.ActivityIdType): boolean {
  return classActivities.has(activity)
}

/** パラメータ属性を予定表に保存する単属性授業IDへ対応付ける */
function classActivity(type: enums.ParameterType): enums.ActivityIdType {
  return {
    [enums.ParameterType.Vocal]: enums.ActivityIdType.ClassVo,
    [enums.ParameterType.Dance]: enums.ActivityIdType.ClassDa,
    [enums.ParameterType.Visual]: enums.ActivityIdType.ClassVi,
  }[type]
}

/** パラメータ属性を単属性レッスンIDへ対応付ける */
function lessonActivity(type: enums.ParameterType): enums.ActivityIdType {
  return {
    [enums.ParameterType.Vocal]: enums.ActivityIdType.VoLesson,
    [enums.ParameterType.Dance]: enums.ActivityIdType.DaLesson,
    [enums.ParameterType.Visual]: enums.ActivityIdType.ViLesson,
  }[type]
}

/** 週ごとの先頭候補を初期選択にして、スケジュール表を作る */
export function createScenarioScheduleSelections(
  scenario: typeof enums.ScenarioType.Hif | typeof enums.ScenarioType.Hajime,
  difficulty: enums.DifficultyType,
): Record<number, enums.ActivityIdType> {
  return Object.fromEntries(
    data.getScheduleData(scenario, difficulty).map((week) => {
      const activity = week.activities[0]?.id
      if (activity === undefined) throw new Error(`No activity is available for week ${week.week}`)
      return [week.week, activity]
    }),
  )
}

/** HIFの主属性と副属性を予定表に保存する複合レッスンIDへ対応付ける */
function hifLessonActivity(main: enums.ParameterType, sub: enums.ParameterType): enums.ActivityIdType {
  const activities: Record<enums.ParameterType, Partial<Record<enums.ParameterType, enums.ActivityIdType>>> = {
    [enums.ParameterType.Vocal]: {
      [enums.ParameterType.Dance]: enums.ActivityIdType.VoLessonDa,
      [enums.ParameterType.Visual]: enums.ActivityIdType.VoLessonVi,
    },
    [enums.ParameterType.Dance]: {
      [enums.ParameterType.Vocal]: enums.ActivityIdType.DaLessonVo,
      [enums.ParameterType.Visual]: enums.ActivityIdType.DaLessonVi,
    },
    [enums.ParameterType.Visual]: {
      [enums.ParameterType.Vocal]: enums.ActivityIdType.ViLessonVo,
      [enums.ParameterType.Dance]: enums.ActivityIdType.ViLessonDa,
    },
  }
  const activity = activities[main][sub]
  if (!activity) throw new Error(`HIF lesson pair is not supported: ${main}/${sub}`)
  return activity
}

/** HIFのレッスン配分と授業属性をfixtureの各週へ反映する */
export function applyHifScheduleVariant(
  selections: Record<number, enums.ActivityIdType>,
  variant: SeededHifVariant,
): Record<number, enums.ActivityIdType> {
  const updated = { ...selections }
  const lessonWeeks = Object.entries(updated)
    .filter(([, activity]) => lessonActivities.has(activity))
    .map(([week]) => week)
  if (lessonWeeks.length !== 8) throw new Error(`HIF schedule expected 8 lessons, got ${lessonWeeks.length}`)

  const lessonTypes = Object.entries(variant.lessonCounts).flatMap(([rawType, count]) => {
    const type = parameterTypes.find((parameterType) => parameterType === rawType)
    if (!type) throw new Error(`HIF variant has unknown lesson type: ${rawType}`)
    return Array.from({ length: count ?? 0 }, () => type)
  })
  if (lessonTypes.length !== 8) throw new Error(`HIF variant has ${lessonTypes.length} lessons; expected 8`)
  lessonWeeks.forEach((week, index) => {
    const mainType = lessonTypes[index]
    if (!mainType) throw new Error(`HIF variant is missing lesson type ${index + 1}`)
    // 副属性と同じ属性のレッスンは、主属性を副属性として複合レッスンにする
    const subType = mainType === variant.hifSubType ? variant.mainType : variant.hifSubType
    updated[Number(week)] = hifLessonActivity(mainType, subType)
  })

  for (const [week, activity] of Object.entries(updated)) {
    if (classActivities.has(activity)) updated[Number(week)] = classActivity(variant.classType)
  }
  return updated
}

/** 初のレッスン配分と授業属性を各週へ反映する */
export function applyHajimeScheduleVariant(
  selections: Record<number, enums.ActivityIdType>,
  variant: SeededHajimeVariant,
  difficulty: enums.DifficultyType,
): Record<number, enums.ActivityIdType> {
  const updated = { ...selections }
  const schedule = data.getScheduleData(enums.ScenarioType.Hajime, difficulty)
  const lessonWeeks = schedule.filter((week) => week.activities.some(({ id }) => lessonActivities.has(id)))
  const lessonTypes = Object.entries(variant.lessonCounts).flatMap(([rawType, count]) => {
    const type = parameterTypes.find((parameterType) => parameterType === rawType)
    if (!type) throw new Error(`Hajime variant has unknown lesson type: ${rawType}`)
    return Array.from({ length: count ?? 0 }, () => type)
  })
  if (lessonTypes.length !== lessonWeeks.length) {
    throw new Error(`Hajime variant has ${lessonTypes.length} lessons; expected ${lessonWeeks.length}`)
  }

  lessonWeeks.forEach((week, index) => {
    const type = lessonTypes[index]
    if (!type) throw new Error(`Hajime variant is missing lesson type ${index + 1}`)
    updated[week.week] = lessonActivity(type)
  })

  for (const week of schedule) {
    if (week.activities.some(({ id }) => classActivities.has(id))) {
      updated[week.week] = classActivity(variant.classType)
    }
  }
  return updated
}

/** 変更可能なレッスン・授業以外の週から、候補内の活動をseed付きで選ぶ */
export function randomizeOtherScheduleActivities(
  selections: Record<number, enums.ActivityIdType>,
  scenario: typeof enums.ScenarioType.Hif | typeof enums.ScenarioType.Hajime,
  difficulty: enums.DifficultyType,
  hifLessonSplitSub: boolean,
  seed: string,
): Record<number, enums.ActivityIdType> {
  const updated = { ...selections }
  for (const week of data.getScheduleData(scenario, difficulty)) {
    const current = updated[week.week]
    const isSelectionFixed = week.fixed && !week.canRest
    if (isSelectionFixed || current === undefined || lessonActivities.has(current) || classActivities.has(current))
      continue

    const candidates = [
      ...week.activities.map(({ id }) => id),
      ...(week.canRest ? [enums.ActivityIdType.Rest] : []),
    ].filter(
      (activity) =>
        !lessonActivities.has(activity) &&
        !classActivities.has(activity) &&
        data.isScheduleActivityAllowed(week, activity, scenario, hifLessonSplitSub),
    )
    if (candidates.length === 0) throw new Error(`No random activity is available for week ${week.week}`)
    const nextRandom = createSeededRandom(`${seed}:week:${week.week}`)
    const selected = candidates[Math.floor(nextRandom() * candidates.length)]
    if (selected === undefined) throw new Error(`No random activity was selected for week ${week.week}`)
    updated[week.week] = selected
  }
  return updated
}

/** レッスン配分を点数設定で使うenumキー形式へ展開する */
export function toParameterValues(counts: Partial<Record<enums.ParameterType, number>>): ParameterValues {
  return {
    [enums.ParameterType.Vocal]: counts[enums.ParameterType.Vocal] ?? 0,
    [enums.ParameterType.Dance]: counts[enums.ParameterType.Dance] ?? 0,
    [enums.ParameterType.Visual]: counts[enums.ParameterType.Visual] ?? 0,
  }
}

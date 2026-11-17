/** Optimizer検証で共用するseed付き乱数とランダム設定生成 */
import * as constant from '../../src/constant'
import type { ParameterValues } from '../../src/types/card'
import * as enums from '../../src/types/enums'

/** 両シナリオの設定で共通して使う基準値 */
type ScenarioParameterValues = Record<typeof enums.ScenarioType.Hajime | typeof enums.ScenarioType.Hif, ParameterValues>

/** 整数の抽選範囲 */
export interface IntegerRange {
  min: number
  max: number
}

/** HIFランダム条件のレッスン配分キー */
export type HifLessonAllocation = 'hif-7-1' | 'hif-6-2' | 'hif-8'

/** HIFランダム条件の配分別入力 */
export interface SeededHifVariant {
  mainType: enums.ParameterType
  lessonCounts: Partial<Record<enums.ParameterType, number>>
  classType: enums.ParameterType
  hifSubType: enums.ParameterType
  hifLessonSplitSub: boolean
}

/** HIFと初のランダム条件で共通して使う属性設定 */
export interface SeededOptimizerRandomSettings {
  mainType: enums.ParameterType
  minorType: enums.ParameterType
  classType: enums.ParameterType
}

/** HIF・初レジェンドのランダム条件で共用する点数設定範囲 */
export const seededOptimizerSettingRanges = {
  initialParams: {
    baselineByScenario: {
      [enums.ScenarioType.Hif]: { vocal: 300, dance: 300, visual: 300 },
      [enums.ScenarioType.Hajime]: { vocal: 200, dance: 200, visual: 200 },
    } satisfies ScenarioParameterValues,
    variation: 100,
  },
  paramBonusPercent: {
    baselineByScenario: {
      [enums.ScenarioType.Hif]: { vocal: 30, dance: 30, visual: 30 },
      [enums.ScenarioType.Hajime]: { vocal: 20, dance: 20, visual: 20 },
    } satisfies ScenarioParameterValues,
    variationPercentagePoints: 10,
    step: constant.PARAMETER_BONUS_PERCENT_STEP,
  },
} as const

const parameterTypes = [enums.ParameterType.Vocal, enums.ParameterType.Dance, enums.ParameterType.Visual]

/** seedの文字列から、呼び出すたびに次の再現可能な乱数を作る */
export function createSeededRandom(seed: string): () => number {
  // FNV-1aの初期値から始め、seedの全文字を32bitの状態へ畳み込む
  let state = 2166136261
  for (const character of seed) {
    state ^= character.charCodeAt(0)
    state = Math.imul(state, 16777619)
  }

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    const shiftedValue = value ^ (value >>> 7)
    const multiplier = value | 61
    value ^= value + Math.imul(shiftedValue, multiplier)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/** 範囲の欠落や逆転を拒否し、両端を含む整数をseed付きで選ぶ */
export function randomIntegerInRange(range: IntegerRange, nextRandom: () => number, label: string): number {
  if (!Number.isSafeInteger(range.min) || !Number.isSafeInteger(range.max) || range.min < 0 || range.max < range.min) {
    throw new Error(`${label} range must have non-negative safe integer bounds`)
  }
  return range.min + Math.floor(nextRandom() * (range.max - range.min + 1))
}

/** 両シナリオで共通して使う属性設定をseedから作る */
export function buildSeededOptimizerRandomSettings(seed: string): SeededOptimizerRandomSettings {
  const mainTypeIndex = randomIntegerInRange(
    { min: 0, max: parameterTypes.length - 1 },
    createSeededRandom(`${seed}:random-lesson-main`),
    'random lesson main type',
  )
  const mainType = parameterTypes[mainTypeIndex]
  if (!mainType) throw new Error('No randomized main lesson type was selected')

  const otherTypes = parameterTypes.filter((type) => type !== mainType)
  const classTypeIndex = randomIntegerInRange(
    { min: 0, max: otherTypes.length - 1 },
    createSeededRandom(`${seed}:random-class-type`),
    'random class type',
  )
  const classType = otherTypes[classTypeIndex]
  if (!classType) throw new Error('No randomized class type was selected')
  const minorType = otherTypes.find((type) => type !== classType)
  if (!minorType) throw new Error(`No secondary lesson type matches ${mainType}/${classType}`)

  return {
    mainType,
    minorType,
    classType,
  }
}

/** HIFのレッスン分割モードをseedから選ぶ */
export function createSeededHifLessonSplitSub(seed: string): boolean {
  return createSeededRandom(`${seed}:random-hif-split`)() >= 0.5
}

/** 両シナリオで共通する設定範囲から初期パラメータを作る */
export function createSeededSharedInitialParams(seed: string): ParameterValues {
  const scenarioBaselines = Object.values(seededOptimizerSettingRanges.initialParams.baselineByScenario)
  const variation = seededOptimizerSettingRanges.initialParams.variation
  if (!Number.isSafeInteger(variation) || variation < 0) {
    throw new Error('initialParams.variation must be a non-negative integer')
  }

  const randomValue = (type: enums.ParameterType) => {
    const minimum = Math.max(0, ...scenarioBaselines.map((baseline) => baseline[type] - variation))
    const maximum = Math.min(
      constant.INITIAL_PARAMETER_MAX,
      ...scenarioBaselines.map((baseline) => baseline[type] + variation),
    )
    return randomIntegerInRange(
      { min: minimum, max: maximum },
      createSeededRandom(`${seed}:${type}`),
      `initialParams.${type}`,
    )
  }

  return {
    [enums.ParameterType.Vocal]: randomValue(enums.ParameterType.Vocal),
    [enums.ParameterType.Dance]: randomValue(enums.ParameterType.Dance),
    [enums.ParameterType.Visual]: randomValue(enums.ParameterType.Visual),
  }
}

/** 両シナリオで共通する設定範囲からパラメータボーナスを作る */
export function createSeededSharedParamBonusPercent(seed: string): ParameterValues {
  const scenarioBaselines = Object.values(seededOptimizerSettingRanges.paramBonusPercent.baselineByScenario)
  const variation = seededOptimizerSettingRanges.paramBonusPercent.variationPercentagePoints
  const step = seededOptimizerSettingRanges.paramBonusPercent.step
  if (!Number.isFinite(variation) || variation < 0) {
    throw new Error('paramBonusPercent.variationPercentagePoints must be non-negative')
  }

  const randomValue = (type: enums.ParameterType) => {
    const minimum = Math.max(0, ...scenarioBaselines.map((baseline) => baseline[type] - variation))
    const maximum = Math.min(
      constant.PARAMETER_BONUS_PERCENT_MAX,
      ...scenarioBaselines.map((baseline) => baseline[type] + variation),
    )
    const stepCount = (maximum - minimum) / step
    if (
      !Number.isFinite(step) ||
      maximum < minimum ||
      maximum > constant.PARAMETER_BONUS_PERCENT_MAX ||
      step < constant.PARAMETER_BONUS_PERCENT_STEP ||
      Math.abs(stepCount - Math.round(stepCount)) > 1e-8 ||
      Math.abs(minimum / step - Math.round(minimum / step)) > 1e-8
    ) {
      throw new Error(`paramBonusPercent.${type} common range must fit the supported step and bounds`)
    }
    const stepIndex = randomIntegerInRange(
      { min: 0, max: Math.round(stepCount) },
      createSeededRandom(`${seed}:${type}`),
      `paramBonusPercent.${type}`,
    )
    return Number((minimum + stepIndex * step).toPrecision(12))
  }

  return {
    [enums.ParameterType.Vocal]: randomValue(enums.ParameterType.Vocal),
    [enums.ParameterType.Dance]: randomValue(enums.ParameterType.Dance),
    [enums.ParameterType.Visual]: randomValue(enums.ParameterType.Visual),
  }
}

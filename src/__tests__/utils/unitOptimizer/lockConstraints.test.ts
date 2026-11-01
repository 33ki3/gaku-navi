/**
 * 最適編成のロック・SP・組み合わせ数キャッシュを小規模な独立fixtureで検証する
 */
import { describe, expect, it } from 'vitest'

import * as constant from '../../../constant'
import type { Ability, SupportCard } from '../../../types/card'
import * as enums from '../../../types/enums'
import type { UnitSimulatorSettings } from '../../../types/unit'
import type { OptimizeInput } from '../../../types/unitOptimizer'
import { createDefaultSettings } from '../../../utils/scoreSettings'
import {
  createCandidateCard,
  createRentalPool,
  createSearchBranches,
} from '../../../utils/unitOptimizer/candidatePreparation'
import { countSpTypeConstrainedCombos, spTypeConstrainedCombos } from '../../../utils/unitOptimizer/combinatorics'
import { exhaustiveOptimizeAsync } from '../../../utils/unitSimulator'

/** サポートタイプから計算対象のパラメータを決める */
function getParameterType(type: enums.CardType): enums.ParameterType {
  return type === enums.CardType.Assist ? enums.ParameterType.Vocal : type
}

/** 固定スコアとSP区分を持つ小規模fixtureカードを作る */
function makeCard(
  name: string,
  type: enums.CardType,
  scoreAtFour: number,
  spCategory: enums.SpCategoryType = enums.SpCategoryType.None,
  scoreAtZero = scoreAtFour,
): SupportCard {
  const parameterType = getParameterType(type)
  const abilities: Ability[] = [
    {
      name_key: enums.AbilityNameKeyType.InitialStat,
      trigger_key: enums.TriggerKeyType.LessonEnd,
      parameter_type: parameterType,
      values: {
        [String(enums.UncapType.Zero)]: String(scoreAtZero),
        [String(enums.UncapType.Four)]: String(scoreAtFour),
      },
      is_initial_stat: true,
    },
  ]
  const spTrigger = {
    [enums.SpCategoryType.Vocal]: enums.TriggerKeyType.VoSpLessonRate,
    [enums.SpCategoryType.Dance]: enums.TriggerKeyType.DaSpLessonRate,
    [enums.SpCategoryType.Visual]: enums.TriggerKeyType.ViSpLessonRate,
    [enums.SpCategoryType.All]: enums.TriggerKeyType.SpLessonRateAll,
    [enums.SpCategoryType.None]: null,
  }[spCategory]

  if (spTrigger) {
    abilities.push({
      name_key: enums.AbilityNameKeyType.SpLessonRate,
      trigger_key: spTrigger,
      values: { [String(enums.UncapType.Four)]: '10' },
      is_percentage: true,
      skip_calculation: true,
    })
  }

  return {
    name,
    rarity: enums.RarityType.SSR,
    plan: enums.PlanType.Sense,
    type,
    parameter_type: parameterType,
    source: enums.SourceType.Gacha,
    release_date: '2026/01/01',
    abilities,
    events: [],
    p_item: null,
    skill_card: null,
  }
}

/** 小規模fixtureで使う最適編成設定を作る */
function makeSettings(overrides: Partial<UnitSimulatorSettings> = {}): UnitSimulatorSettings {
  return {
    plan: enums.PlanType.Sense,
    allowedTypes: [],
    spConstraint: { vocal: 0, dance: 0, visual: 0 },
    typeCountMin: { vocal: 0, dance: 0, visual: 0 },
    typeCountMax: { vocal: 6, dance: 6, visual: 6 },
    paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
    rentalCardName: null,
    lockedCards: [],
    selectedCards: [],
    excludedCardNames: [],
    initialParams: { vocal: 0, dance: 0, visual: 0 },
    excludeContestSkillCards: false,
    excludeContestPItems: false,
    unifyRentalLock: false,
    ...overrides,
  }
}

/** fixture内のスコアが凸数だけで決まり、他カードとの連携を持たない設定を作る */
function makeScoreSettings(useFixedUncap: boolean) {
  return {
    ...createDefaultSettings(enums.ScenarioType.Custom),
    scenario: enums.ScenarioType.Custom,
    difficulty: enums.DifficultyType.None,
    useFixedUncap,
    useScheduleLimits: false,
    includeSelfTrigger: false,
    includePItem: false,
    parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    actionCounts: {},
    useCustomMode: true,
    customParamBonusRows: [{ vocal: 0, dance: 0, visual: 0 }],
    customClassBonus: { vocal: 0, dance: 0, visual: 0 },
    customNonBonusGain: { vocal: 0, dance: 0, visual: 0 },
  }
}

/** 比較用のカード集合から通常候補を準備する */
function makeInput(
  cards: SupportCard[],
  settings: UnitSimulatorSettings,
  options: { useFixedUncap?: boolean; cardUncaps?: OptimizeInput['cardUncaps']; excludedCardNames?: string[] } = {},
): OptimizeInput {
  return {
    settings,
    scoreSettings: makeScoreSettings(options.useFixedUncap ?? true),
    cardUncaps: options.cardUncaps ?? {},
    allCards: cards,
    cardByName: new Map(cards.map((card) => [card.name, card])),
    excludedCardNames: options.excludedCardNames ?? [],
  }
}

/** 独立oracleが最小fixtureの合法編成を全列挙し、最大スコアを求める */
function findBestFixtureLineup(
  cards: { card: SupportCard; score: number; spCategory: enums.SpCategoryType }[],
  settings: UnitSimulatorSettings,
  excludedCardNames: string[],
): { names: string[]; score: number } {
  const lockedNames = new Set(settings.lockedCards)
  const excludedNames = new Set(excludedCardNames)
  const eligible = cards.filter(
    ({ card }) => lockedNames.has(card.name) || card.name === settings.rentalCardName || !excludedNames.has(card.name),
  )
  let best: { names: string[]; score: number } | null = null
  const selected: typeof eligible = []

  function enumerate(start: number): void {
    if (selected.length === constant.UNIT_SIZE) {
      const names = new Set(selected.map(({ card }) => card.name))
      if (names.size !== constant.UNIT_SIZE) return
      if (settings.lockedCards.some((name) => !names.has(name))) return
      if (settings.rentalCardName && !names.has(settings.rentalCardName)) return

      for (const type of Object.values(enums.ParameterType)) {
        const typeCount = selected.filter(({ card }) => card.type === type).length
        const spCount = selected.filter(
          ({ spCategory }) => spCategory === type || spCategory === enums.SpCategoryType.All,
        ).length
        if (typeCount < settings.typeCountMin[type] || typeCount > settings.typeCountMax[type]) return
        if (spCount < settings.spConstraint[type]) return
      }

      const score = selected.reduce((sum, fixtureCard) => sum + fixtureCard.score, 0)
      if (!best || score > best.score) best = { names: selected.map(({ card }) => card.name).sort(), score }
      return
    }

    const remaining = constant.UNIT_SIZE - selected.length
    for (let index = start; index <= eligible.length - remaining; index++) {
      selected.push(eligible[index])
      enumerate(index + 1)
      selected.pop()
    }
  }

  enumerate(0)
  if (!best) throw new Error('Independent fixture has no legal lineup')
  return best
}

describe('最適編成の独立制約fixture', () => {
  it('除外より固定ロックを優先し、SP All・タイプ上限を満たす最良編成を全列挙oracleと一致させる', async () => {
    const lockedVocal = makeCard('固定Vo', enums.CardType.Vocal, 3)
    const lockedAll = makeCard('固定AllSP', enums.CardType.Assist, 10, enums.SpCategoryType.All)
    const danceHigh = makeCard('Da高得点', enums.CardType.Dance, 20)
    const danceLow = makeCard('Da補助', enums.CardType.Dance, 6)
    const visualHigh = makeCard('Vi高得点', enums.CardType.Visual, 8)
    const visualLow = makeCard('Vi補助', enums.CardType.Visual, 2)
    const assist = makeCard('Assist候補', enums.CardType.Assist, 7)
    const vocal = makeCard('Vo候補', enums.CardType.Vocal, 4)
    const excludedHigh = makeCard('除外高得点', enums.CardType.Dance, 1_000)
    const cards = [lockedVocal, lockedAll, danceHigh, danceLow, visualHigh, visualLow, assist, vocal, excludedHigh]
    const settings = makeSettings({
      spConstraint: { vocal: 1, dance: 1, visual: 1 },
      typeCountMin: { vocal: 1, dance: 1, visual: 1 },
      typeCountMax: { vocal: 2, dance: 2, visual: 2 },
      rentalCardName: lockedAll.name,
      lockedCards: [lockedVocal.name, lockedAll.name],
    })
    const excludedCardNames = [lockedVocal.name, lockedAll.name, excludedHigh.name]
    const input = makeInput(cards, settings, { excludedCardNames })
    const result = await exhaustiveOptimizeAsync(
      input,
      () => {},
      () => false,
    )
    const oracle = findBestFixtureLineup(
      [
        { card: lockedVocal, score: 3, spCategory: enums.SpCategoryType.None },
        { card: lockedAll, score: 10, spCategory: enums.SpCategoryType.All },
        { card: danceHigh, score: 20, spCategory: enums.SpCategoryType.None },
        { card: danceLow, score: 6, spCategory: enums.SpCategoryType.None },
        { card: visualHigh, score: 8, spCategory: enums.SpCategoryType.None },
        { card: visualLow, score: 2, spCategory: enums.SpCategoryType.None },
        { card: assist, score: 7, spCategory: enums.SpCategoryType.None },
        { card: vocal, score: 4, spCategory: enums.SpCategoryType.None },
        { card: excludedHigh, score: 1_000, spCategory: enums.SpCategoryType.None },
      ],
      settings,
      excludedCardNames,
    )

    expect(result?.totalScore).toBe(oracle.score)
    expect(result?.members.map(({ card }) => card.name).sort()).toEqual(oracle.names)
    expect(result?.members.find(({ card }) => card.name === lockedVocal.name)?.isRental).toBe(false)
    expect(result?.members.find(({ card }) => card.name === lockedAll.name)?.isRental).toBe(true)
    expect(result?.members.map(({ card }) => card.name)).not.toContain(excludedHigh.name)
  })

  it('SP Allを含む自動レンタル枝を残し、枝の通数と実列挙数を一致させる', () => {
    const allSp = makeCard('自由枠AllSP', enums.CardType.Assist, 0, enums.SpCategoryType.All)
    const freePool = [
      allSp,
      makeCard('自由Vo', enums.CardType.Vocal, 0),
      makeCard('自由Da', enums.CardType.Dance, 0),
      makeCard('自由Vi', enums.CardType.Visual, 0),
      makeCard('自由Assist', enums.CardType.Assist, 0),
    ].map((card) =>
      createCandidateCard({
        card,
        uncap: enums.UncapType.Four,
        scoreSettings: makeScoreSettings(true),
        effectiveCounts: {},
        parameterBonusRows: [],
      }),
    )
    const rental = createCandidateCard({
      card: makeCard('自動レンタル', enums.CardType.Assist, 0),
      uncap: enums.UncapType.Four,
      scoreSettings: makeScoreSettings(true),
      effectiveCounts: {},
      parameterBonusRows: [],
    })
    const settings = makeSettings({ spConstraint: { vocal: 1, dance: 1, visual: 1 } })

    const branches = createSearchBranches([], freePool, [rental], settings)

    expect(branches).toHaveLength(1)
    expect(branches[0].totalCombos).toBe(1)
    expect(Array.from(spTypeConstrainedCombos(branches[0].enumeration))).toHaveLength(branches[0].totalCombos)
  })

  it('未所持の固定レンタルを通常枠へ移さず、所持ロックをレンタルへ昇格させない', async () => {
    const rental = makeCard('未所持レンタル', enums.CardType.Vocal, 0)
    const normalLock = makeCard('所持済みロック', enums.CardType.Dance, 100, enums.SpCategoryType.None, 1)
    const fillers = Array.from({ length: 4 }, (_, index) => makeCard(`自由${index}`, enums.CardType.Visual, 0))
    const cards = [rental, normalLock, ...fillers]
    const settings = makeSettings({
      rentalCardName: rental.name,
      lockedCards: [rental.name, normalLock.name],
      unifyRentalLock: true,
    })
    const input = makeInput(cards, settings, {
      useFixedUncap: false,
      cardUncaps: {
        [rental.name]: enums.UncapType.NotOwned,
        [normalLock.name]: enums.UncapType.Zero,
        ...Object.fromEntries(fillers.map((card) => [card.name, enums.UncapType.Four])),
      },
    })
    const result = await exhaustiveOptimizeAsync(
      input,
      () => {},
      () => false,
    )

    expect(result).not.toBeNull()
    expect(result?.members.find(({ card }) => card.name === rental.name)?.isRental).toBe(true)
    expect(result?.members.find(({ card }) => card.name === normalLock.name)?.isRental).toBe(false)
  })

  it('選択プランと不一致の固定レンタルでレンタル枠なしの編成を作らない', () => {
    const rental = { ...makeCard('プラン不一致レンタル', enums.CardType.Vocal, 0), plan: enums.PlanType.Logic }
    const settings = makeSettings({ rentalCardName: rental.name, lockedCards: [rental.name] })
    const input = makeInput([rental], settings)
    const schedule = { effectiveCounts: {}, parameterBonusRows: [] }
    const rentalPool = createRentalPool(input, schedule, new Set(), 10)

    expect(rentalPool).toHaveLength(0)
    expect(createSearchBranches([], [], rentalPool, settings)).toHaveLength(0)
  })

  it('凸数未記録の固定レンタルを既定4凸として扱い、統合時に通常枠へ移せる', async () => {
    const rental = makeCard('凸数未記録レンタル', enums.CardType.Vocal, 0)
    const normalLock = makeCard('所持済みロック', enums.CardType.Dance, 100, enums.SpCategoryType.None, 1)
    const fillers = Array.from({ length: 4 }, (_, index) => makeCard(`自由${index}`, enums.CardType.Visual, 0))
    const cards = [rental, normalLock, ...fillers]
    const settings = makeSettings({
      rentalCardName: rental.name,
      lockedCards: [rental.name, normalLock.name],
      unifyRentalLock: true,
    })
    const input = makeInput(cards, settings, {
      useFixedUncap: false,
      cardUncaps: {
        [normalLock.name]: enums.UncapType.Zero,
        ...Object.fromEntries(fillers.map((card) => [card.name, enums.UncapType.Four])),
      },
    })
    const result = await exhaustiveOptimizeAsync(
      input,
      () => {},
      () => false,
    )

    expect(result).not.toBeNull()
    expect(result?.members.find(({ card }) => card.name === rental.name)?.isRental).toBe(false)
    expect(result?.members.find(({ card }) => card.name === normalLock.name)?.isRental).toBe(true)
  })

  it('同名SP候補のタイプ変更後に古い通数cacheを再利用しない', () => {
    const countWithType = (type: enums.CardType) =>
      countSpTypeConstrainedCombos({
        voSpPool: [{ card: { name: '同名SP', type } }],
        daSpPool: [],
        viSpPool: [],
        allSpPool: [],
        genVoCount: 0,
        genDaCount: 0,
        genViCount: 0,
        genAsCount: 0,
        neededVo: 1,
        neededDa: 0,
        neededVi: 0,
        typeVoMin: 1,
        typeDaMin: 0,
        typeViMin: 0,
        typeVoMax: 1,
        typeDaMax: 0,
        typeViMax: 0,
        totalSlots: 1,
      })

    expect(countWithType(enums.CardType.Vocal)).toBe(1)
    expect(countWithType(enums.CardType.Dance)).toBe(0)
  })
})

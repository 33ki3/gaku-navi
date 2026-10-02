/**
 * 最適編成候補準備のテスト
 *
 * コンテスト用除外オプションなど、候補プール作成時のフィルタ条件を検証する。
 */
import { describe, expect, it } from 'vitest'

import * as constant from '../../../constant'
import { AllCards } from '../../../data/card/cards'
import type { Ability, SkillCardInfo, SupportCard } from '../../../types/card'
import * as enums from '../../../types/enums'
import type { UnitSimulatorSettings } from '../../../types/unit'
import { createDefaultSettings } from '../../../utils/scoreSettings'
import {
  type CandidateCard,
  createFixedCandidates,
  createRentalPool,
  prepareCandidates,
} from '../../../utils/unitOptimizer/candidatePreparation'
import { rankSynergyCandidates, selectSynergyCandidates } from '../../../utils/unitOptimizer/synergySelection'
import { evaluateManualUnit, exhaustiveOptimizeAsync } from '../../../utils/unitSimulator'

/** テスト用スキルカード */
const testSkillCard: SkillCardInfo = {
  name: 'テストスキル',
  rarity: enums.SkillCardRarityType.SR,
  type: enums.SkillCardType.Mental,
  lesson_limit: 0,
  no_duplicate: false,
  effects: [
    {
      level: enums.SkillCardLevelType.Base,
      cost_type: enums.CostType.None,
      cost_value: 0,
    },
  ],
  custom_cap: 0,
  custom_slot: [],
}

/** テスト用サポートを作る */
function makeCard(name: string, overrides: Partial<SupportCard> = {}): SupportCard {
  return {
    name,
    rarity: enums.RarityType.SSR,
    plan: enums.PlanType.Sense,
    type: enums.CardType.Vocal,
    parameter_type: enums.ParameterType.Vocal,
    source: enums.SourceType.Gacha,
    release_date: '2026/01/01',
    abilities: [],
    events: [],
    p_item: null,
    skill_card: null,
    ...overrides,
  }
}

/** テスト用最適編成設定を作る */
function makeSettings(overrides: Partial<UnitSimulatorSettings> = {}): UnitSimulatorSettings {
  return {
    plan: enums.PlanType.Sense,
    allowedTypes: [],
    spConstraint: { vocal: 0, dance: 0, visual: 0 },
    typeCountMin: {
      [enums.ParameterType.Vocal]: constant.TYPE_COUNT_MIN_DEFAULT,
      [enums.ParameterType.Dance]: constant.TYPE_COUNT_MIN_DEFAULT,
      [enums.ParameterType.Visual]: constant.TYPE_COUNT_MIN_DEFAULT,
    },
    typeCountMax: {
      [enums.ParameterType.Vocal]: constant.TYPE_COUNT_MAX_DEFAULT,
      [enums.ParameterType.Dance]: constant.TYPE_COUNT_MAX_DEFAULT,
      [enums.ParameterType.Visual]: constant.TYPE_COUNT_MAX_DEFAULT,
    },
    paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
    rentalCardName: null,
    lockedCards: [],
    selectedCards: [],
    excludedCardNames: [],
    initialParams: { vocal: 0, dance: 0, visual: 0 },
    excludeContestSkillCards: true,
    excludeContestPItems: true,
    ...overrides,
  }
}

describe('候補準備のコンテスト用除外', () => {
  const normal = makeCard('通常サポート')
  const skillCard = makeCard('スキルカード持ち', { skill_card: testSkillCard })
  const memorizablePItem = makeCard('メモリ化Pアイテム持ち', {
    p_item: {
      name: 'メモリ化アイテム',
      rarity: enums.PItemRarityType.SR,
      memory: enums.PItemMemoryType.Memorizable,
    },
  })
  const nonMemorizablePItem = makeCard('メモリ化不可Pアイテム持ち', {
    p_item: {
      name: 'メモリ化不可アイテム',
      rarity: enums.PItemRarityType.SR,
      memory: enums.PItemMemoryType.NonMemorizable,
    },
  })
  const allCards = [normal, skillCard, memorizablePItem, nonMemorizablePItem]
  const schedule = { effectiveCounts: {}, parameterBonusRows: [] }

  function makeInput(settings: UnitSimulatorSettings) {
    return {
      settings,
      scoreSettings: createDefaultSettings(),
      cardUncaps: {},
      cardCountCustom: {},
      excludedCardNames: [],
      allCards,
      cardByName: new Map(allCards.map((card) => [card.name, card])),
    }
  }

  it('スキルカード持ちとメモリ化Pアイテム持ちを通常候補とレンタル候補から除外する', () => {
    const input = makeInput(makeSettings())

    const candidates = prepareCandidates(input, schedule)
    const rentalPool = createRentalPool(input, schedule, new Set(), 10)

    expect(candidates.map((candidate) => candidate.card.name)).toEqual(['メモリ化不可Pアイテム持ち', '通常サポート'])
    expect(rentalPool.map((candidate) => candidate.card.name)).toEqual(['メモリ化不可Pアイテム持ち', '通常サポート'])
  })

  it('スキルカード除外だけ有効ならメモリ化Pアイテム持ちは候補に残す', () => {
    const input = makeInput(makeSettings({ excludeContestSkillCards: true, excludeContestPItems: false }))

    const candidates = prepareCandidates(input, schedule)
    const rentalPool = createRentalPool(input, schedule, new Set(), 10)

    expect(candidates.map((candidate) => candidate.card.name)).toEqual([
      'メモリ化Pアイテム持ち',
      'メモリ化不可Pアイテム持ち',
      '通常サポート',
    ])
    expect(rentalPool.map((candidate) => candidate.card.name)).toEqual([
      'メモリ化Pアイテム持ち',
      'メモリ化不可Pアイテム持ち',
      '通常サポート',
    ])
  })

  it('メモリ化Pアイテム除外だけ有効ならスキルカード持ちは候補に残す', () => {
    const input = makeInput(makeSettings({ excludeContestSkillCards: false, excludeContestPItems: true }))

    const candidates = prepareCandidates(input, schedule)
    const rentalPool = createRentalPool(input, schedule, new Set(), 10)

    expect(candidates.map((candidate) => candidate.card.name)).toEqual([
      'スキルカード持ち',
      'メモリ化不可Pアイテム持ち',
      '通常サポート',
    ])
    expect(rentalPool.map((candidate) => candidate.card.name)).toEqual([
      'スキルカード持ち',
      'メモリ化不可Pアイテム持ち',
      '通常サポート',
    ])
  })

  it('通常ロックされたサポートはコンテスト用除外対象でも固定候補として残す', () => {
    const skillCard = makeCard('固定スキルカード持ち', { skill_card: testSkillCard })
    const input = {
      settings: makeSettings({ lockedCards: [skillCard.name] }),
      scoreSettings: createDefaultSettings(),
      cardUncaps: {},
      cardCountCustom: {},
      excludedCardNames: [],
      allCards: [skillCard],
      cardByName: new Map([[skillCard.name, skillCard]]),
    }
    const schedule = { effectiveCounts: {}, parameterBonusRows: [] }

    const candidates = prepareCandidates(input, schedule)

    expect(candidates.map((candidate) => candidate.card.name)).toEqual([skillCard.name])
  })

  it('指定除外したサポートを通常候補と自動レンタル候補から除外する', () => {
    const input = {
      ...makeInput(makeSettings()),
      excludedCardNames: ['通常サポート'],
    }

    const candidates = prepareCandidates(input, schedule)
    const rentalPool = createRentalPool(input, schedule, new Set(), 10)

    expect(candidates.map((candidate) => candidate.card.name)).not.toContain('通常サポート')
    expect(rentalPool.map((candidate) => candidate.card.name)).not.toContain('通常サポート')
  })

  it('指定除外しても通常ロックされたサポートは固定候補として残す', () => {
    const lockedName = '固定対象'
    const lockedCard = makeCard(lockedName)
    const input = {
      settings: makeSettings({ lockedCards: [lockedName] }),
      scoreSettings: createDefaultSettings(),
      cardUncaps: {},
      cardCountCustom: {},
      allCards: [lockedCard],
      cardByName: new Map([[lockedName, lockedCard]]),
      excludedCardNames: [lockedName],
    }

    const candidates = prepareCandidates(input, schedule)

    expect(candidates.map((candidate) => candidate.card.name)).toEqual([lockedName])
  })
})

describe('Pアイテム相乗効果を考慮した候補選定', () => {
  it('基礎点が低いPアイテム行動提供元を候補に残す', () => {
    const settings = makeSettings({
      plan: enums.PlanType.Sense,
      allowedTypes: [enums.CardType.Vocal, enums.CardType.Dance, enums.CardType.Visual, enums.CardType.Assist],
    })
    const scoreSettings = { ...createDefaultSettings(), useFixedUncap: true }
    const input = {
      settings,
      scoreSettings,
      cardUncaps: {},
      cardCountCustom: {},
      excludedCardNames: [],
      allCards: AllCards,
      cardByName: new Map(AllCards.map((card) => [card.name, card])),
    }
    const schedule = {
      effectiveCounts: {
        [enums.ActionIdType.SpLessonDa]: 3,
        [enums.ActionIdType.SpLessonVo]: 3,
      },
      parameterBonusRows: [],
    }

    const candidates = prepareCandidates(input, schedule)
    const pool = selectSynergyCandidates(candidates, 30)
    const rentalPool = createRentalPool(input, schedule, new Set(), 30)
    const expectedNames = ['ふわふわでワクワク', '今はあえて、背を向けて']

    expect(pool.map((candidate) => candidate.card.name)).toEqual(expect.arrayContaining(expectedNames))
    expect(rentalPool.map((candidate) => candidate.card.name)).toEqual(expect.arrayContaining(expectedNames))
  })
})

const synergyCases = [
  {
    label: 'Pアイテム獲得',
    event: enums.EventEffectType.PItem,
    action: enums.ActionIdType.PItemAcquire,
    trigger: enums.TriggerKeyType.PItemAcquire,
    ability: enums.AbilityNameKeyType.PItemAcquire,
  },
  {
    label: 'スキルカード獲得',
    event: enums.EventEffectType.SkillCard,
    action: enums.ActionIdType.SkillAcquire,
    trigger: enums.TriggerKeyType.SkillAcquire,
    ability: enums.AbilityNameKeyType.SkillAcquire,
  },
  {
    label: 'スキルカード強化',
    event: enums.EventEffectType.CardEnhance,
    action: enums.ActionIdType.SkillEnhance,
    trigger: enums.TriggerKeyType.SkillEnhance,
    ability: enums.AbilityNameKeyType.SkillEnhance,
  },
  {
    label: 'スキルカード削除',
    event: enums.EventEffectType.CardDelete,
    action: enums.ActionIdType.Delete,
    trigger: enums.TriggerKeyType.Delete,
    ability: enums.AbilityNameKeyType.Delete,
  },
  {
    label: 'スキルカードチェンジ',
    event: enums.EventEffectType.CardChange,
    action: enums.ActionIdType.Change,
    trigger: enums.TriggerKeyType.Change,
    ability: enums.AbilityNameKeyType.Change,
  },
]

function makeSynergyInput(cards: SupportCard[], overrides: Partial<UnitSimulatorSettings> = {}) {
  return {
    settings: makeSettings({ excludeContestSkillCards: false, excludeContestPItems: false, ...overrides }),
    scoreSettings: {
      ...createDefaultSettings(),
      useFixedUncap: true,
      parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    },
    cardUncaps: {},
    cardCountCustom: {},
    excludedCardNames: [],
    allCards: cards,
    cardByName: new Map(cards.map((card) => [card.name, card])),
  }
}

function makeSynergyPair(testCase: (typeof synergyCases)[number], receiverOverrides: Partial<Ability> = {}) {
  const provider = makeCard('提供元', {
    events: [{ release: enums.ReleaseConditionType.Initial, effect_type: testCase.event, title: '提供イベント' }],
  })
  const receiver = makeCard('受け手', {
    abilities: [
      {
        name_key: testCase.ability,
        trigger_key: testCase.trigger,
        parameter_type: enums.ParameterType.Vocal,
        values: { '0': '1000' },
        ...receiverOverrides,
      },
    ],
  })
  const fillers = Array.from({ length: 12 }, (_, index) =>
    makeCard(`基礎点上位${index}`, {
      events: [
        {
          release: enums.ReleaseConditionType.Initial,
          effect_type: enums.EventEffectType.ParamBoost,
          param_type: enums.ParameterType.Vocal,
          param_value: 100,
          title: '基礎点',
        },
      ],
    }),
  )
  return { provider, receiver, cards: [...fillers, provider, receiver] }
}

const emptySchedule = { effectiveCounts: {}, parameterBonusRows: [] }

function getCandidatesWithSynergy(
  candidates: readonly CandidateCard[],
  limit: number,
  context: Parameters<typeof rankSynergyCandidates>[1],
): CandidateCard[] {
  return rankSynergyCandidates(candidates, context)
    .filter(({ providedScore, receivedScore }) => providedScore > 0 || receivedScore > 0)
    .slice(0, limit)
    .map(({ candidate }) => candidate)
}

describe('イベントとPアイテムの両側の候補保護', () => {
  it('レンタル名が固定カード一覧に含まれるなら、通常枠の凸数と分けて4凸の固定レンタルを作る', async () => {
    const rental = makeCard('固定レンタル')
    const normal = makeCard('通常固定')
    const input = makeSynergyInput([rental, normal, ...Array.from({ length: 4 }, (_, i) => makeCard(`自由枠${i}`))], {
      rentalCardName: rental.name,
      lockedCards: [rental.name, normal.name],
      typeCountMax: { vocal: 6, dance: 6, visual: 6 },
    })
    input.scoreSettings.useFixedUncap = false
    input.cardUncaps = { [rental.name]: enums.UncapType.Zero, [normal.name]: enums.UncapType.Zero }
    const candidates = prepareCandidates(input, emptySchedule)

    const rentals = createRentalPool(input, emptySchedule, new Set(), 10, candidates)
    const fixed = createFixedCandidates(input, candidates, rentals)

    expect(fixed.map((candidate) => [candidate.card.name, candidate.uncap])).toEqual([
      [normal.name, enums.UncapType.Zero],
      [rental.name, enums.UncapType.Four],
    ])
    const result = await exhaustiveOptimizeAsync(
      input,
      () => {},
      () => false,
    )
    expect(result?.members.find((member) => member.isRental)?.card.name).toBe(rental.name)
    expect(result?.members.find((member) => member.isRental)?.uncap).toBe(enums.UncapType.Four)
  })

  it('同じ発動条件でも上限の異なるアビリティは、それぞれの使用済み回数で結果表示へ加点する', () => {
    const provider = makeCard('提供3回', {
      events: Array.from({ length: 3 }, () => ({
        release: enums.ReleaseConditionType.Initial,
        effect_type: enums.EventEffectType.PItem,
        title: '提供イベント',
      })),
    })
    const receiver = makeCard('上限の異なる受け手', {
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.PItemAcquire,
          trigger_key: enums.TriggerKeyType.PItemAcquire,
          parameter_type: enums.ParameterType.Vocal,
          values: { '0': '100' },
          max_count: 3,
        },
        {
          name_key: enums.AbilityNameKeyType.SkillAcquire,
          trigger_key: enums.TriggerKeyType.PItemAcquire,
          parameter_type: enums.ParameterType.Vocal,
          values: { '0': '200' },
          max_count: 1,
        },
      ],
    })
    const input = makeSynergyInput([provider, receiver], { selectedCards: [provider.name, receiver.name] })
    input.scoreSettings.useScheduleLimits = false
    input.scoreSettings.actionCounts = { [enums.ActionIdType.PItemAcquire]: 2 }

    const result = evaluateManualUnit(input)
    const member = result?.members.find((member) => member.card.name === receiver.name)

    expect(member?.supportSynergy).toBe(100)
    expect(member?.supportSynergyDetail[enums.TriggerKeyType.PItemAcquire]).toBe(1)
  })

  it.each(synergyCases)('$labelの提供元と低基礎点の受け手を通常・レンタル候補へ残す', (testCase) => {
    const { cards } = makeSynergyPair(testCase)
    const input = makeSynergyInput(cards)
    const candidates = prepareCandidates(input, emptySchedule)
    expect(candidates.slice(0, 10).map((candidate) => candidate.card.name)).not.toContain('受け手')
    for (const pool of [
      selectSynergyCandidates(candidates, 10),
      createRentalPool(input, emptySchedule, new Set(), 10),
    ]) {
      expect(pool).toHaveLength(10)
      expect(pool.map((candidate) => candidate.card.name)).toEqual(expect.arrayContaining(['提供元', '受け手']))
    }
  })

  it('Dance SP3回で実カードの提供元と受け手を基礎点上位30枚の外から残す', () => {
    const input = makeSynergyInput(AllCards)
    const schedule = { ...emptySchedule, effectiveCounts: { [enums.ActionIdType.SpLessonDa]: 3 } }
    const candidates = prepareCandidates(input, schedule)
    const names = ['ふわふわでワクワク', 'いつも頑張ってるね。']
    for (const name of names)
      expect(candidates.slice(0, 30).map((candidate) => candidate.card.name)).not.toContain(name)
    expect(selectSynergyCandidates(candidates, 30).map((candidate) => candidate.card.name)).toEqual(
      expect.arrayContaining(names),
    )
    expect(createRentalPool(input, schedule, new Set(), 30).map((candidate) => candidate.card.name)).toEqual(
      expect.arrayContaining(names),
    )
  })

  it('イベント提供の無効化・提供回数ゼロ・受け手上限消費済みなら保護しない', () => {
    const testCase = synergyCases[3]
    const { cards } = makeSynergyPair(testCase, { max_count: 1 })
    const input = makeSynergyInput(cards)
    const disabled = prepareCandidates(
      { ...input, scoreSettings: { ...input.scoreSettings, includeSelfTrigger: false } },
      emptySchedule,
    )
    const zero = prepareCandidates(
      { ...input, cardCountCustom: { 提供元: { selfTrigger: { [testCase.action]: 0 } } } },
      emptySchedule,
    )
    const consumed = prepareCandidates(input, { ...emptySchedule, effectiveCounts: { [testCase.action]: 1 } })
    for (const candidates of [disabled, zero, consumed])
      expect(getCandidatesWithSynergy(candidates, 10, {})).toEqual([])
  })

  it('Pアイテム無効化時はその行動から受け手を保護しない', () => {
    const { receiver, cards } = makeSynergyPair(synergyCases[3])
    const pItemProvider = makeCard('Pアイテム提供元', {
      p_item: {
        name: '削除',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.NonMemorizable,
        actions: [enums.PItemActionType.Delete],
      },
    })
    const input = makeSynergyInput([...cards.filter((card) => card.name !== '提供元'), pItemProvider])
    const enabled = prepareCandidates(input, emptySchedule)
    expect(selectSynergyCandidates(enabled, 10).map((candidate) => candidate.card.name)).toContain(receiver.name)
    const disabled = prepareCandidates(
      { ...input, scoreSettings: { ...input.scoreSettings, includePItem: false } },
      emptySchedule,
    )
    expect(getCandidatesWithSynergy(disabled, 10, {})).toEqual([])
  })

  it('自身の提供だけでは受け手を保護しない', () => {
    const { provider, receiver } = makeSynergyPair(synergyCases[3])
    const input = makeSynergyInput([{ ...receiver, events: provider.events }])
    expect(getCandidatesWithSynergy(prepareCandidates(input, emptySchedule), 10, {})).toEqual([])
  })

  it('固定提供元と手動レンタル提供元からの連携を通常の受け手へ反映する', () => {
    const { cards, provider } = makeSynergyPair(synergyCases[3])
    const input = makeSynergyInput(cards)
    const candidates = prepareCandidates(input, emptySchedule)
    const fixed = candidates.filter((candidate) => candidate.card.name === provider.name)
    const free = candidates.filter((candidate) => candidate.card.name !== provider.name)
    for (const settings of [
      input.settings,
      { ...input.settings, lockedCards: [provider.name], rentalCardName: provider.name },
    ]) {
      expect(
        selectSynergyCandidates(free, 10, { settings, fixedCandidates: fixed, normalCandidates: free }).map(
          (candidate) => candidate.card.name,
        ),
      ).toContain('受け手')
    }
  })

  it('レンタル受け手へ別のレンタル提供元を重ねず、通常提供元だけを使う', () => {
    const { cards } = makeSynergyPair(synergyCases[3])
    const candidates = prepareCandidates(makeSynergyInput(cards), emptySchedule)
    const receiver = candidates.filter((candidate) => candidate.card.name === '受け手')
    const provider = candidates.filter((candidate) => candidate.card.name === '提供元')
    expect(
      getCandidatesWithSynergy(receiver, 10, {
        rentalSelection: true,
        normalCandidates: [],
        rentalCandidates: provider,
      }),
    ).toEqual([])
    expect(getCandidatesWithSynergy(receiver, 10, { rentalSelection: true, normalCandidates: provider })).toEqual(
      receiver,
    )
  })

  it('未所持の提供元はレンタル1枠として通常の受け手を保護する', async () => {
    const { cards } = makeSynergyPair(synergyCases[3])
    const input = {
      ...makeSynergyInput(cards, {
        exhaustiveCandidateLimit: 10,
        typeCountMax: { vocal: 6, dance: 6, visual: 6 },
      }),
      cardUncaps: Object.fromEntries(
        cards.map((card) => [card.name, card.name === '提供元' ? enums.UncapType.NotOwned : enums.UncapType.Four]),
      ),
    }
    input.scoreSettings.useFixedUncap = false
    const normal = prepareCandidates(input, emptySchedule)
    expect(normal.map((candidate) => candidate.card.name)).not.toContain('提供元')
    const rentals = createRentalPool(input, emptySchedule, new Set(), 10)
    const pool = selectSynergyCandidates(normal, 10, {
      settings: input.settings,
      normalCandidates: normal,
      rentalCandidates: rentals,
    })
    expect(pool.map((candidate) => candidate.card.name)).toContain('受け手')
    const result = await exhaustiveOptimizeAsync(
      input,
      () => {},
      () => false,
    )
    expect(result?.members.find((member) => member.card.name === '提供元')?.isRental).toBe(true)
    expect(result?.members.map((member) => member.card.name)).toContain('受け手')
  })

  it('空き枠・タイプ上限・SP必要枠に収まらない連携は保護しない', () => {
    const { cards } = makeSynergyPair(synergyCases[3])
    const input = makeSynergyInput(cards)
    const candidates = prepareCandidates(input, emptySchedule)
    const partners = candidates.filter((candidate) => ['提供元', '受け手'].includes(candidate.card.name))
    const filler = candidates.filter((candidate) => candidate.card.name.startsWith('基礎点上位'))
    const contexts = [
      { fixedCandidates: filler.slice(0, 5) },
      { settings: { ...input.settings, typeCountMin: { vocal: 0, dance: 0, visual: 5 } } },
      { settings: { ...input.settings, typeCountMax: { ...input.settings.typeCountMax, vocal: 1 } } },
      { settings: { ...input.settings, spConstraint: { vocal: 5, dance: 0, visual: 0 } } },
    ]
    for (const context of contexts)
      expect(getCandidatesWithSynergy(partners, 10, { normalCandidates: partners, ...context })).toEqual([])
  })

  it('仮想供給を最大5枚に抑え、同名の通常・レンタル提供元を重複加算しない', () => {
    const pairA = makeSynergyPair(synergyCases[3])
    const pairB = makeSynergyPair(synergyCases[4])
    const receiverA = {
      ...pairA.receiver,
      name: '受け手A',
      abilities: pairA.receiver.abilities.map((ability) => ({ ...ability, values: { '0': '100' } })),
    }
    const receiverB = {
      ...pairB.receiver,
      name: '受け手B',
      abilities: pairB.receiver.abilities.map((ability) => ({ ...ability, values: { '0': '550' } })),
    }
    const providers = Array.from({ length: 6 }, (_, index) => ({ ...pairA.provider, name: `提供元A${index}` }))
    const input = makeSynergyInput([...providers, { ...pairB.provider, name: '提供元B' }, receiverA, receiverB])
    const candidates = prepareCandidates(input, emptySchedule)
    const receivers = candidates.filter((candidate) => candidate.card.name.startsWith('受け手'))
    const partners = candidates.filter((candidate) => candidate.card.name.startsWith('提供元'))
    expect(
      getCandidatesWithSynergy(receivers, 1, { normalCandidates: partners, rentalCandidates: partners }).map(
        (candidate) => candidate.card.name,
      ),
    ).toEqual(['受け手B'])
    const onlyA = partners.filter((candidate) => candidate.card.name === '提供元A0')
    const weakerB = receivers.map((candidate) =>
      candidate.card.name === '受け手B'
        ? {
            ...candidate,
            synergyAbilities: candidate.synergyAbilities.map((ability) => ({ ...ability, parsedValue: 150 })),
          }
        : candidate,
    )
    expect(
      getCandidatesWithSynergy(weakerB, 1, {
        normalCandidates: [...onlyA, partners.find((candidate) => candidate.card.name === '提供元B')!],
        rentalCandidates: onlyA,
      }).map((candidate) => candidate.card.name),
    ).toEqual(['受け手B'])
  })

  it('候補上限が小さくても両側を残し、同点は入力順に依存しない', () => {
    const { cards } = makeSynergyPair(synergyCases[3])
    const candidates = prepareCandidates(makeSynergyInput(cards), emptySchedule)
    const selected = selectSynergyCandidates(candidates, 2)
    expect(selected.map((candidate) => candidate.card.name)).toEqual(expect.arrayContaining(['提供元', '受け手']))
    expect(selectSynergyCandidates([...candidates].reverse(), 2)).toEqual(selected)
    expect(selectSynergyCandidates(candidates, 0)).toEqual([])
  })

  it('最終編成を実点数で選び、仮想加点を二重計上しない', async () => {
    const { cards } = makeSynergyPair(synergyCases[3])
    const input = makeSynergyInput(cards, {
      exhaustiveCandidateLimit: 10,
      typeCountMax: { vocal: 6, dance: 6, visual: 6 },
    })
    const result = await exhaustiveOptimizeAsync(
      input,
      () => {},
      () => false,
    )
    expect(result).not.toBeNull()
    expect(result!.members.map((member) => member.card.name)).toEqual(expect.arrayContaining(['提供元', '受け手']))
    const manual = evaluateManualUnit({
      ...input,
      settings: {
        ...input.settings,
        selectedCards: result!.members.map((member) => member.card.name),
        lockedCards: result!.members.filter((member) => member.isRental).map((member) => member.card.name),
        rentalCardName: result!.members.find((member) => member.isRental)?.card.name ?? null,
      },
    })
    expect(result!.totalScore).toBe(manual!.totalScore)
    expect(result!.totalScore).toBe(2000)
  })
})

function makeTypeDiversityCards(voCount = 8, viCount = 8): SupportCard[] {
  const makeTypeCards = (type: enums.ParameterType, count: number) =>
    Array.from({ length: count }, (_, index) =>
      makeCard(`${type}${index.toString().padStart(2, '0')}`, {
        type,
        parameter_type: type,
        events: [
          {
            release: enums.ReleaseConditionType.Initial,
            effect_type: enums.EventEffectType.ParamBoost,
            param_type: type,
            param_value: 100 - index,
            title: '基礎点',
          },
        ],
        abilities:
          type === enums.ParameterType.Dance
            ? [
                {
                  name_key: enums.AbilityNameKeyType.SpLessonEnd,
                  trigger_key: enums.TriggerKeyType.DaSpLessonEnd,
                  parameter_type: type,
                  values: { '0': '100' },
                },
              ]
            : [],
      }),
    )
  return [
    ...makeTypeCards(enums.ParameterType.Vocal, voCount),
    ...makeTypeCards(enums.ParameterType.Visual, viCount),
    ...makeTypeCards(enums.ParameterType.Dance, 35),
  ]
}

const daEightSchedule = { ...emptySchedule, effectiveCounts: { [enums.ActionIdType.SpLessonDa]: 8 } }

describe('共通評価点とタイプ別最低5枚の候補選定', () => {
  it('単体点・与える点・受ける点を合算し、各項目単独では下位のカードも上位へ選ぶ', () => {
    const deletePair = makeSynergyPair(synergyCases[3])
    const changePair = makeSynergyPair(synergyCases[4])
    const hybrid = {
      ...deletePair.receiver,
      name: '両方向の連携',
      events: [
        ...changePair.provider.events,
        {
          release: enums.ReleaseConditionType.Initial,
          effect_type: enums.EventEffectType.ParamBoost,
          param_type: enums.ParameterType.Vocal,
          param_value: 50,
          title: '基礎点',
        },
      ],
      abilities: deletePair.receiver.abilities.map((ability) => ({ ...ability, values: { '0': '100' } })),
    }
    const competitor = makeCard('単体点1100', {
      events: [
        {
          release: enums.ReleaseConditionType.Initial,
          effect_type: enums.EventEffectType.ParamBoost,
          param_type: enums.ParameterType.Vocal,
          param_value: 1100,
          title: '基礎点',
        },
      ],
    })
    const input = makeSynergyInput([
      hybrid,
      { ...deletePair.provider, name: '削除の提供元' },
      { ...changePair.receiver, name: 'チェンジの受け手' },
      competitor,
    ])
    const candidates = prepareCandidates(input, emptySchedule)
    const ranked = rankSynergyCandidates(candidates)
    expect(ranked[0]).toMatchObject({
      candidate: { card: { name: hybrid.name }, baseScore: 50 },
      providedScore: 1000,
      receivedScore: 100,
      selectionScore: 1150,
    })
    expect(selectSynergyCandidates(candidates, 1).map((candidate) => candidate.card.name)).toEqual([hybrid.name])
  })

  it('HIFのDa8レッスンで上位30枚がDaだけでも、通常・レンタル候補へVo・Vi各5枚を残す', () => {
    const input = makeSynergyInput(makeTypeDiversityCards())
    input.scoreSettings.scenario = enums.ScenarioType.Hif
    input.scoreSettings.difficulty = enums.DifficultyType.None
    const candidates = prepareCandidates(input, daEightSchedule)
    expect(candidates.slice(0, 30).every((candidate) => candidate.card.type === enums.CardType.Dance)).toBe(true)
    for (const pool of [
      selectSynergyCandidates(candidates, 30, { settings: input.settings }),
      createRentalPool(input, daEightSchedule, new Set(), 30),
    ]) {
      expect(pool).toHaveLength(30)
      expect(pool.filter((candidate) => candidate.card.type === enums.CardType.Vocal)).toHaveLength(5)
      expect(pool.filter((candidate) => candidate.card.type === enums.CardType.Visual)).toHaveLength(5)
      expect(pool.filter((candidate) => candidate.card.type === enums.CardType.Dance)).toHaveLength(20)
      expect(new Set(pool.map((candidate) => candidate.card.name)).size).toBe(30)
      expect(pool.map((candidate) => candidate.card.name)).toContain('vocal04')
      expect(pool.map((candidate) => candidate.card.name)).not.toContain('vocal05')
    }
  })

  it('タイプ別最低5枚にも連携込みの順位を使う', () => {
    const { provider, receiver } = makeSynergyPair(synergyCases[3])
    const input = makeSynergyInput([
      ...makeTypeDiversityCards(),
      { ...provider, name: '削除提供', type: enums.CardType.Dance, parameter_type: enums.ParameterType.Dance },
      { ...receiver, name: '低単体点Vo' },
    ])
    const candidates = prepareCandidates(input, daEightSchedule)
    for (const pool of [
      selectSynergyCandidates(candidates, 30),
      createRentalPool(input, daEightSchedule, new Set(), 30),
    ]) {
      expect(pool.filter((candidate) => candidate.card.type === enums.CardType.Vocal)).toHaveLength(5)
      expect(pool.map((candidate) => candidate.card.name)).toContain('低単体点Vo')
      expect(pool.map((candidate) => candidate.card.name)).not.toContain('vocal04')
    }
  })

  it('タイプ不足の余り枠を全体順位へ戻し、強いAssistも候補へ入れる', () => {
    const assist = makeCard('強いAssist', {
      type: enums.CardType.Assist,
      events: [
        {
          release: enums.ReleaseConditionType.Initial,
          effect_type: enums.EventEffectType.ParamBoost,
          param_type: enums.ParameterType.Vocal,
          param_value: 1000,
          title: '基礎点',
        },
      ],
    })
    const input = makeSynergyInput([...makeTypeDiversityCards(2, 2), assist])
    const candidates = prepareCandidates(input, daEightSchedule)
    for (const pool of [
      selectSynergyCandidates(candidates, 30),
      createRentalPool(input, daEightSchedule, new Set(), 30),
    ]) {
      expect(pool).toHaveLength(30)
      expect(pool.filter((candidate) => candidate.card.type === enums.CardType.Vocal)).toHaveLength(2)
      expect(pool.filter((candidate) => candidate.card.type === enums.CardType.Visual)).toHaveLength(2)
      expect(pool.filter((candidate) => candidate.card.type === enums.CardType.Dance)).toHaveLength(25)
      expect(pool.map((candidate) => candidate.card.name)).toContain(assist.name)
    }
  })

  it('除外・許可タイプ・未所持を守り、レンタルは4凸で各タイプを確保する', () => {
    const cards = makeTypeDiversityCards()
    const input = {
      ...makeSynergyInput(cards, { allowedTypes: [enums.CardType.Vocal, enums.CardType.Dance] }),
      excludedCardNames: ['vocal00'],
      cardUncaps: Object.fromEntries(
        cards.map((card) => [card.name, card.name === 'vocal01' ? enums.UncapType.NotOwned : enums.UncapType.Zero]),
      ),
    }
    input.scoreSettings.useFixedUncap = false
    const candidates = prepareCandidates(input, daEightSchedule)
    const normal = selectSynergyCandidates(candidates, 30, { settings: input.settings })
    const rental = createRentalPool(input, daEightSchedule, new Set(), 30)
    for (const pool of [normal, rental]) {
      expect(pool).toHaveLength(30)
      expect(pool.filter((candidate) => candidate.card.type === enums.CardType.Vocal)).toHaveLength(5)
      expect(pool.some((candidate) => candidate.card.type === enums.CardType.Visual)).toBe(false)
      expect(pool.some((candidate) => candidate.card.name === 'vocal00')).toBe(false)
    }
    expect(normal.some((candidate) => candidate.card.name === 'vocal01')).toBe(false)
    expect(rental.some((candidate) => candidate.card.name === 'vocal01')).toBe(true)
    expect(rental.every((candidate) => candidate.uncap === enums.UncapType.Four)).toBe(true)
  })

  it('SP必要候補を30枚の中へ確保し、タイプ別候補を後から上限外へ追加しない', () => {
    const spCards = Array.from({ length: 3 }, (_, index) =>
      makeCard(`低単体点DaSP${index}`, {
        type: enums.CardType.Dance,
        parameter_type: enums.ParameterType.Dance,
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.SpLessonRate,
            trigger_key: enums.TriggerKeyType.DaSpLessonRate,
            values: { '0': '10' },
            is_percentage: true,
            skip_calculation: true,
          },
        ],
      }),
    )
    const input = makeSynergyInput([...makeTypeDiversityCards(), ...spCards], {
      spConstraint: { vocal: 0, dance: 3, visual: 0 },
    })
    const candidates = prepareCandidates(input, daEightSchedule)
    for (const pool of [
      selectSynergyCandidates(candidates, 30, { settings: input.settings }),
      createRentalPool(input, daEightSchedule, new Set(), 30),
    ]) {
      expect(pool).toHaveLength(30)
      expect(pool.filter((candidate) => candidate.spCategory === enums.SpCategoryType.Dance)).toHaveLength(3)
      expect(pool.filter((candidate) => candidate.card.type === enums.CardType.Vocal)).toHaveLength(5)
      expect(pool.filter((candidate) => candidate.card.type === enums.CardType.Visual)).toHaveLength(5)
    }
  })

  it('10枚の既存上限では各タイプ3枚を確保し、同点・入力順・空集合でも決定的に選ぶ', () => {
    const input = makeSynergyInput(makeTypeDiversityCards())
    const candidates = prepareCandidates(input, daEightSchedule)
    const pool = selectSynergyCandidates(candidates, 10)
    expect(pool).toHaveLength(10)
    for (const type of Object.values(enums.ParameterType))
      expect(pool.filter((candidate) => candidate.card.type === type).length).toBeGreaterThanOrEqual(3)
    expect(selectSynergyCandidates([...candidates].reverse(), 10)).toEqual(pool)
    expect(selectSynergyCandidates([], 30)).toEqual([])
  })

  it('単体点の高いカードを連携の弱いカードより優先し、見込み点を単体点へ書き戻さない', () => {
    const { cards } = makeSynergyPair(synergyCases[3], { values: { '0': '20' } })
    const input = makeSynergyInput(cards)
    const candidates = prepareCandidates(input, emptySchedule)
    const before = candidates.map((candidate) => candidate.baseScore)
    const pool = selectSynergyCandidates(candidates, 5)
    expect(pool.every((candidate) => candidate.card.name.startsWith('基礎点上位'))).toBe(true)
    expect(candidates.map((candidate) => candidate.baseScore)).toEqual(before)
  })
})

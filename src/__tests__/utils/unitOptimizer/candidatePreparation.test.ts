/**
 * 最適編成候補準備のテスト
 *
 * コンテスト用除外オプションなど、候補プール作成時のフィルタ条件を検証する。
 */
import { describe, expect, it } from 'vitest'

import type { SupportCard, SkillCardInfo } from '../../../types/card'
import type { UnitSimulatorSettings } from '../../../types/unit'
import * as enums from '../../../types/enums'
import * as constant from '../../../constant'
import { createDefaultSettings } from '../../../utils/scoreSettings'
import { createRentalPool, prepareCandidates } from '../../../utils/unitOptimizer/candidatePreparation'

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
    manualRental: false,
    rentalCardName: null,
    lockedCards: [],
    manualCards: [],
    initialParams: { vocal: 0, dance: 0, visual: 0 },
    excludeContestBlockedCards: true,
    ...overrides,
  }
}

describe('候補準備のコンテスト用除外', () => {
  it('スキルカード持ちとメモリ化Pアイテム持ちを通常候補とレンタル候補から除外する', () => {
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
    const input = {
      settings: makeSettings(),
      scoreSettings: createDefaultSettings(),
      cardUncaps: {},
      cardCountCustom: {},
      allCards,
      cardByName: new Map(allCards.map((card) => [card.name, card])),
    }
    const schedule = { effectiveCounts: {}, perLessonValues: undefined }

    const candidates = prepareCandidates(input, schedule)
    const rentalPool = createRentalPool(input, schedule, new Set(), 10)

    expect(candidates.map((candidate) => candidate.card.name)).toEqual(['通常サポート', 'メモリ化不可Pアイテム持ち'])
    expect(rentalPool.map((candidate) => candidate.card.name)).toEqual(['通常サポート', 'メモリ化不可Pアイテム持ち'])
  })

  it('通常ロックされたサポートはコンテスト用除外対象でも固定候補として残す', () => {
    const skillCard = makeCard('固定スキルカード持ち', { skill_card: testSkillCard })
    const input = {
      settings: makeSettings({ lockedCards: [skillCard.name] }),
      scoreSettings: createDefaultSettings(),
      cardUncaps: {},
      cardCountCustom: {},
      allCards: [skillCard],
      cardByName: new Map([[skillCard.name, skillCard]]),
    }
    const schedule = { effectiveCounts: {}, perLessonValues: undefined }

    const candidates = prepareCandidates(input, schedule)

    expect(candidates.map((candidate) => candidate.card.name)).toEqual([skillCard.name])
  })
})

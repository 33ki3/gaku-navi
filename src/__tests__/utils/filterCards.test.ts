/**
 * サポートフィルタリング・ソートのテスト
 *
 * サポート一覧画面のフィルターバーで選択された条件（レアリティ・タイプ・プラン・
 * テキスト検索・SP有無・イベント種別・アビリティキーワード・凸数）に基づいて
 * サポートを絞り込み、ソート順（レアリティ・日付・スコア・凸数）を適用する
 * filterAndSortCards 関数の動作を検証する。
 *
 * フィルターのカテゴリ内は OR、カテゴリ間は AND で結合される。
 * イベントフィルターは「獲得系」と「操作系」の2カテゴリに分かれ、
 * 同カテゴリ内は OR、カテゴリ間は AND で結合される。
 */
import { describe, expect, it } from 'vitest'
import { filterAndSortCards } from '../../utils/filterCards'
import type { SupportCard } from '../../types/card'
import * as enums from '../../types/enums'

/** 最小限のサポートファクトリ */
function makeCard(overrides: Partial<SupportCard> = {}): SupportCard {
  return {
    name: 'テストサポート',
    rarity: enums.RarityType.SR,
    plan: enums.PlanType.Free,
    type: enums.CardType.Vocal,
    parameter_type: enums.ParameterType.Vocal,
    source: enums.SourceType.Gacha,
    release_date: '2024/01/01',
    abilities: [],
    events: [],
    p_item: null,
    skill_card: null,
    ...overrides,
  }
}

/** デフォルトのフィルタパラメータ（フィルターなし） */
function defaultParams() {
  return {
    searchTerm: '',
    selectedRarities: new Set<enums.RarityType>(),
    selectedTypes: new Set<enums.CardType>(),
    selectedPlans: new Set<enums.PlanType>(),
    spOnly: false,
    selectedAbilityKeywords: new Set<enums.AbilityKeywordType>(),
    selectedEventFilters: new Set<enums.EventFilterType>(),
    selectedUncaps: new Set<enums.UncapType>(),
    cardUncaps: {} as Record<string, enums.UncapType>,
    sortCardUncaps: {} as Record<string, enums.UncapType>,
    sortMode: enums.SortModeType.Rarity,
    sortReverse: false,
    cardScores: new Map<string, number>(),
  }
}

const cards: SupportCard[] = [
  makeCard({
    name: 'Aサポート',
    rarity: enums.RarityType.SSR,
    type: enums.CardType.Vocal,
    plan: enums.PlanType.Sense,
    release_date: '2024/06/01',
  }),
  makeCard({
    name: 'Bサポート',
    rarity: enums.RarityType.SR,
    type: enums.CardType.Dance,
    plan: enums.PlanType.Logic,
    release_date: '2024/07/01',
  }),
  makeCard({
    name: 'Cサポート',
    rarity: enums.RarityType.R,
    type: enums.CardType.Visual,
    plan: enums.PlanType.Free,
    release_date: '2024/05/01',
  }),
  makeCard({
    name: 'Dサポート',
    rarity: enums.RarityType.SSR,
    type: enums.CardType.Assist,
    plan: enums.PlanType.Anomaly,
    release_date: '2024/08/01',
  }),
]

// --- フィルタリング ---

/** サポート一覧のフィルタリング機能テスト */
describe('filterAndSortCards - フィルタリング', () => {
  it('フィルターなしで全サポート返る', () => {
    const result = filterAndSortCards(cards, defaultParams())
    expect(result).toHaveLength(4)
  })

  it('レアリティフィルター: SSR のみ', () => {
    const params = { ...defaultParams(), selectedRarities: new Set([enums.RarityType.SSR]) }
    const result = filterAndSortCards(cards, params)
    expect(result).toHaveLength(2)
    expect(result.every((c) => c.rarity === enums.RarityType.SSR)).toBe(true)
  })

  it('タイプフィルター: vocal のみ', () => {
    const params = { ...defaultParams(), selectedTypes: new Set([enums.CardType.Vocal]) }
    const result = filterAndSortCards(cards, params)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Aサポート')
  })

  it('プランフィルター: sense + logic', () => {
    const params = { ...defaultParams(), selectedPlans: new Set([enums.PlanType.Sense, enums.PlanType.Logic]) }
    const result = filterAndSortCards(cards, params)
    expect(result).toHaveLength(2)
  })

  it('テキスト検索: サポート名に部分一致', () => {
    const params = { ...defaultParams(), searchTerm: 'Aサ' }
    const result = filterAndSortCards(cards, params)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Aサポート')
  })

  it('テキスト検索: 大文字小文字を区別しない', () => {
    const params = { ...defaultParams(), searchTerm: 'aサ' }
    const result = filterAndSortCards(cards, params)
    expect(result).toHaveLength(1)
  })

  it('テキスト検索: Pアイテム名で一致', () => {
    const cardsWithPItem = [
      makeCard({
        name: 'テスト',
        p_item: { name: '特別なアイテム', rarity: enums.PItemRarityType.SR, memory: enums.PItemMemoryType.Memorizable },
      }),
    ]
    const params = { ...defaultParams(), searchTerm: '特別な' }
    const result = filterAndSortCards(cardsWithPItem, params)
    expect(result).toHaveLength(1)
  })

  it('テキスト検索: イベント名で一致', () => {
    const cardsWithEvent = [
      makeCard({
        name: 'テスト',
        events: [
          {
            release: enums.ReleaseConditionType.Initial,
            effect_type: enums.EventEffectType.ParamBoost,
            title: 'きらめきの瞬間',
            param_value: 10,
          },
        ],
      }),
    ]
    const params = { ...defaultParams(), searchTerm: 'きらめき' }
    const result = filterAndSortCards(cardsWithEvent, params)
    expect(result).toHaveLength(1)
  })

  it('テキスト検索: スキルカード名で一致', () => {
    const cardsWithSkill = [
      makeCard({
        name: 'テスト',
        skill_card: {
          name: 'アドレナリン全開',
          rarity: enums.RarityType.SSR,
          type: enums.SkillCardType.Active,
          effects: [],
          lesson_limit: 0,
          no_duplicate: false,
          custom_cap: 0,
          custom_slot: [],
        },
      }),
    ]
    const params = { ...defaultParams(), searchTerm: 'アドレナリン' }
    const result = filterAndSortCards(cardsWithSkill, params)
    expect(result).toHaveLength(1)
  })

  it('テキスト検索: 一致なしで空の結果', () => {
    const params = { ...defaultParams(), searchTerm: '存在しないサポート名' }
    const result = filterAndSortCards(cards, params)
    expect(result).toHaveLength(0)
  })

  it('SPフィルター: SP レッスン率アビリティ持ちのみ', () => {
    const cardsWithSP = [
      makeCard({
        name: 'SPあり',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.SpLessonRate,
            trigger_key: enums.TriggerKeyType.SpLessonRate,
            values: { '0': '14%' },
            is_percentage: true,
            skip_calculation: true,
          },
        ],
      }),
      makeCard({ name: 'SPなし' }),
    ]
    const params = { ...defaultParams(), spOnly: true }
    const result = filterAndSortCards(cardsWithSP, params)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('SPあり')
  })

  it('SPフィルター: 属性別SP発生率trigger_keyにもマッチする', () => {
    const cardsWithSP = [
      makeCard({
        name: 'Vo SP',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.SpLessonRate,
            trigger_key: enums.TriggerKeyType.VoSpLessonRate,
            values: { '0': '21%' },
            is_percentage: true,
            skip_calculation: true,
          },
        ],
      }),
      makeCard({
        name: 'Da SP',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.SpLessonRate,
            trigger_key: enums.TriggerKeyType.DaSpLessonRate,
            values: { '0': '21%' },
            is_percentage: true,
            skip_calculation: true,
          },
        ],
      }),
      makeCard({
        name: 'Vi SP',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.SpLessonRate,
            trigger_key: enums.TriggerKeyType.ViSpLessonRate,
            values: { '0': '21%' },
            is_percentage: true,
            skip_calculation: true,
          },
        ],
      }),
      makeCard({
        name: 'SP全体',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.SpLessonRateAll,
            trigger_key: enums.TriggerKeyType.SpLessonRateAll,
            values: { '0': '10.5%' },
            is_percentage: true,
            skip_calculation: true,
          },
        ],
      }),
      makeCard({ name: 'SPなし' }),
    ]
    const params = { ...defaultParams(), spOnly: true }
    const result = filterAndSortCards(cardsWithSP, params)
    expect(result).toHaveLength(4)
    expect(result.map((c) => c.name)).toEqual(['Vo SP', 'Da SP', 'Vi SP', 'SP全体'])
  })

  it('凸数フィルター: 凸0のサポートのみ', () => {
    const uncaps: Record<string, enums.UncapType> = {
      Aサポート: enums.UncapType.Four,
      Bサポート: enums.UncapType.Zero,
    }
    const params = { ...defaultParams(), selectedUncaps: new Set([enums.UncapType.Zero]), cardUncaps: uncaps }
    const result = filterAndSortCards(cards, params)
    // Bサポート = 凸0 のみ通る。Cサポート & Dサポート はデフォルト凸(=4)
    expect(result.map((c) => c.name)).toContain('Bサポート')
    expect(result.map((c) => c.name)).not.toContain('Aサポート')
    expect(result.map((c) => c.name)).not.toContain('Cサポート')
    expect(result.map((c) => c.name)).not.toContain('Dサポート')
    expect(result).toHaveLength(1)
  })

  it('複合フィルター: SSR + vocal', () => {
    const params = {
      ...defaultParams(),
      selectedRarities: new Set([enums.RarityType.SSR]),
      selectedTypes: new Set([enums.CardType.Vocal]),
    }
    const result = filterAndSortCards(cards, params)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Aサポート')
  })

  it('空の結果: 存在しない条件の組み合わせ', () => {
    const params = {
      ...defaultParams(),
      selectedRarities: new Set([enums.RarityType.R]),
      selectedTypes: new Set([enums.CardType.Vocal]),
    }
    const result = filterAndSortCards(cards, params)
    expect(result).toHaveLength(0)
  })
})

// --- ソート ---

/** サポート一覧のソート機能テスト */
describe('filterAndSortCards - ソート', () => {
  it('レアリティ順: SSR → SR → R', () => {
    const params = { ...defaultParams(), sortMode: enums.SortModeType.Rarity }
    const result = filterAndSortCards(cards, params)
    expect(result[0].rarity).toBe(enums.RarityType.SSR)
    expect(result[result.length - 1].rarity).toBe(enums.RarityType.R)
  })

  it('レアリティ順: 同レアリティは日付降順', () => {
    const params = { ...defaultParams(), sortMode: enums.SortModeType.Rarity }
    const result = filterAndSortCards(cards, params)
    const ssrCards = result.filter((c) => c.rarity === enums.RarityType.SSR)
    expect(ssrCards[0].release_date >= ssrCards[1].release_date).toBe(true)
  })

  it('日付順: 新しい順', () => {
    const params = { ...defaultParams(), sortMode: enums.SortModeType.Date }
    const result = filterAndSortCards(cards, params)
    expect(result[0].name).toBe('Dサポート') // 2024/08/01
    expect(result[result.length - 1].name).toBe('Cサポート') // 2024/05/01
  })

  it('スコア順: 高い順', () => {
    const scores = new Map([
      ['Aサポート', 100],
      ['Bサポート', 300],
      ['Cサポート', 50],
      ['Dサポート', 200],
    ])
    const params = { ...defaultParams(), sortMode: enums.SortModeType.Score, cardScores: scores }
    const result = filterAndSortCards(cards, params)
    expect(result[0].name).toBe('Bサポート') // 300
    expect(result[1].name).toBe('Dサポート') // 200
  })

  it('凸数順: 凸数降順 → レアリティ降順', () => {
    const uncaps: Record<string, enums.UncapType> = {
      Aサポート: enums.UncapType.Four,
      Bサポート: enums.UncapType.Zero,
      Cサポート: enums.UncapType.Zero,
      Dサポート: enums.UncapType.Two,
    }
    const params = {
      ...defaultParams(),
      sortMode: enums.SortModeType.Uncap,
      cardUncaps: uncaps,
      sortCardUncaps: uncaps,
    }
    const result = filterAndSortCards(cards, params)
    // 凸4: Aサポート
    // 凸2: Dサポート
    // 凸0: Bサポート(SR), Cサポート(R) → レアリティ降順
    expect(result[0].name).toBe('Aサポート') // 凸4
    expect(result[result.length - 1].name).toBe('Cサポート') // 凸0, R
  })

  it('逆順フラグ', () => {
    const params = { ...defaultParams(), sortMode: enums.SortModeType.Rarity, sortReverse: true }
    const result = filterAndSortCards(cards, params)
    // 通常: SSR → R、逆順: R → SSR
    expect(result[0].rarity).toBe(enums.RarityType.R)
    expect(result[result.length - 1].rarity).toBe(enums.RarityType.SSR)
  })
})

// --- イベントフィルター ---

/** イベント種別によるフィルタリングテスト */
describe('filterAndSortCards - イベントフィルター', () => {
  const eventCards = [
    makeCard({
      name: 'スキルカードあり',
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SkillCard, title: 'テスト' },
      ],
    }),
    makeCard({
      name: '強化あり',
      events: [
        {
          release: enums.ReleaseConditionType.Initial,
          effect_type: enums.EventEffectType.CardEnhance,
          title: 'テスト',
        },
      ],
    }),
    makeCard({
      name: '選択強化あり',
      events: [
        {
          release: enums.ReleaseConditionType.Initial,
          effect_type: enums.EventEffectType.SelectEnhance,
          title: 'テスト',
        },
      ],
    }),
    makeCard({
      name: 'Pアイテムあり',
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.PItem, title: 'テスト' },
      ],
    }),
    makeCard({
      name: 'チェンジあり',
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.CardChange, title: 'テスト' },
      ],
    }),
    makeCard({
      name: '削除あり',
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.CardDelete, title: 'テスト' },
      ],
    }),
    makeCard({
      name: '選択削除あり',
      events: [
        {
          release: enums.ReleaseConditionType.Initial,
          effect_type: enums.EventEffectType.SelectDelete,
          title: 'テスト',
        },
      ],
    }),
    makeCard({
      name: 'トラブル削除あり',
      events: [
        {
          release: enums.ReleaseConditionType.Initial,
          effect_type: enums.EventEffectType.TroubleDelete,
          title: 'テスト',
        },
      ],
    }),
    makeCard({ name: 'イベントなし' }),
  ]

  it('スキルカードイベントフィルター', () => {
    const params = { ...defaultParams(), selectedEventFilters: new Set([enums.EventFilterType.SkillCard]) }
    const result = filterAndSortCards(eventCards, params)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('スキルカードあり')
  })

  it('Pアイテムイベントフィルター', () => {
    const params = { ...defaultParams(), selectedEventFilters: new Set([enums.EventFilterType.PItem]) }
    const result = filterAndSortCards(eventCards, params)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Pアイテムあり')
  })

  it('強化フィルター: CardEnhance と SelectEnhance の両方にマッチ', () => {
    const params = { ...defaultParams(), selectedEventFilters: new Set([enums.EventFilterType.Enhance]) }
    const result = filterAndSortCards(eventCards, params)
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.name).sort()).toEqual(['強化あり', '選択強化あり'].sort())
  })

  it('チェンジフィルター', () => {
    const params = { ...defaultParams(), selectedEventFilters: new Set([enums.EventFilterType.Change]) }
    const result = filterAndSortCards(eventCards, params)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('チェンジあり')
  })

  it('削除フィルター: CardDelete と SelectDelete の両方にマッチ', () => {
    const params = { ...defaultParams(), selectedEventFilters: new Set([enums.EventFilterType.Delete]) }
    const result = filterAndSortCards(eventCards, params)
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.name).sort()).toEqual(['削除あり', '選択削除あり'].sort())
  })

  it('トラブル削除フィルター', () => {
    const params = { ...defaultParams(), selectedEventFilters: new Set([enums.EventFilterType.TroubleDelete]) }
    const result = filterAndSortCards(eventCards, params)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('トラブル削除あり')
  })

  it('獲得系カテゴリ内OR: SkillCard + PItem で両方通る', () => {
    const params = {
      ...defaultParams(),
      selectedEventFilters: new Set([enums.EventFilterType.SkillCard, enums.EventFilterType.PItem]),
    }
    const result = filterAndSortCards(eventCards, params)
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.name).sort()).toEqual(['Pアイテムあり', 'スキルカードあり'].sort())
  })

  it('操作系カテゴリ内OR: Enhance + Delete で該当サポートが通る', () => {
    const params = {
      ...defaultParams(),
      selectedEventFilters: new Set([enums.EventFilterType.Enhance, enums.EventFilterType.Delete]),
    }
    const result = filterAndSortCards(eventCards, params)
    expect(result).toHaveLength(4)
    expect(result.map((c) => c.name).sort()).toEqual(['強化あり', '削除あり', '選択削除あり', '選択強化あり'].sort())
  })

  it('カテゴリ間AND: 獲得系SkillCard + 操作系Enhance → 両方持つサポートのみ', () => {
    const cardWithBoth = makeCard({
      name: '両方あり',
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SkillCard, title: 'テスト' },
        {
          release: enums.ReleaseConditionType.Initial,
          effect_type: enums.EventEffectType.CardEnhance,
          title: 'テスト',
        },
      ],
    })
    const testCards = [...eventCards, cardWithBoth]
    const params = {
      ...defaultParams(),
      selectedEventFilters: new Set([enums.EventFilterType.SkillCard, enums.EventFilterType.Enhance]),
    }
    const result = filterAndSortCards(testCards, params)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('両方あり')
  })
})

// --- アビリティキーワードフィルター ---

describe('filterAndSortCards - アビリティキーワードフィルター', () => {
  /** trigger_keyベースでマッチするキーワードのテスト */
  const triggerKeywordCases: [string, enums.AbilityKeywordType, enums.TriggerKeyType][] = [
    ['初期パラメータ', enums.AbilityKeywordType.InitialParameter, enums.TriggerKeyType.InitialStat],
    ['パラメータボーナス', enums.AbilityKeywordType.ParameterBonus, enums.TriggerKeyType.ParameterBonus],
    ['お出かけ', enums.AbilityKeywordType.Outing, enums.TriggerKeyType.Outing],
    ['休む', enums.AbilityKeywordType.Rest, enums.TriggerKeyType.Rest],
    ['相談', enums.AbilityKeywordType.Consult, enums.TriggerKeyType.Consult],
    ['差し入れ', enums.AbilityKeywordType.ActivitySupplyGift, enums.TriggerKeyType.ActivitySupplyGift],
    ['追い込み', enums.AbilityKeywordType.SpecialTraining, enums.TriggerKeyType.SpecialTraining],
    ['カスタマイズ', enums.AbilityKeywordType.Customize, enums.TriggerKeyType.Customize],
    ['Pアイテム', enums.AbilityKeywordType.PItem, enums.TriggerKeyType.PItemAcquire],
  ]

  it.each(triggerKeywordCases)('%s フィルター (trigger_key: %s)', (_label, keyword, triggerKey) => {
    const testCards = [
      makeCard({
        name: 'マッチ',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: triggerKey,
            values: { '0': '10' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({ name: '非マッチ' }),
    ]
    const params = { ...defaultParams(), selectedAbilityKeywords: new Set([keyword]) }
    const result = filterAndSortCards(testCards, params)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('マッチ')
  })

  it('試験フィルター: ExamEnd と ExamHp の両方にマッチ', () => {
    const testCards = [
      makeCard({
        name: 'ExamEnd',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.ExamEnd,
            values: { '0': '10' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({
        name: 'ExamHp',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.ExamHp,
            values: { '0': '10' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({ name: '非マッチ' }),
    ]
    const params = { ...defaultParams(), selectedAbilityKeywords: new Set([enums.AbilityKeywordType.Exam]) }
    const result = filterAndSortCards(testCards, params)
    expect(result).toHaveLength(2)
  })

  it('SPレッスンフィルター: 複数のSPトリガーにマッチ', () => {
    const testCards = [
      makeCard({
        name: 'SpLesson20',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.SpLesson20,
            values: { '0': '10' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({
        name: 'SpLessonEnd',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.SpLessonEnd,
            values: { '0': '10' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({ name: '非マッチ' }),
    ]
    const params = { ...defaultParams(), selectedAbilityKeywords: new Set([enums.AbilityKeywordType.SpLesson]) }
    const result = filterAndSortCards(testCards, params)
    expect(result).toHaveLength(2)
  })

  it('カード獲得フィルター: SkillAcquire, MSkillAcquire, SsrCardAcquire 等にマッチ', () => {
    const testCards = [
      makeCard({
        name: 'SkillAcquire',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.SkillAcquire,
            values: { '0': '5' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({
        name: 'MSkillAcquire',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.MSkillAcquire,
            values: { '0': '5' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({
        name: 'AggressiveCardAcquire',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.AggressiveCardAcquire,
            values: { '0': '5' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({ name: '非マッチ' }),
    ]
    const params = { ...defaultParams(), selectedAbilityKeywords: new Set([enums.AbilityKeywordType.CardAcquire]) }
    const result = filterAndSortCards(testCards, params)
    expect(result).toHaveLength(3)
  })

  it('カード強化フィルター: SkillEnhance, ASkillEnhance, MSkillEnhance にマッチ', () => {
    const testCards = [
      makeCard({
        name: 'SkillEnhance',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.SkillEnhance,
            values: { '0': '5' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({
        name: 'ASkillEnhance',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.ASkillEnhance,
            values: { '0': '5' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({
        name: 'MSkillEnhance',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.MSkillEnhance,
            values: { '0': '5' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({ name: '非マッチ' }),
    ]
    const params = { ...defaultParams(), selectedAbilityKeywords: new Set([enums.AbilityKeywordType.CardEnhance]) }
    const result = filterAndSortCards(testCards, params)
    expect(result).toHaveLength(3)
  })

  it('カード除外フィルター: Delete, ASkillDelete, MSkillDelete にマッチ', () => {
    const testCards = [
      makeCard({
        name: 'Delete',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.Delete,
            values: { '0': '5' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({
        name: 'ASkillDelete',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.ASkillDelete,
            values: { '0': '5' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({ name: '非マッチ' }),
    ]
    const params = { ...defaultParams(), selectedAbilityKeywords: new Set([enums.AbilityKeywordType.CardDelete]) }
    const result = filterAndSortCards(testCards, params)
    expect(result).toHaveLength(2)
  })

  it('カードチェンジフィルター', () => {
    const testCards = [
      makeCard({
        name: 'Change',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.Change,
            values: { '0': '5' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({ name: '非マッチ' }),
    ]
    const params = { ...defaultParams(), selectedAbilityKeywords: new Set([enums.AbilityKeywordType.CardChange]) }
    const result = filterAndSortCards(testCards, params)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Change')
  })

  it('Pドリンクフィルター: PDrinkAcquire と PDrinkExchange にマッチ', () => {
    const testCards = [
      makeCard({
        name: 'PDrinkAcquire',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.PDrinkAcquire,
            values: { '0': '5' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({
        name: 'PDrinkExchange',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.PDrinkExchange,
            values: { '0': '5' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({ name: '非マッチ' }),
    ]
    const params = { ...defaultParams(), selectedAbilityKeywords: new Set([enums.AbilityKeywordType.PDrink]) }
    const result = filterAndSortCards(testCards, params)
    expect(result).toHaveLength(2)
  })

  it('レッスンフィルター (name_keyベース): LessonEnd にマッチ', () => {
    const testCards = [
      makeCard({
        name: 'レッスン終了',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.LessonEnd,
            values: { '0': '10' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({
        name: '授業終了',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.ClassWorkEnd,
            trigger_key: enums.TriggerKeyType.ClassWorkEnd,
            values: { '0': '10' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({ name: '非マッチ' }),
    ]
    const params = { ...defaultParams(), selectedAbilityKeywords: new Set([enums.AbilityKeywordType.Lesson]) }
    const result = filterAndSortCards(testCards, params)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('レッスン終了')
  })

  it('授業フィルター (name_keyベース): ClassWorkEnd にマッチ', () => {
    const testCards = [
      makeCard({
        name: '授業終了',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.ClassWorkEnd,
            trigger_key: enums.TriggerKeyType.ClassWorkEnd,
            values: { '0': '10' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({
        name: 'レッスン終了',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.LessonEnd,
            values: { '0': '10' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({ name: '非マッチ' }),
    ]
    const params = { ...defaultParams(), selectedAbilityKeywords: new Set([enums.AbilityKeywordType.ClassWork]) }
    const result = filterAndSortCards(testCards, params)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('授業終了')
  })

  it('カテゴリ内OR: 同カテゴリの複数キーワード → いずれかにマッチすればOK', () => {
    const testCards = [
      makeCard({
        name: 'お出かけ',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.Outing,
            values: { '0': '10' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({
        name: '休む',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.Rest,
            values: { '0': '10' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({ name: '非マッチ' }),
    ]
    const params = {
      ...defaultParams(),
      selectedAbilityKeywords: new Set([enums.AbilityKeywordType.Outing, enums.AbilityKeywordType.Rest]),
    }
    const result = filterAndSortCards(testCards, params)
    expect(result).toHaveLength(2)
  })

  it('カテゴリ間AND: パラメータ系 + 効果系 → 両方マッチ必要', () => {
    const testCards = [
      makeCard({
        name: '両方あり',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.InitialStat,
            values: { '0': '50' },
            is_percentage: false,
            skip_calculation: false,
          },
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.Outing,
            values: { '0': '10' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({
        name: '初期パラのみ',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.InitialStat,
            values: { '0': '50' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
      makeCard({
        name: 'お出かけのみ',
        abilities: [
          {
            name_key: enums.AbilityNameKeyType.LessonEnd,
            trigger_key: enums.TriggerKeyType.Outing,
            values: { '0': '10' },
            is_percentage: false,
            skip_calculation: false,
          },
        ],
      }),
    ]
    const params = {
      ...defaultParams(),
      selectedAbilityKeywords: new Set([enums.AbilityKeywordType.InitialParameter, enums.AbilityKeywordType.Outing]),
    }
    const result = filterAndSortCards(testCards, params)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('両方あり')
  })

  it('凸数フィルター: 複数凸数選択で該当サポートが通る', () => {
    const uncaps: Record<string, enums.UncapType> = {
      Aサポート: enums.UncapType.Four,
      Bサポート: enums.UncapType.Zero,
      Cサポート: enums.UncapType.Two,
    }
    const testCards = [
      makeCard({ name: 'Aサポート' }),
      makeCard({ name: 'Bサポート' }),
      makeCard({ name: 'Cサポート' }),
    ]
    const params = {
      ...defaultParams(),
      selectedUncaps: new Set([enums.UncapType.Zero, enums.UncapType.Two]),
      cardUncaps: uncaps,
    }
    const result = filterAndSortCards(testCards, params)
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.name).sort()).toEqual(['Bサポート', 'Cサポート'].sort())
  })
})

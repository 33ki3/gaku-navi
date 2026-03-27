import { describe, expect, it } from 'vitest'
import { calculateCardParameter } from '../../../utils/calculator/calculateCard'
import type { SupportCard } from '../../../types/card'
import type { ActionIdType } from '../../../types/enums'
import * as enums from '../../../types/enums'

/** 最小限のカードを作るファクトリ */
function makeCard(overrides: Partial<SupportCard> = {}): SupportCard {
  return {
    name: 'テストカード',
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

/** calculateCardParameter のユニットテスト */
describe('calculateCardParameter', () => {
  const emptyActions: Partial<Record<ActionIdType, number>> = {}
  const emptyExtra: Partial<Record<ActionIdType, number>> = {}
  const zeroBonusBase = { vocal: 0, dance: 0, visual: 0 }

  it('アビリティもイベントもない場合は合計 0', () => {
    const card = makeCard()
    const result = calculateCardParameter(card, enums.UncapType.Zero, emptyActions, emptyExtra, zeroBonusBase)
    expect(result.totalIncrease).toBe(0)
    expect(result.eventBoost).toBe(0)
    expect(result.parameterBonus).toBe(0)
    expect(result.abilityBoosts).toHaveLength(0)
  })

  it('イベントパラメータ上昇のみ（ブーストなし）', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Lv20, effect_type: enums.EventEffectType.ParamBoost, param_value: 20, title: 'テスト' },
      ],
    })
    const result = calculateCardParameter(card, enums.UncapType.Zero, emptyActions, emptyExtra, zeroBonusBase)
    // ブースト倍率 = 1.0 → 20 * 1.0 = 20
    expect(result.eventBoost).toBe(20)
    expect(result.eventBoostBase).toBe(20)
    expect(result.eventBoostPercent).toBe(0)
    expect(result.totalIncrease).toBe(20)
  })

  it('イベントパラメータ上昇 + イベントブースト 50%', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.EventBoost,
          trigger_key: enums.TriggerKeyType.Nothing,
          values: { '0': '50%' },
          is_percentage: true,
          is_event_boost: true,
        },
      ],
      events: [
        { release: enums.ReleaseConditionType.Lv20, effect_type: enums.EventEffectType.ParamBoost, param_value: 20, title: 'テスト' },
      ],
    })
    const result = calculateCardParameter(card, enums.UncapType.Zero, emptyActions, emptyExtra, zeroBonusBase)
    // 20 * 1.5 = 30
    expect(result.eventBoost).toBe(30)
    expect(result.totalIncrease).toBe(30)
  })

  it('レッスントリガーアビリティ × アクション回数', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.LessonEnd,
          trigger_key: enums.TriggerKeyType.VoLessonEnd,
          parameter_type: enums.ParameterType.Vocal,
          values: { '0': '3' },
        },
      ],
    })
    const actions = { [enums.ActionIdType.LessonVo]: 5 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, actions, emptyExtra, zeroBonusBase)
    // 3 * 5 = 15
    expect(result.abilityBoosts).toHaveLength(1)
    expect(result.abilityBoosts[0].total).toBe(15)
    expect(result.abilityBoosts[0].count).toBe(5)
    expect(result.abilityBoosts[0].valuePerTrigger).toBe(3)
    expect(result.totalIncrease).toBe(15)
  })

  it('凸数で値が変わる', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.LessonEnd,
          trigger_key: enums.TriggerKeyType.LessonEnd,
          values: { '0': '1', '4': '3' },
        },
      ],
    })
    const actions = { [enums.ActionIdType.Lesson]: 10 }
    const r0 = calculateCardParameter(card, enums.UncapType.Zero, actions, emptyExtra, zeroBonusBase)
    const r4 = calculateCardParameter(card, enums.UncapType.Four, actions, emptyExtra, zeroBonusBase)
    expect(r0.totalIncrease).toBe(10) // 1 * 10
    expect(r4.totalIncrease).toBe(30) // 3 * 10
  })

  it('max_count で回数が制限される', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.LessonEnd,
          trigger_key: enums.TriggerKeyType.LessonEnd,
          values: { '0': '5' },
          max_count: 3,
        },
      ],
    })
    const actions = { [enums.ActionIdType.Lesson]: 10 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, actions, emptyExtra, zeroBonusBase)
    // 5 * 3 = 15（max_count 3 で制限）
    expect(result.abilityBoosts[0].count).toBe(3)
    expect(result.totalIncrease).toBe(15)
  })

  it('初期値上昇は固定 1回分（トリガー不要）', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.InitialStat,
          trigger_key: enums.TriggerKeyType.Nothing,
          parameter_type: enums.ParameterType.Vocal,
          values: { '0': '52' },
          is_initial_stat: true,
        },
      ],
    })
    const result = calculateCardParameter(card, enums.UncapType.Zero, emptyActions, emptyExtra, zeroBonusBase)
    expect(result.abilityBoosts).toHaveLength(1)
    expect(result.abilityBoosts[0].total).toBe(52)
    expect(result.abilityBoosts[0].count).toBe(1)
    expect(result.totalIncrease).toBe(52)
  })

  it('skip_calculation のアビリティは計算に含まない', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SupportRate,
          trigger_key: enums.TriggerKeyType.Nothing,
          values: { '0': '100%' },
          is_percentage: true,
          skip_calculation: true,
        },
        {
          name_key: enums.AbilityNameKeyType.LessonEnd,
          trigger_key: enums.TriggerKeyType.LessonEnd,
          values: { '0': '5' },
        },
      ],
    })
    const actions = { [enums.ActionIdType.Lesson]: 2 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, actions, emptyExtra, zeroBonusBase)
    expect(result.totalIncrease).toBe(10) // 5 * 2 only
  })

  it('パラメータボーナス%: bonusBase × percent / 100（小数切り捨て）', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.ParameterBonus,
          trigger_key: enums.TriggerKeyType.Nothing,
          parameter_type: enums.ParameterType.Vocal,
          values: { '0': '4.3%' },
          is_percentage: true,
          is_parameter_bonus: true,
        },
      ],
    })
    // vocal bonusBase = 1000, 4.3% → 1000 * 4.3 / 100 = 43
    const bonusBase = { vocal: 1000, dance: 500, visual: 500 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, emptyActions, emptyExtra, bonusBase)
    expect(result.parameterBonus).toBe(43)
    expect(result.paramBonusPercent).toBeCloseTo(4.3)
    expect(result.paramBonusBase).toBe(1000) // vocal カードなので vocal の値
    expect(result.totalIncrease).toBe(43)
  })

  it('パラメータボーナス%: 小数は切り捨て', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.ParameterBonus,
          trigger_key: enums.TriggerKeyType.Nothing,
          values: { '0': '2.8%' },
          is_percentage: true,
          is_parameter_bonus: true,
        },
      ],
    })
    // vocal bonusBase = 100, 2.8% → 100 * 2.8 / 100 = 2.8 → floor(2.8) = 2
    const result = calculateCardParameter(card, enums.UncapType.Zero, emptyActions, emptyExtra, { vocal: 100, dance: 0, visual: 0 })
    expect(result.parameterBonus).toBe(2)
  })

  it('パラメータボーナス: number 指定時はそのまま bonusBase として使う', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.ParameterBonus,
          trigger_key: enums.TriggerKeyType.Nothing,
          values: { '0': '10%' },
          is_percentage: true,
          is_parameter_bonus: true,
        },
      ],
    })
    const result = calculateCardParameter(card, enums.UncapType.Zero, emptyActions, emptyExtra, 200)
    // 200 * 10 / 100 = 20
    expect(result.parameterBonus).toBe(20)
  })

  it('extraEventCounts が加算される', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SkillAcquire,
          trigger_key: enums.TriggerKeyType.SkillAcquire,
          values: { '0': '10' },
        },
      ],
    })
    const actions = { [enums.TriggerKeyType.SkillAcquire]: 2 }
    const extra = { [enums.TriggerKeyType.SkillAcquire]: 3 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, actions, extra, zeroBonusBase)
    // 10 * (2 + 3) = 50
    expect(result.abilityBoosts[0].count).toBe(5)
    expect(result.totalIncrease).toBe(50)
  })

  it('selfTrigger ボーナスが加算される（スキルカード提供カード）', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SkillCard, title: 'テスト' },
      ],
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SkillAcquire,
          trigger_key: enums.TriggerKeyType.SkillAcquire,
          values: { '0': '10' },
        },
      ],
    })
    const actions = { [enums.TriggerKeyType.SkillAcquire]: 2 }
    // selfTrigger → SkillAcquire +1 → total = 2 + 0 + 1 = 3
    const result = calculateCardParameter(card, enums.UncapType.Zero, actions, emptyExtra, zeroBonusBase, true)
    expect(result.abilityBoosts[0].count).toBe(3)
    expect(result.totalIncrease).toBe(30) // 10 * 3
  })

  it('includeSelfTrigger = false なら自己ボーナスなし', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SkillCard, title: 'テスト' },
      ],
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SkillAcquire,
          trigger_key: enums.TriggerKeyType.SkillAcquire,
          values: { '0': '10' },
        },
      ],
    })
    const actions = { [enums.TriggerKeyType.SkillAcquire]: 2 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, actions, emptyExtra, zeroBonusBase, false)
    expect(result.abilityBoosts[0].count).toBe(2)
    expect(result.totalIncrease).toBe(20)
  })

  it('Pアイテム効果が加算される', () => {
    const card = makeCard({
      p_item: {
        name: 'テストアイテム',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.Memorizable,
        boost: {
          trigger_key: enums.TriggerKeyType.VoLessonEnd,
          parameter_type: enums.ParameterType.Vocal,
          value: 6,
        },
      },
    })
    const actions = { [enums.ActionIdType.LessonVo]: 4 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, actions, emptyExtra, zeroBonusBase)
    // 6 * 4 = 24
    expect(result.totalIncrease).toBe(24)
  })

  it('includePItem = false ならPアイテム効果なし', () => {
    const card = makeCard({
      p_item: {
        name: 'テストアイテム',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.Memorizable,
        boost: {
          trigger_key: enums.TriggerKeyType.LessonEnd,
          parameter_type: enums.ParameterType.Vocal,
          value: 6,
        },
      },
    })
    const actions = { [enums.ActionIdType.Lesson]: 4 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, actions, emptyExtra, zeroBonusBase, true, false)
    expect(result.totalIncrease).toBe(0)
  })

  it('複合: イベント + アビリティ + パラメータボーナスの合計', () => {
    const card = makeCard({
      abilities: [
        // イベントブースト 50%
        {
          name_key: enums.AbilityNameKeyType.EventBoost,
          trigger_key: enums.TriggerKeyType.Nothing,
          values: { '0': '50%' },
          is_percentage: true,
          is_event_boost: true,
        },
        // パラメータボーナス 10%
        {
          name_key: enums.AbilityNameKeyType.ParameterBonus,
          trigger_key: enums.TriggerKeyType.Nothing,
          values: { '0': '10%' },
          is_percentage: true,
          is_parameter_bonus: true,
        },
        // レッスンアビリティ
        {
          name_key: enums.AbilityNameKeyType.LessonEnd,
          trigger_key: enums.TriggerKeyType.LessonEnd,
          values: { '0': '5' },
        },
      ],
      events: [
        { release: enums.ReleaseConditionType.Lv20, effect_type: enums.EventEffectType.ParamBoost, param_value: 20, title: 'テスト' },
      ],
    })
    const actions = { [enums.ActionIdType.Lesson]: 3 }
    const bonusBase = { vocal: 200, dance: 0, visual: 0 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, actions, emptyExtra, bonusBase)

    // イベント: 20 * 1.5 = 30
    expect(result.eventBoost).toBe(30)
    // アビリティ: 5 * 3 = 15
    expect(result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.LessonEnd)?.total).toBe(15)
    // パラメータボーナス: 200 * 10 / 100 = 20
    expect(result.parameterBonus).toBe(20)
    // 合計: 30 + 15 + 20 = 65
    expect(result.totalIncrease).toBe(65)
  })

  it('perLesson パラメータボーナス: レッスンごとに切り捨て合算', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.ParameterBonus,
          trigger_key: enums.TriggerKeyType.Nothing,
          values: { '0': '10%' },
          is_percentage: true,
          is_parameter_bonus: true,
        },
      ],
    })
    // 各レッスンのパラメータ上昇値 [15, 13, 17]
    // 15 * 10 / 100 = 1.5 → 1
    // 13 * 10 / 100 = 1.3 → 1
    // 17 * 10 / 100 = 1.7 → 1
    // 合計 = 3
    const perLesson = { vocal: [15, 13, 17], dance: [5, 5, 5], visual: [5, 5, 5] }
    const result = calculateCardParameter(card, enums.UncapType.Zero, emptyActions, emptyExtra, zeroBonusBase, true, true, perLesson)
    expect(result.parameterBonus).toBe(3)
  })

  it('allAbilityDetails に 0点のアビリティも含まれる', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.LessonEnd,
          trigger_key: enums.TriggerKeyType.LessonEnd,
          values: { '0': '5' },
        },
        {
          name_key: enums.AbilityNameKeyType.Consult,
          trigger_key: enums.TriggerKeyType.Consult,
          values: { '0': '10' },
        },
      ],
    })
    // lesson のみ回数あり(3)、consult は 0
    const actions = { [enums.ActionIdType.Lesson]: 3 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, actions, emptyExtra, zeroBonusBase)
    expect(result.abilityBoosts).toHaveLength(1) // lesson のみ
    expect(result.allAbilityDetails).toHaveLength(2) // lesson + consult 両方
    const consultDetail = result.allAbilityDetails.find(d => d.nameKey === enums.AbilityNameKeyType.Consult)
    expect(consultDetail?.total).toBe(0)
    expect(consultDetail?.count).toBe(0)
  })

  it('パーセンテージアビリティは abilityBoosts に含まれない', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SpLessonRate,
          trigger_key: enums.TriggerKeyType.SpLessonRate,
          values: { '0': '14%' },
          is_percentage: true,
          skip_calculation: true,
        },
      ],
    })
    const result = calculateCardParameter(card, enums.UncapType.Zero, emptyActions, emptyExtra, zeroBonusBase)
    expect(result.abilityBoosts).toHaveLength(0)
    expect(result.totalIncrease).toBe(0)
  })

  it('cardName と parameterType が正しくセットされる', () => {
    const card = makeCard({ name: 'テスト花咲', parameter_type: enums.ParameterType.Dance })
    const result = calculateCardParameter(card, enums.UncapType.Zero, emptyActions, emptyExtra, zeroBonusBase)
    expect(result.cardName).toBe('テスト花咲')
    expect(result.parameterType).toBe(enums.ParameterType.Dance)
  })

  it('visual カードは visual の bonusBase を使う', () => {
    const card = makeCard({
      parameter_type: enums.ParameterType.Visual,
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.ParameterBonus,
          trigger_key: enums.TriggerKeyType.Nothing,
          values: { '0': '10%' },
          is_percentage: true,
          is_parameter_bonus: true,
        },
      ],
    })
    const bonusBase = { vocal: 100, dance: 200, visual: 300 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, emptyActions, emptyExtra, bonusBase)
    // visual bonusBase 300 * 10% = 30
    expect(result.parameterBonus).toBe(30)
    expect(result.paramBonusBase).toBe(300)
  })

  it('dance カードは dance の bonusBase を使う', () => {
    const card = makeCard({
      parameter_type: enums.ParameterType.Dance,
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.ParameterBonus,
          trigger_key: enums.TriggerKeyType.Nothing,
          values: { '0': '5%' },
          is_percentage: true,
          is_parameter_bonus: true,
        },
      ],
    })
    const bonusBase = { vocal: 100, dance: 400, visual: 200 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, emptyActions, emptyExtra, bonusBase)
    // dance bonusBase 400 * 5% = 20
    expect(result.parameterBonus).toBe(20)
    expect(result.paramBonusBase).toBe(400)
  })

  it('イベントブースト 0%（空文字の凸0）では倍率 1.0', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.EventBoost,
          trigger_key: enums.TriggerKeyType.Nothing,
          values: { '0': '', '4': '100%' },
          is_percentage: true,
          is_event_boost: true,
        },
      ],
      events: [
        { release: enums.ReleaseConditionType.Lv20, effect_type: enums.EventEffectType.ParamBoost, param_value: 20, title: 'テスト' },
      ],
    })
    const result = calculateCardParameter(card, enums.UncapType.Zero, emptyActions, emptyExtra, zeroBonusBase)
    // 空文字 → 0% → 倍率 1.0 → 20 * 1.0 = 20
    expect(result.eventBoost).toBe(20)
    expect(result.eventBoostPercent).toBe(0)
  })

  it('SSR自己発火: SkillCard + SSR + ssr_card_acquire', () => {
    const card = makeCard({
      rarity: enums.RarityType.SSR,
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SkillCard, title: 'テスト' },
      ],
      skill_card: { name: 'テスト', rarity: enums.RarityType.SSR, type: enums.SkillCardType.Active, lesson_limit: 0, no_duplicate: false, effects: [], custom_cap: 0, custom_slot: [] },
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SsrCardAcquire,
          trigger_key: enums.TriggerKeyType.SsrCardAcquire,
          values: { '0': '10' },
        },
      ],
    })
    const actions = { [enums.TriggerKeyType.SsrCardAcquire]: 2 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, actions, emptyExtra, zeroBonusBase, true)
    // selfTrigger → SsrCardAcquire +1 → 10 * (2 + 1) = 30
    expect(result.abilityBoosts[0].count).toBe(3)
    expect(result.totalIncrease).toBe(30)
  })

  it('Pアイテム max_count で回数が制限される', () => {
    const card = makeCard({
      p_item: {
        name: 'テストアイテム',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.Memorizable,
        boost: {
          trigger_key: enums.TriggerKeyType.VoLessonEnd,
          parameter_type: enums.ParameterType.Vocal,
          value: 6,
          max_count: 3,
        },
      },
    })
    const actions = { [enums.ActionIdType.LessonVo]: 10 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, actions, emptyExtra, zeroBonusBase)
    // 6 * 3 = 18（max_count 3 で制限、10→3）
    expect(result.totalIncrease).toBe(18)
  })

  it('allAbilityDetails に Pアイテム効果も含まれる', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.LessonEnd,
          trigger_key: enums.TriggerKeyType.LessonEnd,
          values: { '0': '5' },
        },
      ],
      p_item: {
        name: 'テストアイテム',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.Memorizable,
        boost: {
          trigger_key: enums.TriggerKeyType.LessonEnd,
          parameter_type: enums.ParameterType.Vocal,
          value: 6,
        },
      },
    })
    const actions = { [enums.ActionIdType.Lesson]: 3, [enums.ActionIdType.LessonVo]: 3 }
    const result = calculateCardParameter(card, enums.UncapType.Zero, actions, emptyExtra, zeroBonusBase)
    // アビリティ: 5*3=15, Pアイテム: 6*3=18 → total=33
    expect(result.totalIncrease).toBe(33)
    expect(result.allAbilityDetails).toHaveLength(2)
    const pItemDetail = result.allAbilityDetails.find(d => d.displayName === 'テストアイテム')
    expect(pItemDetail).toBeDefined()
    expect(pItemDetail?.total).toBe(18)
  })

  it('複数の初期値アビリティが合算される', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.InitialStat,
          trigger_key: enums.TriggerKeyType.Nothing,
          parameter_type: enums.ParameterType.Vocal,
          values: { '0': '30' },
          is_initial_stat: true,
        },
        {
          name_key: enums.AbilityNameKeyType.InitialStat,
          trigger_key: enums.TriggerKeyType.Nothing,
          parameter_type: enums.ParameterType.Vocal,
          values: { '0': '20' },
          is_initial_stat: true,
        },
      ],
    })
    const result = calculateCardParameter(card, enums.UncapType.Zero, emptyActions, emptyExtra, zeroBonusBase)
    expect(result.totalIncrease).toBe(50)
    expect(result.abilityBoosts).toHaveLength(2)
  })
})

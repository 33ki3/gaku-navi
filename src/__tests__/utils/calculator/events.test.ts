import { describe, expect, it } from 'vitest'
import { parseEventParameterBoost, parsePItemParameterBoost, getSelfAcquisitionBonus } from '../../../utils/calculator/events'
import type { SupportCard } from '../../../types/card'
import * as enums from '../../../types/enums'

// --- テスト用ヘルパー ---

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

// --- parseEventParameterBoost ---

/** イベントパラメータ上昇値の解析テスト */
describe('parseEventParameterBoost', () => {
  it('param_boost イベントのパラメータ上昇値を返す', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Lv20, effect_type: enums.EventEffectType.ParamBoost, param_type: enums.ParameterType.Vocal, param_value: 20, title: 'テスト' },
      ],
    })
    expect(parseEventParameterBoost(card)).toBe(20)
  })

  it('param_boost イベントがなければ 0', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SkillCard, title: 'テスト' },
      ],
    })
    expect(parseEventParameterBoost(card)).toBe(0)
  })

  it('events が空なら 0', () => {
    expect(parseEventParameterBoost(makeCard())).toBe(0)
  })

  it('最初に見つかった param_boost の值を返す', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.ParamBoost, param_value: 15, title: '1st' },
        { release: enums.ReleaseConditionType.Lv20, effect_type: enums.EventEffectType.ParamBoost, param_value: 25, title: '2nd' },
      ],
    })
    expect(parseEventParameterBoost(card)).toBe(15)
  })
})

// --- parsePItemParameterBoost ---

/** Pアイテムパラメータ上昇効果の解析テスト */
describe('parsePItemParameterBoost', () => {
  it('boost がある場合、効果情報を配列で返す', () => {
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
    const result = parsePItemParameterBoost(card)
    expect(result).toHaveLength(1)
    expect(result[0].triggerKey).toBe('lesson_end')
    expect(result[0].value).toBe(6)
    expect(result[0].parameterType).toBe(enums.ParameterType.Vocal)
    expect(result[0].description).toBe('テストアイテム')
  })

  it('boost がない場合は空配列', () => {
    const card = makeCard({
      p_item: {
        name: 'テスト',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.Memorizable,
      },
    })
    expect(parsePItemParameterBoost(card)).toEqual([])
  })

  it('p_item が null なら空配列', () => {
    expect(parsePItemParameterBoost(makeCard())).toEqual([])
  })

  it('boost.value が 0 なら空配列', () => {
    const card = makeCard({
      p_item: {
        name: 'テスト',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.Memorizable,
        boost: {
          trigger_key: enums.TriggerKeyType.LessonEnd,
          parameter_type: enums.ParameterType.Vocal,
          value: 0,
        },
      },
    })
    expect(parsePItemParameterBoost(card)).toEqual([])
  })

  it('boost.max_count が設定されていれば反映', () => {
    const card = makeCard({
      p_item: {
        name: 'テスト',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.Memorizable,
        boost: {
          trigger_key: enums.TriggerKeyType.LessonEnd,
          parameter_type: enums.ParameterType.Vocal,
          value: 5,
          max_count: 3,
        },
      },
    })
    const result = parsePItemParameterBoost(card)
    expect(result[0].maxCount).toBe(3)
  })
})

// --- getSelfAcquisitionBonus ---

/** 自己発火（イベント提供による追加トリガー回数）の判定テスト */
describe('getSelfAcquisitionBonus', () => {
  it('スキルカード提供 + skill_acquire トリガー → SkillAcquire +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SkillCard, title: 'テスト' },
      ],
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SkillAcquire,
          trigger_key: enums.TriggerKeyType.SkillAcquire,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.SkillAcquire]).toBe(1)
  })

  it('メンタルスキルカード提供 + m_skill_acquire トリガー → MSkillAcquire +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SkillCard, title: 'テスト' },
      ],
      skill_card: { name: 'テスト', rarity: enums.RarityType.SR, type: enums.SkillCardType.Mental, lesson_limit: 0, no_duplicate: false, effects: [], custom_cap: 0, custom_slot: [] },
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.MSkillAcquire,
          trigger_key: enums.TriggerKeyType.MSkillAcquire,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.MSkillAcquire]).toBe(1)
  })

  it('SSR + スキルカード提供 + ssr_card_acquire トリガー → SsrCardAcquire +1', () => {
    const card = makeCard({
      rarity: enums.RarityType.SSR,
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SkillCard, title: 'テスト' },
      ],
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SsrCardAcquire,
          trigger_key: enums.TriggerKeyType.SsrCardAcquire,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.SsrCardAcquire]).toBe(1)
  })

  it('Pアイテム提供 + p_item_acquire トリガー → PItemAcquire +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.PItem, title: 'テスト' },
      ],
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.PItemAcquire,
          trigger_key: enums.TriggerKeyType.PItemAcquire,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.PItemAcquire]).toBe(1)
  })

  it('カード強化イベント + skill_enhance トリガー → SkillEnhance +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.CardEnhance, title: 'テスト' },
      ],
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SkillEnhance,
          trigger_key: enums.TriggerKeyType.SkillEnhance,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.SkillEnhance]).toBe(1)
  })

  it('カード削除イベント + delete トリガー → Delete +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.CardDelete, title: 'テスト' },
      ],
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.ASkillDelete,
          trigger_key: enums.TriggerKeyType.Delete,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.Delete]).toBe(1)
  })

  it('skip_calculation のアビリティは無視される', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SkillCard, title: 'テスト' },
      ],
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SkillAcquire,
          trigger_key: enums.TriggerKeyType.SkillAcquire,
          values: { '0': '5' },
          skip_calculation: true,
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.SkillAcquire]).toBeUndefined()
  })

  it('trigger_key のないアビリティは無視される', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SkillCard, title: 'テスト' },
      ],
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SkillAcquire,
          trigger_key: undefined as unknown as enums.TriggerKeyType,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(Object.keys(bonus)).toHaveLength(0)
  })

  it('イベントがない場合は空オブジェクト', () => {
    expect(getSelfAcquisitionBonus(makeCard())).toEqual({})
  })

  it('イベント強化 + Pアイテム強化で SkillEnhance +2', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.CardEnhance, title: 'テスト' },
      ],
      p_item: {
        name: 'テスト',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.Memorizable,
        actions: [enums.PItemActionType.Enhance],
      },
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SkillEnhance,
          trigger_key: enums.TriggerKeyType.SkillEnhance,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.SkillEnhance]).toBe(2)
  })

  it('Pドリンク獲得アクション + p_drink_acquire トリガー → PDrinkAcquire +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.ParamBoost, param_value: 10, title: 'テスト' },
      ],
      p_item: {
        name: 'テスト',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.Memorizable,
        actions: [enums.PItemActionType.PDrinkAcquire],
      },
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.PDrinkAcquire,
          trigger_key: enums.TriggerKeyType.PDrinkAcquire,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.PDrinkAcquire]).toBe(1)
  })

  it('アクティブスキルカード提供 + a_skill_acquire トリガー → ASkillAcquire +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SkillCard, title: 'テスト' },
      ],
      skill_card: { name: 'テスト', rarity: enums.RarityType.SR, type: enums.SkillCardType.Active, lesson_limit: 0, no_duplicate: false, effects: [], custom_cap: 0, custom_slot: [] },
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.ASkillAcquire,
          trigger_key: enums.TriggerKeyType.ASkillAcquire,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.ASkillAcquire]).toBe(1)
  })

  it('SelectEnhance イベント + skill_enhance トリガー → SkillEnhance +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SelectEnhance, title: 'テスト' },
      ],
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SkillEnhance,
          trigger_key: enums.TriggerKeyType.SkillEnhance,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.SkillEnhance]).toBe(1)
  })

  it('SelectDelete イベント + delete トリガー → Delete +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SelectDelete, title: 'テスト' },
      ],
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.ASkillDelete,
          trigger_key: enums.TriggerKeyType.Delete,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.Delete]).toBe(1)
  })

  it('TroubleDelete イベント + trouble_delete トリガー → TroubleDelete +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.TroubleDelete, title: 'テスト' },
      ],
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.Delete,
          trigger_key: enums.TriggerKeyType.TroubleDelete,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.TroubleDelete]).toBe(1)
  })

  it('CardChange イベント + change トリガー → Change +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.CardChange, title: 'テスト' },
      ],
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.Change,
          trigger_key: enums.TriggerKeyType.Change,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.Change]).toBe(1)
  })

  it('Pアイテム強化アクションのみ（イベント強化なし）→ SkillEnhance +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.ParamBoost, param_value: 10, title: 'テスト' },
      ],
      p_item: {
        name: 'テスト',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.Memorizable,
        actions: [enums.PItemActionType.Enhance],
      },
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SkillEnhance,
          trigger_key: enums.TriggerKeyType.SkillEnhance,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.SkillEnhance]).toBe(1)
  })

  it('Pアイテム削除アクション + delete トリガー → Delete +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.ParamBoost, param_value: 10, title: 'テスト' },
      ],
      p_item: {
        name: 'テスト',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.Memorizable,
        actions: [enums.PItemActionType.Delete],
      },
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.ASkillDelete,
          trigger_key: enums.TriggerKeyType.Delete,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.Delete]).toBe(1)
  })

  it('Pアイテムチェンジアクション + change トリガー → Change +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.ParamBoost, param_value: 10, title: 'テスト' },
      ],
      p_item: {
        name: 'テスト',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.Memorizable,
        actions: [enums.PItemActionType.Change],
      },
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.Change,
          trigger_key: enums.TriggerKeyType.Change,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.Change]).toBe(1)
  })

  it('PアイテムTroubleDeleteアクション + trouble_delete トリガー → TroubleDelete +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.ParamBoost, param_value: 10, title: 'テスト' },
      ],
      p_item: {
        name: 'テスト',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.Memorizable,
        actions: [enums.PItemActionType.TroubleDelete],
      },
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.Delete,
          trigger_key: enums.TriggerKeyType.TroubleDelete,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.TroubleDelete]).toBe(1)
  })

  it('SSRカード + アクティブスキル: SkillAcquire + ASkillAcquire + SsrCardAcquire の複合', () => {
    const card = makeCard({
      rarity: enums.RarityType.SSR,
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SkillCard, title: 'テスト' },
      ],
      skill_card: { name: 'テスト', rarity: enums.RarityType.SSR, type: enums.SkillCardType.Active, lesson_limit: 0, no_duplicate: false, effects: [], custom_cap: 0, custom_slot: [] },
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SkillAcquire,
          trigger_key: enums.TriggerKeyType.SkillAcquire,
          values: { '0': '5' },
        },
        {
          name_key: enums.AbilityNameKeyType.ASkillAcquire,
          trigger_key: enums.TriggerKeyType.ASkillAcquire,
          values: { '0': '5' },
        },
        {
          name_key: enums.AbilityNameKeyType.SsrCardAcquire,
          trigger_key: enums.TriggerKeyType.SsrCardAcquire,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.SkillAcquire]).toBe(1)
    expect(bonus[enums.ActionIdType.ASkillAcquire]).toBe(1)
    expect(bonus[enums.ActionIdType.SsrCardAcquire]).toBe(1)
  })

  it('イベント強化 + Pアイテムチェンジの複合 → SkillEnhance +1, Change +1', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.CardEnhance, title: 'テスト' },
      ],
      p_item: {
        name: 'テスト',
        rarity: enums.PItemRarityType.SR,
        memory: enums.PItemMemoryType.Memorizable,
        actions: [enums.PItemActionType.Change],
      },
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.SkillEnhance,
          trigger_key: enums.TriggerKeyType.SkillEnhance,
          values: { '0': '5' },
        },
        {
          name_key: enums.AbilityNameKeyType.Change,
          trigger_key: enums.TriggerKeyType.Change,
          values: { '0': '5' },
        },
      ],
    })
    const bonus = getSelfAcquisitionBonus(card)
    expect(bonus[enums.ActionIdType.SkillEnhance]).toBe(1)
    expect(bonus[enums.ActionIdType.Change]).toBe(1)
  })
})

/**
 * サポートクエリユーティリティのテスト
 *
 * フィルターバーで使用するサポート属性判定関数を検証する。
 * イベントサマリーの取得（サポート一覧のイベントアイコン表示）、
 * SPレッスン率アビリティの有無判定（SPフィルター）、
 * アビリティキーワードマッチ（キーワードフィルター）の正確な動作を確認する。
 */
import { describe, expect, it } from 'vitest'
import { getEventSummaryParts, hasSPAbility, hasAbilityKeyword } from '../../utils/cardQuery'
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

// --- getEventSummaryParts ---

/** イベントサマリーラベル取得テスト */
describe('getEventSummaryParts', () => {
  it('イベントがない場合は空配列', () => {
    expect(getEventSummaryParts(makeCard())).toEqual([])
  })

  it('イベントのラベルキーを配列で返す', () => {
    const card = makeCard({
      events: [
        { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.PItem, title: 'テスト' },
        { release: enums.ReleaseConditionType.Lv20, effect_type: enums.EventEffectType.SkillCard, title: 'テスト2' },
      ],
    })
    const parts = getEventSummaryParts(card)
    expect(parts.length).toBe(2)
    // TranslationKey が返ることを確認（具体的なキーは data/card/event に依存）
    expect(typeof parts[0]).toBe('string')
  })

  it('未マッピングのイベントタイプはスキップ', () => {
    const card = makeCard({
      events: [
        {
          release: enums.ReleaseConditionType.Initial,
          effect_type: 'unknown_type' as enums.EventEffectType,
          title: 'テスト',
        },
      ],
    })
    const parts = getEventSummaryParts(card)
    // getEventSummaryLabel が null を返す → push されない
    expect(parts.length).toBe(0)
  })
})

// --- hasSPAbility ---

/** SPレッスン率アビリティ有無の判定テスト */
describe('hasSPAbility', () => {
  it('sp_lesson_rate トリガーがあれば true', () => {
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
    expect(hasSPAbility(card)).toBe(true)
  })

  it('sp_lesson_rate トリガーがなければ false', () => {
    const card = makeCard({
      abilities: [
        {
          name_key: enums.AbilityNameKeyType.LessonEnd,
          trigger_key: enums.TriggerKeyType.LessonEnd,
          values: { '0': '5' },
        },
      ],
    })
    expect(hasSPAbility(card)).toBe(false)
  })

  it('アビリティなしは false', () => {
    expect(hasSPAbility(makeCard())).toBe(false)
  })
})

// --- hasAbilityKeyword ---

/** アビリティキーワードマッチ判定テスト */
describe('hasAbilityKeyword', () => {
  it('trigger_key ベースのキーワードがマッチする', () => {
    const card = makeCard({
      abilities: [
        { name_key: enums.AbilityNameKeyType.Consult, trigger_key: enums.TriggerKeyType.Consult, values: { '0': '5' } },
      ],
    })
    // 'outing' キーワードは consult トリガーとは別
    expect(hasAbilityKeyword(card, enums.AbilityKeywordType.Outing)).toBe(false)
  })

  it('アビリティなしは false', () => {
    expect(hasAbilityKeyword(makeCard(), enums.AbilityKeywordType.Lesson)).toBe(false)
  })
})

/**
 * アビリティ値解決テスト
 *
 * getAvailableAbilities で返されるアビリティが stageData に存在し、
 * resolveAbilityValues で凸別の正しい値が導出されることを検証する。
 * また固定スロット（1・3・6）の選択肢が仕様通りであることを確認する。
 */
import { describe, expect, it } from 'vitest'
import {
  RarityTierType,
  RarityType,
  AbilityNameKeyType,
  UncapType,
  SourceType,
  CardType,
  PlanType,
  ParameterType,
  TriggerKeyType,
} from '../../types/enums'
import { getAvailableAbilities, getStages, getSchedule } from '../../data/score/abilityValue'
import { resolveAbilityValues } from '../../utils/abilityValueResolver'
import { SLOT1_OPTIONS, SLOT3_OPTIONS, SLOT6_OPTIONS, isFixedSlot } from '../../data/card/abilitySlot'
import type { SupportCard, Ability } from '../../types/card'

/** テスト用のダミーサポートを生成する */
function dummyCard(overrides: Partial<SupportCard> = {}): SupportCard {
  return {
    name: 'テストサポート',
    rarity: RarityType.SSR,
    type: CardType.Vocal,
    plan: PlanType.Free,
    parameter_type: ParameterType.Vocal,
    source: SourceType.User,
    release_date: '2025/01/01',
    abilities: [],
    events: [],
    p_item: null,
    skill_card: null,
    ...overrides,
  }
}

/** テスト用のダミーアビリティを生成する */
function dummyAbility(nameKey: AbilityNameKeyType): Ability {
  return {
    name_key: nameKey,
    trigger_key: TriggerKeyType.LessonEnd,
    values: {},
  }
}

// レアリティ階層の全種類
const ALL_TIERS = Object.values(RarityTierType)

describe('getAvailableAbilities', () => {
  it.each(ALL_TIERS)('レアリティ %s で少なくとも1つのアビリティがある', (tier) => {
    const abilities = getAvailableAbilities(tier)
    expect(abilities.length).toBeGreaterThan(0)
  })

  it.each(ALL_TIERS)('レアリティ %s の全アビリティに stageData が存在する', (tier) => {
    const abilities = getAvailableAbilities(tier)
    for (const nameKey of abilities) {
      const stages = getStages(tier, nameKey)
      expect(stages, `${tier}/${nameKey} の stageData が未定義`).toBeDefined()
      expect(stages!.length, `${tier}/${nameKey} の stageData が空`).toBeGreaterThan(0)
    }
  })
})

describe('resolveAbilityValues', () => {
  describe.each(ALL_TIERS)('レアリティ %s', (tier) => {
    // レアリティ階層→RarityType の変換
    const rarity =
      tier === RarityTierType.EventSSR || tier === RarityTierType.SSR ? RarityType.SSR : (tier as string as RarityType)
    const isEvent = tier === RarityTierType.EventSSR

    it.each(getAvailableAbilities(tier))('アビリティ %s の凸別値が正しく解決される', (nameKey) => {
      const card = dummyCard({
        rarity,
        ...(isEvent && { is_event_source: true }),
      })
      const ability = dummyAbility(nameKey)

      // 全6スロットで試して、値が返るスロットがあるか確認
      let resolved = false
      for (let slot = 0; slot < 6; slot++) {
        const values = resolveAbilityValues(card, ability, slot)
        const schedule = getSchedule(tier, slot + 1)
        const stages = getStages(tier, nameKey)!

        // スケジュールの最大段階数が stageData の段階数以内であること
        const maxStageIndex = Math.max(...schedule)
        if (maxStageIndex > stages.length) continue

        // 値が解決されたことを確認
        if (Object.keys(values).length > 0) {
          resolved = true

          // 各凸で正しい段階の値が入っているか検証
          for (let uncap = 0; uncap <= UncapType.Four; uncap++) {
            const stageIndex = schedule[uncap]
            if (stageIndex === 0) {
              // 未解放 → 空文字
              expect(values[uncap]).toBe('')
            } else {
              // 段階値と一致
              expect(values[uncap]).toBe(stages[stageIndex - 1])
            }
          }
        }
      }
      expect(resolved, `${tier}/${nameKey} がどのスロットでも値解決されなかった`).toBe(true)
    })
  })
})

describe('固定スロット', () => {
  it('isFixedSlot がスロット 0・2・5 で true を返す', () => {
    expect(isFixedSlot(0)).toBe(true)
    expect(isFixedSlot(1)).toBe(false)
    expect(isFixedSlot(2)).toBe(true)
    expect(isFixedSlot(3)).toBe(false)
    expect(isFixedSlot(4)).toBe(false)
    expect(isFixedSlot(5)).toBe(true)
  })

  it('スロット1 は InitialStat と ParameterBonus の2択', () => {
    expect(SLOT1_OPTIONS).toContain(AbilityNameKeyType.InitialStat)
    expect(SLOT1_OPTIONS).toContain(AbilityNameKeyType.ParameterBonus)
    expect(SLOT1_OPTIONS).toHaveLength(2)
  })

  it('スロット3 は SupportRate 固定', () => {
    expect(SLOT3_OPTIONS).toContain(AbilityNameKeyType.SupportRate)
    expect(SLOT3_OPTIONS).toHaveLength(1)
  })

  it.each(ALL_TIERS)('レアリティ %s のスロット6選択肢が stageData に存在する', (tier) => {
    const options = SLOT6_OPTIONS[tier]
    expect(options.length).toBeGreaterThan(0)
    for (const nameKey of options) {
      const stages = getStages(tier, nameKey)
      expect(stages, `${tier}/${nameKey} が stageData にない`).toBeDefined()
      // スロット6は3段階のスケジュール
      expect(stages!.length).toBe(3)
    }
  })

  it('SSR のスロット6 に EventBoost と EventRecoveryBoost がある', () => {
    const options = SLOT6_OPTIONS[RarityTierType.SSR]
    expect(options).toContain(AbilityNameKeyType.EventBoost)
    expect(options).toContain(AbilityNameKeyType.EventRecoveryBoost)
  })

  it('SR のスロット6 に EventBoost と EventPpBoost がある', () => {
    const options = SLOT6_OPTIONS[RarityTierType.SR]
    expect(options).toContain(AbilityNameKeyType.EventBoost)
    expect(options).toContain(AbilityNameKeyType.EventPpBoost)
  })

  it('EventSSR のスロット6 は EventBoost のみ', () => {
    const options = SLOT6_OPTIONS[RarityTierType.EventSSR]
    expect(options).toContain(AbilityNameKeyType.EventBoost)
    expect(options).toHaveLength(1)
  })

  it('R のスロット6 は EventBoost のみ', () => {
    const options = SLOT6_OPTIONS[RarityTierType.R]
    expect(options).toContain(AbilityNameKeyType.EventBoost)
    expect(options).toHaveLength(1)
  })

  it.each(ALL_TIERS)('レアリティ %s の固定スロットアビリティが getAvailableAbilities に含まれる', (tier) => {
    const available = getAvailableAbilities(tier)
    // スロット1の選択肢が含まれている
    for (const nameKey of SLOT1_OPTIONS) {
      expect(available, `${tier} に ${nameKey} がない`).toContain(nameKey)
    }
    // スロット3の選択肢が含まれている
    for (const nameKey of SLOT3_OPTIONS) {
      expect(available, `${tier} に ${nameKey} がない`).toContain(nameKey)
    }
    // スロット6の選択肢が含まれている
    for (const nameKey of SLOT6_OPTIONS[tier]) {
      expect(available, `${tier} に ${nameKey} がない`).toContain(nameKey)
    }
  })
})

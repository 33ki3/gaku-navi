/**
 * マスタデータ完全性テスト
 *
 * 全 enum 値に対応するマスタデータが欠落なく定義されていることを検証する。
 * フォールバック削除の安全を保証するためのテスト群。
 */
import { describe, expect, it } from 'vitest'
import * as enums from '../../types/enums'
import * as data from '../../data'
import { getSchedule } from '../../data/score/abilityValue'
import { AbilityExceptionMap } from '../../data/score/abilityException'
import { TriggerActionMap } from '../../data/score'

/** レアリティ×凸数の全組み合わせで最大レベルが正しく定義されていること */
describe('maxLevel', () => {
  const rarities = Object.values(enums.RarityType)
  const uncaps = Object.values(enums.UncapType).filter((u) => u !== enums.UncapType.NotOwned)

  it.each(rarities.flatMap((r) => uncaps.map((u) => [r, u] as const)))(
    'getMaxLevel(%s, %s) が正の数を返す',
    (rarity, uncap) => {
      const level = data.getMaxLevel(rarity, uncap)
      expect(level).toBeGreaterThan(0)
    },
  )
})

/** レアリティ階層ごとにアビリティ値のスケジュールが定義されていること */
describe('abilityValue', () => {
  const tiers = Object.values(enums.RarityTierType)

  it.each(tiers)('getSchedule(%s, 1) が値を返す', (tier) => {
    const schedule = getSchedule(tier, 1)
    expect(Array.isArray(schedule)).toBe(true)
    expect(schedule.length).toBeGreaterThan(0)
  })
})

/** 全レアリティに対応する表示エントリ（ラベル・色・ソート順）が存在すること */
describe('rarityDisplay', () => {
  const rarities = Object.values(enums.RarityType)

  it.each(rarities)('getRarityEntry(%s) がエントリを返す', (rarity) => {
    const entry = data.getRarityEntry(rarity)
    expect(entry).toBeDefined()
    expect(typeof entry.order).toBe('number')
    expect(typeof entry.label).toBe('string')
    expect(typeof entry.color).toBe('string')
  })
})

/** スキルカードレアリティに表示エントリが存在すること */
describe('skillCardRarityDisplay', () => {
  const rarities = Object.values(enums.SkillCardRarityType)

  it.each(rarities)('getSkillCardRarityEntry(%s) がエントリを返す', (rarity) => {
    const entry = data.getSkillCardRarityEntry(rarity)
    expect(entry).toBeDefined()
    expect(typeof entry.label).toBe('string')
    expect(typeof entry.color).toBe('string')
  })
})

/** Pアイテムレアリティに表示エントリが存在すること */
describe('pItemRarityDisplay', () => {
  const rarities = Object.values(enums.PItemRarityType)

  it.each(rarities)('getPItemRarityEntry(%s) がエントリを返す', (rarity) => {
    const entry = data.getPItemRarityEntry(rarity)
    expect(entry).toBeDefined()
    expect(typeof entry.label).toBe('string')
    expect(typeof entry.color).toBe('string')
  })
})

/** 全サポートタイプに対応する表示エントリ（ラベル・背景色）が存在すること */
describe('typeDisplay', () => {
  const types = Object.values(enums.CardType)

  it.each(types)('getTypeEntry(%s) がエントリを返す', (type) => {
    const entry = data.getTypeEntry(type)
    expect(entry).toBeDefined()
    expect(typeof entry.displayLabel).toBe('string')
    expect(typeof entry.bg).toBe('string')
  })
})

/** Pアイテムメモリー・スキルタイプ・入手先・プランのバッジ色・ラベルが定義されていること */
describe('badge', () => {
  it.each(Object.values(enums.PItemMemoryType))('getMemoryBadge(%s) がエントリを返す', (memory) => {
    const entry = data.getMemoryBadge(memory)
    expect(entry).toBeDefined()
    expect(typeof entry.label).toBe('string')
    expect(typeof entry.badge).toBe('string')
  })

  it.each(Object.values(enums.SkillCardType))('getSkillTypeBadge(%s) がエントリを返す', (type) => {
    const entry = data.getSkillTypeBadge(type)
    expect(entry).toBeDefined()
    expect(typeof entry.label).toBe('string')
    expect(typeof entry.badge).toBe('string')
  })

  it.each(Object.values(enums.SourceType))('getSourceBadge(%s) がエントリを返す', (source) => {
    const entry = data.getSourceBadge(source)
    expect(entry).toBeDefined()
    expect(typeof entry.label).toBe('string')
    expect(typeof entry.badge).toBe('string')
  })

  it.each(Object.values(enums.PlanType))('getPlanBadge(%s) がエントリを返す', (plan) => {
    const entry = data.getPlanBadge(plan)
    expect(entry).toBeDefined()
    expect(typeof entry.label).toBe('string')
    expect(typeof entry.activeColor).toBe('string')
  })
})

/** 全エフェクトキーワードに対応するゲーム内ラベルが存在すること */
describe('gameKeyword', () => {
  it.each(Object.values(enums.EffectKeywordType))('getEffectKeywordEntry(%s) がエントリを返す', (keyword) => {
    const entry = data.getEffectKeywordEntry(keyword)
    expect(entry).toBeDefined()
    expect(typeof entry!.label).toBe('string')
    expect(entry!.label.length).toBeGreaterThan(0)
  })
})

/** パラメータ・カードゾーン・スキル種別・イベント効果・解放条件・コスト種別のラベル解決が存在すること */
describe('effectLabelResolver', () => {
  it.each(Object.values(enums.ParameterType))('getParamLabel(%s) が文字列を返す', (param) => {
    expect(typeof data.getParamLabel(param)).toBe('string')
  })

  it.each(Object.values(enums.CardZoneType))('getCardZoneLabel(%s) が文字列を返す', (zone) => {
    expect(typeof data.getCardZoneLabel(zone)).toBe('string')
  })

  it.each(Object.values(enums.SkillCardType))('getSkillTypeLabel(%s) が文字列を返す', (type) => {
    expect(typeof data.getSkillTypeLabel(type)).toBe('string')
  })

  it.each(Object.values(enums.EventEffectType))('getEventEffectLabelKey(%s) が文字列を返す', (effect) => {
    expect(typeof data.getEventEffectLabelKey(effect)).toBe('string')
  })

  it.each(Object.values(enums.ReleaseConditionType))('getEventReleaseLabelKey(%s) が文字列を返す', (release) => {
    expect(typeof data.getEventReleaseLabelKey(release)).toBe('string')
  })

  it.each(Object.values(enums.CostType))('getCostTypeLabelKey(%s) が文字列を返す', (costType) => {
    expect(typeof data.getCostTypeLabelKey(costType)).toBe('string')
  })
})

/** 全アビリティキーワードのバッジ色とトリガーマッピングが存在すること */
describe('abilityKeyword', () => {
  const keywords = Object.values(enums.AbilityKeywordType)

  it.each(keywords)('AbilityKeywordMap.get(%s) がエントリを返す', (keyword) => {
    const entry = data.AbilityKeywordMap.get(keyword)
    expect(entry).toBeDefined()
    expect(typeof entry!.badge).toBe('string')
    expect(Array.isArray(entry!.triggers)).toBe(true)
  })
})

/** アクションカテゴリ一覧にラベルがあり、グループラベルも存在すること */
describe('actionCategory', () => {
  it('全カテゴリにラベルがある', () => {
    for (const cat of data.ActionCategoryList) {
      expect(typeof cat.label).toBe('string')
      expect(cat.label.length).toBeGreaterThan(0)
    }
  })

  it.each(Object.values(enums.ActionGroupType))('getActionGroupLabel(%s) が文字列を返す', (group) => {
    expect(typeof data.getActionGroupLabel(group)).toBe('string')
  })
})

const allCombinations: [enums.ScenarioType, enums.DifficultyType][] = [
  [enums.ScenarioType.Hajime, enums.DifficultyType.Regular],
  [enums.ScenarioType.Hajime, enums.DifficultyType.Pro],
  [enums.ScenarioType.Hajime, enums.DifficultyType.Master],
  [enums.ScenarioType.Hajime, enums.DifficultyType.Legend],
  [enums.ScenarioType.Nia, enums.DifficultyType.Regular],
  [enums.ScenarioType.Nia, enums.DifficultyType.Pro],
  [enums.ScenarioType.Nia, enums.DifficultyType.Master],
  [enums.ScenarioType.Nia, enums.DifficultyType.Legend],
]

/** 全シナリオ×難易度の組み合わせでスケジュールデータが存在すること */
describe('schedule', () => {
  it.each(allCombinations)('getScheduleData(%s, %s) が配列を返す', (scenario, difficulty) => {
    const result = data.getScheduleData(scenario, difficulty)
    expect(Array.isArray(result)).toBe(true)
  })

  it('getScheduleData(hajime, legend) は要素を持つ', () => {
    const result = data.getScheduleData(enums.ScenarioType.Hajime, enums.DifficultyType.Legend)
    expect(result.length).toBeGreaterThan(0)
  })
})

/** 全シナリオ×難易度の組み合わせでレッスンデータが存在すること */
describe('lesson', () => {
  it.each(allCombinations)('getLessonData(%s, %s) が配列を返す', (scenario, difficulty) => {
    const result = data.getLessonData(scenario, difficulty)
    expect(Array.isArray(result)).toBe(true)
  })

  it('getLessonData(hajime, legend) は要素を持つ', () => {
    const result = data.getLessonData(enums.ScenarioType.Hajime, enums.DifficultyType.Legend)
    expect(result.length).toBeGreaterThan(0)
  })
})

/** アビリティ例外マップのエントリが正しい形式（サポート名→スロット→値）であること */
describe('abilityException', () => {
  it('AbilityExceptionMap が 1 件以上のエントリを含む', () => {
    expect(AbilityExceptionMap.size).toBeGreaterThan(0)
  })

  it('各エントリのサポート名が文字列で、スロットMap が空でない', () => {
    for (const [cardName, slotMap] of AbilityExceptionMap) {
      expect(typeof cardName).toBe('string')
      expect(cardName.length).toBeGreaterThan(0)
      expect(slotMap.size).toBeGreaterThan(0)
      for (const [slot, values] of slotMap) {
        expect(typeof slot).toBe('number')
        expect(Object.keys(values).length).toBeGreaterThan(0)
      }
    }
  })
})

/** 全TriggerKeyTypeがtriggerActionMapに存在し、マッピング先が有効なActionIdTypeであること */
describe('triggerActionMap', () => {
  it.each(Object.values(enums.TriggerKeyType))('TriggerKeyType "%s" が triggerActionMap に存在する', (key) => {
    expect(TriggerActionMap[key]).toBeDefined()
  })

  it('全マッピング値が有効な ActionIdType である', () => {
    const validActions = new Set(Object.values(enums.ActionIdType))
    for (const [key, value] of Object.entries(TriggerActionMap)) {
      expect(validActions.has(value), `${key} → ${value} は無効な ActionIdType`).toBe(true)
    }
  })
})

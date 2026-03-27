import { describe, expect, it } from 'vitest'
import { parseAbility } from '../../../utils/calculator/helpers'
import type { Ability } from '../../../types/card'
import * as enums from '../../../types/enums'

// --- parseAbility ---

/** アビリティ値の解析・正規化テスト */
describe('parseAbility', () => {
  const baseAbility: Ability = {
    name_key: enums.AbilityNameKeyType.LessonEnd,
    trigger_key: enums.TriggerKeyType.LessonEnd,
    values: { '0': '1', '1': '2', '2': '3', '3': '4', '4': '5' },
  }

  it('凸0の場合 values["0"] の数値を返す', () => {
    const parsed = parseAbility(baseAbility, enums.UncapType.Zero)
    expect(parsed.numericValue).toBe(1)
    expect(parsed.triggerKey).toBe('lesson_end')
    expect(parsed.nameKey).toBe('lesson_end')
  })

  it('凸4の場合 values["4"] の数値を返す', () => {
    const parsed = parseAbility(baseAbility, enums.UncapType.Four)
    expect(parsed.numericValue).toBe(5)
  })

  it('指定凸の値がなければ凸0にフォールバック', () => {
    const ability: Ability = {
      name_key: enums.AbilityNameKeyType.LessonEnd,
      trigger_key: enums.TriggerKeyType.LessonEnd,
      values: { '0': '10' },
    }
    const parsed = parseAbility(ability, enums.UncapType.Three)
    expect(parsed.numericValue).toBe(10)
  })

  it('values が空なら 0 を返す', () => {
    const ability: Ability = {
      name_key: enums.AbilityNameKeyType.SupportRate,
      trigger_key: enums.TriggerKeyType.Nothing,
      values: {},
      skip_calculation: true,
    }
    const parsed = parseAbility(ability, enums.UncapType.Zero)
    expect(parsed.numericValue).toBe(0)
    expect(parsed.skipCalculation).toBe(true)
  })

  it('パーセント値から % を除去して数値化する', () => {
    const ability: Ability = {
      name_key: enums.AbilityNameKeyType.ParameterBonus,
      trigger_key: enums.TriggerKeyType.Nothing,
      values: { '0': '2.8%', '4': '4.3%' },
      is_percentage: true,
      is_parameter_bonus: true,
    }
    const parsed = parseAbility(ability, enums.UncapType.Zero)
    expect(parsed.numericValue).toBeCloseTo(2.8)
    expect(parsed.isPercentage).toBe(true)
    expect(parsed.isParameterBonus).toBe(true)
  })

  it('プラス記号付きの値を処理する', () => {
    const ability: Ability = {
      name_key: enums.AbilityNameKeyType.LessonEnd,
      trigger_key: enums.TriggerKeyType.LessonEnd,
      values: { '0': '+8.5%' },
      is_percentage: true,
    }
    const parsed = parseAbility(ability, enums.UncapType.Zero)
    expect(parsed.numericValue).toBeCloseTo(8.5)
  })

  it('is_event_boost フラグを反映する', () => {
    const ability: Ability = {
      name_key: enums.AbilityNameKeyType.EventBoost,
      trigger_key: enums.TriggerKeyType.Nothing,
      values: { '0': '50%' },
      is_percentage: true,
      is_event_boost: true,
    }
    const parsed = parseAbility(ability, enums.UncapType.Zero)
    expect(parsed.isEventBoost).toBe(true)
    expect(parsed.numericValue).toBe(50)
  })

  it('is_initial_stat フラグを反映する', () => {
    const ability: Ability = {
      name_key: enums.AbilityNameKeyType.InitialStat,
      trigger_key: enums.TriggerKeyType.Nothing,
      values: { '0': '52', '4': '65' },
      is_initial_stat: true,
    }
    const parsed = parseAbility(ability, enums.UncapType.Four)
    expect(parsed.isInitialStat).toBe(true)
    expect(parsed.numericValue).toBe(65)
  })

  it('max_count を反映する', () => {
    const ability: Ability = {
      name_key: enums.AbilityNameKeyType.LessonEnd,
      trigger_key: enums.TriggerKeyType.LessonEnd,
      values: { '0': '5' },
      max_count: 3,
    }
    const parsed = parseAbility(ability, enums.UncapType.Zero)
    expect(parsed.maxCount).toBe(3)
  })

  it('parameter_type を反映する', () => {
    const ability: Ability = {
      name_key: enums.AbilityNameKeyType.LessonEnd,
      trigger_key: enums.TriggerKeyType.LessonEnd,
      parameter_type: enums.ParameterType.Dance,
      values: { '0': '5' },
    }
    const parsed = parseAbility(ability, enums.UncapType.Zero)
    expect(parsed.parameterType).toBe(enums.ParameterType.Dance)
  })

  it('空文字の値は 0 として扱われる', () => {
    const ability: Ability = {
      name_key: enums.AbilityNameKeyType.EventBoost,
      trigger_key: enums.TriggerKeyType.Nothing,
      values: { '0': '', '4': '100%' },
      is_percentage: true,
      is_event_boost: true,
    }
    const parsed = parseAbility(ability, enums.UncapType.Zero)
    expect(parsed.numericValue).toBe(0)
    expect(parsed.isEventBoost).toBe(true)
  })
})

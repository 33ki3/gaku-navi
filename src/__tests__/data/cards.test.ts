import { describe, expect, it } from 'vitest'
import { AllCards } from '../../data'
import { TriggerKeyType } from '../../types/enums'
import { PERCENT_SIGN, PLUS_SIGN } from '../../constant'
const validTriggerKeys = new Set(Object.values(TriggerKeyType))

describe('AllCards', () => {
  it('アビリティ値をマスタから復元できる', () => {
    const card = AllCards.find((entry) => entry.name === 'いめーじとれーにんぐ')
    expect(card).toBeDefined()
    expect(card?.abilities[0].values['0']).toBe('2.8%')
    expect(card?.abilities[2].values['4']).toBe('100%')
  })

  it('source_detail を持つカードで詳細名を保持する', () => {
    const card = AllCards.find((entry) => entry.source_detail?.startsWith('イベント「'))
    expect(card).toBeDefined()
    expect(card?.source).toBe('event')
    expect(card?.source_detail).toContain('イベント「')
  })

  it('全アビリティが有効な trigger_key を持つ', () => {
    for (const card of AllCards) {
      for (const ability of card.abilities) {
        expect(validTriggerKeys.has(ability.trigger_key), `${card.name} の ${ability.name_key} に無効な trigger_key: ${ability.trigger_key}`).toBe(true)
      }
    }
  })

  it('全アビリティの値文字列が数値にパースできる', () => {
    for (const card of AllCards) {
      for (const ability of card.abilities) {
        for (const [uncap, valueStr] of Object.entries(ability.values)) {
          // 空文字列はアビリティ未解放（stageIndex=0）を示す正当な値なのでスキップ
          if (valueStr === '') continue
          const cleaned = valueStr.replace(PERCENT_SIGN, '').replace(PLUS_SIGN, '').trim()
          const parsed = parseFloat(cleaned)
          expect(Number.isFinite(parsed), `${card.name} の ${ability.name_key} 凸${uncap} の値 "${valueStr}" が数値にパースできない`).toBe(true)
        }
      }
    }
  })

  it('全カードが events 配列を持つ', () => {
    for (const card of AllCards) {
      expect(Array.isArray(card.events), `${card.name} の events が配列でない`).toBe(true)
      expect(card.events.length, `${card.name} の events が空`).toBeGreaterThan(0)
    }
  })

  it('Pアイテムのブーストがあるカードは必ず effectData を持つ', () => {
    for (const card of AllCards) {
      if (card.p_item?.boost) {
        expect(card.p_item.effect, `${card.name} の Pアイテムに boost はあるが effect がない`).toBeDefined()
      }
    }
  })
})
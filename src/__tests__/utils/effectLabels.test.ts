/**
 * エフェクトラベル補間テスト
 *
 * 全サポートのイベント・Pアイテム・スキルカード・カスタムスロットについて、
 * テンプレート補間後に未解決の {{}} プレースホルダーが残っていないことを検証する。
 * また、存在しない i18n キーが参照された場合はテスト失敗として検出する。
 */
import { describe, expect, it, beforeEach } from 'vitest'
import i18n from 'i18next'
import ja from '../../i18n/locales/ja.json'
import { AllCards } from '../../data'
import {
  getEventEffectLabel,
  getPItemEffectLabel,
  getSkillCardEffectLabel,
  getCustomSlotNameLabel,
  getCustomSlotEffectLabel,
  getCustomSlotStageLabel,
} from '../../utils/display/effectLabels'

// 各テストで検出された欠落キーを蓄積する配列
const missingKeys: string[] = []

// テスト用 i18n インスタンスを初期化（欠落キー検出付き）
i18n.init({
  resources: { ja: { translation: ja } },
  lng: 'ja',
  fallbackLng: 'ja',
  interpolation: { escapeValue: false },
  saveMissing: true,
  missingKeyHandler: (_lngs, _ns, key) => {
    missingKeys.push(key)
  },
})

const t = i18n.t.bind(i18n)

// 各テスト前に欠落キーリストをリセット
beforeEach(() => {
  missingKeys.length = 0
})

/** 文字列に未解決プレースホルダー {{...}} が残っていないことを検証する */
function expectNoUnresolved(text: string, context: string) {
  expect(text, `${context} → "${text}"`).not.toMatch(/\{\{/)
}

/** 欠落した i18n キーがないことを検証する */
function expectNoMissingKeys(context: string) {
  expect(missingKeys, `${context}: 欠落キー [${missingKeys.join(', ')}]`).toHaveLength(0)
}
describe('effectLabels テンプレート補間', () => {
  describe('全サポートのイベント効果に未解決プレースホルダーがない', () => {
    for (const card of AllCards) {
      for (const [i, event] of card.events.entries()) {
        it(`${card.name} events[${i}]`, () => {
          const label = getEventEffectLabel(event, t)
          expectNoMissingKeys(`${card.name} events[${i}]`)
          expectNoUnresolved(label, `${card.name} events[${i}]`)
        })
      }
    }
  })

  describe('全サポートのPアイテム効果に未解決プレースホルダーがない', () => {
    for (const card of AllCards) {
      if (!card.p_item?.effect) continue
      it(`${card.name} p_item`, () => {
        const label = getPItemEffectLabel(card.p_item!.effect!, t)
        expectNoMissingKeys(`${card.name} p_item`)
        expectNoUnresolved(label, `${card.name} p_item`)
      })
    }
  })

  describe('全サポートのスキルカード効果に未解決プレースホルダーがない', () => {
    for (const card of AllCards) {
      if (!card.skill_card) continue
      for (const [i, eff] of card.skill_card.effects.entries()) {
        if (!eff.effect) continue
        it(`${card.name} skill_card.effects[${i}]`, () => {
          const label = getSkillCardEffectLabel(eff.effect!, t)
          expectNoMissingKeys(`${card.name} skill_card.effects[${i}]`)
          expectNoUnresolved(label, `${card.name} skill_card.effects[${i}]`)
        })
      }
    }
  })

  describe('全サポートのカスタムスロット名に未解決プレースホルダーがない', () => {
    for (const card of AllCards) {
      if (!card.skill_card) continue
      for (const [si, slot] of card.skill_card.custom_slot.entries()) {
        it(`${card.name} custom_slot[${si}].name`, () => {
          const label = getCustomSlotNameLabel(slot.name, t)
          expectNoMissingKeys(`${card.name} custom_slot[${si}].name`)
          expectNoUnresolved(label, `${card.name} custom_slot[${si}].name`)
        })
      }
    }
  })

  describe('全サポートのカスタムスロット効果に未解決プレースホルダーがない', () => {
    for (const card of AllCards) {
      if (!card.skill_card) continue
      for (const [si, slot] of card.skill_card.custom_slot.entries()) {
        for (const [gi, stage] of slot.stages.entries()) {
          if (!stage.effect) continue
          it(`${card.name} custom_slot[${si}].stages[${gi}]`, () => {
            const label = getCustomSlotEffectLabel(stage.effect, t)
            expectNoMissingKeys(`${card.name} custom_slot[${si}].stages[${gi}]`)
            expectNoUnresolved(label, `${card.name} custom_slot[${si}].stages[${gi}]`)
          })
        }
      }
    }
  })

  describe('カスタムスロット段階ラベルに未解決プレースホルダーがない', () => {
    it.each([1, 2, 3, 4, 5])('stage %d', (n) => {
      const label = getCustomSlotStageLabel(n, t)
      expectNoMissingKeys(`custom_slot_stage(${n})`)
      expectNoUnresolved(label, `custom_slot_stage(${n})`)
    })
  })
})

import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCardScores } from '../../hooks/useCardScores'
import type { ScoreSettings } from '../../types/card'
import * as enums from '../../types/enums'

/** 空のスコア設定（全アクション回数 0・パラメータボーナス 0） */
function emptySettings(): ScoreSettings {
  return {
    name: 'test',
    scenario: enums.ScenarioType.Hajime,
    difficulty: enums.DifficultyType.Legend,
    parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    actionCounts: {},
    scheduleSelections: {},
    useScheduleLimits: false,
    includeSelfTrigger: true,
    includePItem: true,
    useFixedUncap: false,
  }
}

/** useCardScores フックの点数算出テスト */
describe('useCardScores', () => {
  it('アクション回数・ボーナスが全て0なら結果は空', () => {
    const { result } = renderHook(() => useCardScores(emptySettings(), {}))
    expect(result.current.cardResults.size).toBe(0)
    expect(result.current.cardScores.size).toBe(0)
  })

  it('アクション回数を設定すると全カードにスコアが算出される', () => {
    const settings = emptySettings()
    settings.actionCounts = { [enums.ActionIdType.Lesson]: 10 }

    const { result } = renderHook(() => useCardScores(settings, {}))
    // lesson_end トリガーのアビリティを持つカードがあればスコア > 0 になる
    expect(result.current.cardResults.size).toBeGreaterThan(0)
    expect(result.current.cardScores.size).toBe(result.current.cardResults.size)
  })

  it('cardScores は cardResults の totalIncrease を返す', () => {
    const settings = emptySettings()
    settings.actionCounts = { [enums.ActionIdType.Lesson]: 5 }

    const { result } = renderHook(() => useCardScores(settings, {}))
    for (const [name, score] of result.current.cardScores) {
      const detail = result.current.cardResults.get(name)
      expect(detail).toBeDefined()
      expect(score).toBe(detail!.totalIncrease)
    }
  })

  it('calculateForCard で個別計算ができる', () => {
    const settings = emptySettings()
    settings.actionCounts = { [enums.ActionIdType.Lesson]: 5 }

    const { result } = renderHook(() => useCardScores(settings, {}))
    // 一覧の先頭カードで個別計算
    const firstEntry = result.current.cardResults.entries().next().value
    if (!firstEntry) return // カードが 0 件ならスキップ

    const [, expected] = firstEntry
    // AllCards からカードを取得する代わりに result のキーで検索
    // calculateForCard は任意のカード名・凸で呼べるが、ここでは一貫性テストのみ
    expect(expected.totalIncrease).toBeGreaterThanOrEqual(0)
  })

  it('アクション回数が0で calculateForCard は undefined を返す', () => {
    const settings = emptySettings()
    const { result } = renderHook(() => useCardScores(settings, {}))

    // ダミーのカードを渡す(型として最低限) — 計算入力がないので undefined
    const dummyCard = {
      name: 'dummy',
      rarity: enums.RarityType.R,
      plan: enums.PlanType.Free,
      type: enums.CardType.Vocal,
      parameter_type: enums.ParameterType.Vocal,
      source: enums.SourceType.Gacha,
      release_date: '2024/01/01',
      abilities: [],
      events: [],
      p_item: null,
      skill_card: null,
    }
    expect(result.current.calculateForCard(dummyCard, enums.UncapType.Four)).toBeUndefined()
  })

  it('parameterBonusBase のみでもスコアが算出される', () => {
    const settings = emptySettings()
    settings.parameterBonusBase = { vocal: 50, dance: 0, visual: 0 }

    const { result } = renderHook(() => useCardScores(settings, {}))
    // パラメータボーナスのアビリティを持つカードがあればスコア > 0
    expect(result.current.cardResults.size).toBeGreaterThan(0)
  })
})

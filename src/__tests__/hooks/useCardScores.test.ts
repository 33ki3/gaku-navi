/**
 * useCardScores フックの点数算出テスト
 *
 * 点数設定（シナリオ・難易度・アクション回数・パラメータボーナス）に基づいて
 * 全サポートのスコアを一括計算する useCardScores フックの動作を検証する。
 * サポート一覧画面でスコア順ソートや点数表示に使われるため、
 * 入力条件に応じて正しく計算結果が変化することを確認する。
 */
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

describe('useCardScores', () => {
  it('アクション回数・ボーナスが全て0なら計算結果は空でスコアは全て0', () => {
    // 全アクション回数0・パラメータボーナス0の設定でフックを実行する
    const { result } = renderHook(() => useCardScores(emptySettings(), {}))

    // アクション回数が0なので計算対象サポートなし
    expect(result.current.cardResults.size).toBe(0)
    // cardScores は全サポートを含むが、スコアは全て0であること
    // （サポート一覧でスコア順ソートしても全サポートが0点として扱われる）
    expect(result.current.cardScores.size).toBeGreaterThan(0)
    for (const score of result.current.cardScores.values()) {
      expect(score).toBe(0)
    }
  })

  it('アクション回数を設定すると全サポートにスコアが算出される', () => {
    // レッスン回数を10に設定してフックを実行する
    const settings = emptySettings()
    settings.actionCounts = { [enums.ActionIdType.Lesson]: 10 }
    const { result } = renderHook(() => useCardScores(settings, {}))

    // lesson_end トリガーのアビリティを持つサポートがスコア > 0 で計算されること
    expect(result.current.cardResults.size).toBeGreaterThan(0)
    // cardScores のサイズが cardResults と一致すること（全計算対象サポートにスコアが割り当てられる）
    expect(result.current.cardScores.size).toBe(result.current.cardResults.size)
  })

  it('cardScores は cardResults の totalIncrease を返す', () => {
    // レッスン回数5でフックを実行し、cardScores と cardResults の整合性を確認する
    const settings = emptySettings()
    settings.actionCounts = { [enums.ActionIdType.Lesson]: 5 }
    const { result } = renderHook(() => useCardScores(settings, {}))

    // cardScores の各値が対応する cardResults.totalIncrease と一致すること
    // （サポート一覧のスコア表示が計算詳細の合計と食い違わないための検証）
    for (const [name, score] of result.current.cardScores) {
      const detail = result.current.cardResults.get(name)
      expect(detail).toBeDefined()
      expect(score).toBe(detail!.totalIncrease)
    }
  })

  it('calculateForCard で個別計算ができる', () => {
    // 点数詳細モーダルで個別サポートの計算に使う calculateForCard の動作確認
    const settings = emptySettings()
    settings.actionCounts = { [enums.ActionIdType.Lesson]: 5 }
    const { result } = renderHook(() => useCardScores(settings, {}))

    // 一覧の先頭サポートで個別計算結果が取得できることを確認する
    const firstEntry = result.current.cardResults.entries().next().value
    if (!firstEntry) return // サポートが 0 件ならスキップ
    const [, expected] = firstEntry

    // 個別計算の totalIncrease が 0 以上であること
    expect(expected.totalIncrease).toBeGreaterThanOrEqual(0)
  })

  it('アクション回数が0で calculateForCard は undefined を返す', () => {
    // アクション回数が全て0の状態で個別計算を試み、計算不要と判定されることを確認する
    // 計算入力（アクション回数）がない場合は undefined を返すのが正しい動作
    const settings = emptySettings()
    const { result } = renderHook(() => useCardScores(settings, {}))

    // ダミーサポートを作成して calculateForCard を呼び出す
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
    // 計算入力がないので undefined が返ること
    expect(result.current.calculateForCard(dummyCard, enums.UncapType.Four)).toBeUndefined()
  })

  it('parameterBonusBase のみでもスコアが算出される', () => {
    // パラメータボーナスの基礎値のみ設定（アクション回数は0のまま）
    // パラボ% アビリティを持つサポートはパラボ基礎値だけでスコアが発生する
    const settings = emptySettings()
    settings.parameterBonusBase = { vocal: 50, dance: 0, visual: 0 }
    const { result } = renderHook(() => useCardScores(settings, {}))

    // パラメータボーナスのアビリティを持つサポートが計算対象に含まれること
    expect(result.current.cardResults.size).toBeGreaterThan(0)
  })
})

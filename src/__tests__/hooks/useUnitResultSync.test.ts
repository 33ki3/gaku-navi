/**
 * 最適編成パネル再マウント時の手動編成再計算を検証する。
 *
 * PCでパネルを閉じたままカードを追加して6枠目で選択モードが終了すると、計算前にパネルがアンマウントされる。
 * その後の再マウントで保存設定と古い結果が不一致なら、現在のカードを再評価することを確認する。
 */
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as data from '../../data'
import { useUnitResultSync } from '../../hooks/useUnitResultSync'
import type { ScoreSettings } from '../../types/card'
import * as enums from '../../types/enums'
import type { UnitResult } from '../../types/unit'

const scoreSettings = {} as ScoreSettings

function makeResult(cardName: string): UnitResult {
  // 同期判定に必要なカード名だけを有効値にし、その他の計算結果はテスト用の空値にする
  const card = data.AllCards.find((candidate) => candidate.name === cardName) ?? data.AllCards[0]
  return {
    members: [
      {
        card,
        uncap: enums.UncapType.Four,
        isRental: false,
        result: {} as UnitResult['members'][number]['result'],
        supportSynergy: 0,
        supportSynergyDetail: {},
        synergyProviders: [],
        paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
      },
    ],
    totalScore: 0,
    totalParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
    parameterBonus: { vocal: 0, dance: 0, visual: 0 },
    parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    outsideParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
  }
}

describe('useUnitResultSync', () => {
  it('再マウント時に保存設定へ追加されたカードを再評価する', () => {
    const first = data.AllCards[0].name
    const second = data.AllCards[1].name
    const evaluateCurrentCards = vi.fn()

    // 保存結果は1枚、保存設定は2枚にして、再マウント時の不一致を再現する
    renderHook(() =>
      useUnitResultSync({
        result: makeResult(first),
        manualCards: [first, second],
        cardCountCustom: {},
        scoreSettings,
        recalculateScores: vi.fn(),
        evaluateCurrentCards,
      }),
    )

    // 初回effectで現在の2枚構成を再評価する処理が、重複なく1回だけ呼ばれる
    expect(evaluateCurrentCards).toHaveBeenCalledOnce()
  })

  it('計算結果と手動編成が一致している場合は再評価しない', () => {
    const first = data.AllCards[0].name
    const second = data.AllCards[1].name
    const evaluateCurrentCards = vi.fn()
    const initialResult = makeResult(first)

    const { rerender } = renderHook(
      ({ result, manualCards }: { result: UnitResult; manualCards: (string | null)[] }) =>
        useUnitResultSync({
          result,
          manualCards,
          cardCountCustom: {},
          scoreSettings,
          recalculateScores: vi.fn(),
          evaluateCurrentCards,
        }),
      { initialProps: { result: initialResult, manualCards: [first] } },
    )

    // 最適化結果と手動編成が同時に反映された場合は、同じ編成を再評価しない
    const optimizedResult = makeResult(second)
    rerender({ result: optimizedResult, manualCards: [second] })
    expect(evaluateCurrentCards).not.toHaveBeenCalled()

    // 手動編成だけが結果とずれた場合は、古い結果なので再評価する
    rerender({ result: optimizedResult, manualCards: [first] })
    expect(evaluateCurrentCards).toHaveBeenCalledOnce()
  })
})

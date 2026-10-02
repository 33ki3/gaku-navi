/** 実際の編成フックで凸数変更後の再評価と保存結果を検証する */
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as constant from '../../constant'
import * as data from '../../data'
import { useUnitResultSync } from '../../hooks/useUnitResultSync'
import { useUnitSimulator } from '../../hooks/useUnitSimulator'
import { useUnitSimulatorSettingsState } from '../../hooks/useUnitSimulatorSettingsState'
import type { CardCountCustom } from '../../types/card'
import type { UncapType } from '../../types/enums'
import * as enums from '../../types/enums'
import { createDefaultSettings } from '../../utils/scoreSettings'
import { loadUnitResult } from '../../utils/unitResultStorage'
import { evaluateManualUnit } from '../../utils/unitSimulator'
import { saveUnitSimulatorSettings } from '../../utils/unitSimulatorSettings'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('編成結果の凸数同期', () => {
  it.each([false, true])('凸数変更を反映し、レンタル指定%sの条件を維持する', (isRental) => {
    localStorage.clear()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
    const card = data.AllCards.find((candidate) => candidate.name === '新たな挑戦の成功ですわ！')
    if (!card) throw new Error('凸数比較用カードがありません')
    const cards = [card]
    const cardByName = new Map([[card.name, card]])
    const settings = {
      ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
      selectedCards: [card.name],
      rentalCardName: isRental ? card.name : null,
    }
    saveUnitSimulatorSettings(settings)
    const scoreSettings = {
      ...createDefaultSettings(enums.ScenarioType.Hajime),
      useFixedUncap: false,
      useScheduleLimits: false,
      parameterBonusBase: { vocal: 1000, dance: 1000, visual: 1000 },
      actionCounts: Object.fromEntries(Object.values(enums.ActionIdType).map((id) => [id, 8])),
    }
    const cardCountCustom: CardCountCustom = {}
    const initialProps: { cardUncaps: Record<string, UncapType> } = {
      cardUncaps: { [card.name]: enums.UncapType.Zero },
    }
    const { result, rerender } = renderHook(
      ({ cardUncaps }: { cardUncaps: Record<string, UncapType> }) => {
        const state = useUnitSimulatorSettingsState()
        const simulator = useUnitSimulator(cards, cardByName, scoreSettings, state, cardUncaps, cardCountCustom)
        useUnitResultSync({
          result: simulator.result,
          selectedCards: state.settings.selectedCards,
          rentalCardName: state.settings.rentalCardName,
          cardCountCustom,
          cardUncaps,
          scoreSettings,
          recalculateScores: simulator.recalculateScores,
          evaluateCurrentCards: simulator.evaluateCurrentCards,
        })
        return simulator
      },
      { initialProps },
    )
    act(() => result.current.evaluateCurrentCards())
    const before = result.current.result
    expect(before?.members[0].uncap).toBe(isRental ? enums.UncapType.Four : enums.UncapType.Zero)
    rerender({ cardUncaps: { [card.name]: enums.UncapType.Four } })
    const expected = evaluateManualUnit({
      settings,
      scoreSettings,
      allCards: cards,
      cardByName,
      cardUncaps: { [card.name]: enums.UncapType.Four },
      excludedCardNames: [],
    })
    expect(result.current.result?.members[0].uncap).toBe(enums.UncapType.Four)
    expect(result.current.result?.totalScore).toBe(expected?.totalScore)
    if (isRental) expect(result.current.result?.totalScore).toBe(before?.totalScore)
    else expect(result.current.result?.totalScore).not.toBe(before?.totalScore)
    expect(loadUnitResult(cardByName).result?.totalScore).toBe(expected?.totalScore)
  })
})

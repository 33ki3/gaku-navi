/**
 * 最適計算中の手動編成表示を検証する。
 *
 * 手動設定と直前の計算結果が一致しない場合も、計算中は現在の手動編成の
 * スロット一覧を表示し続け、計算完了まで一覧が消えないことを確認する
 */
import { render, screen } from '@testing-library/react'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import { UnitOptimizationSection } from '../../../components/unitSimulator/UnitOptimizationSection'
import * as constant from '../../../constant'
import * as data from '../../../data'
import i18n from '../../../i18n'
import * as enums from '../../../types/enums'
import type { UnitMember, UnitResult } from '../../../types/unit'
import { createEmptyResult } from '../../../utils/calculator/calculateCard'
import { createDefaultSettings } from '../../../utils/scoreSettings'

function createMember(cardName: string): UnitMember {
  // 結果表示に必要なカードだけを実データから取り出し、表示可能な0点の結果を持たせる
  const card = data.AllCards.find((candidate) => candidate.name === cardName) ?? data.AllCards[0]
  return {
    card,
    uncap: enums.UncapType.Four,
    isRental: false,
    result: createEmptyResult(card),
    supportSynergy: 0,
    supportSynergyDetail: {},
    synergyProviders: [],
    paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
  }
}

function createResult(cardNames: string[]): UnitResult {
  // テストではカード名の一致判定だけが目的なので、合計値はすべて0に固定する
  return {
    members: cardNames.map(createMember),
    totalScore: 0,
    totalParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
    parameterBonus: { vocal: 0, dance: 0, visual: 0 },
    parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    outsideParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
  }
}

describe('UnitOptimizationSection', () => {
  it('手動編成と古い結果が異なる計算中もユニット一覧を表示する', () => {
    const first = data.AllCards[0].name
    const second = data.AllCards[1].name
    // 設定には2枚ある一方、保存済み結果には1枚しかない「計算結果が古い」状態を作る
    const settings = {
      ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
      manualCards: [first, second],
    }

    // 計算中フラグを立て、古い1枚結果と現在の2枚設定が混在する状態を表示する
    render(
      React.createElement(
        I18nextProvider,
        { i18n },
        React.createElement(UnitOptimizationSection, {
          simulator: {
            settings,
            setSettings: vi.fn(),
            optimizeRemaining: vi.fn(),
            cancelOptimize: vi.fn(),
            isCalculating: true,
            result: createResult([first]),
            hasCalculated: true,
            noCandidates: false,
            exhaustiveProgress: null,
          },
          manualSelection: {
            active: false,
            setActive: vi.fn(),
            startSlotSelection: vi.fn(),
            clearTargetSlot: vi.fn(),
          },
          scoreSettings: createDefaultSettings(enums.ScenarioType.Hajime),
          countCustom: {
            cardCountCustom: {},
            setSelfTrigger: vi.fn(),
            removeSelfTrigger: vi.fn(),
            setPItemCount: vi.fn(),
            removePItemCount: vi.fn(),
            clearCardCustom: vi.fn(),
          },
          customizedCardNames: new Set<string>(),
          allCardByName: new Map(data.AllCards.map((card) => [card.name, card])),
        }),
      ),
    )

    // 古い結果側のカード一覧と、結果ビューの合計値ラベルが消えないことを確認する
    expect(screen.getByText(first)).toBeTruthy()
    expect(screen.getByText('合計パラメータ上昇量')).toBeTruthy()
    // 新しい手動設定は計算完了後に結果へ反映するため、計算中の結果一覧にはまだ出ない
    expect(screen.queryByText(second)).toBeNull()
  })
})

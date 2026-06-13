import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import { CardDetailSections } from '../../../components/cardDetailModal/CardDetailSections'
import i18n from '../../../i18n'
import * as data from '../../../data'
import * as enums from '../../../types/enums'
import type { CardCalculationResult, SupportCard } from '../../../types/card'

const testCard: SupportCard = {
  name: 'テストサポート',
  rarity: enums.RarityType.SSR,
  plan: enums.PlanType.Free,
  type: enums.CardType.Vocal,
  parameter_type: enums.ParameterType.Vocal,
  source: enums.SourceType.Gacha,
  release_date: '2026/06/13',
  abilities: [],
  events: [],
  p_item: null,
  skill_card: null,
}

const emptyScoreResult: CardCalculationResult = {
  cardName: testCard.name,
  parameterType: enums.ParameterType.Vocal,
  eventBoost: 0,
  abilityBoosts: [],
  allAbilityDetails: [],
  parameterBonus: 0,
  paramBonusPercent: 0,
  paramBonusBase: 0,
  eventBoostBase: 0,
  eventBoostPercent: 0,
  totalIncrease: 0,
  autoCounts: {},
}

function renderSections(isUncapChanged: boolean, onSaveUncap = vi.fn()) {
  return render(
    React.createElement(
      I18nextProvider,
      { i18n },
      React.createElement(CardDetailSections, {
        card: testCard,
        colors: data.getTypeEntry(testCard.type),
        uncap: enums.UncapType.Three,
        onUncapChange: vi.fn(),
        isUncapChanged,
        onSaveUncap,
        scoreResult: emptyScoreResult,
      }),
    ),
  )
}

describe('CardDetailSections', () => {
  it('凸数が保存済みの値と同じなら保存ボタンを表示しない', () => {
    renderSections(false)

    expect(screen.queryByRole('button', { name: '保存' })).toBeNull()
  })

  it('凸数が変更されているときだけ保存ボタンから保存できる', () => {
    const onSaveUncap = vi.fn()
    renderSections(true, onSaveUncap)

    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(onSaveUncap).toHaveBeenCalledTimes(1)
  })
})

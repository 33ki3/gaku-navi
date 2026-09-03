/**
 * サポート一覧カードのクリック振り分けを検証する。
 *
 * 手動編成中はカード本体だけでなくスコア行を押しても編成へ追加し、通常時だけスコア詳細を開くことを期待する。
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import { CardListItem } from '../../../components/cardList/CardListItem'
import { CardDataProvider, CardUIProvider } from '../../../contexts/CardContext'
import * as data from '../../../data'
import i18n from '../../../i18n'
import * as enums from '../../../types/enums'
import { hasSPAbility } from '../../../utils/cardQuery'

/** 実カードを一覧へ渡し、手動編成中と通常時でクリック先が変わることを検証する */
const targetCard = data.AllCards[0]

function renderCard(
  unitCardSelectMode: boolean,
  onCardClick = vi.fn(),
  onScoreClick = vi.fn(),
  uncapEditMode = false,
  isCardExcluded = () => false,
  cardExclusionEditMode = false,
  card = targetCard,
) {
  // 実画面と同じ2つのContextを用意し、カードのクリック処理へ選択モードを渡す
  const cardListMode = cardExclusionEditMode
    ? enums.CardListInteractionModeType.CardExclusionEdit
    : unitCardSelectMode
      ? enums.CardListInteractionModeType.UnitCardSelect
      : enums.CardListInteractionModeType.None
  return render(
    React.createElement(
      I18nextProvider,
      { i18n },
      React.createElement(
        CardDataProvider,
        {
          value: {
            getCardUncap: () => enums.UncapType.Four,
            onCardClick,
            onScoreClick,
            onUncapChange: vi.fn(),
            isCardExcluded,
          },
        },
        React.createElement(
          CardUIProvider,
          {
            value: {
              cardListMode,
              uncapEditMode,
              onToggleUncapEdit: vi.fn(),
              isCardEligible: () => true,
            },
          },
          React.createElement(CardListItem, {
            card,
            uncap: enums.UncapType.Four,
            score: 123,
            abilityBadges: [],
            hasCountCustom: false,
          }),
        ),
      ),
    ),
  )
}

describe('CardListItem', () => {
  it('手動編成中にスコア行を押してもカード選択へ渡す', () => {
    const onCardClick = vi.fn()
    const onScoreClick = vi.fn()
    renderCard(true, onCardClick, onScoreClick)

    // 手動編成中のスコア行クリックは、内訳ではなく
    // カード追加用のクリックとして扱う
    fireEvent.click(screen.getByTitle('クリックで内訳を表示'))

    // 選択中はカードクリックだけが呼ばれ、スコア詳細のハンドラは呼ばれない
    expect(onCardClick).toHaveBeenCalledWith(targetCard)
    expect(onScoreClick).not.toHaveBeenCalled()
  })

  it('通常時のスコア行はスコア詳細へ渡す', () => {
    const onCardClick = vi.fn()
    // 実際のアプリ側ハンドラと同じく、詳細クリックで親カードへの伝播を止める
    const onScoreClick = vi.fn((_card, event: React.MouseEvent) => event.stopPropagation())
    renderCard(false, onCardClick, onScoreClick)

    // 通常時の同じ操作はスコア詳細のクリック領域へ渡す
    fireEvent.click(screen.getAllByTitle('クリックで内訳を表示').at(-1)!)

    // 詳細ハンドラは1回だけ呼ばれ、親カードのクリックへは伝播しない
    expect(onScoreClick).toHaveBeenCalledOnce()
    expect(onCardClick).not.toHaveBeenCalled()
  })

  it('除外設定モードでカード本体をタップすると最適編成からの除外を切り替える', () => {
    const onCardClick = vi.fn()
    const { container } = renderCard(false, onCardClick, vi.fn(), false, () => false, true)

    fireEvent.click(within(container).getByText(targetCard.name))

    expect(onCardClick).toHaveBeenCalledWith(targetCard)
  })

  it('凸数編集は除外設定中もセレクターを表示したまま操作できない', () => {
    const { container } = renderCard(false, vi.fn(), vi.fn(), true, () => false, true)

    const uncapButton = within(container).getByRole('button', { name: '4凸' }) as HTMLButtonElement
    expect(uncapButton.disabled).toBe(true)
  })

  it('除外済みカードは一覧に残り、右上に除外バッジを表示する', () => {
    const { container } = renderCard(false, vi.fn(), vi.fn(), false, () => true, true)

    const exclusionBadge = within(container).getByText('除外中')
    expect(exclusionBadge.parentElement?.className).toContain('absolute')
    expect(exclusionBadge.parentElement?.className).toContain('top-2')
    expect(exclusionBadge.parentElement?.className).toContain('right-2')
    expect(exclusionBadge.className).toContain('bg-slate-700')
    expect(within(container).getByText(targetCard.name)).toBeTruthy()
  })

  it('手動編成中も除外バッジを表示したまま選択できる', () => {
    const onCardClick = vi.fn()
    const { container } = renderCard(true, onCardClick, vi.fn(), false, () => true)

    expect(within(container).getByText('除外中')).toBeTruthy()

    fireEvent.click(within(container).getByText(targetCard.name))

    expect(onCardClick).toHaveBeenCalledWith(targetCard)
  })

  it('手動編成中も凸数セレクターを表示したまま操作できない', () => {
    const { container } = renderCard(true, vi.fn(), vi.fn(), true)

    const uncapButton = within(container).getByRole('button', { name: '4凸' }) as HTMLButtonElement
    expect(uncapButton.disabled).toBe(true)
  })

  it('SPバッジの位置を維持し、除外バッジをさらに右上に重ねる', () => {
    const spCard = data.AllCards.find(hasSPAbility)
    expect(spCard).toBeDefined()
    const { container } = renderCard(false, vi.fn(), vi.fn(), false, () => true, true, spCard!)

    const spBadge = within(container).getByText('SP')
    const exclusionBadge = within(container).getByText('除外中')
    expect(spBadge.parentElement).toBe(exclusionBadge.parentElement)
    expect(spBadge.parentElement?.className).toContain('top-2')
    expect(spBadge.parentElement?.className).toContain('right-2')
    expect(spBadge.parentElement?.className).toContain('gap-1')
  })
})

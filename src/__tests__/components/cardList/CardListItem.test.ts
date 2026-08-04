/**
 * サポート一覧カードのクリック振り分けを検証する。
 *
 * 手動編成中はカード本体だけでなくスコア行を押しても編成へ追加し、通常時だけスコア詳細を開くことを期待する。
 */
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import { CardListItem } from '../../../components/cardList/CardListItem'
import { CardDataProvider, CardUIProvider } from '../../../contexts/CardContext'
import * as data from '../../../data'
import i18n from '../../../i18n'
import * as enums from '../../../types/enums'

/** 実カードを一覧へ渡し、手動編成中と通常時でクリック先が変わることを検証する */
const targetCard = data.AllCards[0]

function renderCard(unitCardSelectMode: boolean, onCardClick = vi.fn(), onScoreClick = vi.fn()) {
  // 実画面と同じ2つのContextを用意し、カードのクリック処理へ選択モードを渡す
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
          },
        },
        React.createElement(
          CardUIProvider,
          {
            value: {
              uncapEditMode: false,
              onToggleUncapEdit: vi.fn(),
              unitCardSelectMode,
              isCardEligible: () => true,
            },
          },
          React.createElement(CardListItem, {
            card: targetCard,
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
})

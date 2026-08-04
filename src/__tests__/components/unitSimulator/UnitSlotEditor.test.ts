/**
 * 手動編成スロットの表示を検証する。
 *
 * ユーザー追加サポートは静的な AllCards に含まれないため、最適編成へ渡されたカードマップから表示できることを確認する
 */
import { render, screen } from '@testing-library/react'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import UnitSlotEditor from '../../../components/unitSimulator/UnitSlotEditor'
import * as data from '../../../data'
import i18n from '../../../i18n'

describe('UnitSlotEditor', () => {
  it('ユーザー追加サポートをカードマップから表示する', () => {
    // 静的マスタにはない名前を持つカードを、パネルから渡される名前→カードMapへ登録する
    const userCard = { ...data.AllCards[0], name: 'テストユーザーサポート' }

    // スロットにはその名前だけを設定し、エディターがMapのカード情報を使って描画できるようにする
    render(
      React.createElement(
        I18nextProvider,
        { i18n },
        React.createElement(UnitSlotEditor, {
          cards: [userCard.name],
          cardByName: new Map([[userCard.name, userCard]]),
          onRemoveCard: vi.fn(),
          onStartSelect: vi.fn(),
          selectMode: false,
        }),
      ),
    )

    // 静的AllCardsを直接参照せず、ユーザー追加カードの名前がスロットへ表示されることを確認する
    expect(screen.getByText(userCard.name)).toBeTruthy()
  })
})

/**
 * 手動編成スロットの表示を検証する
 *
 * ユーザー追加サポートは静的な一覧に含まれないため、
 * 最適編成へ渡されたカード一覧から表示できることを確認する
 */
import { render, screen } from '@testing-library/react'
import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import UnitSlotEditor from '../../../components/unitSimulator/UnitSlotEditor'
import * as data from '../../../data'
import i18n from '../../../i18n'

describe('UnitSlotEditor', () => {
  it('ユーザー追加サポートをカード一覧から表示する', () => {
    // 組み込みカード一覧にはない名前のカードを、
    // パネルから渡されるカード一覧へ登録する
    const userCard = { ...data.AllCards[0], name: 'テストユーザーサポート' }

    // スロットには名前だけを設定し、
    // カード一覧から本体を参照して描画できるようにする
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

    // 静的な一覧を直接参照せず、
    // ユーザー追加カードの名前がスロットへ表示されることを確認する
    expect(screen.getByText(userCard.name)).toBeTruthy()
  })
})

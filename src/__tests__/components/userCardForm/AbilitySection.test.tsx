/**
 * サポート追加のアビリティ選択肢を検証する。
 *
 * アビリティ名はカード表示と同じキー解決を通すため、i18nキーそのものが画面に出ないことを確認する。
 */
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import AbilitySection from '../../../components/userCardForm/AbilitySection'
import { createInitialState } from '../../../hooks/formHelpers'
import i18n from '../../../i18n'

describe('AbilitySection', () => {
  it('アビリティ選択肢にi18nキーをそのまま表示しない', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AbilitySection
          form={createInitialState()}
          addAbility={vi.fn()}
          updateAbility={vi.fn()}
          removeAbility={vi.fn()}
        />
      </I18nextProvider>,
    )

    const optionLabels = screen.getAllByRole('option').map((option) => option.textContent ?? '')

    expect(optionLabels).toContain('アクティブスキルカード獲得時、ボーカル上昇')
  })
})

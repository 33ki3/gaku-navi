/**
 * 最適編成ボタンの計算中表示を検証する。
 *
 * 総当たり計算の進捗が渡されたとき、文言だけでなく
 * 支援技術向けの進捗値も更新することを確認する
 */
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import { OptimizeUnitButton } from '../../../components/unitSimulator/OptimizeUnitButton'
import i18n from '../../../i18n'

describe('OptimizeUnitButton', () => {
  it('計算中の進捗をプログレスバーとして表示する', () => {
    // 100通り中25通りまで進んだ計算状態を渡し、進捗値を固定する
    render(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(OptimizeUnitButton, {
          isCalculating: true,
          exhaustiveProgress: { done: 25, total: 100 },
          onOptimize: vi.fn(),
          onCancel: vi.fn(),
        }),
      ),
    )

    // 見た目の幅だけでなく、aria属性にも同じ計算値が反映されることを確認する
    const progress = screen.getByRole('progressbar')
    expect(progress.getAttribute('aria-valuenow')).toBe('25')
    expect(progress.getAttribute('aria-valuemax')).toBe('100')
    expect(progress.className).toContain('bg-slate-100')
    expect(progress.firstElementChild?.getAttribute('style')).toContain('width: 25%')
    expect(progress.firstElementChild?.className).toContain('bg-amber-500')
    // 高速端末でも実進捗へ即時追随させ、トランジションの遅延で止まって見えないようにする
    expect(progress.firstElementChild?.className).toContain('transition-none')
    expect(progress.firstElementChild?.className).not.toContain('rounded-r-xl')
  })
})

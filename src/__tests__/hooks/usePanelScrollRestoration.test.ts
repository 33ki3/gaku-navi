/**
 * パネルの開閉をまたいだスクロール位置復元を検証する
 */
import { fireEvent, render } from '@testing-library/react'
import { createElement, useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePanelScrollRestoration } from '../../hooks/usePanelScrollRestoration'

interface TestPanelProps {
  isOpen: boolean
}

/**
 * 実DOMの開閉を再現し、閉じる前に記録したscrollTopが
 * 再表示時に復元されることを確認する
 */
function TestPanel({ isOpen }: TestPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { handleScroll } = usePanelScrollRestoration({
    panelRef,
    isOpen,
    pinned: false,
    storageKey: 'test-panel-scroll',
  })

  if (!isOpen) return null
  // テスト用のrefをDOMへ渡すだけで、レンダー中にcurrentは参照していない
  // eslint-disable-next-line react-hooks/refs
  return createElement('div', { ref: panelRef, onScroll: handleScroll, 'data-testid': 'panel' })
}

describe('usePanelScrollRestoration', () => {
  afterEach(() => {
    // requestAnimationFrameとDOM寸法のモックを解除し、他テストのスクロール環境を汚さない
    vi.unstubAllGlobals()
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollHeight
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight
  })

  it('パネルを閉じて一覧から戻ってもスクロール位置を復元する', () => {
    // 復元処理が非同期にならないようにframeを即時実行し、スクロール可能な寸法を設定する
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 300 })

    // パネルを開いた状態でscrollTopを420まで移動し、scrollイベントで保存させる
    const view = render(createElement(TestPanel, { isOpen: true }))
    const panel = view.getByTestId('panel')
    panel.scrollTop = 420
    fireEvent.scroll(panel)

    // 一覧へ戻るため一度アンマウントし、再度パネルを表示する
    view.rerender(createElement(TestPanel, { isOpen: false }))
    view.rerender(createElement(TestPanel, { isOpen: true }))

    // 再表示後のDOMへ、保存していた420pxが復元されている
    expect(view.getByTestId('panel').scrollTop).toBe(420)
  })
})

/**
 * スマホ下部ナビのスクロール表示制御を検証する。
 *
 * ページ本体と最適編成などのパネル内部のスクロールで、同じ表示切り替えが行われることを確認する
 */
import { act, fireEvent, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMobileNavigationVisibility } from '../../hooks/useMobileNavigationVisibility'

describe('useMobileNavigationVisibility', () => {
  beforeEach(() => {
    // jsdomにはmatchMediaがないため、スマホ幅として判定できる最小実装を用意する
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: true,
        media: '(max-width: 767px)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
  })

  it('ページ本体を下へスクロールするとナビを隠す', () => {
    const { result } = renderHook(() => useMobileNavigationVisibility({ keepFixed: false, preventHiding: false }))

    // 上端で基準位置を記録してから、ページを下方向へ移動する
    act(() => {
      window.scrollY = 0
      fireEvent.scroll(document)
      window.scrollY = 120
      fireEvent.scroll(document)
    })

    // ページ移動だけでは下部ナビが画面外へ移動する
    expect(result.current.hidden).toBe(true)
  })

  it('固定パネル内部を下へスクロールするとナビを隠す', () => {
    const { result } = renderHook(() => useMobileNavigationVisibility({ keepFixed: false, preventHiding: false }))
    const panel = document.createElement('div')
    document.body.append(panel)

    // パネル内部の上端を基準位置として記録する
    act(() => {
      fireEvent.scroll(panel)
    })

    // パネルの下方向スクロールを発生させる
    act(() => {
      Object.defineProperty(panel, 'scrollTop', { configurable: true, value: 120 })
      fireEvent.scroll(panel)
    })

    // パネル内でも下方向へ進んだときは下部ナビを画面外へ移動する
    expect(result.current.hidden).toBe(true)
    panel.remove()
  })

  it('showを呼ぶと隠れていたナビを表示する', () => {
    const { result } = renderHook(() => useMobileNavigationVisibility({ keepFixed: false, preventHiding: false }))

    // ページを下方向へ動かしてナビを隠す
    act(() => {
      window.scrollY = 0
      fireEvent.scroll(document)
      window.scrollY = 120
      fireEvent.scroll(document)
    })
    expect(result.current.hidden).toBe(true)

    // 一覧からパネルへ戻る処理がshowを呼ぶ
    act(() => result.current.show())
    expect(result.current.hidden).toBe(false)
  })
})

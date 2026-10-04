/** スピナーの長押しと入力中の範囲外表示を検証する */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SpinnerInput } from '../../../components/ui/SpinnerInput'
import * as constant from '../../../constant'

function SpinnerHarness() {
  const [value, setValue] = useState(1)
  return <SpinnerInput value={value} onChange={setValue} min={0} max={3} clampOnBlur aria-label="数値" />
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('SpinnerInput', () => {
  it('通常のクリックは一度だけ反映する', () => {
    render(<SpinnerHarness />)
    const plus = screen.getByRole('button', { name: '+' })
    fireEvent.pointerDown(plus)
    act(() => vi.advanceTimersByTime(100))
    fireEvent.pointerUp(plus)
    fireEvent.click(plus, { detail: 1 })
    expect(screen.getByRole('spinbutton').getAttribute('value')).toBe('2')
  })

  it('長押しで繰り返し、上限で停止し、解除後に二重加算しない', () => {
    render(<SpinnerHarness />)
    const plus = screen.getByRole('button', { name: '+' })
    fireEvent.pointerDown(plus)
    act(() => vi.advanceTimersByTime(constant.PRESS_REPEAT_DELAY_MS))
    expect(screen.getByRole('spinbutton').getAttribute('value')).toBe('2')
    act(() => vi.advanceTimersByTime(constant.PRESS_REPEAT_INTERVAL_MS))
    expect(screen.getByRole('spinbutton').getAttribute('value')).toBe('3')
    expect(plus.hasAttribute('disabled')).toBe(true)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('spinbutton').getAttribute('value')).toBe('3')
    fireEvent.pointerUp(plus)
    fireEvent.click(plus, { detail: 1 })
    expect(screen.getByRole('spinbutton').getAttribute('value')).toBe('3')
  })

  it('指を離す・操作をキャンセルする・アンマウントする場合にタイマーを解除する', () => {
    const { unmount } = render(<SpinnerHarness />)
    const plus = screen.getByRole('button', { name: '+' })
    fireEvent.pointerDown(plus)
    fireEvent.pointerCancel(plus)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('spinbutton').getAttribute('value')).toBe('1')
    fireEvent.pointerDown(plus)
    act(() => vi.advanceTimersByTime(constant.PRESS_REPEAT_DELAY_MS))
    fireEvent.pointerUp(plus)
    fireEvent.click(plus, { detail: 1 })
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('spinbutton').getAttribute('value')).toBe('2')
    fireEvent.pointerDown(plus)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('長押し中に画面からフォーカスが外れた場合にも停止する', () => {
    render(<SpinnerHarness />)
    fireEvent.pointerDown(screen.getByRole('button', { name: '+' }))
    fireEvent.blur(window)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('spinbutton').getAttribute('value')).toBe('1')
  })

  it('編集中の範囲外値と空欄を維持し、フォーカスが外れたら範囲内へ丸める', () => {
    render(<SpinnerHarness />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '120' } })
    expect(input.getAttribute('value')).toBe('120')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    fireEvent.blur(input)
    expect(input.getAttribute('value')).toBe('3')
    fireEvent.change(input, { target: { value: '' } })
    expect(input.getAttribute('value')).toBe('')
    fireEvent.change(input, { target: { value: '2' } })
    expect(input.getAttribute('value')).toBe('2')
    expect(input.getAttribute('aria-invalid')).toBeNull()
  })
})

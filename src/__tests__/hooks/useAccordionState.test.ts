/**
 * アコーディオン状態hookの切り替えと初期状態への復元を検証する
 */
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAccordionState } from '../../hooks/useAccordionState'

describe('useAccordionState', () => {
  it('指定したセクションだけを切り替える', () => {
    const { result } = renderHook(() => useAccordionState({ file: true, json: false }))

    // JSONセクションだけを開き、他のセクションの状態を保持する
    act(() => result.current.toggle('json'))

    // 切り替え後はfileを開いたままjsonだけが開くことを確認する
    expect(result.current.state).toEqual({ file: true, json: true })
  })

  it('resetで初期状態へ戻す', () => {
    const initialState = { file: true, json: true }
    const { result } = renderHook(() => useAccordionState(initialState))

    // 両セクションを閉じて、モーダルを開き直した状態を再現する
    act(() => {
      result.current.toggle('file')
      result.current.toggle('json')
    })
    expect(result.current.state).toEqual({ file: false, json: false })

    // reset後は、開き直し時の初期表示へ戻ることを確認する
    act(() => result.current.reset())
    expect(result.current.state).toEqual(initialState)
  })
})

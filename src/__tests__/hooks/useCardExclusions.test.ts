/**
 * 最適編成設定に含めた除外サポートの状態同期を検証する
 */
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import * as constant from '../../constant'
import { useCardExclusions } from '../../hooks/useCardExclusions'

describe('useCardExclusions', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('除外状態を最適編成設定へ保存し、同じ画面の別利用箇所へ同期する', () => {
    const first = renderHook(() => useCardExclusions())
    const second = renderHook(() => useCardExclusions())

    act(() => first.result.current.toggleCardExcluded('除外カード'))

    expect(first.result.current.isCardExcluded('除外カード')).toBe(true)
    expect(second.result.current.isCardExcluded('除外カード')).toBe(true)
    expect(JSON.parse(localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY) ?? 'null')).toMatchObject({
      excludedCardNames: ['除外カード'],
    })
  })

  it('同じカードを再度切り替えると最適編成設定から除外状態を解除する', () => {
    const { result } = renderHook(() => useCardExclusions())

    act(() => {
      result.current.toggleCardExcluded('除外カード')
      result.current.toggleCardExcluded('除外カード')
    })

    expect(result.current.isCardExcluded('除外カード')).toBe(false)
    expect(JSON.parse(localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY) ?? 'null')).toMatchObject({
      excludedCardNames: [],
    })
  })
})

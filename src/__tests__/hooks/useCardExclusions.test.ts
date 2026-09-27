/**
 * 最適編成設定に含めた除外サポートの状態同期を検証する
 */
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import * as constant from '../../constant'
import { useCardExclusions } from '../../hooks/useCardExclusions'
import { useUnitSimulatorSettingsState } from '../../hooks/useUnitSimulatorSettingsState'

function useSharedCardExclusions() {
  const settingsState = useUnitSimulatorSettingsState()
  return {
    first: useCardExclusions(settingsState),
    second: useCardExclusions(settingsState),
  }
}

describe('useCardExclusions', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('除外状態を最適編成設定へ保存し、共有stateの別利用箇所へ同期する', () => {
    const { result } = renderHook(() => useSharedCardExclusions())

    act(() => result.current.first.toggleCardExcluded('除外カード'))

    expect(result.current.first.isCardExcluded('除外カード')).toBe(true)
    expect(result.current.second.isCardExcluded('除外カード')).toBe(true)
    expect(JSON.parse(localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY) ?? 'null')).toMatchObject({
      excludedCardNames: ['除外カード'],
    })
  })

  it('同じカードを再度切り替えると最適編成設定から除外状態を解除する', () => {
    const { result } = renderHook(() => useSharedCardExclusions())

    act(() => {
      result.current.first.toggleCardExcluded('除外カード')
      result.current.first.toggleCardExcluded('除外カード')
    })

    expect(result.current.first.isCardExcluded('除外カード')).toBe(false)
    expect(JSON.parse(localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY) ?? 'null')).toMatchObject({
      excludedCardNames: [],
    })
  })
})

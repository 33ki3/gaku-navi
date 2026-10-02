import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import * as constant from '../../constant'
import { useUserCards } from '../../hooks/useUserCards'
import * as enums from '../../types/enums'

function createStoredUserCard(name: string) {
  return {
    name,
    rarity: enums.RarityType.SSR,
    plan: enums.PlanType.Free,
    type: enums.CardType.Vocal,
    parameter_type: enums.ParameterType.Vocal,
    source: enums.SourceType.User,
    release_date: '2026/09/08',
    abilities: [],
    events: [],
    p_item: null,
    skill_card: null,
  }
}

afterEach(() => {
  localStorage.removeItem(constant.USER_SUPPORTS_STORAGE_KEY)
})

describe('useUserCards', () => {
  it('保存済みの互換カードを残し、不正要素だけをstateへ入れない', () => {
    const card = createStoredUserCard('互換カード')
    localStorage.setItem(constant.USER_SUPPORTS_STORAGE_KEY, JSON.stringify([card, null]))

    const { result } = renderHook(() => useUserCards())

    expect(result.current.userCards).toEqual([card])
  })

  it('同一ページからの全storage再読込通知を反映する', async () => {
    localStorage.setItem(constant.USER_SUPPORTS_STORAGE_KEY, JSON.stringify([createStoredUserCard('変更前')]))
    const { result } = renderHook(() => useUserCards())

    localStorage.setItem(constant.USER_SUPPORTS_STORAGE_KEY, JSON.stringify([createStoredUserCard('変更後')]))
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: null })))

    await waitFor(() => expect(result.current.userCards.map(({ name }) => name)).toEqual(['変更後']))
  })
})

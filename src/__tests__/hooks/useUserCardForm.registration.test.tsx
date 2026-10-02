import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import * as constant from '../../constant'
import * as data from '../../data'
import { useUserCardForm } from '../../hooks/useUserCardForm'
import { useUserCards } from '../../hooks/useUserCards'
import * as enums from '../../types/enums'
import type { AbilityFormRow } from '../../utils/userCardForm'

afterEach(() => {
  localStorage.removeItem(constant.USER_SUPPORTS_STORAGE_KEY)
})

const parameterTypes = Object.values(enums.ParameterType) as enums.ParameterType[]
const rarityCases = [
  { tier: enums.RarityTierType.SSR, rarity: enums.RarityType.SSR, isEventSource: false },
  { tier: enums.RarityTierType.EventSSR, rarity: enums.RarityType.SSR, isEventSource: true },
  { tier: enums.RarityTierType.SR, rarity: enums.RarityType.SR, isEventSource: false },
  { tier: enums.RarityTierType.R, rarity: enums.RarityType.R, isEventSource: false },
] as const

const cardTypesByParameter: Record<enums.ParameterType, enums.CardType> = {
  [enums.ParameterType.Vocal]: enums.CardType.Vocal,
  [enums.ParameterType.Dance]: enums.CardType.Dance,
  [enums.ParameterType.Visual]: enums.CardType.Visual,
}

function createAbilityRow(
  slotIndex: number,
  nameKey: enums.AbilityNameKeyType,
  parameterType: enums.ParameterType,
): AbilityFormRow {
  const maxCount = data.ABILITY_MAX_COUNT[nameKey]
  const isFixedSlot = slotIndex === 2 || slotIndex === 5

  return {
    nameKey,
    ...(isFixedSlot ? {} : { parameterType }),
    maxCount: maxCount === undefined ? '' : String(maxCount),
  }
}

describe.each(rarityCases)('$tier user support registration', ({ tier, rarity, isEventSource }) => {
  it.each(parameterTypes)('accepts every selectable ability for %s cards', (parameterType) => {
    const { result } = renderHook(() => ({ form: useUserCardForm(), cards: useUserCards() }))

    act(() => {
      result.current.form.setRarity(rarity)
      if (isEventSource) result.current.form.setIsEventSource(true)
      result.current.form.setType(cardTypesByParameter[parameterType])
      result.current.form.updateField('name', `registration-${tier}-${parameterType}`)
    })

    const fixedOptions = new Set<enums.AbilityNameKeyType>([
      ...data.SLOT1_OPTIONS,
      ...data.SLOT3_OPTIONS,
      ...data.SLOT6_OPTIONS[tier],
    ])
    const freeOptions = data.getAvailableAbilities(tier).filter((nameKey) => !fixedOptions.has(nameKey))
    const optionsBySlot = [
      data.SLOT1_OPTIONS,
      freeOptions,
      data.SLOT3_OPTIONS,
      freeOptions,
      freeOptions,
      data.SLOT6_OPTIONS[tier],
    ]

    act(() => {
      optionsBySlot.forEach((options, slotIndex) => {
        result.current.form.updateAbility(slotIndex, createAbilityRow(slotIndex, options[0], parameterType))
      })
    })

    const rejectedChoices: string[] = []
    optionsBySlot.forEach((options, slotIndex) => {
      options.forEach((nameKey) => {
        act(() => {
          result.current.form.updateAbility(slotIndex, createAbilityRow(slotIndex, nameKey, parameterType))
          result.current.form.updateField('name', `registration-${tier}-${parameterType}-${slotIndex + 1}-${nameKey}`)
        })

        const card = result.current.form.toSupportCard()
        let added = false
        act(() => {
          added = result.current.cards.addUserCard(card)
        })
        if (!result.current.form.isValid || !added) {
          rejectedChoices.push(`slot ${slotIndex + 1}: ${nameKey}`)
        }
      })
    })

    expect(rejectedChoices, `${tier}/${parameterType} rejected choices`).toEqual([])
  })
})

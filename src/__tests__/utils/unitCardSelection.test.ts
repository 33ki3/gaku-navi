/** 固定レンタルの判定と、採用方法に従う画面の枠配置を検証する */
import { describe, expect, it } from 'vitest'
import * as constant from '../../constant'
import { isUnitSimulatorSettings } from '../../utils/settingsValidation'
import { getLockedRentalCardName, getUnitSlotCards } from '../../utils/unitCardSelection'

describe('getLockedRentalCardName', () => {
  it('選択中のレンタルが固定一覧にある場合だけ固定レンタルと判定する', () => {
    const settings = { ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS, rentalCardName: '貸出', lockedCards: ['貸出'] }
    expect(getLockedRentalCardName(settings)).toBe('貸出')
    expect(getLockedRentalCardName({ ...settings, lockedCards: [] })).toBeNull()
  })
})

describe('getUnitSlotCards', () => {
  it('レンタル名を末尾へ表示し、通常枠の空きを表示時に補う', () => {
    expect(
      getUnitSlotCards({
        ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
        selectedCards: ['貸出', 'A', 'B'],
        rentalCardName: '貸出',
      }),
    ).toEqual(['A', 'B', null, null, null, '貸出'])
  })

  it('通常枠の空きがあっても後ろのカードを詰めない', () => {
    const selectedCards = ['A', 'B', 'C', null, 'E', '貸出']
    expect(
      getUnitSlotCards({ ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS, selectedCards, rentalCardName: '貸出' }),
    ).toEqual(selectedCards)
  })

  it('6枚選択済みの編成にはレンタル指定が必須', () => {
    const settings = { ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS, selectedCards: ['A', 'B', 'C', 'D', 'E', 'F'] }
    expect(isUnitSimulatorSettings(settings)).toBe(false)
    expect(isUnitSimulatorSettings({ ...settings, rentalCardName: 'F' })).toBe(true)
  })
})

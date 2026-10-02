/**
 * 手動編成と計算結果の同期判定を検証する。
 *
 * パネルを閉じた直後に設定だけ更新され、古い計算結果が残るケースを
 * 想定し、カード集合の追加・削除・一致をそれぞれ判定する
 */
import { describe, expect, it } from 'vitest'
import * as data from '../../data'
import type { CardCalculationResult } from '../../types/card'
import * as enums from '../../types/enums'
import type { UnitMember, UnitResult } from '../../types/unit'
import { isUnitResultSynchronized } from '../../utils/unitSelectedCards'

function makeMember(cardName: string): UnitMember {
  // 同期判定が参照するカード名とレンタル状態だけを実値にし、他の結果項目は固定値にする
  const card = data.AllCards.find((candidate) => candidate.name === cardName) ?? data.AllCards[0]
  return {
    card,
    uncap: enums.UncapType.Four,
    isRental: false,
    result: {} as CardCalculationResult,
    supportSynergy: 0,
    supportSynergyDetail: {},
    synergyProviders: [],
    paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
  }
}

function makeResult(memberNames: string[]): UnitResult {
  // 引数の順序をそのままmembersへ反映し、カード集合の比較を再現する
  return {
    members: memberNames.map(makeMember),
    totalScore: 0,
    totalParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
    parameterBonus: { vocal: 0, dance: 0, visual: 0 },
    parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    outsideParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
  }
}

describe('isUnitResultSynchronized', () => {
  const first = data.AllCards[0].name
  const second = data.AllCards[1].name

  it('通常カードの並び順が変わっても一致と判定する', () => {
    // 通常カードの表示順は計算結果の有効性に影響しない
    expect(isUnitResultSynchronized(makeResult([first, second]), [second, first, null], null)).toBe(true)
    expect(isUnitResultSynchronized(makeResult([first, second]), [first, second, null], null)).toBe(true)
  })

  it('同じカード集合でもレンタル指定が変われば不一致と判定する', () => {
    const result = makeResult([first, second])
    result.members[0].isRental = true
    expect(isUnitResultSynchronized(result, [second, first], first)).toBe(true)
    expect(isUnitResultSynchronized(result, [second, first], second)).toBe(false)
  })

  it('追加・削除されたカードがある場合は古い結果として判定する', () => {
    // 結果より手動設定が増えた場合も、手動設定より結果が減った場合も再計算対象になる
    expect(isUnitResultSynchronized(makeResult([first]), [first, second], null)).toBe(false)
    expect(isUnitResultSynchronized(makeResult([first, second]), [first], null)).toBe(false)
  })
})

/**
 * 計算開始時点の条件を固定し、snapshot上の設定変更が独立することを検証する
 *
 * 条件変更は画面の設定や保存値を書き換えず、元の条件から独立したsnapshotを返す
 */
import { describe, expect, it, vi } from 'vitest'
import * as constant from '../../constant'
import * as data from '../../data'
import * as enums from '../../types/enums'
import {
  applyCalculationVariant,
  createCalculationSnapshot,
  createOptimizeInput,
} from '../../utils/calculationSnapshot'
import { calculateCardScores } from '../../utils/calculator/calculateCardScores'
import { createDefaultSettings } from '../../utils/scoreSettings'
import { createTestCardByName } from '../fixtures/cards'

const cardByName = createTestCardByName()

function createSnapshot() {
  return createCalculationSnapshot({
    scoreSettings: createDefaultSettings(),
    unitSettings: constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
    cardUncaps: {},
    cardCountCustom: {},
    allCards: data.AllCards,
    cardByName,
  })
}

function applyScoreSettingsVariantFromUnknown(snapshot: ReturnType<typeof createSnapshot>, patch: unknown) {
  return Reflect.apply(applyCalculationVariant, undefined, [snapshot, { scoreSettings: patch }])
}

const applyScoreSettingsVariant = (
  snapshot: Parameters<typeof applyCalculationVariant>[0],
  patch: NonNullable<Parameters<typeof applyCalculationVariant>[1]['scoreSettings']>,
) => applyCalculationVariant(snapshot, { scoreSettings: patch })

const applyUnitSettingsVariant = (
  snapshot: Parameters<typeof applyCalculationVariant>[0],
  patch: NonNullable<Parameters<typeof applyCalculationVariant>[1]['unitSettings']>,
) => applyCalculationVariant(snapshot, { unitSettings: patch })

describe('calculationSnapshot', () => {
  it('計算入力の入れ子をコピーして、元のstate参照を保持しない', () => {
    const scoreSettings = createDefaultSettings()
    const card = data.AllCards.find((candidate) =>
      candidate.events.some((event) => event.effect_type === enums.EventEffectType.PItem),
    )!
    const cardUncaps = { [card.name]: enums.UncapType.Zero }
    const cardCountCustom = {
      [card.name]: { selfTrigger: { [enums.ActionIdType.PItemAcquire]: 2 } },
    }
    const snapshot = createCalculationSnapshot({
      scoreSettings,
      unitSettings: constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
      cardUncaps,
      cardCountCustom,
      allCards: data.AllCards,
      cardByName,
    })

    expect(snapshot.scoreSettings).not.toBe(scoreSettings)
    expect(snapshot.scoreSettings.actionCounts).not.toBe(scoreSettings.actionCounts)
    expect(snapshot.unitSettings).not.toBe(constant.DEFAULT_UNIT_SIMULATOR_SETTINGS)
    expect(snapshot.cardUncaps).not.toBe(cardUncaps)
    expect(snapshot.cardCountCustom).not.toBe(cardCountCustom)
    expect(snapshot.cardCountCustom[card.name].selfTrigger).not.toBe(cardCountCustom[card.name].selfTrigger)
  })

  it('点数variantは元snapshotを変更せず、variant同士も独立して計算できる', () => {
    const snapshot = createSnapshot()
    const first = applyScoreSettingsVariant(snapshot, {
      useScheduleLimits: false,
      actionCounts: { [enums.ActionIdType.NormalLessonVo]: 5 },
    })
    const second = applyScoreSettingsVariant(snapshot, {
      useScheduleLimits: false,
      actionCounts: { [enums.ActionIdType.NormalLessonDa]: 3 },
    })

    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    expect(snapshot.scoreSettings.actionCounts[enums.ActionIdType.NormalLessonVo]).toBe(0)
    expect(first!.scoreSettings.actionCounts[enums.ActionIdType.NormalLessonVo]).toBe(5)
    expect(first!.scoreSettings.actionCounts[enums.ActionIdType.NormalLessonDa]).toBe(0)
    expect(second!.scoreSettings.actionCounts[enums.ActionIdType.NormalLessonDa]).toBe(3)
    expect(second!.scoreSettings.actionCounts[enums.ActionIdType.NormalLessonVo]).toBe(0)
  })

  it('編成variantは保存値を変更せず、存在しないカード名を拒否する', () => {
    const snapshot = createSnapshot()
    const cardName = data.AllCards[0].name
    const variant = applyUnitSettingsVariant(snapshot, {
      manualCards: [cardName],
      lockedCards: [cardName],
    })
    const invalid = applyUnitSettingsVariant(snapshot, {
      manualCards: ['存在しないカード'],
    })

    expect(variant).not.toBeNull()
    expect(snapshot.unitSettings.manualCards).toEqual([])
    expect(variant!.unitSettings.manualCards).toEqual([cardName])
    expect(invalid).toBeNull()
  })

  it('不正なenum・負数・範囲外のvariantを計算前に拒否する', () => {
    const snapshot = createSnapshot()

    expect(
      applyScoreSettingsVariantFromUnknown(snapshot, {
        scenario: 'invalid',
      }),
    ).toBeNull()
    expect(
      applyScoreSettingsVariant(snapshot, {
        actionCounts: { [enums.ActionIdType.Lesson]: -1 },
      }),
    ).toBeNull()
    expect(
      applyUnitSettingsVariant(snapshot, {
        exhaustiveCandidateLimit: constant.CANDIDATE_LIMIT_MAX + 1,
      }),
    ).toBeNull()
    expect(
      applyCalculationVariant(snapshot, {
        cardCountCustom: { [data.AllCards[0].name]: { selfTrigger: { [enums.ActionIdType.Lesson]: -1 } } },
      }),
    ).toBeNull()
  })

  it('凸数と回数調整のvariantも保存値を変更せずに適用する', () => {
    const snapshot = createSnapshot()
    const cardName = data.AllCards.find((card) =>
      card.events.some((event) => event.effect_type === enums.EventEffectType.PItem),
    )!.name
    const variant = applyCalculationVariant(snapshot, {
      cardUncaps: { [cardName]: enums.UncapType.Zero },
      cardCountCustom: { [cardName]: { selfTrigger: { [enums.ActionIdType.PItemAcquire]: 2 } } },
    })

    expect(variant).not.toBeNull()
    expect(snapshot.cardUncaps).toEqual({})
    expect(snapshot.cardCountCustom).toEqual({})
    expect(variant!.cardUncaps[cardName]).toBe(enums.UncapType.Zero)
    expect(variant!.cardCountCustom[cardName].selfTrigger?.[enums.ActionIdType.PItemAcquire]).toBe(2)
  })

  it('snapshotから編成評価入力を作り、除外設定を計算入力へ反映する', () => {
    const snapshot = createSnapshot()
    const cardName = data.AllCards[0].name
    const variant = applyUnitSettingsVariant(snapshot, { excludedCardNames: [cardName] })
    expect(variant).not.toBeNull()

    const input = createOptimizeInput(variant!)
    expect(input.excludedCardNames).toEqual([cardName])
    expect(input.settings).toBe(variant!.unitSettings)
    expect(input.cardByName).toBe(variant!.cardByName)
  })

  it('固定したsnapshotだけでカードスコアを計算できる', () => {
    const snapshot = createSnapshot()
    const variant = applyScoreSettingsVariant(snapshot, {
      useScheduleLimits: false,
      actionCounts: { [enums.ActionIdType.NormalLessonVo]: 5 },
    })
    expect(variant).not.toBeNull()

    const result = calculateCardScores(createOptimizeInput(variant!))

    expect(result.cardResults.size).toBeGreaterThan(0)
    expect(result.cardScores.size).toBe(data.AllCards.length)
  })

  it('variant適用中にlocalStorageやCustomEventへ副作用を出さない', () => {
    const snapshot = createSnapshot()
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')

    applyCalculationVariant(snapshot, {
      scoreSettings: { useScheduleLimits: false },
      unitSettings: { initialParams: { vocal: 10, dance: 0, visual: 0 } },
    })

    expect(setItemSpy).not.toHaveBeenCalled()
    expect(dispatchEventSpy).not.toHaveBeenCalled()
  })
})

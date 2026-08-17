/**
 * Pアイテムが提供するアクションと発動回数のテスト。
 *
 * スケジュールに連動する無制限トリガーと、Pアイテム本文から抽出する獲得・削除を確認する。
 */
import { describe, expect, it } from 'vitest'

import type { PItemEffect, SupportCard } from '../../types/card'
import * as enums from '../../types/enums'
import { getPItemBodyActionCounts, getProvidedActions, resolvePItemFireCount } from '../../utils/supportSynergy'

function makeCard(
  effect: PItemEffect,
  actions: enums.PItemActionType[] = [enums.PItemActionType.PDrinkAcquire],
): SupportCard {
  return {
    name: 'テストPアイテム提供元',
    rarity: enums.RarityType.SR,
    plan: enums.PlanType.Free,
    type: enums.CardType.Vocal,
    parameter_type: enums.ParameterType.Vocal,
    source: enums.SourceType.Gacha,
    release_date: '2026/01/01',
    abilities: [],
    events: [],
    p_item: {
      name: 'テストPアイテム',
      rarity: enums.PItemRarityType.SR,
      memory: enums.PItemMemoryType.NonMemorizable,
      effect,
      actions,
    },
    skill_card: null,
  }
}

describe('supportSynergy', () => {
  it.each([
    [enums.EffectTemplateKeyType.SpLessonEnd, enums.ActionIdType.SpLesson, 3],
    [enums.EffectTemplateKeyType.SpLesson20, enums.ActionIdType.SpLesson20, 2],
    [enums.EffectTemplateKeyType.OutingEnd, enums.ActionIdType.Outing, 2],
    [enums.EffectTemplateKeyType.ClassWorkEnd, enums.ActionIdType.ClassWork, 4],
    [enums.EffectTemplateKeyType.ConsultSelection, enums.ActionIdType.Consult, 5],
    [enums.EffectTemplateKeyType.SpecialTrainingStart, enums.ActionIdType.SpecialTraining, 6],
  ] as const)('%sをスケジュール回数へ変換する', (triggerKey, actionId, count) => {
    const card = makeCard({
      trigger: { key: triggerKey },
      body: [{ key: enums.EffectTemplateKeyType.RandomPdrinkCount, count: 1 }],
    })

    const provided = getProvidedActions(card, { actionCounts: { [actionId]: count } })

    expect(provided[enums.ActionIdType.PDrinkAcquire]).toBe(count)
  })

  it('キーワード系スキルカード獲得トリガーを対応する獲得回数へ変換する', () => {
    const card = makeCard({
      trigger: {
        key: enums.EffectTemplateKeyType.KeywordCardAcquire,
        keyword: enums.EffectKeywordType.Reserve,
      },
      body: [{ key: enums.EffectTemplateKeyType.RandomPdrinkCount, count: 1 }],
    })

    const provided = getProvidedActions(card, {
      actionCounts: { [enums.ActionIdType.ReserveCardAcquire]: 4 },
    })

    expect(provided[enums.ActionIdType.PDrinkAcquire]).toBe(4)
  })

  it('Pアイテム本文から獲得・削除アクションを抽出する', () => {
    const counts = getPItemBodyActionCounts({
      trigger: { key: enums.EffectTemplateKeyType.LessonStart },
      body: [
        { key: enums.EffectTemplateKeyType.GenerateCard, count: 2 },
        { key: enums.EffectTemplateKeyType.RandomSkillCardRAcquire },
        { key: enums.EffectTemplateKeyType.AcquireItemPp },
        { key: enums.EffectTemplateKeyType.SelectDeleteAcquireItem },
      ],
    })

    expect(counts).toEqual({
      [enums.ActionIdType.SkillAcquire]: 3,
      [enums.ActionIdType.PItemAcquire]: 2,
      [enums.ActionIdType.Delete]: 1,
    })
  })

  it('ユーザー定義Pアイテムのレッスンごとの回数制限を反映する', () => {
    const card = makeCard(
      {
        trigger: { key: enums.EffectTemplateKeyType.LessonStart },
        body: [],
        limit: { key: enums.EffectTemplateKeyType.PerLesson, count: 2 },
      },
      [],
    )
    card.p_item!.provided_action_ids = { [enums.ActionIdType.SkillAcquire]: 1 }

    const provided = getProvidedActions(card, {
      actionCounts: { [enums.ActionIdType.Lesson]: 5 },
    })

    expect(provided[enums.ActionIdType.SkillAcquire]).toBe(10)
  })

  it('プロデュース全体の回数制限はスケジュール回数をさらに掛けない', () => {
    const effect: PItemEffect = {
      trigger: { key: enums.EffectTemplateKeyType.OutingEnd },
      body: [],
      limit: { key: enums.EffectTemplateKeyType.PerProduce, count: 2 },
    }

    expect(resolvePItemFireCount(effect, { [enums.ActionIdType.Outing]: 5 })).toBe(2)
  })

  it('制限のないPアイテムは対応するスケジュール回数を使う', () => {
    const effect: PItemEffect = {
      trigger: { key: enums.EffectTemplateKeyType.OutingEnd },
      body: [],
    }

    expect(resolvePItemFireCount(effect, { [enums.ActionIdType.Outing]: 5 })).toBe(5)
  })

  it('Pアイテム本文の個数と発動回数を掛け合わせて提供アクション数を求める', () => {
    const card = makeCard({
      trigger: { key: enums.EffectTemplateKeyType.LessonStart },
      body: [{ key: enums.EffectTemplateKeyType.GenerateCard, count: 2 }],
      limit: { key: enums.EffectTemplateKeyType.PerLesson, count: 3 },
    })

    const provided = getProvidedActions(card, {
      actionCounts: { [enums.ActionIdType.Lesson]: 4 },
    })

    expect(provided[enums.ActionIdType.SkillAcquire]).toBe(24)
  })
})

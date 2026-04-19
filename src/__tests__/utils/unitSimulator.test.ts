/**
 * 最適編成のテスト
 *
 * パラメータボーナスの二重計算防止、サポート間連携計算、最適性検証を行う。
 */
import { describe, expect, it } from 'vitest'
import { evaluateManualUnit, optimizeUnit } from '../../utils/unitSimulator'
import { calculateCardParameter } from '../../utils/calculator/calculateCard'
import { computeUnitSupportSynergy, getProvidedActions } from '../../utils/supportSynergy'
import { getSelfAcquisitionBonus } from '../../utils/calculator/events'
import { ActionCategoryList, AllCards, CardByName, getScheduleData, TriggerActionMap } from '../../data'
import { mergeScheduleCounts } from '../../utils/scoreSettings'
import type { ScoreSettings } from '../../types/card'
import * as enums from '../../types/enums'
import type { UnitSimulatorSettings } from '../../types/unit'
import * as constant from '../../constant'

/** デフォルトのスコア設定を作る */
function makeScoreSettings(overrides: Partial<ScoreSettings> = {}): ScoreSettings {
  return {
    name: 'test',
    scenario: enums.ScenarioType.Hajime,
    difficulty: enums.DifficultyType.Regular,
    useFixedUncap: true,
    scheduleSelections: {},
    useScheduleLimits: false,
    includeSelfTrigger: true,
    includePItem: true,
    parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    actionCounts: {},
    ...overrides,
  }
}

/** スケジュール込みのスコア設定を作る（実際のアプリと同じデフォルト） */
function makeRealisticScoreSettings(overrides: Partial<ScoreSettings> = {}): ScoreSettings {
  const actionCounts: Partial<Record<enums.ActionIdType, number>> = {}
  for (const cat of ActionCategoryList) {
    actionCounts[cat.id] = 0
  }
  const scheduleData = getScheduleData(constant.DEFAULT_SCENARIO, constant.DEFAULT_DIFFICULTY)
  const scheduleSelections: Record<number, enums.ActivityIdType> = {}
  for (const week of scheduleData) {
    if (week.fixed && !week.canRest && week.activities.length > 0) {
      scheduleSelections[week.week] = week.activities[0].id
    }
  }
  return {
    name: 'realistic',
    scenario: constant.DEFAULT_SCENARIO,
    difficulty: constant.DEFAULT_DIFFICULTY,
    parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    actionCounts,
    scheduleSelections,
    useScheduleLimits: true,
    includeSelfTrigger: true,
    includePItem: true,
    useFixedUncap: false,
    ...overrides,
  }
}

/** デフォルトのシミュレーター設定を作る */
function makeSimulatorSettings(
  cardNames: string[],
  overrides: Partial<UnitSimulatorSettings> = {},
): UnitSimulatorSettings {
  return {
    plan: enums.PlanType.Anomaly,
    allowedTypes: [],
    spConstraint: { vocal: 0, dance: 0, visual: 0 },
    typeCountMin: {
      [enums.ParameterType.Vocal]: constant.TYPE_COUNT_MIN_DEFAULT,
      [enums.ParameterType.Dance]: constant.TYPE_COUNT_MIN_DEFAULT,
      [enums.ParameterType.Visual]: constant.TYPE_COUNT_MIN_DEFAULT,
    },
    typeCountMax: {
      [enums.ParameterType.Vocal]: constant.TYPE_COUNT_MAX_DEFAULT,
      [enums.ParameterType.Dance]: constant.TYPE_COUNT_MAX_DEFAULT,
      [enums.ParameterType.Visual]: constant.TYPE_COUNT_MAX_DEFAULT,
    },
    paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
    manualRental: false,
    rentalCardName: null,
    lockedCards: [],
    manualCards: cardNames,
    initialParams: { vocal: 0, dance: 0, visual: 0 },
    ...overrides,
  }
}

describe('最適編成', () => {
  describe('パラメータボーナス二重計算防止', () => {
    it('パラボ持ちサポートの totalScore がサポート個別パラボとユニットパラボで二重計算されない', () => {
      // パラメータボーナスを持つサポートを使用する
      const cards = AllCards.filter((c) => c.plan === enums.PlanType.Anomaly || c.plan === enums.PlanType.Free)
      const paramBonusCard = cards.find((c) => c.abilities.some((a) => a.is_parameter_bonus))
      if (!paramBonusCard) return // パラボ持ちサポートがなければスキップ

      const scoreSettings = makeScoreSettings({
        parameterBonusBase: { vocal: 1000, dance: 1000, visual: 1000 },
      })
      const builderSettings = makeSimulatorSettings([paramBonusCard.name], {
        paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
      })

      const result = evaluateManualUnit({
        settings: builderSettings,
        scoreSettings,
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })

      if (!result) return

      // サポート個別の計算
      const schedule = getScheduleData(scoreSettings.scenario, scoreSettings.difficulty)
      const effectiveCounts = mergeScheduleCounts(scoreSettings, schedule)
      const cardResult = calculateCardParameter(
        paramBonusCard,
        enums.UncapType.Four,
        effectiveCounts,
        {},
        scoreSettings.parameterBonusBase,
        scoreSettings.includeSelfTrigger,
        scoreSettings.includePItem,
      )

      // サポート個別のパラボ
      const cardParamBonus = cardResult.parameterBonus
      // ユニット結果のパラボ（1枚なので同じ%）
      const unitParamBonus = result.parameterBonus.vocal + result.parameterBonus.dance + result.parameterBonus.visual

      // 1枚ユニットなので: totalScore = (totalIncrease - cardParamBonus) + supportSynergy + unitParamBonus
      // もし二重計算されていたら totalScore = totalIncrease + unitParamBonus になる
      const member = result.members[0]
      const expectedTotal =
        member.result.totalIncrease - member.result.parameterBonus + member.supportSynergy + unitParamBonus

      expect(result.totalScore).toBe(expectedTotal)

      // 二重計算されていないことの確認: totalScore ≠ totalIncrease + unitParamBonus
      if (cardParamBonus > 0) {
        const doubleCountedTotal = member.result.totalIncrease + member.supportSynergy + unitParamBonus
        expect(result.totalScore).not.toBe(doubleCountedTotal)
      }
    })

    it('パラボなしサポートの場合 totalScore = totalIncrease + supportSynergy', () => {
      // パラボを持たないサポート（bonusBase = 0 なので結果的にパラボ = 0）
      const cards = AllCards.filter((c) => c.plan === enums.PlanType.Anomaly || c.plan === enums.PlanType.Free)
      const noParamCard = cards.find((c) => !c.abilities.some((a) => a.is_parameter_bonus))
      if (!noParamCard) return

      const scoreSettings = makeScoreSettings({
        parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
      })
      const builderSettings = makeSimulatorSettings([noParamCard.name])

      const result = evaluateManualUnit({
        settings: builderSettings,
        scoreSettings,
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })

      if (!result) return

      const member = result.members[0]
      expect(result.totalScore).toBe(member.result.totalIncrease + member.supportSynergy)
    })
  })

  describe('サポート間連携', () => {
    it('2枚ユニットでサポート間連携がある場合に effectiveScore に反映される', () => {
      // スキルカード獲得イベントを持つサポートと、skill_acquire トリガーのアビリティを持つサポートの組み合わせ
      const providerCard = AllCards.find(
        (c) =>
          (c.plan === enums.PlanType.Anomaly || c.plan === enums.PlanType.Free) &&
          c.events.some((e) => e.effect_type === enums.EventEffectType.SkillCard),
      )
      const receiverCard = AllCards.find(
        (c) =>
          (c.plan === enums.PlanType.Anomaly || c.plan === enums.PlanType.Free) &&
          c.name !== providerCard?.name &&
          c.abilities.some(
            (a) =>
              !a.skip_calculation &&
              !a.is_percentage &&
              !a.is_event_boost &&
              !a.is_parameter_bonus &&
              a.trigger_key === enums.TriggerKeyType.SkillAcquire,
          ),
      )

      if (!providerCard || !receiverCard) return

      const scoreSettings = makeScoreSettings()
      const builderSettings = makeSimulatorSettings([providerCard.name, receiverCard.name])

      const result = evaluateManualUnit({
        settings: builderSettings,
        scoreSettings,
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })

      if (!result) return

      // receiverCard のサポート間連携が 0 以上であることを確認する
      const receiver = result.members.find((m) => m.card.name === receiverCard.name)
      expect(receiver).toBeDefined()
      expect(receiver!.supportSynergy).toBeGreaterThan(0)
    })

    it('cardCountCustom で提供回数が変動する', () => {
      // 他サポートに何かを提供していて、かつ自身も同じアクションの自動ボーナスを持つサポートを探す
      // provided > 0 条件で ZERO_DEFAULT_ACTIONS（MSkillEnhance 等）を除外する
      const providerCard = AllCards.find((c) => {
        const provided = getProvidedActions(c)
        const selfBonus = getSelfAcquisitionBonus(c)
        return Object.keys(provided).some(
          (aid) =>
            (provided[aid as enums.ActionIdType] ?? 0) > 0 &&
            aid in selfBonus &&
            (selfBonus[aid as enums.ActionIdType] ?? 0) > 0,
        )
      })

      if (!providerCard) return

      const provided = getProvidedActions(providerCard)
      const selfBonus = getSelfAcquisitionBonus(providerCard)
      const commonAction = Object.keys(provided).find(
        (aid) =>
          (provided[aid as enums.ActionIdType] ?? 0) > 0 &&
          aid in selfBonus &&
          (selfBonus[aid as enums.ActionIdType] ?? 0) > 0,
      ) as enums.ActionIdType

      // receiverCard: commonAction をトリガーにするアビリティを持つサポート
      const receiverCard = AllCards.find(
        (c) =>
          c.name !== providerCard.name &&
          c.abilities.some(
            (a) =>
              !a.skip_calculation &&
              !a.is_percentage &&
              a.trigger_key &&
              TriggerActionMap[a.trigger_key] === commonAction,
          ),
      )

      if (!receiverCard) return

      // 回数調整なし
      const baseResult = computeUnitSupportSynergy([providerCard, receiverCard])
      const baseCount = baseResult.bonusMap.get(receiverCard.name)?.[commonAction] ?? 0

      // 回数調整で自動ボーナスを0にする
      const customCounts = {
        [providerCard.name]: {
          selfTrigger: { [commonAction]: 0 },
        },
      }
      const customResult = computeUnitSupportSynergy([providerCard, receiverCard], customCounts)
      const customCount = customResult.bonusMap.get(receiverCard.name)?.[commonAction] ?? 0

      // 回数調整により受取回数が減ることを確認する
      expect(customCount).toBeLessThan(baseCount)
    })

    it('evaluateManualUnit に cardCountCustom を渡すとスコアが変動する', () => {
      // 他サポートに提供するサポートと、そのアクションのアビリティを持つサポートの組で検証する
      const providerCard = AllCards.find((c) => {
        const provided = getProvidedActions(c)
        const selfBonus = getSelfAcquisitionBonus(c)
        return Object.keys(provided).some((aid) => aid in selfBonus && (selfBonus[aid as enums.ActionIdType] ?? 0) > 0)
      })
      if (!providerCard) return

      const provided = getProvidedActions(providerCard)
      const selfBonus = getSelfAcquisitionBonus(providerCard)
      const commonAction = Object.keys(provided).find(
        (aid) => aid in selfBonus && (selfBonus[aid as enums.ActionIdType] ?? 0) > 0,
      ) as enums.ActionIdType

      const receiverCard = AllCards.find(
        (c) =>
          c.name !== providerCard.name &&
          c.abilities.some(
            (a) =>
              !a.skip_calculation &&
              !a.is_percentage &&
              a.trigger_key &&
              TriggerActionMap[a.trigger_key] === commonAction,
          ),
      )
      if (!receiverCard) return

      const scoreSettings = makeScoreSettings()
      const builderSettings = makeSimulatorSettings([providerCard.name, receiverCard.name])

      // 回数調整なしで計算
      const baseResult = evaluateManualUnit({
        settings: builderSettings,
        scoreSettings,
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })
      // 回数調整で自動ボーナスを 0 にして計算
      const customCounts = { [providerCard.name]: { selfTrigger: { [commonAction]: 0 } } }
      const customResult = evaluateManualUnit({
        settings: builderSettings,
        scoreSettings,
        cardUncaps: {},
        cardCountCustom: customCounts,
        allCards: AllCards,
        cardByName: CardByName,
      })

      if (!baseResult || !customResult) return

      // receiver のサポート間連携が変動することを確認する
      const baseReceiver = baseResult.members.find((m) => m.card.name === receiverCard.name)
      const customReceiver = customResult.members.find((m) => m.card.name === receiverCard.name)
      expect(baseReceiver).toBeDefined()
      expect(customReceiver).toBeDefined()

      // 回数調整により合計スコアが変動する
      expect(customResult.totalScore).not.toBe(baseResult.totalScore)
    })

    it('selfTrigger 回数調整が連動グループ内の関連アクションにも伝播する', () => {
      // Pアイテムの削除アクションを持つサポートを探す（delete/m_skill_delete/a_skill_delete を同時提供）
      const deleteProviderCard = AllCards.find((c) => {
        const actions = c.p_item?.actions ?? []
        return actions.includes(enums.PItemActionType.Delete as never)
      })
      if (!deleteProviderCard) return

      const provided = getProvidedActions(deleteProviderCard)
      const selfBonus = getSelfAcquisitionBonus(deleteProviderCard)

      // 汎用 delete トリガーのアビリティを持つ受取サポートを探す
      const receiverCard = AllCards.find(
        (c) =>
          c.name !== deleteProviderCard.name &&
          c.abilities.some(
            (a) => !a.skip_calculation && !a.is_percentage && a.trigger_key === enums.TriggerKeyType.Delete,
          ),
      )
      if (!receiverCard) return

      // delete が提供されていることを確認
      if (!provided[enums.ActionIdType.Delete]) return

      // 具体的な selfBonus キーを探す（a_skill_delete など、サポートのアビリティが持つもの）
      const selfBonusDeleteKey = (
        [
          enums.ActionIdType.ASkillDelete,
          enums.ActionIdType.MSkillDelete,
          enums.ActionIdType.Delete,
        ] as enums.ActionIdType[]
      ).find((aid) => (selfBonus[aid] ?? 0) > 0)
      if (!selfBonusDeleteKey) return

      // 回数調整なし
      const baseResult = computeUnitSupportSynergy([deleteProviderCard, receiverCard])
      const baseDeleteCount = baseResult.bonusMap.get(receiverCard.name)?.[enums.ActionIdType.Delete] ?? 0

      // selfBonus の特定キーを 0 に回数調整 → 連動で delete も減るはず
      const customCounts = {
        [deleteProviderCard.name]: {
          selfTrigger: { [selfBonusDeleteKey]: 0 },
        },
      }
      const customResult = computeUnitSupportSynergy([deleteProviderCard, receiverCard], customCounts)
      const customDeleteCount = customResult.bonusMap.get(receiverCard.name)?.[enums.ActionIdType.Delete] ?? 0

      // 連動により汎用 delete の受取回数も減ることを確認する
      expect(customDeleteCount).toBeLessThan(baseDeleteCount)
    })

    it('サポート間連携の extraCount が max_count を超えない', () => {
      // max_count 付きアビリティを持つサポートと、そのトリガーを提供するサポートを探す
      const receiverCard = AllCards.find((c) =>
        c.abilities.some(
          (a) =>
            !a.skip_calculation &&
            !a.is_percentage &&
            !a.is_event_boost &&
            !a.is_parameter_bonus &&
            !a.is_initial_stat &&
            a.max_count !== undefined &&
            a.max_count > 0 &&
            a.trigger_key,
        ),
      )
      if (!receiverCard) return

      const maxCountAbility = receiverCard.abilities.find(
        (a) => a.max_count !== undefined && a.max_count > 0 && a.trigger_key && !a.skip_calculation && !a.is_percentage,
      )!
      const actionId = TriggerActionMap[maxCountAbility.trigger_key]

      const providerCard = AllCards.find(
        (c) => c.name !== receiverCard.name && getProvidedActions(c)[actionId] !== undefined,
      )
      if (!providerCard) return

      const scoreSettings = makeScoreSettings({
        actionCounts: { [actionId]: maxCountAbility.max_count! },
      })
      const builderSettings = makeSimulatorSettings([providerCard.name, receiverCard.name])
      const result = evaluateManualUnit({
        settings: builderSettings,
        scoreSettings,
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })
      if (!result) return

      const receiver = result.members.find((m) => m.card.name === receiverCard.name)
      expect(receiver).toBeDefined()
      // baseCount が max_count に到達しているので、supportSynergyDetail のこのトリガーは 0 のはず
      const extraCount = receiver!.supportSynergyDetail[maxCountAbility.trigger_key] ?? 0
      expect(extraCount).toBe(0)
    })

    it('Pアイテムの無制限トリガーがスケジュール回数で発動する', () => {
      // ふわふわでワクワク: Pアイテムがダンスsplesson終了時にPドリンク×2獲得（回数制限なし）
      const fuwafuwa = AllCards.find((c) => c.name === 'ふわふわでワクワク')
      // いつまでも続けばいいのに: Pドリンク獲得時アビリティを持つ
      const itsumademo = AllCards.find((c) => c.name === 'いつまでも続けばいいのに')
      if (!fuwafuwa || !itsumademo) return

      // DaSPレッスン3回のスケジュール
      const scoreSettings = makeScoreSettings({
        actionCounts: { [enums.ActionIdType.SpLessonDa]: 3 },
      })

      // actionCounts あり: 3回発動 × 2個 = 6
      const withSchedule = computeUnitSupportSynergy([fuwafuwa, itsumademo], undefined, {
        actionCounts: scoreSettings.actionCounts,
      })
      const synergyCount = withSchedule.bonusMap.get(itsumademo.name)?.[enums.ActionIdType.PDrinkAcquire] ?? 0
      expect(synergyCount).toBe(6)

      // actionCounts なし: フォールバック1回 × 2個 = 2
      const withoutSchedule = computeUnitSupportSynergy([fuwafuwa, itsumademo])
      const fallbackCount = withoutSchedule.bonusMap.get(itsumademo.name)?.[enums.ActionIdType.PDrinkAcquire] ?? 0
      expect(fallbackCount).toBe(2)
    })

    it('per_produce制限ありのPドリンク獲得カードもシナジーに反映される', () => {
      // はっぴぃはろうぃ～～ん！: per_produce 2回、body=param_up_random_pdrink（1個/回）
      const happii = AllCards.find((c) => c.name === 'はっぴぃはろうぃ～～ん！')
      const itsumademo = AllCards.find((c) => c.name === 'いつまでも続けばいいのに')
      if (!happii || !itsumademo) return

      const result = computeUnitSupportSynergy([happii, itsumademo])
      const synergyCount = result.bonusMap.get(itsumademo.name)?.[enums.ActionIdType.PDrinkAcquire] ?? 0
      // limit:2 × 1個/回 = 2
      expect(synergyCount).toBe(2)
    })

    it('ユーザー設定再現: ふわふわでワクワクがはっぴぃはろうぃ～～ん！より高シナジーになる', () => {
      // ユーザーのスケジュール: da_lesson×3, vi_lesson×2 → SpLessonDa=3, SpLessonVi=2
      const fuwafuwa = AllCards.find((c) => c.name === 'ふわふわでワクワク')
      const happii = AllCards.find((c) => c.name === 'はっぴぃはろうぃ～～ん！')
      const itsumademo = AllCards.find((c) => c.name === 'いつまでも続けばいいのに')
      if (!fuwafuwa || !happii || !itsumademo) return

      const actionCounts: Partial<Record<enums.ActionIdType, number>> = {
        [enums.ActionIdType.SpLessonDa]: 3,
        [enums.ActionIdType.SpLessonVi]: 2,
      }

      // ふわふわでワクワク: DaSP3回×2個=6
      const fuwafuwaResult = computeUnitSupportSynergy([fuwafuwa, itsumademo], undefined, { actionCounts })
      const fuwafuwaSynergy = fuwafuwaResult.bonusMap.get(itsumademo.name)?.[enums.ActionIdType.PDrinkAcquire] ?? 0

      // はっぴぃはろうぃ～～ん！: limit:2×1個=2
      const happiiResult = computeUnitSupportSynergy([happii, itsumademo], undefined, { actionCounts })
      const happiiSynergy = happiiResult.bonusMap.get(itsumademo.name)?.[enums.ActionIdType.PDrinkAcquire] ?? 0

      expect(fuwafuwaSynergy).toBe(6)
      expect(happiiSynergy).toBe(2)
      expect(fuwafuwaSynergy).toBeGreaterThan(happiiSynergy)
    })

    it('ユーザー設定再現: optimizeUnitでふわふわでワクワクがはっぴぃはろうぃ～～ん！より優先される', () => {
      // ユーザーの実際の設定: hajime/legend, useFixedUncap, useScheduleLimits
      // scheduleSelections: da_lesson×3, vi_lesson×2, class×4, etc.
      const scoreSettings = makeScoreSettings({
        scenario: enums.ScenarioType.Hajime,
        difficulty: enums.DifficultyType.Legend,
        useFixedUncap: true,
        useScheduleLimits: true,
        includeSelfTrigger: true,
        includePItem: true,
        parameterBonusBase: { vocal: 390, dance: 875, visual: 1035 },
        actionCounts: {
          [enums.ActionIdType.SkillAcquire]: 11,
          [enums.ActionIdType.MSkillAcquire]: 9,
          [enums.ActionIdType.ASkillAcquire]: 2,
          [enums.ActionIdType.SsrCardAcquire]: 12,
          [enums.ActionIdType.PDrinkAcquire]: 22,
          [enums.ActionIdType.PDrinkExchange]: 12,
          [enums.ActionIdType.SkillEnhance]: 3,
          [enums.ActionIdType.MSkillEnhance]: 3,
          [enums.ActionIdType.ASkillEnhance]: 3,
          [enums.ActionIdType.Delete]: 3,
          [enums.ActionIdType.MSkillDelete]: 3,
          [enums.ActionIdType.ASkillDelete]: 3,
          [enums.ActionIdType.Change]: 3,
          [enums.ActionIdType.Customize]: 5,
          [enums.ActionIdType.SpLesson20]: 3,
          [enums.ActionIdType.GoodConditionCardAcquire]: 6,
          [enums.ActionIdType.ConcentrationCardAcquire]: 6,
          [enums.ActionIdType.GoodImpressionCardAcquire]: 6,
          [enums.ActionIdType.MotivationCardAcquire]: 6,
          [enums.ActionIdType.FullPowerCardAcquire]: 6,
          [enums.ActionIdType.AggressiveCardAcquire]: 6,
          [enums.ActionIdType.VitalityCardAcquire]: 6,
          [enums.ActionIdType.ReserveCardAcquire]: 6,
          [enums.ActionIdType.TroubleDelete]: 0,
          [enums.ActionIdType.DrowsyAcquire]: 0,
          [enums.ActionIdType.ExamEnd]: 0,
          [enums.ActionIdType.Outing]: 0,
          [enums.ActionIdType.Consult]: 0,
          [enums.ActionIdType.Rest]: 0,
          [enums.ActionIdType.PItemAcquire]: 0,
          [enums.ActionIdType.ExamPItemAcquire]: 0,
          [enums.ActionIdType.ActivitySupplyGift]: 0,
          [enums.ActionIdType.SpecialTraining]: 0,
        },
        scheduleSelections: {
          1: enums.ActivityIdType.Class,
          2: enums.ActivityIdType.Class,
          3: enums.ActivityIdType.ActivitySupply,
          4: enums.ActivityIdType.DaLesson,
          5: enums.ActivityIdType.ActivitySupply,
          6: enums.ActivityIdType.Class,
          7: enums.ActivityIdType.DaLesson,
          8: enums.ActivityIdType.Consult,
          9: enums.ActivityIdType.SpecialTraining,
          10: enums.ActivityIdType.MidExam,
          11: enums.ActivityIdType.ActivitySupply,
          12: enums.ActivityIdType.ViLesson,
          13: enums.ActivityIdType.ActivitySupply,
          14: enums.ActivityIdType.DaLesson,
          15: enums.ActivityIdType.Class,
          16: enums.ActivityIdType.ViLesson,
          17: enums.ActivityIdType.Consult,
          18: enums.ActivityIdType.FinalExam,
        },
      })
      const settings = makeSimulatorSettings([], {
        plan: enums.PlanType.Sense,
        manualCards: [],
        spConstraint: { vocal: 0, dance: 3, visual: 1 },
      })

      const result = optimizeUnit({
        settings,
        scoreSettings,
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })
      expect(result).not.toBeNull()
      if (!result) return

      const hasFuwafuwa = result.members.some((m) => m.card.name === 'ふわふわでワクワク')
      const hasHappii = result.members.some((m) => m.card.name === 'はっぴぃはろうぃ～～ん！')

      // ふわふわでワクワク(PDrink×6)がはっぴぃはろうぃ～～ん！(PDrink×2)より優先される
      // 両方入る場合もあるが、はっぴぃのみでふわふわなしはNG
      if (hasHappii && !hasFuwafuwa) {
        // これが起きたらバグ: はっぴぃの代わりにふわふわを入れて再計算してみる
        const fuwafuwaUnit = result.members.map((m) =>
          m.card.name === 'はっぴぃはろうぃ～～ん！' ? 'ふわふわでワクワク' : m.card.name,
        )
        const fuwafuwaResult = evaluateManualUnit({
          settings: makeSimulatorSettings(fuwafuwaUnit),
          scoreSettings,
          cardUncaps: {},
          allCards: AllCards,
          cardByName: CardByName,
        })
        // ふわふわの方がスコアが高ければ最適化のバグ
        if (fuwafuwaResult && fuwafuwaResult.totalScore > result.totalScore) {
          expect.fail(
            `はっぴぃはろうぃ～～ん！(${result.totalScore})よりふわふわでワクワク(${fuwafuwaResult.totalScore})の方が高スコア`,
          )
        }
      }
    })
  })

  /**
   * 最適性検証テスト
   *
   * 最適編成画面で「最適化実行」ボタンを押した際に呼ばれる optimizeUnit の
   * 出力品質を検証する。貪欲法＋局所探索アルゴリズムが返す6枚編成が
   * 本当に良い結果になっているかを、以下の4観点で確認する:
   *
   * 1. 有効性: 6枚が返り、プラン互換性を持ち、重複がないこと
   * 2. 整合性: 同じサポートで evaluateManualUnit した結果とスコアが一致すること
   * 3. ランダム比較: 500組のランダム編成すべてに勝つこと
   * 4. 局所最適性: ユニット内の任意の1枚を候補サポートと入れ替えても改善しないこと
   *
   * SP制約は0（制約なし）で純粋なスコア最大化を検証する。
   */
  describe('未所持サポートのレンタル枠考慮', () => {
    it('未所持サポートがレンタル枠として選出される', () => {
      // 4凸固定モードで最適編成を取得し、その中の1枚を未所持にして再実行する
      const plan = enums.PlanType.Anomaly
      const scoreSettings = makeScoreSettings({ useFixedUncap: true })
      const settings = makeSimulatorSettings([], {
        plan,
        manualCards: [],
        spConstraint: { vocal: 0, dance: 0, visual: 0 },
      })

      // 4凸固定モードで最適化を実行してベースラインを取得する
      const baseline = optimizeUnit({
        settings,
        scoreSettings,
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })
      expect(baseline).not.toBeNull()
      if (!baseline) return

      // ベースラインの1番目のメンバーを未所持にする
      const targetCard = baseline.members[0].card.name

      // useFixedUncap を false にして、対象サポートを未所持に設定する
      const uncapSettings = makeScoreSettings({ useFixedUncap: false })
      const cardUncaps: Record<string, enums.UncapType> = {
        [targetCard]: enums.UncapType.NotOwned,
      }

      const result = optimizeUnit({
        settings,
        scoreSettings: uncapSettings,
        cardUncaps,
        allCards: AllCards,
        cardByName: CardByName,
      })
      expect(result).not.toBeNull()
      if (!result) return

      // 未所持サポートがレンタル枠として選出されていること
      const rentalMember = result.members.find((m) => m.isRental)
      expect(rentalMember).toBeDefined()
      expect(rentalMember!.card.name).toBe(targetCard)
      expect(rentalMember!.uncap).toBe(enums.UncapType.Four)
    })

    it('未所持サポートのレンタル結果が evaluateManualUnit と一致する', () => {
      const plan = enums.PlanType.Anomaly
      const scoreSettings = makeScoreSettings({ useFixedUncap: true })
      const settings = makeSimulatorSettings([], {
        plan,
        manualCards: [],
        spConstraint: { vocal: 0, dance: 0, visual: 0 },
      })

      // 4凸固定モードで最適化を実行する
      const baseline = optimizeUnit({
        settings,
        scoreSettings,
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })
      if (!baseline) return

      // ベースラインの1番目のメンバーを未所持にする
      const targetCard = baseline.members[0].card.name
      const uncapSettings = makeScoreSettings({ useFixedUncap: false })
      const cardUncaps: Record<string, enums.UncapType> = {
        [targetCard]: enums.UncapType.NotOwned,
      }

      const result = optimizeUnit({
        settings,
        scoreSettings: uncapSettings,
        cardUncaps,
        allCards: AllCards,
        cardByName: CardByName,
      })
      if (!result) return

      // optimizeUnit の結果を evaluateManualUnit で再評価してスコアが一致することを確認する
      const rentalName = result.members.find((m) => m.isRental)?.card.name ?? null
      // レンタルカードを末尾に配置する（evaluateManualUnit は末尾スロットをレンタルとして扱う）
      const cardNames = rentalName
        ? [...result.members.filter((m) => !m.isRental).map((m) => m.card.name), rentalName]
        : result.members.map((m) => m.card.name)
      const manualSettings = makeSimulatorSettings(cardNames, {
        plan,
        manualRental: true,
        rentalCardName: rentalName,
      })

      const manual = evaluateManualUnit({
        settings: manualSettings,
        scoreSettings: uncapSettings,
        cardUncaps,
        allCards: AllCards,
        cardByName: CardByName,
      })
      expect(manual).not.toBeNull()
      expect(manual!.totalScore).toBe(result.totalScore)
    })

    it('低凸メンバーが多い場合も0凸で入るカードがNotOwnedでレンタルとして入る', () => {
      // 低凸メンバーが多い環境で、0凸で選出されるカードは NotOwned でもレンタルとして選出される
      // スケジュール込みのリアルな設定を使うことでサポート間連携の影響を再現する
      const plan = enums.PlanType.Anomaly
      const settings = makeSimulatorSettings([], {
        plan,
        manualCards: [],
        spConstraint: { vocal: 0, dance: 0, visual: 0 },
      })

      // リアルなスコア設定でベースラインを取得し、全メンバーを2凸に設定する
      const baseline = optimizeUnit({
        settings,
        scoreSettings: makeRealisticScoreSettings({ useFixedUncap: true }),
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })
      if (!baseline) return

      const cardUncaps: Record<string, enums.UncapType> = {}
      for (const m of baseline.members) {
        cardUncaps[m.card.name] = enums.UncapType.Two
      }

      const scoreSettings = makeRealisticScoreSettings()

      // 各ベースラインメンバーについて「0凸で入る → NotOwnedでもレンタルとして入る」を検証する
      for (const member of baseline.members) {
        const target = member.card.name

        // 0凸で最適化し、ターゲットが選出されるか確認する
        const uncapsZero = { ...cardUncaps, [target]: enums.UncapType.Zero }
        const resultZero = optimizeUnit({
          settings,
          scoreSettings,
          cardUncaps: uncapsZero,
          allCards: AllCards,
          cardByName: CardByName,
        })
        if (!resultZero) continue
        const inZero = resultZero.members.some((m) => m.card.name === target)
        if (!inZero) continue // 0凸で入らない場合はスキップ

        // NotOwnedで最適化する
        const uncapsNotOwned = { ...cardUncaps, [target]: enums.UncapType.NotOwned }
        const resultNotOwned = optimizeUnit({
          settings,
          scoreSettings,
          cardUncaps: uncapsNotOwned,
          allCards: AllCards,
          cardByName: CardByName,
        })
        expect(resultNotOwned).not.toBeNull()
        if (!resultNotOwned) continue

        // 0凸で選出されるカードは NotOwned でもレンタルとして選出されるべき
        const inNotOwned = resultNotOwned.members.some((m) => m.card.name === target)
        expect(inNotOwned, `${target}: 0凸で選出されるが NotOwned で選出されない`).toBe(true)
      }
    })
  })

  describe('最適性検証', () => {
    const planTypes = [
      { plan: enums.PlanType.Sense, label: 'センス' },
      { plan: enums.PlanType.Logic, label: 'ロジック' },
      { plan: enums.PlanType.Anomaly, label: 'アノマリー' },
    ] as const

    for (const { plan, label } of planTypes) {
      describe(`${label}プラン`, () => {
        it('optimizeUnit の結果が evaluateManualUnit と一致する', () => {
          // optimizeUnit は内部で近似計算を使い、最終出力で buildResult を呼ぶ。
          // 同じサポート構成で evaluateManualUnit を呼んだときのスコアと一致することで
          // 内部計算と最終出力の整合性を保証する。
          const scoreSettings = makeScoreSettings()
          const settings = makeSimulatorSettings([], {
            plan,
            manualCards: [],
            spConstraint: { vocal: 0, dance: 0, visual: 0 },
          })

          // 最適化を実行する
          const optimized = optimizeUnit({
            settings,
            scoreSettings,
            cardUncaps: {},
            allCards: AllCards,
            cardByName: CardByName,
          })
          if (!optimized) return

          // 最適化結果のサポート名とレンタル指定で手動評価する
          // レンタルカードを末尾に配置する（evaluateManualUnit は末尾スロットをレンタルとして扱う）
          const rentalName = optimized.members.find((m) => m.isRental)?.card.name ?? null
          const cardNames = rentalName
            ? [...optimized.members.filter((m) => !m.isRental).map((m) => m.card.name), rentalName]
            : optimized.members.map((m) => m.card.name)
          const manualSettings = makeSimulatorSettings(cardNames, {
            plan,
            manualRental: true,
            rentalCardName: rentalName,
          })

          const manual = evaluateManualUnit({
            settings: manualSettings,
            scoreSettings,
            cardUncaps: {},
            allCards: AllCards,
            cardByName: CardByName,
          })

          // 手動評価の結果が存在し、スコアが完全一致すること
          expect(manual).not.toBeNull()
          expect(manual!.totalScore).toBe(optimized.totalScore)
        })

        it('単一サポート入れ替えで改善しない（局所最適性）', () => {
          // 最適化結果のユニットから1枚を非選択サポートと入れ替えた場合、
          // スコアが改善しないことを確認する。局所探索アルゴリズムが
          // 全てのSwapパターンを試行済みであることの検証。
          const scoreSettings = makeScoreSettings()
          const settings = makeSimulatorSettings([], {
            plan,
            manualCards: [],
            spConstraint: { vocal: 0, dance: 0, visual: 0 },
          })

          // 最適化を実行する
          const optimized = optimizeUnit({
            settings,
            scoreSettings,
            cardUncaps: {},
            allCards: AllCards,
            cardByName: CardByName,
          })
          if (!optimized) return

          // 候補サポートから選択済みサポートを除外する
          const selectedNames = new Set(optimized.members.map((m) => m.card.name))
          const candidateCards = AllCards.filter(
            (c) => (c.plan === plan || c.plan === enums.PlanType.Free) && !selectedNames.has(c.name),
          )

          // ユニット内の各サポートを全候補サポートと入れ替えてスコア比較する
          // レンタルカードを末尾に配置する（evaluateManualUnit は末尾スロットをレンタルとして扱う）
          const rentalNameOpt = optimized.members.find((m) => m.isRental)?.card.name ?? null
          const memberNames = rentalNameOpt
            ? [...optimized.members.filter((m) => !m.isRental).map((m) => m.card.name), rentalNameOpt]
            : optimized.members.map((m) => m.card.name)
          for (let i = 0; i < memberNames.length; i++) {
            for (const candidate of candidateCards) {
              // i番目のサポートを候補サポートに入れ替える
              const swappedNames = [...memberNames]
              swappedNames[i] = candidate.name
              const swapSettings = makeSimulatorSettings(swappedNames, {
                plan,
                manualRental: true,
                rentalCardName: rentalNameOpt,
              })
              const swapResult = evaluateManualUnit({
                settings: swapSettings,
                scoreSettings,
                cardUncaps: {},
                allCards: AllCards,
                cardByName: CardByName,
              })
              if (!swapResult) continue

              // 入れ替え後のスコアが最適化結果以下であること
              expect(optimized.totalScore).toBeGreaterThanOrEqual(swapResult.totalScore)
            }
          }
        })
      })
    }
  })

  describe('レンタル込み局所最適性', () => {
    it('未所持カードのレンタルスワップ後も局所最適である', () => {
      // autoDesignateRental が未所持カードをスワップインした後、
      // localSearch の再実行によりシナジー最適化が適用されていることを検証する。
      // Phase 4（レンタル後の局所探索）が正しく機能していることの保証。
      const plan = enums.PlanType.Sense
      const scoreSettings = makeRealisticScoreSettings({
        scenario: enums.ScenarioType.Hajime,
        difficulty: enums.DifficultyType.Legend,
        useFixedUncap: false,
        parameterBonusBase: { vocal: 390, dance: 875, visual: 1035 },
      })
      // いつまでも続けばいいのに を未所持に設定してレンタル候補にする
      const cardUncaps: Record<string, enums.UncapType> = {
        いつまでも続けばいいのに: enums.UncapType.NotOwned,
      }
      const settings = makeSimulatorSettings([], {
        plan,
        manualCards: [],
        spConstraint: { vocal: 0, dance: 3, visual: 1 },
      })

      const result = optimizeUnit({ settings, scoreSettings, cardUncaps, allCards: AllCards, cardByName: CardByName })
      expect(result).not.toBeNull()
      if (!result) return

      // 候補プール: プラン互換の全カード（未所持含む・4凸評価）
      const selectedNames = new Set(result.members.map((m) => m.card.name))
      const candidateCards = AllCards.filter(
        (c) => (c.plan === plan || c.plan === enums.PlanType.Free) && !selectedNames.has(c.name),
      )

      // SP制約チェック用: 各カードのSP種別を判定するヘルパー
      const getSpCat = (card: { abilities: { trigger_key?: string }[] }) => {
        for (const a of card.abilities) {
          if (a.trigger_key === enums.TriggerKeyType.VoSpLessonRate) return enums.SpCategoryType.Vocal
          if (a.trigger_key === enums.TriggerKeyType.DaSpLessonRate) return enums.SpCategoryType.Dance
          if (a.trigger_key === enums.TriggerKeyType.ViSpLessonRate) return enums.SpCategoryType.Visual
        }
        return enums.SpCategoryType.None
      }
      const spConstraint = settings.spConstraint
      const checkSpConstraint = (names: string[]) => {
        const counts = { vocal: 0, dance: 0, visual: 0 }
        for (const n of names) {
          const c = AllCards.find((c) => c.name === n)!
          const cat = getSpCat(c)
          if (cat !== enums.SpCategoryType.None) counts[cat as keyof typeof counts]++
        }
        return (
          counts.vocal >= spConstraint.vocal &&
          counts.dance >= spConstraint.dance &&
          counts.visual >= spConstraint.visual
        )
      }
      // タイプ制約チェック用ヘルパー
      const checkTypeConstraint = (names: string[]) => {
        const counts: Record<enums.ParameterType, number> = {
          [enums.ParameterType.Vocal]: 0,
          [enums.ParameterType.Dance]: 0,
          [enums.ParameterType.Visual]: 0,
        }
        for (const n of names) {
          const c = AllCards.find((c) => c.name === n)!
          if (c.type in counts) counts[c.type as enums.ParameterType]++
        }
        for (const type of Object.values(enums.ParameterType)) {
          if (counts[type] < settings.typeCountMin[type]) return false
          if (counts[type] > settings.typeCountMax[type]) return false
        }
        return true
      }

      // レンタル枠の特定
      const rentalName = result.members.find((m) => m.isRental)?.card.name ?? null

      // ユニット内の各メンバーを全候補と入れ替えてスコア比較する
      // レンタルカードを末尾に配置する（evaluateManualUnit は末尾スロットをレンタルとして扱う）
      const memberNames = rentalName
        ? [...result.members.filter((m) => !m.isRental).map((m) => m.card.name), rentalName]
        : result.members.map((m) => m.card.name)
      for (let i = 0; i < memberNames.length; i++) {
        for (const candidate of candidateCards) {
          const swappedNames = [...memberNames]
          swappedNames[i] = candidate.name
          // SP制約・タイプ制約を満たさないスワップはスキップする
          if (!checkSpConstraint(swappedNames)) continue
          if (!checkTypeConstraint(swappedNames)) continue
          const swapSettings = makeSimulatorSettings(swappedNames, {
            plan,
            manualRental: true,
            rentalCardName: rentalName,
          })
          // 未所持カードが入っている場合は4凸で評価する
          const swapResult = evaluateManualUnit({
            settings: swapSettings,
            scoreSettings,
            cardUncaps,
            allCards: AllCards,
            cardByName: CardByName,
          })
          if (!swapResult) continue

          expect(result.totalScore).toBeGreaterThanOrEqual(swapResult.totalScore)
        }
      }
    })
  })

  describe('タイプ別枚数制約', () => {
    const plan = enums.PlanType.Sense

    it('最大枚数制約を超えるタイプがユニットに含まれない', () => {
      // Dance max=1 に制限して最適化する
      const scoreSettings = makeScoreSettings()
      const settings = makeSimulatorSettings([], {
        plan,
        manualCards: [],
        spConstraint: { vocal: 0, dance: 0, visual: 0 },
        typeCountMin: {
          [enums.ParameterType.Vocal]: 0,
          [enums.ParameterType.Dance]: 0,
          [enums.ParameterType.Visual]: 0,
        },
        typeCountMax: {
          [enums.ParameterType.Vocal]: constant.UNIT_SIZE,
          [enums.ParameterType.Dance]: 1,
          [enums.ParameterType.Visual]: constant.UNIT_SIZE,
        },
      })

      const result = optimizeUnit({
        settings,
        scoreSettings,
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })
      expect(result).not.toBeNull()
      if (!result) return

      const danceCount = result.members.filter((m) => m.card.type === enums.CardType.Dance).length
      expect(danceCount).toBeLessThanOrEqual(1)
    })

    it('最小枚数制約を下回るタイプがユニットに含まれない', () => {
      // Vocal min=2 に制限して最適化する
      const scoreSettings = makeScoreSettings()
      const settings = makeSimulatorSettings([], {
        plan,
        manualCards: [],
        spConstraint: { vocal: 0, dance: 0, visual: 0 },
        typeCountMin: {
          [enums.ParameterType.Vocal]: 2,
          [enums.ParameterType.Dance]: 0,
          [enums.ParameterType.Visual]: 0,
        },
        typeCountMax: {
          [enums.ParameterType.Vocal]: constant.UNIT_SIZE,
          [enums.ParameterType.Dance]: constant.UNIT_SIZE,
          [enums.ParameterType.Visual]: constant.UNIT_SIZE,
        },
      })

      const result = optimizeUnit({
        settings,
        scoreSettings,
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })
      expect(result).not.toBeNull()
      if (!result) return

      const vocalCount = result.members.filter((m) => m.card.type === enums.CardType.Vocal).length
      expect(vocalCount).toBeGreaterThanOrEqual(2)
    })

    it('SP制約とタイプ制約の両方を満たす編成が返る', () => {
      // SP dance=2 + Dance max=2 の組み合わせ（ギリギリ実現可能）
      const scoreSettings = makeScoreSettings()
      const settings = makeSimulatorSettings([], {
        plan,
        manualCards: [],
        spConstraint: { vocal: 0, dance: 2, visual: 0 },
        typeCountMin: {
          [enums.ParameterType.Vocal]: 0,
          [enums.ParameterType.Dance]: 0,
          [enums.ParameterType.Visual]: 0,
        },
        typeCountMax: {
          [enums.ParameterType.Vocal]: constant.UNIT_SIZE,
          [enums.ParameterType.Dance]: 2,
          [enums.ParameterType.Visual]: constant.UNIT_SIZE,
        },
      })

      const result = optimizeUnit({
        settings,
        scoreSettings,
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })
      expect(result).not.toBeNull()
      if (!result) return

      expect(result.members).toHaveLength(constant.UNIT_SIZE)
      const danceCount = result.members.filter((m) => m.card.type === enums.CardType.Dance).length
      expect(danceCount).toBeLessThanOrEqual(2)

      // SP制約も満たしていることを確認する
      const danceSpCount = result.members.filter((m) =>
        m.card.abilities.some((a) => a.trigger_key === enums.TriggerKeyType.DaSpLessonRate),
      ).length
      expect(danceSpCount).toBeGreaterThanOrEqual(2)
    })

    it('制約付きでも局所最適性を維持する', () => {
      // Dance max=2, Visual min=1 の制約付きで最適化し、
      // 制約を満たすスワップの中で改善がないことを確認する
      const scoreSettings = makeScoreSettings()
      const settings = makeSimulatorSettings([], {
        plan,
        manualCards: [],
        spConstraint: { vocal: 0, dance: 0, visual: 0 },
        typeCountMin: {
          [enums.ParameterType.Vocal]: 0,
          [enums.ParameterType.Dance]: 0,
          [enums.ParameterType.Visual]: 1,
        },
        typeCountMax: {
          [enums.ParameterType.Vocal]: constant.UNIT_SIZE,
          [enums.ParameterType.Dance]: 2,
          [enums.ParameterType.Visual]: constant.UNIT_SIZE,
        },
      })

      const result = optimizeUnit({
        settings,
        scoreSettings,
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })
      expect(result).not.toBeNull()
      if (!result) return

      // タイプ制約チェックヘルパー
      const checkTypeConstraint = (names: string[]) => {
        const counts: Record<enums.ParameterType, number> = {
          [enums.ParameterType.Vocal]: 0,
          [enums.ParameterType.Dance]: 0,
          [enums.ParameterType.Visual]: 0,
        }
        for (const n of names) {
          const c = AllCards.find((c) => c.name === n)!
          if (c.type in counts) counts[c.type as enums.ParameterType]++
        }
        for (const type of Object.values(enums.ParameterType)) {
          if (counts[type] < settings.typeCountMin[type]) return false
          if (counts[type] > settings.typeCountMax[type]) return false
        }
        return true
      }

      const selectedNames = new Set(result.members.map((m) => m.card.name))
      const candidateCards = AllCards.filter(
        (c) => (c.plan === plan || c.plan === enums.PlanType.Free) && !selectedNames.has(c.name),
      )
      const memberNames = result.members.map((m) => m.card.name)

      for (let i = 0; i < memberNames.length; i++) {
        for (const candidate of candidateCards) {
          const swappedNames = [...memberNames]
          swappedNames[i] = candidate.name
          if (!checkTypeConstraint(swappedNames)) continue

          const swapSettings = makeSimulatorSettings(swappedNames, { plan })
          const swapResult = evaluateManualUnit({
            settings: swapSettings,
            scoreSettings,
            cardUncaps: {},
            allCards: AllCards,
            cardByName: CardByName,
          })
          if (!swapResult) continue

          expect(result.totalScore).toBeGreaterThanOrEqual(swapResult.totalScore)
        }
      }
    })

    it('最小/最大枚数の合計が不正な場合は null を返す', () => {
      const scoreSettings = makeScoreSettings()

      // 最小枚数合計 > 6: 実現不可能
      const tooMuchMin = makeSimulatorSettings([], {
        plan,
        manualCards: [],
        typeCountMin: {
          [enums.ParameterType.Vocal]: 3,
          [enums.ParameterType.Dance]: 3,
          [enums.ParameterType.Visual]: 3,
        },
        typeCountMax: {
          [enums.ParameterType.Vocal]: constant.UNIT_SIZE,
          [enums.ParameterType.Dance]: constant.UNIT_SIZE,
          [enums.ParameterType.Visual]: constant.UNIT_SIZE,
        },
      })
      expect(
        optimizeUnit({
          settings: tooMuchMin,
          scoreSettings,
          cardUncaps: {},
          allCards: AllCards,
          cardByName: CardByName,
        }),
      ).toBeNull()

      // 最大枚数合計 < 6: 実現不可能
      const tooLittleMax = makeSimulatorSettings([], {
        plan,
        manualCards: [],
        typeCountMin: {
          [enums.ParameterType.Vocal]: 0,
          [enums.ParameterType.Dance]: 0,
          [enums.ParameterType.Visual]: 0,
        },
        typeCountMax: {
          [enums.ParameterType.Vocal]: 1,
          [enums.ParameterType.Dance]: 1,
          [enums.ParameterType.Visual]: 1,
        },
      })
      expect(
        optimizeUnit({
          settings: tooLittleMax,
          scoreSettings,
          cardUncaps: {},
          allCards: AllCards,
          cardByName: CardByName,
        }),
      ).toBeNull()
    })
  })

  describe('網羅的最適性検証', () => {
    // ベーススコア上位12枚の全組み合わせ（C(12,6) = 924通り）を網羅的に評価し、
    // optimizeUnit の結果がその中の最高スコア以上であることを検証する。
    // 真の最適解との比較により、貪欲法＋局所探索が見逃しをしていないか直接検証する。
    const TOP_N = 12

    /** 配列から n 個選ぶ全組み合わせを生成する */
    function combinations<T>(arr: T[], n: number): T[][] {
      if (n === 0) return [[]]
      if (arr.length < n) return []
      const [first, ...rest] = arr
      const withFirst = combinations(rest, n - 1).map((c) => [first, ...c])
      const withoutFirst = combinations(rest, n)
      return [...withFirst, ...withoutFirst]
    }

    // 設定バリエーション: SP制約・paramBonusBase を変えて多様なケースをカバーする
    const settingVariations = [
      {
        label: 'センス（SP制約あり・パラボ非ゼロ）',
        plan: enums.PlanType.Sense as enums.PlanType,
        spConstraint: { vocal: 0, dance: 2, visual: 1 },
        scoreOverrides: { parameterBonusBase: { vocal: 500, dance: 800, visual: 600 } },
      },
      {
        label: 'ロジック（デフォルト設定）',
        plan: enums.PlanType.Logic as enums.PlanType,
        spConstraint: { vocal: 0, dance: 0, visual: 0 },
        scoreOverrides: {},
      },
      {
        label: 'アノマリー（SP制約あり）',
        plan: enums.PlanType.Anomaly as enums.PlanType,
        spConstraint: { vocal: 1, dance: 1, visual: 1 },
        scoreOverrides: { parameterBonusBase: { vocal: 300, dance: 300, visual: 300 } },
      },
    ] as const

    for (const { label, plan, spConstraint, scoreOverrides } of settingVariations) {
      it(`${label}: 上位${TOP_N}枚の全組み合わせ網羅で最適解以上を出す`, { timeout: 30000 }, () => {
        const scoreSettings = makeScoreSettings(scoreOverrides)

        // 候補サポートのベーススコアを計算し、上位12枚を選出する
        const schedule = getScheduleData(scoreSettings.scenario, scoreSettings.difficulty)
        const effectiveCounts = mergeScheduleCounts(scoreSettings, schedule)
        const compatibleCards = AllCards.filter((c) => c.plan === plan || c.plan === enums.PlanType.Free)
        const scored = compatibleCards.map((card) => ({
          card,
          score: calculateCardParameter(
            card,
            enums.UncapType.Four,
            effectiveCounts,
            {},
            scoreSettings.parameterBonusBase,
            scoreSettings.includeSelfTrigger,
            scoreSettings.includePItem,
          ).totalIncrease,
        }))
        scored.sort((a, b) => b.score - a.score)
        const topCards = scored.slice(0, TOP_N).map((s) => s.card)

        // C(12,6) = 924 通りの全組み合わせを評価する
        const combos = combinations(topCards, constant.UNIT_SIZE)
        let exhaustiveBest = -Infinity
        for (const combo of combos) {
          const names = combo.map((c) => c.name)
          const manualSettings = makeSimulatorSettings(names, {
            plan,
            manualRental: true,
            rentalCardName: null,
          })
          const result = evaluateManualUnit({
            settings: manualSettings,
            scoreSettings,
            cardUncaps: {},
            allCards: AllCards,
            cardByName: CardByName,
          })
          if (result && result.totalScore > exhaustiveBest) {
            exhaustiveBest = result.totalScore
          }
        }

        // optimizeUnit（全候補から最適化）の結果が網羅的最高スコア以上であること
        const settings = makeSimulatorSettings([], {
          plan,
          manualCards: [],
          spConstraint,
        })
        const optimized = optimizeUnit({
          settings,
          scoreSettings,
          cardUncaps: {},
          allCards: AllCards,
          cardByName: CardByName,
        })
        expect(optimized).not.toBeNull()
        expect(optimized!.totalScore).toBeGreaterThanOrEqual(exhaustiveBest)
      })
    }
  })

  describe('固定サポートの保護', () => {
    const plans = [enums.PlanType.Sense, enums.PlanType.Logic, enums.PlanType.Anomaly] as const

    for (const plan of plans) {
      it(`${plan}プランで固定サポートが最適化後も結果に含まれる`, () => {
        const scoreSettings = makeScoreSettings()

        // プラン対応カードからベーススコア下位のカードを固定する（あえて弱いカードをロック）
        const planCards = AllCards.filter((c) => c.plan === plan || c.plan === enums.PlanType.Free)
        const scored = planCards.map((c) => ({
          card: c,
          score: calculateCardParameter(c, enums.UncapType.Four, {}, {}, { vocal: 0, dance: 0, visual: 0 }, true, true)
            .totalIncrease,
        }))
        scored.sort((a, b) => a.score - b.score)

        // 下位3枚を固定する
        const lockedNames = scored.slice(0, 3).map((s) => s.card.name)

        const settings = makeSimulatorSettings([], {
          plan,
          manualCards: [],
          lockedCards: lockedNames,
        })
        const result = optimizeUnit({
          settings,
          scoreSettings,
          cardUncaps: {},
          allCards: AllCards,
          cardByName: CardByName,
        })
        expect(result).not.toBeNull()

        // 固定サポートが全て結果に含まれること
        const resultNames = result!.members.map((m) => m.card.name)
        for (const locked of lockedNames) {
          expect(resultNames).toContain(locked)
        }
      })
    }
  })
})

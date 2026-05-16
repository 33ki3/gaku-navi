/**
 * 最適編成のテスト
 *
 * パラメータボーナスの二重計算防止、サポート間連携計算、最適性検証を行う。
 */
import { describe, expect, it } from 'vitest'
import { evaluateManualUnit, exhaustiveOptimizeAsync } from '../../utils/unitSimulator'
import { calculateCardParameter } from '../../utils/calculator/calculateCard'
import { computeUnitSupportSynergy, getProvidedActions } from '../../utils/supportSynergy'
import { getSelfAcquisitionBonus } from '../../utils/calculator/events'
import { AllCards, CardByName, getScheduleData, TriggerActionMap } from '../../data'
import { resolveParamCap } from '../../data/score/paramCap'
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
    useCustomMode: false,
    customParamBonusRows: [{ vocal: 0, dance: 0, visual: 0 }],
    customClassBonus: { vocal: 0, dance: 0, visual: 0 },
    customNonBonusGain: { vocal: 0, dance: 0, visual: 0 },
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
  describe('パラメータ上限値', () => {
    it('通常シナリオではoverrideを無視してシナリオ既定値を使う', () => {
      expect(resolveParamCap(enums.ScenarioType.Hajime, enums.DifficultyType.Legend, 3200)).toBe(3000)
    })

    it('カスタムシナリオではoverride未設定時に3200を使う', () => {
      expect(resolveParamCap(enums.ScenarioType.Custom, enums.DifficultyType.Regular, null)).toBe(3200)
    })
  })

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

    it('カスタムモードではパラボ対象上昇と対象外上昇が合計値に加算される', () => {
      const card = AllCards.find(
        (c) =>
          (c.plan === enums.PlanType.Anomaly || c.plan === enums.PlanType.Free) &&
          !c.abilities.some((a) => a.is_parameter_bonus),
      )
      if (!card) return

      const baseSettings = makeScoreSettings({
        scenario: enums.ScenarioType.Custom,
        useCustomMode: true,
        parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
        customParamBonusRows: [{ vocal: 0, dance: 0, visual: 0 }],
        customClassBonus: { vocal: 0, dance: 0, visual: 0 },
        customNonBonusGain: { vocal: 0, dance: 0, visual: 0 },
      })
      const customSettings = makeScoreSettings({
        scenario: enums.ScenarioType.Custom,
        useCustomMode: true,
        parameterBonusBase: { vocal: 10, dance: 20, visual: 30 },
        customParamBonusRows: [{ vocal: 10, dance: 20, visual: 30 }],
        customClassBonus: { vocal: 1, dance: 2, visual: 3 },
        customNonBonusGain: { vocal: 4, dance: 5, visual: 6 },
      })
      const builderSettings = makeSimulatorSettings([card.name])

      const baseResult = evaluateManualUnit({
        settings: builderSettings,
        scoreSettings: baseSettings,
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })
      const customResult = evaluateManualUnit({
        settings: builderSettings,
        scoreSettings: customSettings,
        cardUncaps: {},
        allCards: AllCards,
        cardByName: CardByName,
      })

      if (!baseResult || !customResult) return

      expect(customResult.totalScore - baseResult.totalScore).toBe(81)
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
  })

  describe('Exhaustive stats', () => {
    it('onStats で探索統計を受け取れる', async () => {
      const testCards = AllCards.filter((c) => c.plan === enums.PlanType.Sense || c.plan === enums.PlanType.Free).slice(
        0,
        14,
      )
      if (testCards.length < 6) return

      let stats = { evaluatedCombos: 0, rentalBranchesVisited: 0 }

      const input = {
        settings: makeSimulatorSettings([], {
          plan: enums.PlanType.Sense,
          manualRental: false,
          rentalCardName: null,
          exhaustiveCandidateLimit: 14,
        }),
        scoreSettings: makeScoreSettings({
          parameterBonusBase: { vocal: 1200, dance: 1200, visual: 1200 },
          includeSelfTrigger: true,
          includePItem: true,
        }),
        cardUncaps: {},
        allCards: testCards,
        cardByName: new Map(testCards.map((c) => [c.name, c])),
      }

      const result = await exhaustiveOptimizeAsync(
        input,
        () => {
          // no-op
        },
        () => false,
        undefined,
        {
          onStats: (currentStats) => {
            stats = currentStats
          },
        },
      )

      expect(result).not.toBeNull()
      expect(stats.rentalBranchesVisited).toBeGreaterThan(0)
      expect(stats.evaluatedCombos).toBeGreaterThan(0)
    })
  })
})

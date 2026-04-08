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
import { AllCards, getScheduleData, TriggerActionMap } from '../../data'
import { mergeScheduleCounts } from '../../utils/scoreSettings'
import type { ScoreSettings } from '../../types/card'
import * as enums from '../../types/enums'
import type { UnitSimulatorSettings } from '../../types/unit'

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

/** デフォルトのシミュレーター設定を作る */
function makeSimulatorSettings(
  cardNames: string[],
  overrides: Partial<UnitSimulatorSettings> = {},
): UnitSimulatorSettings {
  return {
    plan: enums.PlanType.Anomaly,
    allowedTypes: [],
    spConstraint: { vocal: 0, dance: 0, visual: 0 },
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

      // カウント調整なし
      const baseResult = computeUnitSupportSynergy([providerCard, receiverCard])
      const baseCount = baseResult.bonusMap.get(receiverCard.name)?.[commonAction] ?? 0

      // カウント調整で自動ボーナスを0にする
      const customCounts = {
        [providerCard.name]: {
          selfTrigger: { [commonAction]: 0 },
        },
      }
      const customResult = computeUnitSupportSynergy([providerCard, receiverCard], customCounts)
      const customCount = customResult.bonusMap.get(receiverCard.name)?.[commonAction] ?? 0

      // カウント調整により受取回数が減ることを確認する
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
      const baseResult = evaluateManualUnit({ settings: builderSettings, scoreSettings, cardUncaps: {} })
      // 回数調整で自動ボーナスを 0 にして計算
      const customCounts = { [providerCard.name]: { selfTrigger: { [commonAction]: 0 } } }
      const customResult = evaluateManualUnit({
        settings: builderSettings,
        scoreSettings,
        cardUncaps: {},
        cardCountCustom: customCounts,
      })

      if (!baseResult || !customResult) return

      // receiver のサポート間連携が変動することを確認する
      const baseReceiver = baseResult.members.find((m) => m.card.name === receiverCard.name)
      const customReceiver = customResult.members.find((m) => m.card.name === receiverCard.name)
      expect(baseReceiver).toBeDefined()
      expect(customReceiver).toBeDefined()

      // カウント調整により合計スコアが変動する
      expect(customResult.totalScore).not.toBe(baseResult.totalScore)
    })

    it('selfTrigger カウント調整が連動グループ内の関連アクションにも伝播する', () => {
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

      // カウント調整なし
      const baseResult = computeUnitSupportSynergy([deleteProviderCard, receiverCard])
      const baseDeleteCount = baseResult.bonusMap.get(receiverCard.name)?.[enums.ActionIdType.Delete] ?? 0

      // selfBonus の特定キーを 0 にカウント調整 → 連動で delete も減るはず
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
      const result = evaluateManualUnit({ settings: builderSettings, scoreSettings, cardUncaps: {} })
      if (!result) return

      const receiver = result.members.find((m) => m.card.name === receiverCard.name)
      expect(receiver).toBeDefined()
      // baseCount が max_count に到達しているので、supportSynergyDetail のこのトリガーは 0 のはず
      const extraCount = receiver!.supportSynergyDetail[maxCountAbility.trigger_key] ?? 0
      expect(extraCount).toBe(0)
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
      const baseline = optimizeUnit({ settings, scoreSettings, cardUncaps: {} })
      expect(baseline).not.toBeNull()
      if (!baseline) return

      // ベースラインの1番目のメンバーを未所持にする
      const targetCard = baseline.members[0].card.name

      // useFixedUncap を false にして、対象サポートを未所持に設定する
      const uncapSettings = makeScoreSettings({ useFixedUncap: false })
      const cardUncaps: Record<string, enums.UncapType> = {
        [targetCard]: enums.UncapType.NotOwned,
      }

      const result = optimizeUnit({ settings, scoreSettings: uncapSettings, cardUncaps })
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
      const baseline = optimizeUnit({ settings, scoreSettings, cardUncaps: {} })
      if (!baseline) return

      // ベースラインの1番目のメンバーを未所持にする
      const targetCard = baseline.members[0].card.name
      const uncapSettings = makeScoreSettings({ useFixedUncap: false })
      const cardUncaps: Record<string, enums.UncapType> = {
        [targetCard]: enums.UncapType.NotOwned,
      }

      const result = optimizeUnit({ settings, scoreSettings: uncapSettings, cardUncaps })
      if (!result) return

      // optimizeUnit の結果を evaluateManualUnit で再評価してスコアが一致することを確認する
      const cardNames = result.members.map((m) => m.card.name)
      const rentalName = result.members.find((m) => m.isRental)?.card.name ?? null
      const manualSettings = makeSimulatorSettings(cardNames, {
        plan,
        manualRental: true,
        rentalCardName: rentalName,
      })

      const manual = evaluateManualUnit({ settings: manualSettings, scoreSettings: uncapSettings, cardUncaps })
      expect(manual).not.toBeNull()
      expect(manual!.totalScore).toBe(result.totalScore)
    })
  })

  describe('最適性検証', () => {
    /** ランダムに n 個の要素を選択する（Fisher-Yates shuffle で先頭 n 個を取る） */
    function pickRandom<T>(arr: T[], n: number): T[] {
      const copy = [...arr]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy.slice(0, n)
    }

    const SAMPLE_SIZE = 500
    const UNIT_SIZE = 6

    const planTypes = [
      { plan: enums.PlanType.Sense, label: 'センス' },
      { plan: enums.PlanType.Logic, label: 'ロジック' },
      { plan: enums.PlanType.Anomaly, label: 'アノマリー' },
    ] as const

    for (const { plan, label } of planTypes) {
      describe(`${label}プラン`, () => {
        it('optimizeUnit が有効な6枚のユニットを返す', () => {
          // SP制約なし・全タイプ許可で最適化を実行する
          const scoreSettings = makeScoreSettings()
          const settings = makeSimulatorSettings([], {
            plan,
            manualCards: [],
            spConstraint: { vocal: 0, dance: 0, visual: 0 },
          })

          // 最適化を実行する
          const result = optimizeUnit({ settings, scoreSettings, cardUncaps: {} })

          // 結果が返り、ちょうど6枚のメンバーが含まれること
          expect(result).not.toBeNull()
          expect(result!.members).toHaveLength(UNIT_SIZE)

          // すべてのメンバーが対象プランまたはFree（プラン互換）であること
          // プラン不一致のサポートが混入するとゲーム内で使用不可になる
          for (const member of result!.members) {
            expect([plan, enums.PlanType.Free]).toContain(member.card.plan)
          }

          // サポート名が重複しないこと（同じサポートは2枚編成できない）
          const names = result!.members.map((m) => m.card.name)
          expect(new Set(names).size).toBe(UNIT_SIZE)
        })

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
          const optimized = optimizeUnit({ settings, scoreSettings, cardUncaps: {} })
          if (!optimized) return

          // 最適化結果のサポート名とレンタル指定で手動評価する
          const cardNames = optimized.members.map((m) => m.card.name)
          const manualSettings = makeSimulatorSettings(cardNames, {
            plan,
            manualRental: true,
            rentalCardName: optimized.members.find((m) => m.isRental)?.card.name ?? null,
          })

          const manual = evaluateManualUnit({ settings: manualSettings, scoreSettings, cardUncaps: {} })

          // 手動評価の結果が存在し、スコアが完全一致すること
          expect(manual).not.toBeNull()
          expect(manual!.totalScore).toBe(optimized.totalScore)
        })

        it('ランダムな組み合わせより高いスコアを出す', () => {
          // 候補サポートプールから500組のランダム6枚編成を生成し、
          // 最適化結果がすべてのランダム編成以上のスコアであることを確認する。
          // 貪欲法＋局所探索が少なくともランダム選択より優れていることの検証。
          const scoreSettings = makeScoreSettings()
          const settings = makeSimulatorSettings([], {
            plan,
            manualCards: [],
            spConstraint: { vocal: 0, dance: 0, visual: 0 },
          })

          // 最適化を実行する
          const optimized = optimizeUnit({ settings, scoreSettings, cardUncaps: {} })
          if (!optimized) return

          // 該当プランとFreeの全サポートを候補プールとする
          const candidateCards = AllCards.filter((c) => c.plan === plan || c.plan === enums.PlanType.Free)

          // ランダムな6枚の組み合わせを500回試行し、毎回スコア比較する
          for (let i = 0; i < SAMPLE_SIZE; i++) {
            const randomCards = pickRandom(candidateCards, UNIT_SIZE)
            const randomNames = randomCards.map((c) => c.name)
            const randomSettings = makeSimulatorSettings(randomNames, { plan })

            const randomResult = evaluateManualUnit({ settings: randomSettings, scoreSettings, cardUncaps: {} })
            if (!randomResult) continue

            // 最適化結果がランダム編成以上のスコアであること
            expect(optimized.totalScore).toBeGreaterThanOrEqual(randomResult.totalScore)
          }
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
          const optimized = optimizeUnit({ settings, scoreSettings, cardUncaps: {} })
          if (!optimized) return

          // 候補サポートから選択済みサポートを除外する
          const selectedNames = new Set(optimized.members.map((m) => m.card.name))
          const candidateCards = AllCards.filter(
            (c) => (c.plan === plan || c.plan === enums.PlanType.Free) && !selectedNames.has(c.name),
          )

          // ユニット内の各サポートを全候補サポートと入れ替えてスコア比較する
          const memberNames = optimized.members.map((m) => m.card.name)
          for (let i = 0; i < memberNames.length; i++) {
            for (const candidate of candidateCards) {
              // i番目のサポートを候補サポートに入れ替える
              const swappedNames = [...memberNames]
              swappedNames[i] = candidate.name
              const swapSettings = makeSimulatorSettings(swappedNames, { plan })
              const swapResult = evaluateManualUnit({ settings: swapSettings, scoreSettings, cardUncaps: {} })
              if (!swapResult) continue

              // 入れ替え後のスコアが最適化結果以下であること
              expect(optimized.totalScore).toBeGreaterThanOrEqual(swapResult.totalScore)
            }
          }
        })
      })
    }
  })
})

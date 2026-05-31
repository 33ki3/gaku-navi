/**
 * @file useUnitSimulator.test.ts
 * @description 最適化計算完了時における、通常枠およびレンタル枠ロック状態の自動入れ替え・引き継ぎ同期機能の単体テストです。
 *
 * unifyRentalLock 有効時に、レンタル枠と通常枠の間でカードが移動した場合に
 * ロック状態が正しく引き継がれ、ローカルストレージへ保存される挙動を検証します。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// 計算負荷を回避し決定的挙動を検査するため、非同期オプティマイザー実行関数をモック化
vi.mock('../../hooks/unitOptimizerRunner', () => ({
  runOptimizerAsync: vi.fn(),
}))

import { useUnitSimulator } from '../../hooks/useUnitSimulator'
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import type { SupportCard, ScoreSettings, CardCalculationResult } from '../../types/card'
import type { UnitMember, UnitResult } from '../../types/unit'
import { runOptimizerAsync } from '../../hooks/unitOptimizerRunner'

/** テスト用の最小フィールドを持つダミー UnitMember を作成する */
function makeMember(card: SupportCard, isRental: boolean): UnitMember {
  return {
    card,
    uncap: enums.UncapType.Zero,
    isRental,
    result: {} as unknown as CardCalculationResult,
    supportSynergy: 0,
    supportSynergyDetail: {},
    synergyProviders: [],
    paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
  }
}

describe('useUnitSimulator - applyOptimizedResult ロック入れ替え機能', () => {
  // テスト検証用のダミーサポートカードデータ（name のみ参照される）
  const mockCards = [
    { name: 'CardA', type: enums.CardType.Vocal, plan: enums.PlanType.Sense },
    { name: 'CardB', type: enums.CardType.Dance, plan: enums.PlanType.Sense },
    { name: 'CardC', type: enums.CardType.Visual, plan: enums.PlanType.Sense },
  ] as unknown as SupportCard[]

  const cardByName = new Map<string, SupportCard>(mockCards.map((c) => [c.name, c]))

  /** レンタル・通常ロック区別撤廃オプション(unifyRentalLock)が有効な設定 */
  const enabledScoreSettings: ScoreSettings = {
    name: 'test',
    scenario: enums.ScenarioType.Hajime,
    difficulty: enums.DifficultyType.Regular,
    useFixedUncap: true,
    useCustomMode: false,
    customParamBonusRows: [],
    customClassBonus: { vocal: 0, dance: 0, visual: 0 },
    customNonBonusGain: { vocal: 0, dance: 0, visual: 0 },
    hifExamRatios: [],
    hifLessonSplitSub: true,
    scheduleSelections: {},
    useScheduleLimits: false,
    includeSelfTrigger: true,
    includePItem: true,
    parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    actionCounts: {},
    unifyRentalLock: true, // ロック自動入れ替え機能をON
  }

  /** ロック区別撤廃オプションが【無効(デフォルト)】の設定 */
  const disabledScoreSettings: ScoreSettings = {
    ...enabledScoreSettings,
    unifyRentalLock: false, // ロック自動入れ替え機能をOFF
  }

  beforeEach(() => {
    localStorage.clear()
    // requestAnimationFrame などのマクロタスクタイミングを同期的に実行可能にするスタブを設定
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => cb(0))
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  /**
   * シナリオ1: 相互ロック入れ替え
   * - 初期状態: CardAをレンタルスロットでロック、CardBを通常スロットのロックとして設定。
   * - 最適化結果: スロット構造が逆転（CardBがレンタルに、CardAが自前通常スロットとして編成される）。
   * - 期待結果:
   *    ユーザーは両方をロック固定したいため、CardBがレンタル枠に納まったことに追従して
   *    「CardBをレンタルロック(manualRental: true & rentalCardName: 'CardB')」かつ
   *    「CardAを通常ロック(lockedCards: ['CardA'])」へと、ロック状態が連動して相互に安全に入れ替わり保存されること。
   */
  it('unifyRentalLock = true 時、A(レンタルロック)とB(通常ロック)の状態で結果適用によりBがレンタル枠に納まったとき、ロック配置が安全に入れ替わること', async () => {
    const initialSettings = {
      plan: enums.PlanType.Sense,
      allowedTypes: [],
      spConstraint: { vocal: 0, dance: 0, visual: 0 },
      typeCountMin: { vocal: 0, dance: 0, visual: 0 },
      typeCountMax: { vocal: 6, dance: 6, visual: 6 },
      paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
      manualRental: true,
      rentalCardName: 'CardA', // CardAをレンタルでロック
      lockedCards: ['CardB'], // CardBを通常枠でロック
      manualCards: ['CardB', 'CardC', null, null, null, 'CardA'],
      initialParams: { vocal: 0, dance: 0, visual: 0 },
    }
    localStorage.setItem(constant.UNIT_SIMULATOR_STORAGE_KEY, JSON.stringify(initialSettings))

    // Optimizerのシミュレート: CardAが通常枠、CardBがレンタル枠にセットされた結果を返却
    const finalResult: UnitResult = {
      members: [
        makeMember(mockCards[0], false), // CardA (通常へスライド)
        makeMember(mockCards[2], false), // CardC
        makeMember(mockCards[1], true), // CardB (レンタルへ昇格)
      ],
      totalScore: 1200,
      totalParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
      parameterBonus: { vocal: 0, dance: 0, visual: 0 },
      parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
      outsideParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
    }

    vi.mocked(runOptimizerAsync).mockImplementation(({ onDone }) => {
      onDone(finalResult)
      return null
    })

    const { result } = renderHook(() => useUnitSimulator(mockCards, cardByName, enabledScoreSettings))

    await act(async () => {
      result.current.optimizeRemaining()
    })

    // 結果適用後にローカルストレージへ即時同期保存された永続設定を抽出
    const savedRaw = localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY)
    expect(savedRaw).not.toBeNull()
    const saved = JSON.parse(savedRaw!)

    // ロック対象（CardA & CardB）は全員ロックが維持されるが、スロット上での通常・レンタル割当が逆転していること
    expect(saved.manualRental).toBe(true)
    expect(saved.rentalCardName).toBe('CardB') // CardBが新しくレンタルでロック
    expect(saved.lockedCards).toContain('CardA') // CardAが通常でロック
    expect(saved.lockedCards).not.toContain('CardB')
  })

  /**
   * シナリオ2: 非固定カードがレンタルへ採用されるケースでの一過性ロック転送
   * - 初期状態: CardAをレンタルロック設定、自前の通常ロックは一切なし。
   * - 最適化結果: 元々レンタルだったCardAが通常スロットに移動し、枠の都合上、非固定のCardBがレンタルに収まる。
   * - 期待結果:
   *    元々CardAに対してのみロック意思があったため、CardAが通常枠に移るのに合わせて
   *    「CardAが通常ロック(lockedCards: ['CardA'])」になり、
   *    新レンタルとなったCardBは非ロック状態（manualRental: false）に変更され、不要なロックの波及を防ぐこと。
   */
  it('unifyRentalLock = true 時、A(レンタルロック)のみ・B(通常ロックなし)の状態で結果適用によりBがレンタル枠に納まったとき、Aが通常スロットにロック移動し、Bはアンロック状態になること', async () => {
    const initialSettings = {
      plan: enums.PlanType.Sense,
      allowedTypes: [],
      spConstraint: { vocal: 0, dance: 0, visual: 0 },
      typeCountMin: { vocal: 0, dance: 0, visual: 0 },
      typeCountMax: { vocal: 6, dance: 6, visual: 6 },
      paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
      manualRental: true,
      rentalCardName: 'CardA', // CardAがレンタルロック
      lockedCards: [], // 通常ロックなし
      manualCards: ['CardB', 'CardC', null, null, null, 'CardA'],
      initialParams: { vocal: 0, dance: 0, visual: 0 },
    }
    localStorage.setItem(constant.UNIT_SIMULATOR_STORAGE_KEY, JSON.stringify(initialSettings))

    const finalResult: UnitResult = {
      members: [
        makeMember(mockCards[0], false), // CardA
        makeMember(mockCards[2], false), // CardC
        makeMember(mockCards[1], true), // CardB (新レンタル)
      ],
      totalScore: 1200,
      totalParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
      parameterBonus: { vocal: 0, dance: 0, visual: 0 },
      parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
      outsideParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
    }

    vi.mocked(runOptimizerAsync).mockImplementation(({ onDone }) => {
      onDone(finalResult)
      return null
    })

    const { result } = renderHook(() => useUnitSimulator(mockCards, cardByName, enabledScoreSettings))

    await act(async () => {
      result.current.optimizeRemaining()
    })

    const saved = JSON.parse(localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY)!)

    // CardAのロック意思は通常枠へ引き継がれ、CardBはもともと非固定のため、レンタル枠はアンロック（manualRental: false）になること
    expect(saved.manualRental).toBe(false)
    expect(saved.rentalCardName).toBe('CardB')
    expect(saved.lockedCards).toContain('CardA')
  })

  /**
   * シナリオ3: オプションが無効（標準動作）時の保護
   * - 初期状態: unifyRentalLock=false、レンタル枠CardAにロック、通常枠CardBにロック。
   * - 最適化結果: スロット上はCardBがレンタルに、CardAが通常に。
   * - 期待結果:
   *    オプション無効時は、いかなるロックの自動コンバート/入れ替え同期も発動せず、
   *    当初設定した通常施錠配列（lockedCards: ['CardB']）およびレンタル有無設定が
   *    そのまま変更されることなく残存維持（厳格な独立分離の担保）されること。
   */
  it('unifyRentalLock = false (デフォルト無効時) は、如何なる場合もレンタルロック設定や通常ロック配列を自動引き継ぎ・書き換えしないこと', async () => {
    const initialSettings = {
      plan: enums.PlanType.Sense,
      allowedTypes: [],
      spConstraint: { vocal: 0, dance: 0, visual: 0 },
      typeCountMin: { vocal: 0, dance: 0, visual: 0 },
      typeCountMax: { vocal: 6, dance: 6, visual: 6 },
      paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
      manualRental: true,
      rentalCardName: 'CardA',
      lockedCards: ['CardB'],
      manualCards: ['CardB', 'CardC', null, null, null, 'CardA'],
      initialParams: { vocal: 0, dance: 0, visual: 0 },
    }
    localStorage.setItem(constant.UNIT_SIMULATOR_STORAGE_KEY, JSON.stringify(initialSettings))

    const finalResult: UnitResult = {
      members: [
        makeMember(mockCards[0], false),
        makeMember(mockCards[2], false),
        makeMember(mockCards[1], true), // CardB (レンタルへ)
      ],
      totalScore: 1200,
      totalParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
      parameterBonus: { vocal: 0, dance: 0, visual: 0 },
      parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
      outsideParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
    }

    vi.mocked(runOptimizerAsync).mockImplementation(({ onDone }) => {
      onDone(finalResult)
      return null
    })

    const { result } = renderHook(() => useUnitSimulator(mockCards, cardByName, disabledScoreSettings))

    await act(async () => {
      result.current.optimizeRemaining()
    })

    const saved = JSON.parse(localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY)!)

    // 無効時は引継ぎが発動せず、当初指定した manualRental / lockedCards 配列は完全に変化しないこと
    expect(saved.manualRental).toBe(true)
    expect(saved.rentalCardName).toBe('CardB') // レンタルサポート名自体は編成スロットに合わせてBに更新されるが、
    expect(saved.lockedCards).toEqual(['CardB']) // 通常ロック配列は上書き・反転されない
  })

  /**
   * シナリオ4: レンタルロックなし・通常ロックあり での通常→レンタル昇格
   * - 初期状態: レンタルロックなし（manualRental=false）、CardBのみ通常枠に施錠。
   * - 最適化結果: CardBがレンタル枠に収まる。
   * - 期待結果:
   *    unifyRentalLock=true の場合、通常ロックのCardBがレンタル枠に昇格するため
   *    manualRental=true, rentalCardName='CardB', lockedCards=[] に更新されること。
   */
  it('unifyRentalLock = true 時、レンタルロックなし・B(通常ロック)の状態で結果適用によりBがレンタル枠に収まったとき、Bがレンタルでロック、通常ロックがオフになること', async () => {
    const initialSettings = {
      plan: enums.PlanType.Sense,
      allowedTypes: [],
      spConstraint: { vocal: 0, dance: 0, visual: 0 },
      typeCountMin: { vocal: 0, dance: 0, visual: 0 },
      typeCountMax: { vocal: 6, dance: 6, visual: 6 },
      paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
      manualRental: false, // レンタルロックなし
      rentalCardName: null,
      lockedCards: ['CardB'], // CardBのみ通常ロック
      manualCards: ['CardB', 'CardC', null, null, null, null],
      initialParams: { vocal: 0, dance: 0, visual: 0 },
    }
    localStorage.setItem(constant.UNIT_SIMULATOR_STORAGE_KEY, JSON.stringify(initialSettings))

    const finalResult: UnitResult = {
      members: [
        makeMember(mockCards[0], false), // CardA
        makeMember(mockCards[2], false), // CardC
        makeMember(mockCards[1], true), // CardB (レンタルに昇格)
      ],
      totalScore: 1300,
      totalParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
      parameterBonus: { vocal: 0, dance: 0, visual: 0 },
      parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
      outsideParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
    }

    vi.mocked(runOptimizerAsync).mockImplementation(({ onDone }) => {
      onDone(finalResult)
      return null
    })

    const { result } = renderHook(() => useUnitSimulator(mockCards, cardByName, enabledScoreSettings))

    await act(async () => {
      result.current.optimizeRemaining()
    })

    const saved = JSON.parse(localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY)!)

    // CardBが通常枠ロック → レンタル枠へ昇格したため、レンタルロック状態に変換されること
    expect(saved.manualRental).toBe(true)
    expect(saved.rentalCardName).toBe('CardB')
    expect(saved.lockedCards).toEqual([])
  })
})

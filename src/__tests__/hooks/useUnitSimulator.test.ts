/**
 * 最適化後のレンタル枠・通常枠のロック状態を検証する
 *
 * レンタル枠と通常枠のカードが入れ替わった場合に、設定の有効・無効に応じて
 * ロック状態を引き継ぎ、保存することを確認する
 */

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runOptimizerAsync } from '../../application/unitOptimizerRunner'
import * as constant from '../../constant'
import { useUnitSimulator } from '../../hooks/useUnitSimulator'
import { useUnitSimulatorSettingsState } from '../../hooks/useUnitSimulatorSettingsState'
import type { CardCalculationResult, ScoreSettings, SupportCard } from '../../types/card'
import * as enums from '../../types/enums'
import type { UnitMember, UnitResult } from '../../types/unit'

// 計算負荷を避け、ロック設定の結果だけを確認できるよう最適化処理を差し替える
vi.mock('../../application/unitOptimizerRunner', () => ({
  runOptimizerAsync: vi.fn(),
}))

// 最適化結果で使う最小限のサポート情報を作成する
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

  /** 最適編成テスト共通の点数設定 */
  const baseScoreSettings: ScoreSettings = {
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
  }

  const renderUnitSimulator = () =>
    renderHook(() => {
      const unitSettingsState = useUnitSimulatorSettingsState()
      return useUnitSimulator(mockCards, cardByName, baseScoreSettings, unitSettingsState, {}, {})
    })

  beforeEach(() => {
    localStorage.clear()
    // 描画待ちをすぐ完了させ、非同期の表示更新をテスト内で確認できるようにする
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => cb(0))
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  /**
   * レンタルロックと通常ロックが入れ替わる場合
   *
   * CardAをレンタル枠、CardBを通常枠に固定した状態で、最適化結果の枠が入れ替わる
   * 両方の固定を保ったまま、レンタル枠と通常枠の設定も入れ替えて保存する
   * ことを確認する
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
      excludedCardNames: [],
      initialParams: { vocal: 0, dance: 0, visual: 0 },
      unifyRentalLock: true, // ロック自動入れ替え機能をON
    }
    localStorage.setItem(constant.UNIT_SIMULATOR_STORAGE_KEY, JSON.stringify(initialSettings))

    // 最適化処理を差し替え、CardAが通常枠、CardBがレンタル枠に入る結果を返す
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

    const { result } = renderUnitSimulator()

    await act(async () => {
      result.current.optimizeRemaining()
    })

    // 結果適用後に保存された最適編成設定を確認する
    const savedRaw = localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY)
    expect(savedRaw).not.toBeNull()
    const saved = JSON.parse(savedRaw!)

    // CardAとCardBの固定を保ったまま、通常枠とレンタル枠が入れ替わっていること
    expect(saved.manualRental).toBe(true)
    expect(saved.rentalCardName).toBe('CardB') // CardBが新しくレンタルでロック
    expect(saved.lockedCards).toContain('CardA') // CardAが通常でロック
    expect(saved.lockedCards).not.toContain('CardB')
  })

  /**
   * 固定していないカードがレンタル枠へ選ばれる場合
   *
   * CardAだけをレンタル枠に固定した状態で、CardAが通常枠へ移り、
   * CardBがレンタル枠へ入ることを確認する
   * CardAの固定は通常枠へ移し、固定していないCardBへロックを引き継がない
   * ことを確認する
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
      excludedCardNames: [],
      initialParams: { vocal: 0, dance: 0, visual: 0 },
      unifyRentalLock: true, // ロック自動入れ替え機能をON
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

    const { result } = renderUnitSimulator()

    await act(async () => {
      result.current.optimizeRemaining()
    })

    const saved = JSON.parse(localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY)!)

    // CardAの固定だけを通常枠へ移し、CardBにはレンタルロックを付けない
    expect(saved.manualRental).toBe(false)
    expect(saved.rentalCardName).toBe('CardB')
    expect(saved.lockedCards).toContain('CardA')
  })

  /**
   * シナリオ3: オプションが無効（標準動作）時の保護
   * - 初期状態: unifyRentalLock=false、レンタル枠CardAにロック、通常枠CardBにロック
   * - 最適化結果: スロット上はCardBがレンタルに、CardAが通常に
   * - 期待結果:
   *   オプション無効時はロックの自動入れ替えを行わず、通常枠とレンタル枠の設定を
   *   最適化前のまま保存すること
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
      excludedCardNames: [],
      initialParams: { vocal: 0, dance: 0, visual: 0 },
      unifyRentalLock: false, // ロック自動入れ替えを無効にする
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

    const { result } = renderUnitSimulator()

    await act(async () => {
      result.current.optimizeRemaining()
    })

    const saved = JSON.parse(localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY)!)

    // 無効時はロックの引き継ぎを行わず、通常枠の固定をそのまま保つ
    expect(saved.manualRental).toBe(true)
    // レンタル枠のカード名は結果に合わせるが、ロック状態は引き継がない
    expect(saved.rentalCardName).toBe('CardB')
    expect(saved.lockedCards).toEqual(['CardB']) // 通常ロック配列は上書き・反転されない
  })

  /**
   * シナリオ4: レンタルロックなし・通常ロックあり での通常→レンタル昇格
   * - 初期状態: レンタルロックなし（manualRental=false）、CardBのみ通常枠に施錠
   * - 最適化結果: CardBがレンタル枠に収まる
   * - 期待結果:
   *    unifyRentalLock=true の場合、通常ロックのCardBがレンタル枠に昇格するため
   *    manualRental=true, rentalCardName='CardB', lockedCards=[] に更新されること
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
      excludedCardNames: [],
      initialParams: { vocal: 0, dance: 0, visual: 0 },
      unifyRentalLock: true, // ロック自動入れ替え機能をON
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

    const { result } = renderUnitSimulator()

    await act(async () => {
      result.current.optimizeRemaining()
    })

    const saved = JSON.parse(localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY)!)

    // CardBの固定をレンタル枠の固定へ移す
    expect(saved.manualRental).toBe(true)
    expect(saved.rentalCardName).toBe('CardB')
    expect(saved.lockedCards).toEqual([])
  })
})

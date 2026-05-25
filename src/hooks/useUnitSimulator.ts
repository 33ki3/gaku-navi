/**
 * 最適編成状態管理フック
 *
 * 最適編成の設定・実行・結果を管理する。
 * localStorage に設定を永続化し、計算エンジンと連携してユニット最適化を行う。
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

import type { SupportCard, ScoreSettings } from '../types/card'
import type { UncapType } from '../types/enums'
import type { UnitSimulatorSettings, UnitResult, SynergyProviderDetail, ExhaustiveProgress } from '../types/unit'
import { PlanType, CardType, ParameterType } from '../types/enums'
import { evaluateManualUnit } from '../utils/unitSimulator'
import { runOptimizerAsync } from './unitOptimizerRunner'
import { loadCardCountCustom } from './useCardCountCustom'
import type { CardCountCustom } from './useCardCountCustom'
import * as constant from '../constant'

/** loadResult の復元結果 */
interface LoadResultState {
  result: UnitResult
  hasCalculated: boolean
}

/** useUnitSimulator の戻り値 */
interface UseUnitSimulatorReturn {
  settings: UnitSimulatorSettings
  setSettings: (next: UnitSimulatorSettings) => void
  calculate: () => void
  optimizeRemaining: () => void
  cancelOptimize: () => void
  recalculateScores: (custom?: CardCountCustom) => void
  evaluateCurrentCards: () => void
  isCalculating: boolean
  result: UnitResult | null
  hasCalculated: boolean
  noCandidates: boolean
  exhaustiveProgress: ExhaustiveProgress | null
}

/** デフォルト設定 */
const defaultSettings: UnitSimulatorSettings = {
  plan: PlanType.Sense,
  allowedTypes: [CardType.Vocal, CardType.Dance, CardType.Visual],
  spConstraint: { vocal: 0, dance: 0, visual: 0 },
  typeCountMin: {
    [ParameterType.Vocal]: constant.TYPE_COUNT_MIN_DEFAULT,
    [ParameterType.Dance]: constant.TYPE_COUNT_MIN_DEFAULT,
    [ParameterType.Visual]: constant.TYPE_COUNT_MIN_DEFAULT,
  },
  typeCountMax: {
    [ParameterType.Vocal]: constant.TYPE_COUNT_MAX_DEFAULT,
    [ParameterType.Dance]: constant.TYPE_COUNT_MAX_DEFAULT,
    [ParameterType.Visual]: constant.TYPE_COUNT_MAX_DEFAULT,
  },
  paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
  manualRental: false,
  rentalCardName: null,
  lockedCards: [],
  manualCards: [],
  initialParams: { vocal: 0, dance: 0, visual: 0 },
  paramCapOverride: null,
  exhaustiveCandidateLimit: constant.EXHAUSTIVE_CANDIDATE_LIMIT,
}
/** localStorage から設定を読み込む */
function loadSettings(): UnitSimulatorSettings {
  try {
    const raw = localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY)
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw)
    return { ...defaultSettings, ...parsed }
  } catch {
    return defaultSettings
  }
}

/** localStorage から凸数マップを読み込む */
function loadUncaps(): Record<string, UncapType> {
  try {
    const raw = localStorage.getItem(constant.UNCAP_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/** 計算結果を localStorage に保存する（サポート名のみ保存） */
function saveResult(result: UnitResult): void {
  try {
    const serializable = {
      members: result.members.map((m) => ({
        cardName: m.card.name,
        uncap: m.uncap,
        isRental: m.isRental,
        result: m.result,
        supportSynergy: m.supportSynergy,
        supportSynergyDetail: m.supportSynergyDetail,
        synergyProviders: m.synergyProviders,
        paramBonusPercent: m.paramBonusPercent,
      })),
      totalScore: result.totalScore,
      totalParamBonusPercent: result.totalParamBonusPercent,
      parameterBonus: result.parameterBonus,
      parameterBonusBase: result.parameterBonusBase,
      outsideParamBonusPercent: result.outsideParamBonusPercent,
    }
    localStorage.setItem(constant.UNIT_RESULT_STORAGE_KEY, JSON.stringify(serializable))
  } catch {
    // localStorage が使えない環境でも動作を続ける
  }
}

/** localStorage から計算結果を復元する */
function loadResult(cardByName: Map<string, SupportCard>): LoadResultState {
  try {
    const raw = localStorage.getItem(constant.UNIT_RESULT_STORAGE_KEY)
    if (!raw) return { result: null as never, hasCalculated: false }
    const parsed = JSON.parse(raw)
    const members = parsed.members.map(
      (m: {
        cardName: string
        uncap: UncapType
        isRental: boolean
        result: unknown
        supportSynergy: number
        supportSynergyDetail?: Record<string, number>
        synergyProviders?: unknown[]
        paramBonusPercent?: { vocal: number; dance: number; visual: number }
      }) => {
        const card = cardByName.get(m.cardName)
        if (!card) return null
        return {
          card,
          uncap: m.uncap,
          isRental: m.isRental,
          result: m.result,
          supportSynergy: m.supportSynergy,
          supportSynergyDetail: m.supportSynergyDetail ?? {},
          synergyProviders: (m.synergyProviders ?? []) as SynergyProviderDetail[],
          paramBonusPercent: m.paramBonusPercent ?? { vocal: 0, dance: 0, visual: 0 },
        }
      },
    )
    // サポートが見つからないメンバーがいたら復元失敗
    if (members.some((m: unknown) => m === null)) return { result: null as never, hasCalculated: false }
    return {
      result: {
        members,
        totalScore: parsed.totalScore,
        totalParamBonusPercent: parsed.totalParamBonusPercent,
        parameterBonus: parsed.parameterBonus,
        parameterBonusBase: parsed.parameterBonusBase ?? { vocal: 0, dance: 0, visual: 0 },
        outsideParamBonusPercent: parsed.outsideParamBonusPercent ?? { vocal: 0, dance: 0, visual: 0 },
      },
      hasCalculated: true,
    }
  } catch {
    return { result: null as never, hasCalculated: false }
  }
}

/**
 * 編成一覧を UI 表示順（レンタルを末尾）に正規化する
 *
 * @param members - 結果に含まれる編成配列
 * @returns manualCards 用のカード名配列
 */
function toOrderedMemberNames(members: UnitResult['members']): string[] {
  const rentalMember = members.find((m) => m.isRental)
  return rentalMember
    ? [...members.filter((m) => !m.isRental).map((m) => m.card.name), rentalMember.card.name]
    : members.map((m) => m.card.name)
}

/**
 * 最適編成の状態を管理するフック
 *
 * 設定変更を localStorage に永続化し、計算実行時に最適解を求める。
 * 点数設定と凸数は既存のサポート一覧と localStorage 経由で共有する。
 *
 * @param allCards - 全サポートカード配列
 * @param cardByName - サポート名→カードのマップ
 * @param scoreSettings - 現在の点数設定
 * @returns 設定・計算結果・操作関数
 */
export function useUnitSimulator(
  allCards: SupportCard[],
  cardByName: Map<string, SupportCard>,
  scoreSettings: ScoreSettings,
): UseUnitSimulatorReturn {
  const [settings, setSettingsRaw] = useState<UnitSimulatorSettings>(loadSettings)
  const [isCalculating, setIsCalculating] = useState(false)
  const [exhaustiveProgress, setExhaustiveProgress] = useState<ExhaustiveProgress | null>(null)
  const exhaustiveRunIdRef = useRef(0)
  const optimizeWorkerRef = useRef<Worker | null>(null)
  const bestResultDuringRunRef = useRef<UnitResult | null>(null)
  const settingsRef = useRef(settings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  // 初期化時に localStorage からキャッシュされた結果を復元する
  const [cached] = useState(() => loadResult(cardByName))
  const [result, setResult] = useState<UnitResult | null>(cached.hasCalculated ? cached.result : null)
  const [hasCalculated, setHasCalculated] = useState(cached.hasCalculated)
  const [noCandidates, setNoCandidates] = useState(false)

  /** 設定を変更して localStorage に保存する */
  const setSettings = useCallback((next: UnitSimulatorSettings) => {
    setSettingsRaw(next)
    try {
      localStorage.setItem(constant.UNIT_SIMULATOR_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage が使えない環境でも動作を続ける
    }
  }, [])

  /** 最適化結果を保存し、manualCards/rentalCardName に同期する */
  const applyOptimizedResult = useCallback(
    (optimized: UnitResult) => {
      saveResult(optimized)
      const rentalMember = optimized.members.find((m) => m.isRental)
      const rentalName = rentalMember?.card.name ?? null
      // レンタルサポートを末尾に配置する（スロット順表示で最下部に表示させるため）
      const ordered = toOrderedMemberNames(optimized.members)
      const latest = settingsRef.current
      // manualRental はユーザーの明示的な設定を維持する（上書きしない）
      setSettings({ ...latest, manualCards: ordered, rentalCardName: rentalName })
    },
    [setSettings],
  )

  /** 総当たり中の「現時点ベスト」をUIへ反映する */
  const applyBetterResultPreview = useCallback((betterResult: UnitResult) => {
    bestResultDuringRunRef.current = betterResult
    setResult(betterResult)
  }, [])

  /** 総当たりで使用中の Worker を停止して参照をクリアする */
  const terminateOptimizeWorker = useCallback(() => {
    optimizeWorkerRef.current?.terminate()
    optimizeWorkerRef.current = null
  }, [])

  /** 実行時入力を構築する（点数設定・凸数・回数調整を都度最新化する） */
  const buildRuntimeInput = useCallback(
    (nextSettings: UnitSimulatorSettings, customCardCount?: CardCountCustom) => {
      const cardUncaps = loadUncaps()
      const cardCountCustom = customCardCount ?? loadCardCountCustom()
      return { settings: nextSettings, scoreSettings, cardUncaps, cardCountCustom, allCards, cardByName }
    },
    [allCards, cardByName, scoreSettings],
  )

  /** 計算を実行する */
  const calculate = useCallback(() => {
    setIsCalculating(true)
    const input = buildRuntimeInput(settings)

    // 非同期にして UI をブロックしない
    requestAnimationFrame(() => {
      // 手動選択サポートでスコアを計算する
      const optimized = evaluateManualUnit(input)
      setResult(optimized)
      setHasCalculated(true)
      setIsCalculating(false)
      if (optimized) {
        saveResult(optimized)
      }
    })
  }, [settings, buildRuntimeInput])

  /** 進行中の総当たり最適化をキャンセルする */
  const cancelOptimize = useCallback(() => {
    const best = bestResultDuringRunRef.current
    exhaustiveRunIdRef.current++
    terminateOptimizeWorker()
    if (best) {
      setResult(best)
      setHasCalculated(true)
      applyOptimizedResult(best)
      bestResultDuringRunRef.current = null
    }
    setIsCalculating(false)
    setExhaustiveProgress(null)
  }, [applyOptimizedResult, terminateOptimizeWorker])

  /** 手動選択サポートを固定して残り枠を自動最適化する */
  const optimizeRemaining = useCallback(() => {
    // 進行中の総当たり最適化をキャンセルするためにIDを更新する
    const myRunId = ++exhaustiveRunIdRef.current
    bestResultDuringRunRef.current = null
    setIsCalculating(true)
    setExhaustiveProgress(null)
    terminateOptimizeWorker()

    // 明示的にロックされたサポートのみ固定する（ロックボタンで固定したサポートのみ最適化から除外）
    // manualRental が true（ユーザーがレンタル枠を固定済み）の場合はそのまま維持する
    // false の場合のみ自動選出のためリセットする
    const merged: UnitSimulatorSettings = {
      ...settings,
      manualCards: settings.manualCards.filter((n): n is string => n !== null),
      ...(settings.manualRental ? {} : { manualRental: false, rentalCardName: null }),
    }
    const input = buildRuntimeInput(merged)

    requestAnimationFrame(() => {
      setHasCalculated(true)

      const finalize = (exhaustiveResult: UnitResult | null) => {
        if (exhaustiveRunIdRef.current !== myRunId) return
        if (exhaustiveResult !== null) {
          applyBetterResultPreview(exhaustiveResult)
          applyOptimizedResult(exhaustiveResult)
        }
        bestResultDuringRunRef.current = null
        setNoCandidates(exhaustiveResult === null)
        setExhaustiveProgress(null)
        setIsCalculating(false)
      }

      // Worker または main thread で最適化を実行し、完了・中断ごとに finalize を呼ぶ
      const worker = runOptimizerAsync({
        input,
        isCancelled: () => exhaustiveRunIdRef.current !== myRunId,
        onProgress: (done, total) => setExhaustiveProgress({ done, total }),
        onBetter: applyBetterResultPreview,
        onDone: (result) => {
          // Worker が自己終了済みのため参照をクリアしてから完了処理する
          optimizeWorkerRef.current = null
          finalize(result)
        },
      })
      // 外部キャンセル（cancelOptimize）のために Worker 参照を保持する
      if (worker) optimizeWorkerRef.current = worker
    })
  }, [settings, applyOptimizedResult, applyBetterResultPreview, terminateOptimizeWorker, buildRuntimeInput])

  /** 現在の編成メンバーを維持したままスコアのみ再計算する */
  const recalculateScores = useCallback(
    (custom?: CardCountCustom) => {
      if (!result || result.members.length === 0) return

      // レンタルメンバーを末尾に配置して evaluateManualUnit で末尾スロット = レンタル枠の判定が正しく動くようにする
      const memberNames = toOrderedMemberNames(result.members)
      const recalcSettings: UnitSimulatorSettings = {
        ...settings,
        manualCards: memberNames,
      }
      const input = buildRuntimeInput(recalcSettings, custom)
      const updated = evaluateManualUnit(input)
      if (updated) {
        setResult(updated)
        saveResult(updated)
      }
    },
    [result, settings, buildRuntimeInput],
  )

  /** 現在の manualCards で評価する（最適化せず手持ちのサポートリストで計算） */
  const evaluateCurrentCards = useCallback(() => {
    const filledCards = settings.manualCards.filter((n): n is string => n !== null)
    if (filledCards.length === 0) return
    const input = buildRuntimeInput({ ...settings, manualCards: filledCards })
    requestAnimationFrame(() => {
      const evaluated = evaluateManualUnit(input)
      setResult(evaluated)
      setHasCalculated(true)
      if (evaluated) saveResult(evaluated)
    })
  }, [settings, buildRuntimeInput])

  return useMemo(
    () => ({
      settings,
      setSettings,
      calculate,
      optimizeRemaining,
      cancelOptimize,
      recalculateScores,
      evaluateCurrentCards,
      isCalculating,
      result,
      hasCalculated,
      noCandidates,
      exhaustiveProgress,
    }),
    [
      settings,
      setSettings,
      calculate,
      optimizeRemaining,
      cancelOptimize,
      recalculateScores,
      evaluateCurrentCards,
      isCalculating,
      result,
      hasCalculated,
      noCandidates,
      exhaustiveProgress,
    ],
  )
}

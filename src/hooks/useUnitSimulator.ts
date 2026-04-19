/**
 * 最適編成状態管理フック
 *
 * 最適編成の設定・実行・結果を管理する。
 * localStorage に設定を永続化し、計算エンジンと連携してユニット最適化を行う。
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

import type { SupportCard, ScoreSettings } from '../types/card'
import type { UncapType } from '../types/enums'
import type { UnitSimulatorSettings, UnitResult, SynergyProviderDetail } from '../types/unit'
import { PlanType, CardType, ParameterType } from '../types/enums'
import { optimizeUnit, evaluateManualUnit } from '../utils/unitSimulator'
import { loadScoreSettings } from '../utils/scoreSettings'
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
  recalculateScores: (custom?: CardCountCustom) => void
  evaluateCurrentCards: () => void
  isCalculating: boolean
  result: UnitResult | null
  hasCalculated: boolean
  noCandidates: boolean
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
 * 最適編成の状態を管理するフック
 *
 * 設定変更を localStorage に永続化し、計算実行時に最適解を求める。
 * 点数設定と凸数は既存のサポート一覧と localStorage 経由で共有する。
 *
 * @param allCards - 全サポートカード配列
 * @param cardByName - サポート名→カードのマップ
 * @returns 設定・計算結果・操作関数
 */
export function useUnitSimulator(
  allCards: SupportCard[],
  cardByName: Map<string, SupportCard>,
): UseUnitSimulatorReturn {
  const [settings, setSettingsRaw] = useState<UnitSimulatorSettings>(loadSettings)
  const [isCalculating, setIsCalculating] = useState(false)
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

  /** 計算を実行する */
  const calculate = useCallback(() => {
    setIsCalculating(true)

    // localStorage から最新の点数設定と凸数を読み取る
    const scoreSettings: ScoreSettings = loadScoreSettings()
    const cardUncaps = loadUncaps()
    const cardCountCustom = loadCardCountCustom()
    const input = { settings, scoreSettings, cardUncaps, cardCountCustom, allCards, cardByName }

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
  }, [settings, allCards, cardByName])

  /** 手動選択サポートを固定して残り枠を自動最適化する */
  const optimizeRemaining = useCallback(() => {
    setIsCalculating(true)

    const scoreSettings: ScoreSettings = loadScoreSettings()
    const cardUncaps = loadUncaps()
    const cardCountCustom = loadCardCountCustom()

    // 明示的にロックされたサポートのみ固定する（ロックボタンで固定したサポートのみ最適化から除外）
    // 最適化時はレンタル枠を自動選出するため manualRental を無効化する
    const merged: UnitSimulatorSettings = {
      ...settings,
      manualCards: settings.manualCards.filter((n): n is string => n !== null),
      manualRental: false,
      rentalCardName: null,
    }
    const input = { settings: merged, scoreSettings, cardUncaps, cardCountCustom, allCards, cardByName }

    requestAnimationFrame(() => {
      const optimized = optimizeUnit(input)
      setResult(optimized)
      setNoCandidates(optimized === null)
      setHasCalculated(true)
      setIsCalculating(false)
      if (optimized) {
        saveResult(optimized)
        // 最適化結果のサポートを manualCards に同期してスロットエディターと削除を正しく動作させる
        const rentalMember = optimized.members.find((m) => m.isRental)
        const rentalName = rentalMember?.card.name ?? null
        // レンタルサポートを末尾に配置する（スロット順表示で最下部に表示させるため）
        const ordered = rentalName
          ? [...optimized.members.filter((m) => !m.isRental).map((m) => m.card.name), rentalName]
          : optimized.members.map((m) => m.card.name)
        const latest = settingsRef.current
        const synced: UnitSimulatorSettings = {
          ...latest,
          manualCards: ordered,
          manualRental: rentalName !== null,
          rentalCardName: rentalName,
        }
        setSettings(synced)
      }
    })
  }, [settings, setSettings, allCards, cardByName])

  /** 現在の編成メンバーを維持したままスコアのみ再計算する */
  const recalculateScores = useCallback(
    (custom?: CardCountCustom) => {
      if (!result || result.members.length === 0) return

      const scoreSettings: ScoreSettings = loadScoreSettings()
      const cardUncaps = loadUncaps()
      const cardCountCustom = custom ?? loadCardCountCustom()
      const memberNames = result.members.map((m) => m.card.name)
      const recalcSettings: UnitSimulatorSettings = {
        ...settings,
        manualCards: memberNames,
        // レンタルは末尾スロットから位置ベースで導出されるため rentalCardName の上書きは不要
      }
      const input = { settings: recalcSettings, scoreSettings, cardUncaps, cardCountCustom, allCards, cardByName }
      const updated = evaluateManualUnit(input)
      if (updated) {
        setResult(updated)
        saveResult(updated)
      }
    },
    [result, settings, allCards, cardByName],
  )

  /** 現在の manualCards で評価する（最適化せず手持ちのサポートリストで計算） */
  const evaluateCurrentCards = useCallback(() => {
    const filledCards = settings.manualCards.filter((n): n is string => n !== null)
    if (filledCards.length === 0) return
    const scoreSettings: ScoreSettings = loadScoreSettings()
    const cardUncaps = loadUncaps()
    const cardCountCustom = loadCardCountCustom()
    const input = {
      settings: { ...settings, manualCards: filledCards },
      scoreSettings,
      cardUncaps,
      cardCountCustom,
      allCards,
      cardByName,
    }
    requestAnimationFrame(() => {
      const evaluated = evaluateManualUnit(input)
      setResult(evaluated)
      setHasCalculated(true)
      if (evaluated) saveResult(evaluated)
    })
  }, [settings, allCards, cardByName])

  return useMemo(
    () => ({
      settings,
      setSettings,
      calculate,
      optimizeRemaining,
      recalculateScores,
      evaluateCurrentCards,
      isCalculating,
      result,
      hasCalculated,
      noCandidates,
    }),
    [
      settings,
      setSettings,
      calculate,
      optimizeRemaining,
      recalculateScores,
      evaluateCurrentCards,
      isCalculating,
      result,
      hasCalculated,
      noCandidates,
    ],
  )
}

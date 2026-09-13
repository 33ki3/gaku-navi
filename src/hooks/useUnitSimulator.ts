/**
 * 最適編成の設定・実行・結果を統合する公開フック。
 *
 * 永続化、手動評価、総当たり実行、設定同期は責務別フックと
 * ユーティリティへ委譲し、このファイルでは公開APIの組み立てだけを行う。
 */
import { useCallback, useMemo, useState } from 'react'

import type { ScoreSettings, SupportCard } from '../types/card'
import type { ExhaustiveProgress, UnitResult, UnitSimulatorSettings } from '../types/unit'
import type { OptimizeInput } from '../types/unitOptimizer'
import { loadCardUncaps } from '../utils/uncapStorage'
import { resolveSettingsAfterOptimization } from '../utils/unitOptimizedSettings'
import { loadUnitResult, saveUnitResult } from '../utils/unitResultStorage'
import type { CardCountCustom } from './useCardCountCustom'
import { loadCardCountCustom } from './useCardCountCustom'
import { useUnitExhaustiveOptimizer } from './useUnitExhaustiveOptimizer'
import { useUnitManualEvaluation } from './useUnitManualEvaluation'
import { useUnitSimulatorSettingsState } from './useUnitSimulatorSettingsState'

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

/**
 * 最適編成の状態と操作を管理する。
 *
 * @param allCards - ユーザー追加分を含む全サポート
 * @param cardByName - サポート名とカードの対応表
 * @param scoreSettings - 現在の点数設定
 * @returns 設定、計算結果、手動計算と総当たり最適化の操作
 */
export function useUnitSimulator(
  allCards: SupportCard[],
  cardByName: Map<string, SupportCard>,
  scoreSettings: ScoreSettings,
): UseUnitSimulatorReturn {
  const { settings, setSettings, settingsRef } = useUnitSimulatorSettingsState()
  const [cachedResult] = useState(() => loadUnitResult(cardByName))
  const [result, setResult] = useState<UnitResult | null>(cachedResult.result)
  const [hasCalculated, setHasCalculated] = useState(cachedResult.hasCalculated)
  const [isCalculating, setIsCalculating] = useState(false)

  const buildRuntimeInput = useCallback(
    (nextSettings: UnitSimulatorSettings, customCardCount?: CardCountCustom): OptimizeInput => ({
      settings: nextSettings,
      scoreSettings,
      cardUncaps: loadCardUncaps(),
      cardCountCustom: customCardCount ?? loadCardCountCustom(),
      allCards,
      cardByName,
      excludedCardNames: nextSettings.ignoreCardExclusions ? [] : nextSettings.excludedCardNames,
    }),
    [allCards, cardByName, scoreSettings],
  )

  const applyOptimizedResult = useCallback(
    (optimized: UnitResult) => {
      saveUnitResult(optimized)
      setSettings(resolveSettingsAfterOptimization(settingsRef.current, optimized))
    },
    [setSettings, settingsRef],
  )

  const manualActions = useUnitManualEvaluation({
    settings,
    result,
    buildRuntimeInput,
    setResult,
    setHasCalculated,
    setIsCalculating,
  })
  const exhaustiveState = useUnitExhaustiveOptimizer({
    settings,
    buildRuntimeInput,
    applyOptimizedResult,
    setResult,
    setHasCalculated,
    setIsCalculating,
  })

  return useMemo(
    () => ({
      settings,
      setSettings,
      ...manualActions,
      optimizeRemaining: exhaustiveState.optimizeRemaining,
      cancelOptimize: exhaustiveState.cancelOptimize,
      isCalculating,
      result,
      hasCalculated,
      noCandidates: exhaustiveState.noCandidates,
      exhaustiveProgress: exhaustiveState.exhaustiveProgress,
    }),
    [settings, setSettings, manualActions, exhaustiveState, isCalculating, result, hasCalculated],
  )
}

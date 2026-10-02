/**
 * 手動編成の評価と、既存結果のスコア再計算を管理する
 */
import { type Dispatch, type SetStateAction, useCallback } from 'react'

import type { CardCountCustom } from '../types/card'
import type { UnitResult, UnitSimulatorSettings } from '../types/unit'
import type { BuildUnitRuntimeInput } from '../types/unitOptimizer'
import { saveUnitResult } from '../utils/unitResultStorage'
import { evaluateManualUnit } from '../utils/unitSimulator'

/** 手動編成評価フックの引数 */
interface UseUnitManualEvaluationOptions {
  settings: UnitSimulatorSettings
  result: UnitResult | null
  buildRuntimeInput: BuildUnitRuntimeInput
  setResult: Dispatch<SetStateAction<UnitResult | null>>
  setHasCalculated: Dispatch<SetStateAction<boolean>>
  setIsCalculating: Dispatch<SetStateAction<boolean>>
}

/** 手動編成評価フックの返却値 */
interface UnitManualEvaluationActions {
  calculate: () => void
  recalculateScores: (custom?: CardCountCustom) => void
  evaluateCurrentCards: () => void
}

/**
 * 手動編成の計算操作を提供する
 *
 * @param options - 設定、現在結果、入力構築関数、状態更新関数
 * @returns 通常計算・スコア再計算・現在編成評価の操作
 */
export function useUnitManualEvaluation(options: UseUnitManualEvaluationOptions): UnitManualEvaluationActions {
  const { settings, result, buildRuntimeInput, setResult, setHasCalculated, setIsCalculating } = options

  const calculate = useCallback(() => {
    // 計算開始を先に通知し、重い評価処理を次のフレームへ送る
    setIsCalculating(true)
    const input = buildRuntimeInput(settings)

    requestAnimationFrame(() => {
      const optimized = evaluateManualUnit(input)
      // 手動編成の結果も最適化結果と同じ保存経路へ通す
      setResult(optimized)
      setHasCalculated(true)
      setIsCalculating(false)
      if (optimized !== null) saveUnitResult(optimized)
    })
  }, [settings, buildRuntimeInput, setResult, setHasCalculated, setIsCalculating])

  const recalculateScores = useCallback(
    (custom?: CardCountCustom) => {
      // 編成メンバーは変えず、回数調整や点数設定だけを再評価する
      if (result === null || result.members.length === 0) return

      // 保存結果のレンタル名を明示し、現在の表示順とは独立して再評価する
      const recalcSettings: UnitSimulatorSettings = {
        ...settings,
        selectedCards: result.members.map((member) => member.card.name),
        rentalCardName: result.members.find((member) => member.isRental)?.card.name ?? null,
      }
      const updated = evaluateManualUnit(buildRuntimeInput(recalcSettings, custom))
      if (updated === null) return

      setResult(updated)
      saveUnitResult(updated)
    },
    [result, settings, buildRuntimeInput, setResult],
  )

  const evaluateCurrentCards = useCallback(() => {
    // 計算結果と手動編成がずれたときだけ、現在のカードを評価する
    const filledCards = settings.selectedCards.filter((cardName): cardName is string => cardName !== null)
    if (filledCards.length === 0) return

    const input = buildRuntimeInput({
      ...settings,
      selectedCards: filledCards,
    })
    requestAnimationFrame(() => {
      const evaluated = evaluateManualUnit(input)
      setResult(evaluated)
      setHasCalculated(true)
      if (evaluated !== null) saveUnitResult(evaluated)
    })
  }, [settings, buildRuntimeInput, setResult, setHasCalculated])

  return { calculate, recalculateScores, evaluateCurrentCards }
}

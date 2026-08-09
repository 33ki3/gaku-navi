/**
 * 総当たり最適化の実行、進捗、キャンセルを管理する。
 *
 * Workerのライフサイクルと実行IDをこのフックへ閉じ込め、最適編成全体の状態フックから非同期制御を分離する。
 */
import { type Dispatch, type SetStateAction, useCallback, useRef, useState } from 'react'

import type { ExhaustiveProgress, UnitResult, UnitSimulatorSettings } from '../types/unit'
import type { BuildUnitRuntimeInput } from '../types/unitOptimizer'
import { createExhaustiveOptimizationSettings } from '../utils/unitOptimizedSettings'
import { runOptimizerAsync } from './unitOptimizerRunner'

/** 総当たり最適化フックの引数 */
interface UseUnitExhaustiveOptimizerOptions {
  settings: UnitSimulatorSettings
  buildRuntimeInput: BuildUnitRuntimeInput
  applyOptimizedResult: (optimized: UnitResult) => void
  setResult: Dispatch<SetStateAction<UnitResult | null>>
  setHasCalculated: Dispatch<SetStateAction<boolean>>
  setIsCalculating: Dispatch<SetStateAction<boolean>>
}

/** 総当たり最適化フックの返却値 */
interface UnitExhaustiveOptimizerState {
  optimizeRemaining: () => void
  cancelOptimize: () => void
  noCandidates: boolean
  exhaustiveProgress: ExhaustiveProgress | null
}

/**
 * Worker または main thread で行う総当たり最適化を管理する
 *
 * @param options - 実行設定、入力構築関数、結果適用関数、状態更新関数
 * @returns 実行・キャンセル操作と進捗状態
 */
export function useUnitExhaustiveOptimizer(options: UseUnitExhaustiveOptimizerOptions): UnitExhaustiveOptimizerState {
  const { settings, buildRuntimeInput, applyOptimizedResult, setResult, setHasCalculated, setIsCalculating } = options
  const [exhaustiveProgress, setExhaustiveProgress] = useState<ExhaustiveProgress | null>(null)
  const [noCandidates, setNoCandidates] = useState(false)
  const latestProgressRef = useRef<ExhaustiveProgress | null>(null)
  const exhaustiveRunIdRef = useRef(0)
  const optimizeWorkerRef = useRef<Worker | null>(null)
  const bestResultDuringRunRef = useRef<UnitResult | null>(null)

  const applyBetterResultPreview = useCallback(
    (betterResult: UnitResult) => {
      // 計算途中でも最良結果を表示し、長い計算で画面が停止したように見えないようにする
      bestResultDuringRunRef.current = betterResult
      setResult(betterResult)
    },
    [setResult],
  )

  const terminateOptimizeWorker = useCallback(() => {
    // 新しい計算を始める前に、前回のWorkerを停止して結果の競合を防ぐ
    optimizeWorkerRef.current?.terminate()
    optimizeWorkerRef.current = null
  }, [])

  const cancelOptimize = useCallback(() => {
    // キャンセル時は計算途中で見つかった最良結果を確定してから状態を待機へ戻す
    const bestResult = bestResultDuringRunRef.current
    exhaustiveRunIdRef.current += 1
    terminateOptimizeWorker()

    if (bestResult !== null) {
      setResult(bestResult)
      setHasCalculated(true)
      applyOptimizedResult(bestResult)
      bestResultDuringRunRef.current = null
    }
    setIsCalculating(false)
    setExhaustiveProgress(null)
  }, [applyOptimizedResult, terminateOptimizeWorker, setResult, setHasCalculated, setIsCalculating])

  const optimizeRemaining = useCallback(() => {
    // 実行IDを更新し、古いWorkerからのコールバックを無効にする
    const currentRunId = exhaustiveRunIdRef.current + 1
    exhaustiveRunIdRef.current = currentRunId
    bestResultDuringRunRef.current = null
    setIsCalculating(true)
    setExhaustiveProgress(null)
    latestProgressRef.current = null
    terminateOptimizeWorker()

    // 計算用設定をコピーしてから入力を構築し、UI状態を計算中に変更しない
    const input = buildRuntimeInput(createExhaustiveOptimizationSettings(settings))

    requestAnimationFrame(() => {
      // 進捗イベントを受け取る前に、計算開始済みであることを画面へ通知する
      setHasCalculated(true)

      const finalize = (exhaustiveResult: UnitResult | null) => {
        // 新しい実行が始まっていた場合は、古い結果で状態を上書きしない
        if (exhaustiveRunIdRef.current !== currentRunId) return

        if (exhaustiveResult !== null) {
          applyBetterResultPreview(exhaustiveResult)
          applyOptimizedResult(exhaustiveResult)
        }
        bestResultDuringRunRef.current = null
        setNoCandidates(exhaustiveResult === null)
        // 満タン表示を描画した後、次の描画機会で結果へ切り替える
        setExhaustiveProgress(null)
        setIsCalculating(false)
      }

      const worker = runOptimizerAsync({
        // Workerが使えない環境でも同じコールバック契約で実行できる
        input,
        isCancelled: () => exhaustiveRunIdRef.current !== currentRunId,
        onProgress: (done, total) => {
          const progress = { done: Math.min(Math.max(done, 0), total), total }
          latestProgressRef.current = progress
          setExhaustiveProgress(progress)
        },
        onBetter: applyBetterResultPreview,
        onDone: (result) => {
          // Worker は完了時に自己終了するため、外部キャンセル用参照だけ破棄する
          optimizeWorkerRef.current = null
          // 最終進捗を満タンで描画し、スマホでも描画を確認してから結果表示へ切り替える
          const latestProgress = latestProgressRef.current
          if (latestProgress) setExhaustiveProgress({ ...latestProgress, done: latestProgress.total })
          requestAnimationFrame(() => {
            requestAnimationFrame(() => finalize(result))
          })
        },
      })
      if (worker !== null) optimizeWorkerRef.current = worker
    })
  }, [
    settings,
    buildRuntimeInput,
    applyOptimizedResult,
    applyBetterResultPreview,
    terminateOptimizeWorker,
    setHasCalculated,
    setIsCalculating,
  ])

  return {
    optimizeRemaining,
    cancelOptimize,
    noCandidates,
    exhaustiveProgress,
  }
}

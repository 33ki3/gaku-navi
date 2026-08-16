/**
 * 最適編成結果の再計算同期フック。
 *
 * 回数調整・点数設定・手動編成の変更を監視し、必要な計算だけを実行する。
 */
import { useEffect, useMemo, useRef } from 'react'
import * as constant from '../constant'
import type { ScoreSettings } from '../types/card'
import type { UnitResult } from '../types/unit'
import { isUnitResultSynchronized } from '../utils/unitManualCards'
import type { CardCountCustom } from './useCardCountCustom'

interface UseUnitResultSyncParams {
  /** 現在の計算結果 */
  result: UnitResult | null
  /** 手動編成のカード名 */
  manualCards: (string | null)[]
  /** サポート別の回数調整 */
  cardCountCustom: CardCountCustom
  /** 現在の点数設定 */
  scoreSettings: ScoreSettings
  /** 現在の編成のスコアだけ再計算する関数 */
  recalculateScores: (custom?: CardCountCustom) => void
  /** 手動編成を評価し直す関数 */
  evaluateCurrentCards: () => void
}

/**
 * 外部設定の変更と最適編成結果を同期する
 *
 * @param params - 計算結果、監視対象の設定、再計算処理
 * @returns 回数調整されているサポート名の集合
 */
export function useUnitResultSync({
  result,
  manualCards,
  cardCountCustom,
  scoreSettings,
  recalculateScores,
  evaluateCurrentCards,
}: UseUnitResultSyncParams): Set<string> {
  const isFirstRender = useRef(true)
  const previousManualCardsRef = useRef(manualCards)
  // パネルを閉じている間に設定だけ更新されたケースを、再マウント時に一度だけ救済する
  const initialResultRef = useRef(result)
  const isInitialManualSyncRef = useRef(true)

  /** 回数調整が変わった場合は、最適化せず現在の編成だけ再計算する */
  useEffect(() => {
    // 回数調整は候補選びをやり直さず、現在の編成の点数だけ更新する
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (result) recalculateScores(cardCountCustom)
  }, [cardCountCustom]) // eslint-disable-line react-hooks/exhaustive-deps

  /** 点数設定が変わった場合も、現在の編成だけ再計算する */
  useEffect(() => {
    // 点数設定の変更も、既存結果がある場合は同じ編成を再評価する
    if (isFirstRender.current || !result) return
    recalculateScores(cardCountCustom)
  }, [scoreSettings]) // eslint-disable-line react-hooks/exhaustive-deps

  /** 手動編成のカードが変わった場合は、その編成を評価し直す */
  useEffect(() => {
    // 手動編成が変わった場合は、最適化を待たずに現在の編成を評価する
    const cardsChanged = previousManualCardsRef.current !== manualCards
    const resultWasStaleOnMount =
      isInitialManualSyncRef.current && !isUnitResultSynchronized(initialResultRef.current, manualCards)
    isInitialManualSyncRef.current = false
    previousManualCardsRef.current = manualCards

    if (!cardsChanged && !resultWasStaleOnMount) return
    // 最適化完了時は結果と手動編成が同時に更新されるため、同じ編成をもう一度main側で評価しない
    if (result !== null && isUnitResultSynchronized(result, manualCards)) return
    const filledCount = manualCards.filter((name) => name !== null).length
    if (filledCount > 0 && filledCount <= constant.UNIT_SIZE) evaluateCurrentCards()
  }, [evaluateCurrentCards, manualCards, result])

  return useMemo(() => new Set(Object.keys(cardCountCustom)), [cardCountCustom])
}

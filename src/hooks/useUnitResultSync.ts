/**
 * 最適編成結果の再計算同期フック
 *
 * 回数調整・点数設定・凸数・手動編成の変更を監視し、必要な計算だけを実行する
 */
import { useEffect, useMemo, useRef } from 'react'
import * as constant from '../constant'
import type { CardCountCustom, ScoreSettings } from '../types/card'
import type { UncapType } from '../types/enums'
import type { UnitResult } from '../types/unit'
import { isUnitResultSynchronized } from '../utils/unitSelectedCards'

interface UseUnitResultSyncParams {
  /** 現在の計算結果 */
  result: UnitResult | null
  /** 選択中の編成カード名 */
  selectedCards: (string | null)[]
  /** 選択中のレンタルカード名 */
  rentalCardName: string | null
  /** サポート別の回数調整 */
  cardCountCustom: CardCountCustom
  /** カード一覧で設定された凸数 */
  cardUncaps: Record<string, UncapType>
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
  selectedCards,
  rentalCardName,
  cardCountCustom,
  cardUncaps,
  scoreSettings,
  recalculateScores,
  evaluateCurrentCards,
}: UseUnitResultSyncParams): Set<string> {
  const isFirstRender = useRef(true)
  const previousSelectedCardsRef = useRef(selectedCards)
  const previousRentalRef = useRef(rentalCardName)
  // パネルを閉じている間に設定だけ更新された場合は再表示したときに一度だけ再評価する
  const initialResultRef = useRef(result)
  const isInitialSelectionSyncRef = useRef(true)

  /** 回数調整が変わった場合は、最適化せず現在の編成だけ再計算する */
  useEffect(() => {
    // 回数調整は候補選びをやり直さず、現在の編成の点数だけ更新する
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (result) recalculateScores(cardCountCustom)
  }, [cardCountCustom]) // eslint-disable-line react-hooks/exhaustive-deps

  /** 点数設定や凸数が変わった場合も、現在の編成だけ再計算する */
  useEffect(() => {
    // 凸数も現在の設定から解決し直し、レンタルの4凸・固定凸数の条件を維持する
    if (isFirstRender.current || !result) return
    recalculateScores(cardCountCustom)
  }, [scoreSettings, cardUncaps]) // eslint-disable-line react-hooks/exhaustive-deps

  /** 手動編成のカードが変わった場合は、その編成を評価し直す */
  useEffect(() => {
    // 手動編成が変わった場合は、最適化を待たずに現在の編成を評価する
    const cardsChanged =
      previousSelectedCardsRef.current !== selectedCards || previousRentalRef.current !== rentalCardName
    const resultWasStaleOnMount =
      isInitialSelectionSyncRef.current &&
      !isUnitResultSynchronized(initialResultRef.current, selectedCards, rentalCardName)
    isInitialSelectionSyncRef.current = false
    previousSelectedCardsRef.current = selectedCards
    previousRentalRef.current = rentalCardName

    if (!cardsChanged && !resultWasStaleOnMount) return
    // 最適化完了時は結果と手動編成が同時に更新されるため同じ編成をもう一度評価しない
    if (result !== null && isUnitResultSynchronized(result, selectedCards, rentalCardName)) return
    const filledCount = selectedCards.filter((name) => name !== null).length
    if (filledCount > 0 && filledCount <= constant.UNIT_SIZE) evaluateCurrentCards()
  }, [evaluateCurrentCards, selectedCards, rentalCardName, result])

  return useMemo(() => new Set(Object.keys(cardCountCustom)), [cardCountCustom])
}

/**
 * サポートの点数を計算して一覧表示へ渡す
 *
 * 画面の設定変更に合わせた再計算と、個別カードの計算だけを担当し、
 * 計算入力の生成と全カード計算を分け、
 * このファイルでは一覧表示に必要な状態を組み立てる
 */
import { useCallback, useMemo } from 'react'
import type { CardCalculationResult, CardCountCustom, CardCustomData, ScoreSettings, SupportCard } from '../types/card'
import type { UncapType } from '../types/enums'
import { sanitizeCardCountCustomForCalculation } from '../utils/calculationSnapshot'
import {
  calculateBaseCardResults,
  calculateCardScores,
  calculateCardWithSettings,
  createCardScoreCalculationContext,
} from '../utils/calculator/calculateCardScores'

/** useCardScores の戻り値 */
interface ScoreCalculationResult {
  /** サポート名 → 計算の内訳（アビリティごとのスコア等） */
  cardResults: Map<string, CardCalculationResult>
  /** サポート名 → 合計スコア（表示用の数値のみ） */
  cardScores: Map<string, number>
  /** 任意のサポート・凸数でスコアを個別計算する関数 */
  calculateForCard: (card: SupportCard, uncap: UncapType, custom?: CardCustomData) => CardCalculationResult | undefined
}

/**
 * 全サポートのスコアを計算するフック
 *
 * @param allCards - 全サポートの配列（マスターデータ + ユーザー定義）
 * @param allCardByName - サポート名からカードを探す表
 * @param scoreSettings - ユーザーの点数設定
 * @param cardUncaps - サポート名から凸数を探す表
 * @param cardCountCustom - サポート名からアクションごとの回数調整を探す表
 * @returns 全サポートの計算結果と合計スコア
 */
export function useCardScores(
  allCards: SupportCard[],
  allCardByName: Map<string, SupportCard>,
  scoreSettings: ScoreSettings,
  cardUncaps: Record<string, UncapType>,
  cardCountCustom: CardCountCustom = {},
): ScoreCalculationResult {
  // 点数設定が変わるたびに計算条件を作り直し、現在の条件を固定する
  const calculationContext = useMemo(() => createCardScoreCalculationContext(scoreSettings), [scoreSettings])
  const safeCardCountCustom = useMemo(
    // 保存データや外部入力由来の回数調整を、カードごとの表示可能項目へ絞る
    () => sanitizeCardCountCustomForCalculation(cardCountCustom, allCardByName),
    [allCardByName, cardCountCustom],
  )
  // 各カードの基準計算結果をまとめて作り、一覧全体の計算で再利用する
  const baseResults = useMemo(
    () => calculateBaseCardResults(allCards, scoreSettings, calculationContext),
    [allCards, calculationContext, scoreSettings],
  )
  const { cardResults, cardScores } = useMemo(
    // 検証済みの回数調整だけを使い、全カードの点数と並び替え用の値を一括計算する
    () =>
      calculateCardScores({
        allCards,
        cardByName: allCardByName,
        scoreSettings,
        cardUncaps,
        cardCountCustom: safeCardCountCustom,
        calculationContext,
        baseResults,
      }),
    [allCards, allCardByName, scoreSettings, cardUncaps, safeCardCountCustom, calculationContext, baseResults],
  )

  /** サポート詳細モーダルで凸数を切り替えたときの再計算 */
  const calculateForCard = useCallback(
    (card: SupportCard, uncap: UncapType, custom?: CardCustomData) =>
      calculateCardWithSettings(card, uncap, scoreSettings, custom, calculationContext),
    [calculationContext, scoreSettings],
  )

  return { cardResults, cardScores, calculateForCard }
}

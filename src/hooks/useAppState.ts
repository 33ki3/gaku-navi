/**
 * アプリケーション状態管理フック
 *
 * アプリ全体の状態を1つにまとめる「司令塔」のようなフック。
 * UI状態、サポート凸数、スコア計算、フィルターなど
 * 他のフックを組み合わせて、App.tsx に返す。
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import type { SupportCard, ScoreSettings } from '../types/card'
import type { UncapType } from '../types/enums'
import { loadScoreSettings, saveScoreSettings } from '../utils/scoreSettings'
import { createEmptyResult } from '../utils/calculator/calculateCard'
import { useUIState } from './useUIState'
import { useCardUncaps } from './useCardUncaps'
import { useCardCountCustom } from './useCardCountCustom'
import { useFilteredCards } from './useFilteredCards'
import { useCardScores } from './useCardScores'
import * as data from '../data'

/**
 * アプリ全体の状態をまとめて管理するフック
 *
 * 内部で以下のフックを呼び出して統合している:
 * - useUIState() → モーダルやパネルの開閉
 * - useCardUncaps() → サポートの凸数
 * - useCardScores() → 全サポートのスコア計算
 * - useFilteredCards() → フィルター・並び替え
 *
 * @returns アプリ全体の状態とイベントハンドラ
 */
export function useAppState() {
  // --- 各フックから状態を取得 ---
  const ui = useUIState()
  const { setSelectedCard, setScoreBreakdown, setUncapEditMode } = ui
  const uncaps = useCardUncaps()
  const countCustom = useCardCountCustom()
  const { setCardUncap } = uncaps

  // スコア設定（変更時に localStorage にも保存する）
  const [scoreSettings, setScoreSettingsRaw] = useState(loadScoreSettings)
  const setScoreSettings = useCallback((settings: ScoreSettings) => {
    setScoreSettingsRaw(settings)
    saveScoreSettings(settings)
  }, [])

  // スコア計算とフィルタリングを実行する
  const { cardResults, cardScores, calculateForCard } = useCardScores(
    scoreSettings,
    uncaps.cardUncaps,
    countCustom.cardCountCustom,
  )
  const filters = useFilteredCards(data.AllCards, cardScores, uncaps.cardUncaps, scoreSettings)

  // cardResults を ref で保持し、useCallback の依存配列から除外する
  const cardResultsRef = useRef(cardResults)
  useEffect(() => {
    cardResultsRef.current = cardResults
  }, [cardResults])

  // --- イベントハンドラ ---

  /** サポートをクリックしたとき → 詳細モーダルを開く */
  const handleCardClick = useCallback(
    (card: SupportCard) => {
      setSelectedCard(card)
    },
    [setSelectedCard],
  )

  /** スコアをクリックしたとき → スコア内訳モーダルを開く（未所持サポートも0点で表示） */
  const handleScoreClick = useCallback(
    (card: SupportCard, e: React.MouseEvent) => {
      e.stopPropagation()
      const result = cardResultsRef.current.get(card.name) ?? createEmptyResult(card)
      setScoreBreakdown({ card, result })
    },
    [setScoreBreakdown],
  )

  /** 凸数が変更されたとき → 保存する */
  const handleUncapChange = useCallback(
    (cardName: string, u: UncapType) => {
      setCardUncap(cardName, u)
    },
    [setCardUncap],
  )

  /** 凸数編集モードの切り替え */
  const uncapEditModeRef = useRef(ui.uncapEditMode)
  useEffect(() => {
    uncapEditModeRef.current = ui.uncapEditMode
  }, [ui.uncapEditMode])

  const handleToggleUncapEdit = useCallback(() => {
    setUncapEditMode(!uncapEditModeRef.current)
  }, [setUncapEditMode])

  return {
    // UI 状態（モーダル・パネルの開閉など）
    ui,
    // スコア設定・計算結果・凸数
    scores: {
      scoreSettings,
      setScoreSettings,
      getCardUncap: uncaps.getCardUncap,
      cardUncaps: uncaps.cardUncaps,
      cardResults,
      cardScores,
      calculateForCard,
      countCustom,
    },
    // フィルター・並び替え
    filters,
    // イベントハンドラ
    handlers: {
      handleCardClick,
      handleScoreClick,
      handleUncapChange,
      handleToggleUncapEdit,
    },
  }
}

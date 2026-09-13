/**
 * アプリケーション状態管理フック
 *
 * アプリ全体の状態を1つにまとめる「司令塔」のようなフック。
 * UI状態、サポート凸数、スコア計算、フィルターなど
 * 他のフックを組み合わせて、App.tsx に返す。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ScoreSettings, SupportCard } from '../types/card'
import * as enums from '../types/enums'
import { createEmptyResult } from '../utils/calculator/calculateCard'
import { loadScoreSettings, normalizeScoreSettingsDerived, saveScoreSettings } from '../utils/scoreSettings'
import { useCardCountCustom } from './useCardCountCustom'
import { useCardExclusions } from './useCardExclusions'
import { useCardScores } from './useCardScores'
import { useCardUncaps } from './useCardUncaps'
import { useFilteredCards } from './useFilteredCards'
import { useUIState } from './useUIState'
import { useUserCards } from './useUserCards'

/**
 * アプリ全体の状態をまとめて管理するフック
 *
 * 内部で以下のフックを呼び出して統合している:
 * - useUIState() → モーダルやパネルの開閉
 * - useCardUncaps() → サポートの凸数
 * - useUserCards() → ユーザー定義サポートの CRUD
 * - useCardScores() → 全サポートのスコア計算
 * - useFilteredCards() → フィルター・並び替え
 *
 * @returns アプリ全体の状態とイベントハンドラ
 */
export function useAppState() {
  // --- 各フックから状態を取得 ---
  const ui = useUIState()
  const { setSelectedCard, setScoreBreakdown, toggleCardListMode, toggleUncapEditMode } = ui
  const uncaps = useCardUncaps()
  const cardExclusions = useCardExclusions()
  const countCustom = useCardCountCustom()
  const userCards = useUserCards()
  const { setCardUncap } = uncaps

  // スコア設定（変更時に localStorage にも保存する）
  const [scoreSettings, setScoreSettingsRaw] = useState<ScoreSettings>(() => {
    return normalizeScoreSettingsDerived(loadScoreSettings())
  })
  const setScoreSettings = useCallback((settings: ScoreSettings) => {
    const normalizedSettings = normalizeScoreSettingsDerived(settings)

    // setState 後に外部参照が変更されても状態が汚染されないよう、保存前に値を複製する
    const safeSettings: ScoreSettings = {
      ...normalizedSettings,
      parameterBonusBase: { ...normalizedSettings.parameterBonusBase },
      actionCounts: { ...normalizedSettings.actionCounts },
      scheduleSelections: { ...normalizedSettings.scheduleSelections },
      customParamBonusRows: normalizedSettings.customParamBonusRows.map((row) => ({ ...row })),
      customClassBonus: { ...normalizedSettings.customClassBonus },
      customNonBonusGain: { ...normalizedSettings.customNonBonusGain },
    }

    setScoreSettingsRaw(() => safeSettings)
    saveScoreSettings(safeSettings)
  }, [])

  // スコア計算とフィルタリングを実行する
  const { cardResults, cardScores, calculateForCard } = useCardScores(
    userCards.allCards,
    userCards.allCardByName,
    scoreSettings,
    uncaps.cardUncaps,
    countCustom.cardCountCustom,
  )
  // 回数調整済みサポート名のセット（フィルター用）
  const countCustomCardNames = useMemo(
    () => new Set(Object.keys(countCustom.cardCountCustom)),
    [countCustom.cardCountCustom],
  )
  const filters = useFilteredCards(
    userCards.allCards,
    cardScores,
    uncaps.cardUncaps,
    scoreSettings,
    countCustomCardNames,
    cardExclusions.excludedCardNames,
  )

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
    (cardName: string, u: enums.UncapType) => {
      setCardUncap(cardName, u)
    },
    [setCardUncap],
  )
  /** 最適編成の除外設定モードを切り替える */
  const handleToggleCardExclusionMode = useCallback(() => {
    toggleCardListMode(enums.CardListInteractionModeType.CardExclusionEdit)
  }, [toggleCardListMode])

  return {
    // UI 状態（モーダル・パネルの開閉など）
    ui,
    // ユーザー定義サポート
    userCards,
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
    // 最適編成から除外するサポート
    exclusions: {
      excludedCardNames: cardExclusions.excludedCardNames,
      isCardExcluded: cardExclusions.isCardExcluded,
    },
    // イベントハンドラ
    handlers: {
      handleCardClick,
      handleScoreClick,
      handleUncapChange,
      handleToggleUncapEdit: toggleUncapEditMode,
      handleToggleCardExclusionMode,
      handleToggleCardExcluded: cardExclusions.toggleCardExcluded,
    },
  }
}

/** useAppState が返す、アプリ全体の統合状態。戻り値の変更を自動で型へ反映する。 */
export type AppState = ReturnType<typeof useAppState>

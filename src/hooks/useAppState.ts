/**
 * アプリ全体の表示状態・カード情報・計算結果を組み合わせる状態管理
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as constant from '../constant'
import type { CalculationSnapshotInput } from '../types/calculation'
import type { ScoreSettings, SupportCard } from '../types/card'
import * as enums from '../types/enums'
import { createCalculationSnapshot, validateScoreSettingsForCalculation } from '../utils/calculationSnapshot'
import { createEmptyResult } from '../utils/calculator/calculateCard'
import { createDomainDigest } from '../utils/domainRevision'
import {
  createDefaultSettings,
  loadScoreSettings,
  normalizeScoreSettingsDerived,
  saveScoreSettings,
} from '../utils/scoreSettings'
import { useCardCountCustom } from './useCardCountCustom'
import { useCardExclusions } from './useCardExclusions'
import { useCardScores } from './useCardScores'
import { useCardUncaps } from './useCardUncaps'
import { useFilteredCards } from './useFilteredCards'
import { useStorageEvent } from './useStorageEvent'
import { useUIState } from './useUIState'
import { useUnitSimulatorSettingsState } from './useUnitSimulatorSettingsState'
import { useUserCards } from './useUserCards'

/**
 * アプリ全体の状態と操作をまとめて返す
 *
 * モーダル、カード、点数計算、絞り込みなどの状態と操作をまとめ、
 * App.tsxから同じ状態を使えるようにする
 *
 * @returns アプリ全体の状態とイベントハンドラ
 */
export function useAppState() {
  // 各設定の現在値をここでまとめる
  // 画面操作と外部操作が同じ保存・表示更新を使うようにする
  const ui = useUIState()
  const { setSelectedCard, setScoreBreakdown, toggleCardListMode, toggleUncapEditMode } = ui
  const uncaps = useCardUncaps()
  const unitSettings = useUnitSimulatorSettingsState()
  const cardExclusions = useCardExclusions(unitSettings)
  const countCustom = useCardCountCustom()
  const userCards = useUserCards()
  const { setCardUncap } = uncaps

  // スコア設定（変更時にブラウザの保存領域へ保存する）
  const [scoreSettings, setScoreSettingsRaw] = useState<ScoreSettings>(() => {
    // 保存データをそのまま信頼せず、計算に渡せる値か確認してから初期化する
    const loaded = validateScoreSettingsForCalculation(loadScoreSettings())
    return loaded ? normalizeScoreSettingsDerived(loaded) : createDefaultSettings()
  })
  const [scoreSettingsPreview, setScoreSettingsPreviewRaw] = useState<ScoreSettings | null>(null)
  const effectiveScoreSettings = scoreSettingsPreview ?? scoreSettings

  // 別タブで変更された点数設定を、保存処理を再発火させずに反映する
  useStorageEvent([constant.SCORE_SETTINGS_STORAGE_KEY, constant.SCHEDULE_SELECTIONS_STORAGE_KEY], () => {
    const loaded = validateScoreSettingsForCalculation(loadScoreSettings())
    setScoreSettingsPreviewRaw(null)
    setScoreSettingsRaw(loaded ? normalizeScoreSettingsDerived(loaded) : createDefaultSettings())
  })
  const normalizeScoreSettingsInput = useCallback((settings: ScoreSettings): ScoreSettings | null => {
    // 画面操作・プリセット・外部入力のどの経路から来ても、
    // 計算フォームで扱える値だけを状態へ入れる
    const validatedSettings = validateScoreSettingsForCalculation(settings)
    if (validatedSettings === null) return null
    const normalizedSettings = normalizeScoreSettingsDerived(validatedSettings)

    // 呼び出し元が後から同じオブジェクトを変更しても画面の設定が変わらないよう、
    // 保存前に入れ子の値まで複製する
    return {
      // 入れ子の値もコピーし、呼び出し元の変更から画面の設定を守る
      ...normalizedSettings,
      parameterBonusBase: { ...normalizedSettings.parameterBonusBase },
      actionCounts: { ...normalizedSettings.actionCounts },
      scheduleSelections: { ...normalizedSettings.scheduleSelections },
      customParamBonusRows: normalizedSettings.customParamBonusRows.map((row) => ({ ...row })),
      customClassBonus: { ...normalizedSettings.customClassBonus },
      customNonBonusGain: { ...normalizedSettings.customNonBonusGain },
    }
  }, [])

  // 回数を連続入力している間は計算だけ即時更新し、保存は最後の値にまとめる
  const previewScoreSettings = useCallback(
    (settings: ScoreSettings): boolean => {
      const safeSettings = normalizeScoreSettingsInput(settings)
      if (safeSettings === null) return false
      setScoreSettingsPreviewRaw(() => safeSettings)
      return true
    },
    [normalizeScoreSettingsInput],
  )
  const clearScoreSettingsPreview = useCallback(() => setScoreSettingsPreviewRaw(null), [])

  // 保存を行わず、外部commandが保存済みのスコア設定を画面へ反映するときに使う
  const applyScoreSettings = useCallback(
    (settings: ScoreSettings): boolean => {
      const safeSettings = normalizeScoreSettingsInput(settings)
      if (safeSettings === null) return false
      if (createDomainDigest(safeSettings) !== createDomainDigest(scoreSettings)) setScoreSettingsPreviewRaw(null)
      setScoreSettingsRaw(() => safeSettings)
      return true
    },
    [normalizeScoreSettingsInput, scoreSettings],
  )

  // 画面操作からスコア設定を保存し、成功したときだけ画面へ反映する
  const setScoreSettings = useCallback(
    (settings: ScoreSettings): boolean => {
      const safeSettings = normalizeScoreSettingsInput(settings)
      if (safeSettings === null) return false

      // 保存成功後だけ画面を更新し、保存内容と表示を一致させる
      if (!saveScoreSettings(safeSettings)) return false
      setScoreSettingsPreviewRaw(null)
      setScoreSettingsRaw(() => safeSettings)
      return true
    },
    [normalizeScoreSettingsInput],
  )

  // スコア計算とフィルタリングを実行する
  const { cardResults, cardScores, calculateForCard } = useCardScores(
    userCards.allCards,
    userCards.allCardByName,
    effectiveScoreSettings,
    uncaps.cardUncaps,
    countCustom.cardCountCustom,
  )
  // 回数調整済みサポート名のセット（フィルター用）
  const countCustomCardNames = useMemo(
    // 一覧の絞り込みには名前の存在だけを使うため、回数の詳細は渡さない
    () => new Set(Object.keys(countCustom.cardCountCustom)),
    [countCustom.cardCountCustom],
  )
  // 現在のカード条件と表示設定から絞り込み結果を作る
  const filters = useFilteredCards(
    userCards.allCards,
    cardScores,
    uncaps.cardUncaps,
    effectiveScoreSettings,
    countCustomCardNames,
    cardExclusions.excludedCardNames,
  )

  // スコア・編成計算に必要な現在値をまとめ、計算開始時にコピーする
  const calculationInput = useMemo<CalculationSnapshotInput>(
    // 関連する設定が変わったときだけ計算入力を作り直す
    () => ({
      scoreSettings: effectiveScoreSettings,
      unitSettings: unitSettings.settings,
      cardUncaps: uncaps.cardUncaps,
      cardCountCustom: countCustom.cardCountCustom,
      allCards: userCards.allCards,
      cardByName: userCards.allCardByName,
    }),
    [
      effectiveScoreSettings,
      unitSettings.settings,
      uncaps.cardUncaps,
      countCustom.cardCountCustom,
      userCards.allCards,
      userCards.allCardByName,
    ],
  )
  // 非同期処理へ渡す計算条件を、描画中の値と分けて保持する
  const calculationInputRef = useRef(calculationInput)
  useLayoutEffect(() => {
    // 非同期の外部操作が画面更新前の古い入力を読まないよう、
    // 最新の計算条件を保持する
    calculationInputRef.current = calculationInput
  }, [calculationInput])
  const getCalculationSnapshot = useCallback(() => {
    // 呼び出しごとに新しい計算条件を作り、比較条件どうしで値を共有しない
    return createCalculationSnapshot(calculationInputRef.current)
  }, [])

  // クリック時は最新の計算結果を使う
  // 結果が変わるたびにクリック処理は作り直さない
  const cardResultsRef = useRef(cardResults)
  useEffect(() => {
    // クリック処理を作り直さず、最新の計算結果だけを参照する
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

  /** スコアをクリックしたときに内訳モーダルを開く（未所持サポートも0点で表示） */
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
    // 画面の表示状態（モーダル・パネルの開閉など）
    ui,
    // ユーザー定義サポート
    userCards,
    // 最適編成設定
    unitSettings,
    // 現在値を固定した計算条件の生成
    getCalculationSnapshot,
    // スコア設定・計算結果・凸数
    scores: {
      scoreSettings: effectiveScoreSettings,
      persistedScoreSettings: scoreSettings,
      setScoreSettings,
      applyScoreSettings,
      previewScoreSettings,
      clearScoreSettingsPreview,
      getCardUncap: uncaps.getCardUncap,
      cardUncaps: uncaps.cardUncaps,
      setCardUncaps: uncaps.setCardUncaps,
      applyCardUncaps: uncaps.applyCardUncaps,
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

/** useAppState が返す、アプリ全体の統合状態。戻り値の変更を自動で型へ反映する */
export type AppState = ReturnType<typeof useAppState>

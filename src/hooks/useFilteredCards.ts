/**
 * サポートフィルタリングフック
 *
 * サポート一覧を、現在の絞り込み条件と並び順に合わせて返す
 * 各サポートが持つアビリティバッジ（「スコア上昇」「パラメータ上昇」など）も計算する
 */
import { useDeferredValue, useMemo, useRef } from 'react'
import * as data from '../data'
import type { TranslationKey } from '../i18n'
import type { ScoreSettings, SupportCard } from '../types/card'
import type { UncapType } from '../types/enums'
import type { FilterState } from '../types/filter'
import { filterSortedCards, sortCards } from '../utils/filterCards'
import { useFilterState } from './useFilterState'

/** useFilteredCards の戻り値型。FilterState の全フィールドに加え、絞り込み結果を含む */
export interface CardFiltersReturn extends FilterState {
  /** フィルター・ソート適用後のサポート一覧 */
  filteredCards: SupportCard[]
  /** サポート名 → そのサポートが持つアビリティバッジの配列 */
  abilityBadgeMap: Map<string, TranslationKey[]>
}

/**
 * サポートの絞り込み・並び替えを行うフック
 *
 * サポート一覧に対して絞り込み・並び替え・バッジ計算を行う
 * スコア順は点数設定の変更時のみ並び替えを行い、
 * 凸数変更によるスコア変化では並び順を維持する
 *
 * @param cards - 全サポートの配列（マスターデータ）
 * @param cardScores - 点数順の並び替えに使うサポート別スコア
 * @param cardUncaps - サポート別の凸数
 * @param scoreSettings - 点数順の並びを更新する基準
 * @param countCustomCardNames - 回数調整を設定したサポート名
 * @param excludedCardNames - 最適編成から除外するサポート名
 * @returns フィルター状態 + 絞り込み結果 + アビリティバッジ
 */
export function useFilteredCards(
  cards: SupportCard[],
  cardScores: Map<string, number>,
  cardUncaps: Record<string, UncapType>,
  scoreSettings: ScoreSettings,
  countCustomCardNames: Set<string>,
  excludedCardNames: ReadonlySet<string>,
): CardFiltersReturn {
  // 一覧の絞り込み条件を取得する
  const state = useFilterState()

  // 文字入力中の画面応答を優先し、検索結果の更新を後から行う
  const deferredSearchTerm = useDeferredValue(state.searchTerm)

  // 点数設定・並び順が変わったときだけ、一覧の並び順を決める値を更新する
  // 凸数変更では表示用の点数だけを更新し、一覧の並び順は維持する
  const sortScoresRef = useRef(cardScores)
  const sortUncapsRef = useRef(cardUncaps)
  const prevScoreSettingsRef = useRef(scoreSettings)
  const prevSortModeRef = useRef(state.sortMode)
  const prevSortReverseRef = useRef(state.sortReverse)
  if (
    prevScoreSettingsRef.current !== scoreSettings ||
    prevSortModeRef.current !== state.sortMode ||
    prevSortReverseRef.current !== state.sortReverse
  ) {
    prevScoreSettingsRef.current = scoreSettings
    prevSortModeRef.current = state.sortMode
    prevSortReverseRef.current = state.sortReverse
    sortScoresRef.current = cardScores
    sortUncapsRef.current = cardUncaps
  }

  // ソート条件（モード・方向・点数設定）が変わったときだけ並び順を作り直す
  const sortedCards = useMemo(
    () =>
      sortCards(cards, {
        sortMode: state.sortMode,
        sortReverse: state.sortReverse,
        sortCardUncaps: sortUncapsRef.current,
        cardScores: sortScoresRef.current,
      }),
    // 凸数変更で並び順を変えない仕様のため、最新の凸数は再計算条件に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, state.sortMode, state.sortReverse, scoreSettings],
  )

  // フィルター: フィルター条件またはソート結果が変わったときだけ再計算する
  const filteredCards = useMemo(
    () =>
      filterSortedCards(sortedCards, {
        searchTerm: deferredSearchTerm,
        selectedRarities: state.selectedRarities,
        selectedTypes: state.selectedTypes,
        selectedPlans: state.selectedPlans,
        spOnly: state.spOnly,
        selectedAbilityKeywords: state.selectedAbilityKeywords,
        selectedEventFilters: state.selectedEventFilters,
        selectedSources: state.selectedSources,
        selectedUncaps: state.selectedUncaps,
        selectedCountCustom: state.selectedCountCustom,
        countCustomCardNames,
        cardUncaps,
        excludedCardNames,
        selectedCardExclusionFilters: state.selectedCardExclusionFilters,
      }),
    [
      sortedCards,
      deferredSearchTerm,
      state.selectedRarities,
      state.selectedTypes,
      state.selectedPlans,
      state.spOnly,
      state.selectedAbilityKeywords,
      state.selectedEventFilters,
      state.selectedSources,
      state.selectedUncaps,
      state.selectedCountCustom,
      countCustomCardNames,
      cardUncaps,
      excludedCardNames,
      state.selectedCardExclusionFilters,
    ],
  )

  // ユーザー追加カードを含む全カードからアビリティバッジマップを構築する
  const abilityBadgeMap = useMemo(() => data.buildAbilityBadgeMap(cards), [cards])

  return { ...state, filteredCards, abilityBadgeMap }
}

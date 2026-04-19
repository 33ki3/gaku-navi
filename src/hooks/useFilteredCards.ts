/**
 * サポートフィルタリングフック
 *
 * useFilterState で管理しているフィルター条件を使って
 * サポート一覧を絞り込み・並び替えした結果を返す。
 * 各サポートが持つアビリティバッジ（「スコア上昇」「パラメータ上昇」等）も計算する。
 */
import { useMemo, useDeferredValue, useRef } from 'react'
import type { SupportCard, ScoreSettings } from '../types/card'
import type { UncapType } from '../types/enums'
import type { TranslationKey } from '../i18n'
import * as data from '../data'
import { sortCards, filterSortedCards } from '../utils/filterCards'
import { useFilterState } from './useFilterState'
import type { FilterState } from './useFilterState'

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
 * 内部で useFilterState() を呼び出してフィルター条件を取得し、
 * サポート一覧に対してフィルタリング → ソート → バッジ計算を行う。
 * スコアソートは scoreSettings 変更時のみ並び替えを行い、
 * 凸数変更によるスコア変化では並び順を維持する。
 *
 * @param cards - 全サポートの配列（マスターデータ）
 * @param cardScores - サポート名 → スコアのマップ（点数順ソートに使う）
 * @param cardUncaps - サポート名 → 凸数のマップ
 * @param scoreSettings - スコア設定（ソート再計算のトリガー判定に使う）
 * @param countCustomCardNames - 回数調整済みサポート名のセット
 * @returns フィルター状態 + 絞り込み結果 + アビリティバッジ
 */
export function useFilteredCards(
  cards: SupportCard[],
  cardScores: Map<string, number>,
  cardUncaps: Record<string, UncapType>,
  scoreSettings: ScoreSettings,
  countCustomCardNames: Set<string>,
): CardFiltersReturn {
  // フィルター条件の状態を取得する
  const state = useFilterState()

  // テキスト検索のフィルタリングを低優先度にして入力のレスポンス性を維持する
  const deferredSearchTerm = useDeferredValue(state.searchTerm)

  // ソート用スコアの管理:
  // 凸数変更ではソート順を維持し、scoreSettings・ソートモード・ソート方向の
  // 変更時のみソート順を更新する。表示用スコアは cardScores（常に最新）を使う。
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

  // フィルター条件が変わったときだけサポート一覧を再計算する
  // ソートとフィルタリングを分離して、ソート結果をキャッシュする。
  // フィルター条件のみの変更ではソートを再実行しない（O(n) のフィルタリングだけで済む）。

  // ソート: ソート条件（モード・方向・スコア設定）が変わったときだけ再計算する
  const sortedCards = useMemo(
    () =>
      sortCards(cards, {
        sortMode: state.sortMode,
        sortReverse: state.sortReverse,
        sortCardUncaps: sortUncapsRef.current,
        cardScores: sortScoresRef.current,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sortScoresRef / sortUncapsRef は scoreSettings 変更時のみ更新するため ref で管理
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
    ],
  )

  // ユーザー追加カードを含む全カードからアビリティバッジマップを構築する
  const abilityBadgeMap = useMemo(() => data.buildAbilityBadgeMap(cards), [cards])

  return { ...state, filteredCards, abilityBadgeMap }
}

/**
 * カードフィルタリングフック
 *
 * useFilterState で管理しているフィルター条件を使って
 * カード一覧を絞り込み・並び替えした結果を返す。
 * 各カードが持つアビリティバッジ（「スコア上昇」「パラメータ上昇」等）も計算する。
 */
import { useMemo, useDeferredValue, useRef } from 'react'
import type { SupportCard, ScoreSettings } from '../types/card'
import type { UncapType } from '../types/enums'
import type { TranslationKey } from '../i18n'
import * as data from '../data'
import { hasAbilityKeyword } from '../utils/cardQuery'
import { filterAndSortCards } from '../utils/filterCards'
import { useFilterState } from './useFilterState'
import type { FilterState } from './useFilterState'

/** useFilteredCards の戻り値型。FilterState の全フィールドに加え、絞り込み結果を含む */
export interface CardFiltersReturn extends FilterState {
  /** フィルター・ソート適用後のカード一覧 */
  filteredCards: SupportCard[]
  /** カード名 → そのカードが持つアビリティバッジの配列 */
  abilityBadgeMap: Map<string, TranslationKey[]>
}

/**
 * カードの絞り込み・並び替えを行うフック
 *
 * 内部で useFilterState() を呼び出してフィルター条件を取得し、
 * カード一覧に対してフィルタリング → ソート → バッジ計算を行う。
 * スコアソートは scoreSettings 変更時のみ並び替えを行い、
 * 凸数変更によるスコア変化では並び順を維持する。
 *
 * @param cards - 全カードの配列（マスターデータ）
 * @param cardScores - カード名 → スコアのマップ（点数順ソートに使う）
 * @param cardUncaps - カード名 → 凸数のマップ
 * @param scoreSettings - スコア設定（ソート再計算のトリガー判定に使う）
 * @returns フィルター状態 + 絞り込み結果 + アビリティバッジ
 */
export function useFilteredCards(
  cards: SupportCard[],
  cardScores: Map<string, number>,
  cardUncaps: Record<string, UncapType>,
  scoreSettings: ScoreSettings,
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

  // フィルター条件が変わったときだけカード一覧を再計算する
  const filteredCards = useMemo(
    () =>
      filterAndSortCards(cards, {
        searchTerm: deferredSearchTerm,
        selectedRarities: state.selectedRarities,
        selectedTypes: state.selectedTypes,
        selectedPlans: state.selectedPlans,
        spOnly: state.spOnly,
        selectedAbilityKeywords: state.selectedAbilityKeywords,
        selectedEventFilters: state.selectedEventFilters,
        selectedUncaps: state.selectedUncaps,
        cardUncaps,
        sortCardUncaps: sortUncapsRef.current,
        sortMode: state.sortMode,
        sortReverse: state.sortReverse,
        cardScores: sortScoresRef.current,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sortScoresRef は scoreSettings 変更時のみ更新するため ref で管理
    [
      deferredSearchTerm,
      state.selectedRarities,
      state.selectedTypes,
      state.selectedPlans,
      state.selectedEventFilters,
      state.selectedUncaps,
      state.spOnly,
      state.selectedAbilityKeywords,
      state.sortMode,
      state.sortReverse,
      scoreSettings,
      cardUncaps,
      cards,
    ],
  )

  // 各カードのアビリティバッジを計算する（点数に寄与するアビリティのみ対象）
  const abilityBadgeMap = useMemo(() => {
    const map = new Map<string, TranslationKey[]>()
    for (const card of cards) {
      // カードごとに、マスターのキーワード一覧と照合してバッジを集める
      const badges: TranslationKey[] = []
      for (const kw of data.AbilityKeywordList) {
        if (hasAbilityKeyword(card, kw, true)) {
          badges.push(data.AbilityKeywordMap.get(kw)!.badge)
        }
      }
      if (badges.length > 0) map.set(card.name, badges)
    }
    return map
  }, [cards])

  return { ...state, filteredCards, abilityBadgeMap }
}

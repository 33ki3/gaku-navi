/**
 * フィルター状態管理フック
 *
 * サポート一覧の絞り込み・並び替え条件を管理する
 * レアリティ、タイプ、プランなどのフィルター状態を保持し、
 * 変更があると 300ms 後にブラウザの保存領域へ自動保存する
 */
import { useCallback, useEffect, useReducer } from 'react'
import * as constant from '../constant'
import type { PersistedFilterState } from '../types/app'
import type {
  AbilityKeywordType,
  CardExclusionFilterType,
  CardType,
  CountCustomFilter,
  PlanType,
  RarityType,
  SourceType,
  UncapType,
} from '../types/enums'
import * as enums from '../types/enums'
import type { FilterState } from '../types/filter'
import { loadFilterState, saveFilterState } from '../utils/filterStorage'
import { isPersistedFilterState } from '../utils/storageCollectionValidation'
import { useStorageEvent } from './useStorageEvent'

/**
 * 選択中の項目を追加・削除するヘルパー
 * すでにあれば消す、なければ追加する（トグル動作）
 *
 * @param prev - 変更前の選択項目
 * @param item - 追加または削除する要素
 * @returns 変更後の選択項目
 */
function toggleInSet<T>(prev: Set<T>, item: T): Set<T> {
  // 元の選択項目を変更せず、追加・削除後の新しい集合を返す
  const next = new Set(prev)
  if (next.has(item)) next.delete(item)
  else next.add(item)
  return next
}

/** フィルター状態の内部データ */
interface FilterData {
  searchTerm: string
  selectedRarities: Set<RarityType>
  selectedTypes: Set<CardType>
  spOnly: boolean
  selectedAbilityKeywords: Set<AbilityKeywordType>
  selectedPlans: Set<PlanType>
  selectedEventFilters: Set<enums.EventFilterType>
  selectedSources: Set<SourceType>
  selectedUncaps: Set<UncapType>
  selectedCountCustom: Set<CountCustomFilter>
  selectedCardExclusionFilters: Set<CardExclusionFilterType>
  sortMode: enums.SortModeType
  sortReverse: boolean
}

/** フィルターの保存値復元と画面操作を表すreducer action */
type FilterAction =
  | { type: typeof constant.SET_ALL_FILTERS; state: PersistedFilterState }
  | { type: typeof enums.FilterActionType.SetSearch; term: string }
  | { type: typeof enums.FilterActionType.ToggleRarity; rarity: RarityType }
  | { type: typeof enums.FilterActionType.ToggleType; cardType: CardType }
  | { type: typeof enums.FilterActionType.ToggleSP }
  | { type: typeof enums.FilterActionType.ToggleAbilityKeyword; keyword: AbilityKeywordType }
  | { type: typeof enums.FilterActionType.TogglePlan; plan: PlanType }
  | { type: typeof enums.FilterActionType.ToggleEventFilter; filter: enums.EventFilterType }
  | { type: typeof enums.FilterActionType.ToggleSource; source: SourceType }
  | { type: typeof enums.FilterActionType.ToggleUncap; uncap: UncapType }
  | { type: typeof enums.FilterActionType.ToggleCountCustom; filter: CountCustomFilter }
  | {
      type: typeof enums.FilterActionType.ToggleCardExclusionFilter
      filter: CardExclusionFilterType
    }
  | { type: typeof enums.FilterActionType.SetSortMode; mode: enums.SortModeType }
  | { type: typeof enums.FilterActionType.ToggleSortReverse }
  | { type: typeof enums.FilterActionType.ClearFilters }

/**
 * 保存形式のフィルター状態を、画面で扱う選択項目の集合へ変換する
 *
 * @param saved - 保存形式のフィルター状態
 * @returns 画面で扱うフィルター状態
 */
function createFilterData(saved: PersistedFilterState): FilterData {
  // 保存形式の配列を、画面の選択切り替えが扱う集合へ変換する
  return {
    searchTerm: saved.searchTerm,
    selectedRarities: new Set(saved.rarities),
    selectedTypes: new Set(saved.types),
    spOnly: saved.spOnly,
    selectedAbilityKeywords: new Set(saved.abilityKeywords),
    selectedPlans: new Set(saved.plans),
    selectedEventFilters: new Set(saved.eventFilters),
    selectedSources: new Set(saved.sources),
    selectedUncaps: new Set(saved.uncaps),
    selectedCountCustom: new Set(saved.countCustom),
    selectedCardExclusionFilters: new Set(saved.cardExclusionFilters),
    sortMode: saved.sortMode,
    sortReverse: saved.sortReverse,
  }
}

function filterReducer(state: FilterData, action: FilterAction): FilterData {
  switch (action.type) {
    case constant.SET_ALL_FILTERS:
      // 別タブ同期や一括更新では、保存値を全項目まとめて画面へ戻す
      return createFilterData(action.state)
    case enums.FilterActionType.SetSearch:
      return { ...state, searchTerm: action.term }
    case enums.FilterActionType.ToggleRarity:
      return { ...state, selectedRarities: toggleInSet(state.selectedRarities, action.rarity) }
    case enums.FilterActionType.ToggleType:
      return { ...state, selectedTypes: toggleInSet(state.selectedTypes, action.cardType) }
    case enums.FilterActionType.ToggleSP:
      return { ...state, spOnly: !state.spOnly }
    case enums.FilterActionType.ToggleAbilityKeyword:
      return { ...state, selectedAbilityKeywords: toggleInSet(state.selectedAbilityKeywords, action.keyword) }
    case enums.FilterActionType.TogglePlan:
      return { ...state, selectedPlans: toggleInSet(state.selectedPlans, action.plan) }
    case enums.FilterActionType.ToggleEventFilter:
      return { ...state, selectedEventFilters: toggleInSet(state.selectedEventFilters, action.filter) }
    case enums.FilterActionType.ToggleSource:
      return { ...state, selectedSources: toggleInSet(state.selectedSources, action.source) }
    case enums.FilterActionType.ToggleUncap:
      return { ...state, selectedUncaps: toggleInSet(state.selectedUncaps, action.uncap) }
    case enums.FilterActionType.ToggleCountCustom:
      return { ...state, selectedCountCustom: toggleInSet(state.selectedCountCustom, action.filter) }
    case enums.FilterActionType.ToggleCardExclusionFilter:
      return { ...state, selectedCardExclusionFilters: toggleInSet(state.selectedCardExclusionFilters, action.filter) }
    case enums.FilterActionType.SetSortMode:
      return { ...state, sortMode: action.mode }
    case enums.FilterActionType.ToggleSortReverse:
      return { ...state, sortReverse: !state.sortReverse }
    case enums.FilterActionType.ClearFilters:
      // 絞り込み条件だけを初期化し、並び順の選択はユーザーの設定として残す
      return {
        ...state,
        searchTerm: '',
        selectedRarities: new Set(),
        selectedTypes: new Set(),
        spOnly: false,
        selectedAbilityKeywords: new Set(),
        selectedPlans: new Set(),
        selectedEventFilters: new Set(),
        selectedSources: new Set(),
        selectedUncaps: new Set(),
        selectedCountCustom: new Set(),
        selectedCardExclusionFilters: new Set(),
      }
  }
}

function initFilterData(): FilterData {
  // 不正または未保存の場合は、アプリ共通の既定値を利用する
  const saved = loadFilterState() ?? constant.DEFAULT_FILTER_STATE
  return createFilterData(saved)
}

/**
 * フィルター・並び替えの状態をすべて管理するフック
 *
 * 初回レンダリング時にブラウザの保存領域から前回の状態を復元し、
 * 状態が変わるたびに 300ms 待ってから自動保存する
 *
 * @returns フィルター状態と各種トグル・リセット関数
 */
export function useFilterState(): FilterState {
  const [state, dispatch] = useReducer(filterReducer, undefined, initFilterData)

  // フィルターが変わったら 300ms 待ってからブラウザの保存領域に保存する
  useEffect(() => {
    // 連続操作をまとめ、最後のフィルター状態だけを保存する
    const timer = setTimeout(() => {
      const persisted: PersistedFilterState = {
        // 画面内の選択項目は、保存直前に配列へ変換する
        searchTerm: state.searchTerm,
        rarities: [...state.selectedRarities],
        types: [...state.selectedTypes],
        plans: [...state.selectedPlans],
        spOnly: state.spOnly,
        abilityKeywords: [...state.selectedAbilityKeywords],
        eventFilters: [...state.selectedEventFilters],
        sources: [...state.selectedSources],
        uncaps: [...state.selectedUncaps],
        countCustom: [...state.selectedCountCustom],
        cardExclusionFilters: [...state.selectedCardExclusionFilters],
        sortMode: state.sortMode,
        sortReverse: state.sortReverse,
      }
      saveFilterState(persisted)
    }, constant.FILTER_SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [state])

  // 別タブで変更された一覧条件を、リロードせずに現在の画面へ反映する
  useStorageEvent(constant.FILTER_STORAGE_KEY, () => {
    dispatch({ type: constant.SET_ALL_FILTERS, state: loadFilterState() ?? constant.DEFAULT_FILTER_STATE })
  })

  // 検索語を更新する
  const setSearchTerm = useCallback((term: string) => dispatch({ type: enums.FilterActionType.SetSearch, term }), [])
  // 保存形式のフィルター状態を保存して画面へ反映する
  const setFilterState = useCallback((nextState: PersistedFilterState): boolean => {
    // 画面操作・外部入力のどちらから来ても、保存できる値だけを画面へ入れる
    if (!isPersistedFilterState(nextState)) return false
    // 一括更新は保存完了を確認してから画面へ反映する
    if (!saveFilterState(nextState)) return false
    dispatch({ type: constant.SET_ALL_FILTERS, state: nextState })
    return true
  }, [])
  // 保存を行わず、確定済みのフィルター状態だけを画面へ反映する
  const applyFilterState = useCallback((nextState: PersistedFilterState): boolean => {
    if (!isPersistedFilterState(nextState)) return false
    dispatch({ type: constant.SET_ALL_FILTERS, state: nextState })
    return true
  }, [])
  // レアリティの選択状態を切り替える
  const toggleRarity = useCallback(
    (rarity: RarityType) => dispatch({ type: enums.FilterActionType.ToggleRarity, rarity }),
    [],
  )
  // カードタイプの選択状態を切り替える
  const toggleType = useCallback(
    (type: CardType) => dispatch({ type: enums.FilterActionType.ToggleType, cardType: type }),
    [],
  )
  // SPアビリティのみ表示する条件を切り替える
  const toggleSP = useCallback(() => dispatch({ type: enums.FilterActionType.ToggleSP }), [])
  // アビリティキーワードの選択状態を切り替える
  const toggleAbilityKeyword = useCallback(
    (keyword: AbilityKeywordType) => dispatch({ type: enums.FilterActionType.ToggleAbilityKeyword, keyword }),
    [],
  )
  // プランの選択状態を切り替える
  const togglePlan = useCallback((plan: PlanType) => dispatch({ type: enums.FilterActionType.TogglePlan, plan }), [])
  // イベント種別の選択状態を切り替える
  const toggleEventFilter = useCallback(
    (filter: enums.EventFilterType) => dispatch({ type: enums.FilterActionType.ToggleEventFilter, filter }),
    [],
  )
  // 入手先の選択状態を切り替える
  const toggleSource = useCallback(
    (source: SourceType) => dispatch({ type: enums.FilterActionType.ToggleSource, source }),
    [],
  )
  // 凸数の選択状態を切り替える
  const toggleUncap = useCallback(
    (uncap: UncapType) => dispatch({ type: enums.FilterActionType.ToggleUncap, uncap }),
    [],
  )
  // 回数調整の有無に関する条件を切り替える
  const toggleCountCustom = useCallback(
    (filter: CountCustomFilter) => dispatch({ type: enums.FilterActionType.ToggleCountCustom, filter }),
    [],
  )
  // 最適編成からの除外条件を切り替える
  const toggleCardExclusionFilter = useCallback(
    (filter: CardExclusionFilterType) => dispatch({ type: enums.FilterActionType.ToggleCardExclusionFilter, filter }),
    [],
  )
  // カード一覧の並び順を変更する
  const setSortMode = useCallback(
    (mode: enums.SortModeType) => dispatch({ type: enums.FilterActionType.SetSortMode, mode }),
    [],
  )
  // カード一覧の並び順を反転する
  const toggleSortReverse = useCallback(() => dispatch({ type: enums.FilterActionType.ToggleSortReverse }), [])
  // フィルターと並び順を既定値へ戻す
  const clearFilters = useCallback(() => dispatch({ type: enums.FilterActionType.ClearFilters }), [])

  return {
    searchTerm: state.searchTerm,
    setSearchTerm,
    setFilterState,
    applyFilterState,
    selectedRarities: state.selectedRarities,
    selectedTypes: state.selectedTypes,
    spOnly: state.spOnly,
    toggleSP,
    selectedAbilityKeywords: state.selectedAbilityKeywords,
    selectedPlans: state.selectedPlans,
    selectedEventFilters: state.selectedEventFilters,
    selectedSources: state.selectedSources,
    selectedUncaps: state.selectedUncaps,
    selectedCountCustom: state.selectedCountCustom,
    toggleCountCustom,
    selectedCardExclusionFilters: state.selectedCardExclusionFilters,
    toggleCardExclusionFilter,
    sortMode: state.sortMode,
    setSortMode,
    sortReverse: state.sortReverse,
    toggleSortReverse,
    toggleRarity,
    toggleType,
    toggleAbilityKeyword,
    togglePlan,
    toggleEventFilter,
    toggleSource,
    toggleUncap,
    clearFilters,
  }
}

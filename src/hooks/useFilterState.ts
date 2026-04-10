/**
 * フィルター状態管理フック
 *
 * サポート一覧の絞り込み・並び替え条件を管理する。
 * レアリティ、タイプ、プランなどのフィルター状態を保持し、
 * 変更があると 300ms 後に localStorage へ自動保存する。
 */
import { useReducer, useCallback, useEffect } from 'react'
import type {
  AbilityKeywordType,
  CardType,
  CountCustomFilter,
  PlanType,
  RarityType,
  SourceType,
  UncapType,
} from '../types/enums'
import * as constant from '../constant'
import * as enums from '../types/enums'
import { loadFilterState, saveFilterState } from '../utils/filterStorage'
import type { PersistedFilterState } from '../utils/filterStorage'

/**
 * Set の中にある要素を追加/削除するヘルパー
 * すでにあれば消す、なければ追加する（トグル動作）
 */
function toggleInSet<T>(prev: Set<T>, item: T): Set<T> {
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
  sortMode: enums.SortModeType
  sortReverse: boolean
}

type FilterAction =
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
  | { type: typeof enums.FilterActionType.SetSortMode; mode: enums.SortModeType }
  | { type: typeof enums.FilterActionType.ToggleSortReverse }
  | { type: typeof enums.FilterActionType.ClearFilters }

function filterReducer(state: FilterData, action: FilterAction): FilterData {
  switch (action.type) {
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
    case enums.FilterActionType.SetSortMode:
      return { ...state, sortMode: action.mode }
    case enums.FilterActionType.ToggleSortReverse:
      return { ...state, sortReverse: !state.sortReverse }
    case enums.FilterActionType.ClearFilters:
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
      }
  }
}

/** useFilterState が返す状態と操作関数の型 */
export interface FilterState {
  /** テキスト検索のキーワード */
  searchTerm: string
  setSearchTerm: (term: string) => void
  /** 選択中のレアリティ（R, SR, SSR） */
  selectedRarities: Set<RarityType>
  /** 選択中のタイプ（ボーカル、ダンス、ビジュアル） */
  selectedTypes: Set<CardType>
  /** SP のみ表示するか */
  spOnly: boolean
  toggleSP: () => void
  /** 選択中のアビリティキーワード */
  selectedAbilityKeywords: Set<AbilityKeywordType>
  /** 選択中のプラン */
  selectedPlans: Set<PlanType>
  /** 選択中のイベントフィルター */
  selectedEventFilters: Set<enums.EventFilterType>
  /** 選択中の入手種別フィルター */
  selectedSources: Set<SourceType>
  /** 選択中の凸数フィルター */
  selectedUncaps: Set<UncapType>
  /** 選択中の回数調整フィルター */
  selectedCountCustom: Set<CountCustomFilter>
  toggleCountCustom: (filter: CountCustomFilter) => void
  /** 現在の並び替えモード */
  sortMode: enums.SortModeType
  setSortMode: (mode: enums.SortModeType) => void
  /** 並び替えを逆順にするか */
  sortReverse: boolean
  toggleSortReverse: () => void
  toggleRarity: (rarity: RarityType) => void
  toggleType: (type: CardType) => void
  toggleAbilityKeyword: (keyword: AbilityKeywordType) => void
  togglePlan: (plan: PlanType) => void
  toggleEventFilter: (filter: enums.EventFilterType) => void
  toggleSource: (source: SourceType) => void
  toggleUncap: (uncap: UncapType) => void
  /** すべてのフィルターをリセットする */
  clearFilters: () => void
}

function initFilterData(): FilterData {
  const saved = loadFilterState()
  return {
    searchTerm: saved?.searchTerm ?? '',
    selectedRarities: new Set(saved?.rarities),
    selectedTypes: new Set(saved?.types),
    spOnly: saved?.spOnly ?? false,
    selectedAbilityKeywords: new Set(saved?.abilityKeywords),
    selectedPlans: new Set(saved?.plans),
    selectedEventFilters: new Set(saved?.eventFilters),
    selectedSources: new Set(saved?.sources),
    selectedUncaps: new Set(saved?.uncaps),
    selectedCountCustom: new Set(saved?.countCustom),
    sortMode: saved?.sortMode ?? enums.SortModeType.Rarity,
    sortReverse: saved?.sortReverse ?? false,
  }
}

/**
 * フィルター・並び替えの状態をすべて管理するフック
 *
 * 初回レンダリング時に localStorage から前回の状態を復元し、
 * 状態が変わるたびに 300ms のデバウンス付きで自動保存する。
 *
 * @returns フィルター状態と各種トグル・リセット関数
 */
export function useFilterState(): FilterState {
  const [state, dispatch] = useReducer(filterReducer, undefined, initFilterData)

  // フィルターが変わったら 300ms 待ってから localStorage に保存する
  useEffect(() => {
    const timer = setTimeout(() => {
      const persisted: PersistedFilterState = {
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
        sortMode: state.sortMode,
        sortReverse: state.sortReverse,
      }
      saveFilterState(persisted)
    }, constant.FILTER_SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [state])

  const setSearchTerm = useCallback((term: string) => dispatch({ type: enums.FilterActionType.SetSearch, term }), [])
  const toggleRarity = useCallback(
    (rarity: RarityType) => dispatch({ type: enums.FilterActionType.ToggleRarity, rarity }),
    [],
  )
  const toggleType = useCallback(
    (type: CardType) => dispatch({ type: enums.FilterActionType.ToggleType, cardType: type }),
    [],
  )
  const toggleSP = useCallback(() => dispatch({ type: enums.FilterActionType.ToggleSP }), [])
  const toggleAbilityKeyword = useCallback(
    (keyword: AbilityKeywordType) => dispatch({ type: enums.FilterActionType.ToggleAbilityKeyword, keyword }),
    [],
  )
  const togglePlan = useCallback((plan: PlanType) => dispatch({ type: enums.FilterActionType.TogglePlan, plan }), [])
  const toggleEventFilter = useCallback(
    (filter: enums.EventFilterType) => dispatch({ type: enums.FilterActionType.ToggleEventFilter, filter }),
    [],
  )
  const toggleSource = useCallback(
    (source: SourceType) => dispatch({ type: enums.FilterActionType.ToggleSource, source }),
    [],
  )
  const toggleUncap = useCallback(
    (uncap: UncapType) => dispatch({ type: enums.FilterActionType.ToggleUncap, uncap }),
    [],
  )
  const toggleCountCustom = useCallback(
    (filter: CountCustomFilter) => dispatch({ type: enums.FilterActionType.ToggleCountCustom, filter }),
    [],
  )
  const setSortMode = useCallback(
    (mode: enums.SortModeType) => dispatch({ type: enums.FilterActionType.SetSortMode, mode }),
    [],
  )
  const toggleSortReverse = useCallback(() => dispatch({ type: enums.FilterActionType.ToggleSortReverse }), [])
  const clearFilters = useCallback(() => dispatch({ type: enums.FilterActionType.ClearFilters }), [])

  return {
    searchTerm: state.searchTerm,
    setSearchTerm,
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

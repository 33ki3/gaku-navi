/**
 * サポート一覧の絞り込み・並び替え状態と操作関数の型
 *
 * 一覧画面・保存処理・外部操作で同じ選択状態を使う
 */
import type { PersistedFilterState } from './app'
import type {
  AbilityKeywordType,
  CardExclusionFilterType,
  CardType,
  CountCustomFilter,
  EventFilterType,
  PlanType,
  RarityType,
  SortModeType,
  SourceType,
  UncapType,
} from './enums'

/** 一覧の絞り込み・並び替え状態と操作関数の型 */
export interface FilterState {
  /** テキスト検索のキーワード */
  searchTerm: string
  setSearchTerm: (term: string) => void
  /** 絞り込み・並び替えを保存形式の値で一括設定する */
  setFilterState: (state: PersistedFilterState) => boolean
  /** 保存を行わず、共通の更新処理が確定した値だけを画面へ反映する */
  applyFilterState: (state: PersistedFilterState) => boolean
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
  selectedEventFilters: Set<EventFilterType>
  /** 選択中の入手種別フィルター */
  selectedSources: Set<SourceType>
  /** 選択中の凸数フィルター */
  selectedUncaps: Set<UncapType>
  /** 選択中の回数調整フィルター */
  selectedCountCustom: Set<CountCustomFilter>
  toggleCountCustom: (filter: CountCustomFilter) => void
  /** 選択中の最適編成候補フィルター */
  selectedCardExclusionFilters: Set<CardExclusionFilterType>
  toggleCardExclusionFilter: (filter: CardExclusionFilterType) => void
  /** 現在の並び替えモード */
  sortMode: SortModeType
  setSortMode: (mode: SortModeType) => void
  /** 並び替えを逆順にするか */
  sortReverse: boolean
  toggleSortReverse: () => void
  toggleRarity: (rarity: RarityType) => void
  toggleType: (type: CardType) => void
  toggleAbilityKeyword: (keyword: AbilityKeywordType) => void
  togglePlan: (plan: PlanType) => void
  toggleEventFilter: (filter: EventFilterType) => void
  toggleSource: (source: SourceType) => void
  toggleUncap: (uncap: UncapType) => void
  /** すべてのフィルターをリセットする */
  clearFilters: () => void
}

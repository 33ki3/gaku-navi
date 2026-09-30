/**
 * アプリ全体の表示・検索設定に関する型定義
 */
import type {
  AbilityKeywordType,
  CardExclusionFilterType,
  CardListInteractionModeType,
  CardType,
  CountCustomFilter,
  EventFilterType,
  PlanType,
  RarityType,
  SortModeType,
  SourceType,
  UncapType,
} from './enums'

/** 画面全体に適用するユーザー設定 */
export interface AppPreferences {
  /** スマホ画面で下部メニューを表示するか */
  showMobileBottomNav: boolean
  /** スクロール中もスマホ下部メニューを固定表示するか */
  keepMobileBottomNavFixed: boolean
}

/** localStorage に保存する検索・絞り込み・並び順設定 */
export interface PersistedFilterState {
  searchTerm: string
  rarities: RarityType[]
  types: CardType[]
  plans: PlanType[]
  spOnly: boolean
  abilityKeywords: AbilityKeywordType[]
  eventFilters: EventFilterType[]
  sources: SourceType[]
  uncaps: UncapType[]
  countCustom: CountCustomFilter[]
  cardExclusionFilters: CardExclusionFilterType[]
  sortMode: SortModeType
  sortReverse: boolean
}

/** サポート一覧の相互排他モードと切り替え操作 */
export interface CardListModeController {
  /** 現在の操作モード */
  mode: CardListInteractionModeType
  /** 手動選択モードを開始または終了する */
  setManualSelection: (enabled: boolean) => void
  /** 手動選択を完了する */
  finishManualSelection: () => void
  /** 除外設定モードを開始または終了する */
  toggleExclusion: () => void
}

/**
 * フィルター状態の永続化ユーティリティ
 *
 * サポート一覧のフィルター・ソート条件を localStorage に保存し、
 * 次回アクセス時に同じ条件で表示できるようにする。
 */
import * as constant from '../constant'
import type { AbilityKeywordType, CardType, PlanType, RarityType, UncapType } from '../types/enums'
import * as enums from '../types/enums'

/** localStorage に保存するフィルター設定の形 */
export interface PersistedFilterState {
  /** テキスト検索のキーワード */
  searchTerm: string
  /** 選択中のレアリティ（例: ['r', 'ssr']） */
  rarities: RarityType[]
  /** 選択中のタイプ（例: ['vocal', 'dance']） */
  types: CardType[]
  /** 選択中のプラン */
  plans: PlanType[]
  /** SP のみ表示するかどうか */
  spOnly: boolean
  /** 選択中のアビリティキーワード */
  abilityKeywords: AbilityKeywordType[]
  /** 選択中のイベントフィルター */
  eventFilters: enums.EventFilterType[]
  /** 選択中の凸数 */
  uncaps: UncapType[]
  /** 現在のソートモード */
  sortMode: enums.SortModeType
  /** 逆順で表示するかどうか */
  sortReverse: boolean
}

/** enum値の集合を作り、配列から有効な値だけを抽出する */
function filterValid<T extends string | number>(values: unknown[], valid: Set<T>): T[] {
  return (values as T[]).filter((v) => valid.has(v))
}

// バリデーション用の有効値集合
const VALID_RARITIES = new Set(Object.values(enums.RarityType))
const VALID_TYPES = new Set(Object.values(enums.CardType))
const VALID_PLANS = new Set(Object.values(enums.PlanType))
const VALID_ABILITY_KEYWORDS = new Set(Object.values(enums.AbilityKeywordType))
const VALID_EVENT_FILTERS = new Set(Object.values(enums.EventFilterType))
const VALID_UNCAPS = new Set(Object.values(enums.UncapType))
const VALID_SORT_MODES = new Set(Object.values(enums.SortModeType))

/**
 * localStorage からフィルター設定を読み込む
 * 保存されていなければ null を返す。不正な値はフィルタリングされる。
 *
 * @returns 保存されたフィルター設定、またはnull
 */
export function loadFilterState(): PersistedFilterState | null {
  try {
    const raw = localStorage.getItem(constant.FILTER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>

    return {
      searchTerm: typeof parsed.searchTerm === 'string' ? parsed.searchTerm : '',
      rarities: Array.isArray(parsed.rarities) ? filterValid(parsed.rarities, VALID_RARITIES) : [],
      types: Array.isArray(parsed.types) ? filterValid(parsed.types, VALID_TYPES) : [],
      plans: Array.isArray(parsed.plans) ? filterValid(parsed.plans, VALID_PLANS) : [],
      spOnly: typeof parsed.spOnly === 'boolean' ? parsed.spOnly : false,
      abilityKeywords: Array.isArray(parsed.abilityKeywords)
        ? filterValid(parsed.abilityKeywords, VALID_ABILITY_KEYWORDS)
        : [],
      eventFilters: Array.isArray(parsed.eventFilters) ? filterValid(parsed.eventFilters, VALID_EVENT_FILTERS) : [],
      uncaps: Array.isArray(parsed.uncaps) ? filterValid(parsed.uncaps, VALID_UNCAPS) : [],
      sortMode: VALID_SORT_MODES.has(parsed.sortMode as enums.SortModeType)
        ? (parsed.sortMode as enums.SortModeType)
        : enums.SortModeType.Rarity,
      sortReverse: typeof parsed.sortReverse === 'boolean' ? parsed.sortReverse : false,
    }
  } catch {
    return null
  }
}

/**
 * フィルター設定を localStorage に保存する
 *
 * @param state - 保存するフィルター設定
 */
export function saveFilterState(state: PersistedFilterState): void {
  try {
    localStorage.setItem(constant.FILTER_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ストレージ容量超過等は無視する */
  }
}

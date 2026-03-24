/**
 * カードフィルタリング・ソートの純粋ロジック
 *
 * ユーザーが選んだ検索条件（名前、レアリティ、タイプ、プラン等）でカードを絞り込み、
 * 指定されたソート方法で並び替える。
 * UIの状態に依存しない「純粋関数」として設計されている。
 */
import type { SupportCard } from '../types/card'
import type { AbilityKeywordType, CardType, EventFilterType, PlanType, RarityType, SortModeType, UncapType } from '../types/enums'
import * as data from '../data'
import * as constant from '../constant'
import * as enums from '../types/enums'
import { hasSPAbility, hasAbilityKeyword } from './cardQuery'

/**
 * フィルタリングとソートに必要な全パラメータをまとめた型
 *
 * UIコンポーネントから渡される検索条件やソート設定を1つにまとめている。
 */
interface FilterSortParams {
  /** ユーザーが入力したテキスト検索語（カード名等で部分一致検索） */
  searchTerm: string
  /** 選択されているレアリティ（SSR、SR、R）のセット */
  selectedRarities: Set<RarityType>
  /** 選択されているタイプ（ボーカル、ダンス、ビジュアル、アシスト）のセット */
  selectedTypes: Set<CardType>
  /** 選択されているプラン（センス、ロジック）のセット */
  selectedPlans: Set<PlanType>
  /** SPアビリティ持ちのみ表示するフラグ */
  spOnly: boolean
  /** 選択されているアビリティキーワードのセット */
  selectedAbilityKeywords: Set<AbilityKeywordType>
  /** 選択されているイベント種別フィルターのセット */
  selectedEventFilters: Set<EventFilterType>
  /** 選択されている凸数のセット */
  selectedUncaps: Set<UncapType>
  /** カード名 → 現在の凸数のマッピング（フィルタリング用） */
  cardUncaps: Record<string, UncapType>
  /** カード名 → ソート用凸数のマッピング（ソート条件変更時のみ更新） */
  sortCardUncaps: Record<string, UncapType>
  /** 現在のソートモード（レアリティ順、スコア順、日付順、凸数順） */
  sortMode: SortModeType
  /** ソートを逆順にするかどうか */
  sortReverse: boolean
  /** カード名 → 計算スコアのマッピング（スコアソート用） */
  cardScores: Map<string, number>
}

/**
 * カードが指定されたイベント種別フィルターに一致するか判定する
 *
 * カードが持つイベントのうち、1つでも指定された効果タイプに一致すればtrue。
 *
 * @param card - 判定対象のカード
 * @param filter - チェックするイベントフィルター種別
 * @returns 一致したらtrue
 */
function matchesEventFilter(card: SupportCard, filter: EventFilterType): boolean {
  const effects = data.getEventFilterEffects(filter)
  return card.events.some((e) => effects.includes(e.effect_type))
}

/**
 * アビリティキーワードフィルターの判定（カテゴリ間AND・カテゴリ内OR）
 *
 * アビリティキーワードは2つのカテゴリに分かれている:
 * - パラメータ系（初期パラ、パラボなど）
 * - 効果系（それ以外のキーワード）
 *
 * 同じカテゴリ内で複数選択 → OR（どれか1つあればOK）
 * 異なるカテゴリで選択 → AND（両方のカテゴリで1つ以上マッチ必要）
 *
 * @param card - 判定対象のカード
 * @param keywords - 選択されたキーワードのセット
 * @returns フィルター条件を満たしたらtrue
 */
function matchesAbilityFilter(card: SupportCard, keywords: Set<AbilityKeywordType>): boolean {
  if (keywords.size === 0) return true

  // 選択されたキーワードをカテゴリ別に分ける
  const paramSelected: AbilityKeywordType[] = []
  const effectSelected: AbilityKeywordType[] = []
  for (const kw of keywords) {
    if (data.AbilityCategoryParam.has(kw)) paramSelected.push(kw)
    else effectSelected.push(kw)
  }

  // パラメータ系カテゴリ: 選択されていれば、どれか1つでもマッチする必要がある
  if (paramSelected.length > 0 && !paramSelected.some((kw) => hasAbilityKeyword(card, kw))) return false
  // 効果系カテゴリ: 同様にOR判定
  if (effectSelected.length > 0 && !effectSelected.some((kw) => hasAbilityKeyword(card, kw))) return false
  return true
}

/**
 * イベント種別フィルターの判定（カテゴリ間AND・カテゴリ内OR）
 *
 * イベント種別も2つのカテゴリに分かれている:
 * - 獲得系（スキルカード、Pアイテム）
 * - 操作系（強化、チェンジ、削除など）
 *
 * 同じカテゴリ内 → OR、異なるカテゴリ → AND。
 *
 * @param card - 判定対象のカード
 * @param filters - 選択されたイベントフィルターのセット
 * @returns フィルター条件を満たしたらtrue
 */
function matchesEventTypeFilter(card: SupportCard, filters: Set<EventFilterType>): boolean {
  if (filters.size === 0) return true

  // 選択されたフィルターをカテゴリ別に分ける
  const acquireSelected: EventFilterType[] = []
  const modifySelected: EventFilterType[] = []
  for (const ef of filters) {
    if (data.EventCategoryAcquire.has(ef)) acquireSelected.push(ef)
    else modifySelected.push(ef)
  }

  // 獲得系: 選択されていれば、どれか1つでもマッチする必要がある
  if (acquireSelected.length > 0 && !acquireSelected.some((ef) => matchesEventFilter(card, ef))) return false
  // 操作系: 同様にOR判定
  if (modifySelected.length > 0 && !modifySelected.some((ef) => matchesEventFilter(card, ef))) return false
  return true
}

/**
 * カード一覧に対してフィルタリングとソートを行う
 *
 * 処理の流れ:
 * 1. すべてのフィルター条件を順番にチェックして、条件に合わないカードを除外する
 * 2. 選択されたソートモードに従って並び替える
 * 3. 逆順フラグが立っていれば最後にひっくり返す
 *
 * @param cards - フィルター前の全カード一覧
 * @param params - フィルター＆ソートの条件パラメータ
 * @returns フィルター＆ソート後のカード配列
 */
export function filterAndSortCards(cards: SupportCard[], params: FilterSortParams): SupportCard[] {
  const {
    searchTerm,
    selectedRarities,
    selectedTypes,
    selectedPlans,
    spOnly,
    selectedAbilityKeywords,
    selectedEventFilters,
    selectedUncaps,
    cardUncaps,
    sortCardUncaps,
    sortMode,
    sortReverse,
    cardScores,
  } = params

  // ---- ステップ1: フィルタリング ----
  let result = cards.filter((card) => {
    // テキスト検索: カード名・Pアイテム名・スキルカード名・イベント名のどれかに部分一致
    const term = searchTerm.toLowerCase()
    if (
      term &&
      !card.name.toLowerCase().includes(term) &&
      !(card.p_item?.name && card.p_item.name.toLowerCase().includes(term)) &&
      !(card.skill_card?.name && card.skill_card.name.toLowerCase().includes(term)) &&
      !card.events.some((e) => e.title.toLowerCase().includes(term))
    ) {
      return false
    }

    // 各絞り込み条件をチェック（セットが空＝未選択 → フィルターしない）
    if (selectedRarities.size > 0 && !selectedRarities.has(card.rarity)) return false
    if (selectedTypes.size > 0 && !selectedTypes.has(card.type)) return false
    if (selectedPlans.size > 0 && !selectedPlans.has(card.plan)) return false
    if (spOnly && !hasSPAbility(card)) return false
    if (!matchesAbilityFilter(card, selectedAbilityKeywords)) return false
    if (!matchesEventTypeFilter(card, selectedEventFilters)) return false

    // 凸数フィルター: カードの現在の凸数が選択に含まれているか
    const cardUncap = cardUncaps[card.name] ?? constant.DEFAULT_UNCAP
    if (selectedUncaps.size > 0 && !selectedUncaps.has(cardUncap)) return false
    return true
  })

  // ---- ステップ2: ソート ----
  if (sortMode === enums.SortModeType.Uncap) {
    // 凸数順: 凸数 降順 → レアリティ 降順 → リリース日 降順
    result = [...result].sort((a, b) => {
      const uncapA = sortCardUncaps[a.name] ?? constant.DEFAULT_UNCAP
      const uncapB = sortCardUncaps[b.name] ?? constant.DEFAULT_UNCAP
      if (uncapA !== uncapB) return uncapB - uncapA
      const rarityCompare = data.getRarityEntry(b.rarity).order - data.getRarityEntry(a.rarity).order
      if (rarityCompare !== 0) return rarityCompare
      return b.release_date.localeCompare(a.release_date)
    })
  } else if (sortMode === enums.SortModeType.Score && cardScores.size > 0) {
    // スコア順: スコア 降順 → レアリティ 降順 → 凸数 降順 → リリース日 降順
    result = [...result].sort((a, b) => {
      const scoreCompare = cardScores.get(b.name)! - cardScores.get(a.name)!
      if (scoreCompare !== 0) return scoreCompare
      const rarityCompare = data.getRarityEntry(b.rarity).order - data.getRarityEntry(a.rarity).order
      if (rarityCompare !== 0) return rarityCompare
      const uncapA = sortCardUncaps[a.name] ?? constant.DEFAULT_UNCAP
      const uncapB = sortCardUncaps[b.name] ?? constant.DEFAULT_UNCAP
      if (uncapA !== uncapB) return uncapB - uncapA
      return b.release_date.localeCompare(a.release_date)
    })
  } else if (sortMode === enums.SortModeType.Date) {
    // 日付順: 実装日 降順 → レアリティ 降順 → 凸数 降順
    result = [...result].sort((a, b) => {
      const dateCompare = b.release_date.localeCompare(a.release_date)
      if (dateCompare !== 0) return dateCompare
      const rarityCompare = data.getRarityEntry(b.rarity).order - data.getRarityEntry(a.rarity).order
      if (rarityCompare !== 0) return rarityCompare
      const uncapA = sortCardUncaps[a.name] ?? constant.DEFAULT_UNCAP
      const uncapB = sortCardUncaps[b.name] ?? constant.DEFAULT_UNCAP
      return uncapB - uncapA
    })
  } else {
    // デフォルト（レアリティ順）: レアリティ 降順 → 凸数 降順 → リリース日 降順
    result = [...result].sort((a, b) => {
      const rarityCompare = data.getRarityEntry(b.rarity).order - data.getRarityEntry(a.rarity).order
      if (rarityCompare !== 0) return rarityCompare
      const uncapA = sortCardUncaps[a.name] ?? constant.DEFAULT_UNCAP
      const uncapB = sortCardUncaps[b.name] ?? constant.DEFAULT_UNCAP
      if (uncapA !== uncapB) return uncapB - uncapA
      return b.release_date.localeCompare(a.release_date)
    })
  }

  // ---- ステップ3: 逆順フラグがONなら順序を反転 ----
  if (sortReverse) result.reverse()
  return result
}

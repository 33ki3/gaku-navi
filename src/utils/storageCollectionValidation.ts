/**
 * ブラウザの保存領域に保存される一覧・対応表の形式を確認する処理
 *
 * 単純なオブジェクト判定ではなく、キーと値の組み合わせまで確認する
 */
import * as data from '../data'
import type { PersistedFilterState } from '../types/app'
import type { ScenarioScheduleSelections } from '../types/calculation'
import type { CardCountCustom, CardCustomData } from '../types/card'
import * as enums from '../types/enums'
import { isActionCountRecord, isActionId, isEnumArray, isScheduleSelectionRecord } from './domainValueValidation'
import { isEnumValue, isOptional, isRecord } from './valueValidation'

/**
 * サポート名と凸数の対応が正しいか判定する
 *
 * @param value - 判定する値
 * @returns 全値が有効な凸数なら true
 */
export function isUncapRecord(value: unknown): boolean {
  // カード名の存在確認は計算条件を作る段階で行うため、ここでは凸数の値だけを確認する
  return isRecord(value) && Object.values(value).every((uncap) => isEnumValue(uncap, enums.UncapType))
}

/**
 * シナリオ別のスケジュール選択か判定する
 *
 * @param value - 判定する値
 * @returns シナリオ、週番号、活動IDがすべて有効なら true
 */
export function isScenarioScheduleSelections(value: unknown): value is ScenarioScheduleSelections {
  // シナリオごとの週・活動の対応を、外側と内側に分けて確認する
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([scenario, selections]) => isEnumValue(scenario, enums.ScenarioType) && isScheduleSelectionRecord(selections),
    )
  )
}

/**
 * 一覧の検索・絞り込み・並び順設定か判定する
 *
 * @param value - 判定する値
 * @returns フィルター状態の全項目が正しい場合に true
 */
export function isPersistedFilterState(value: unknown): value is PersistedFilterState {
  // 画面の選択一覧へ変換する前に、フィルター全項目の型と選択肢を確認する
  return (
    isRecord(value) &&
    typeof value.searchTerm === 'string' &&
    isEnumArray(value.rarities, enums.RarityType) &&
    isEnumArray(value.types, enums.CardType) &&
    isEnumArray(value.plans, enums.PlanType) &&
    typeof value.spOnly === 'boolean' &&
    isEnumArray(value.abilityKeywords, enums.AbilityKeywordType) &&
    isEnumArray(value.eventFilters, enums.EventFilterType) &&
    isEnumArray(value.sources, enums.SourceType) &&
    isEnumArray(value.uncaps, enums.UncapType) &&
    isEnumArray(value.countCustom, enums.CountCustomFilter) &&
    isEnumArray(value.cardExclusionFilters, enums.CardExclusionFilterType) &&
    isEnumValue(value.sortMode, enums.SortModeType) &&
    typeof value.sortReverse === 'boolean'
  )
}

/**
 * サポート1枚分の回数調整を検証する
 *
 * @param value - 判定する値
 * @returns 自動カウントとPアイテム回数が正しい場合に true
 */
function isCardCustomData(value: unknown): boolean {
  // 2種類の調整は省略できるが、指定された場合は既知のアクションと安全な回数だけを受け入れる
  return (
    isRecord(value) &&
    isOptional(value.selfTrigger, isActionCountRecord) &&
    isOptional(value.pItemCount, isActionCountRecord)
  )
}

/**
 * サポート名別の回数調整設定か判定する
 *
 * @param value - 判定する値
 * @returns 各サポートのアクション回数が正しい場合に true
 */
export function isCardCountCustom(value: unknown): boolean {
  // 外側のカード名は別途一覧と照合し、ここでは各カードの値構造を確認する
  return isRecord(value) && Object.values(value).every(isCardCustomData)
}

/**
 * 保存済みのサポート別回数調整から、フォームで扱える構造だけを取り出す
 *
 * selfTrigger は点数設定画面に表示されるアクションだけを残す一方、
 * pItemCount はPアイテムの発動条件に使うアクション（Lessonなど）も
 * 正常な値として使うため、ActionIdTypeの範囲だけを確認して保持する
 *
 * @param value - 保存済みの回数調整
 * @returns フォームと計算で扱える回数調整だけを残した値
 */
export function sanitizeCardCountCustom(value: unknown): CardCountCustom {
  // 保存値をそのまま信頼せず、計算・フォームで扱える安全な部分だけを取り出す
  if (!isRecord(value)) return {}

  const visibleActionIds = new Set(data.ActionCategoryList.map(({ id }) => id))
  const sanitized: CardCountCustom = {}
  for (const [cardName, rawCustom] of Object.entries(value)) {
    // 1カード分の不正値をスキップして、他カードの有効な設定は保持する
    if (!isRecord(rawCustom)) continue
    const entry: CardCustomData = {}

    if (isActionCountRecord(rawCustom.selfTrigger)) {
      // 自動カウントは点数設定画面に表示されるアクションだけを残す
      const selfTrigger = Object.fromEntries(
        Object.entries(rawCustom.selfTrigger).filter(
          ([actionId]) => isActionId(actionId) && visibleActionIds.has(actionId),
        ),
      )
      if (Object.keys(selfTrigger).length > 0) entry.selfTrigger = selfTrigger
    }
    if (isActionCountRecord(rawCustom.pItemCount) && Object.keys(rawCustom.pItemCount).length > 0) {
      // Pアイテム側は通常画面にない発動条件も使うため、有効なアクションIDを保持する
      entry.pItemCount = { ...rawCustom.pItemCount }
    }

    // 空のカード名や空の調整は未設定と同じなので、保存値から除外する
    if (Object.keys(entry).length > 0 && cardName.trim() !== '') sanitized[cardName] = entry
  }
  return sanitized
}

/**
 * アビリティキーワードマスタ。
 *
 * アビリティキーワード（初期パラメータ・レッスン・お出かけなど）ごとの
 * 表示ラベル・バッジ略称・トリガーキー対応を一元管理する。
 * フィルター UI、カード一覧バッジ、キーワード検索に使用。
 */

import rawData from './abilityKeyword.json'
import { type AbilityKeywordType, type TriggerKeyType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** アビリティキーワードマスタの1行分 */
interface AbilityKeywordEntry {
  keyword: AbilityKeywordType
  label: TranslationKey
  badge: TranslationKey
  is_param_category: boolean
  triggers: TriggerKeyType[]
}

const entries = rawData as AbilityKeywordEntry[]

/** キーワード→エントリのルックアップマップ */
export const AbilityKeywordMap = new Map<AbilityKeywordType, AbilityKeywordEntry>(entries.map((e) => [e.keyword, e]))

/** アビリティキーワード一覧（表示順でソート済み） */
export const AbilityKeywordList: AbilityKeywordType[] = entries.map((e) => e.keyword)

/** パラメータ系カテゴリに属するキーワード一覧 */
export const AbilityParamKeywords: AbilityKeywordType[] = entries.filter((e) => e.is_param_category).map((e) => e.keyword)

/** 効果系カテゴリ（パラメータ系以外）に属するキーワード一覧 */
export const AbilityEffectKeywords: AbilityKeywordType[] = entries.filter((e) => !e.is_param_category).map((e) => e.keyword)

/** アビリティフィルターの「パラメータ系」カテゴリに属するキーワードセット */
export const AbilityCategoryParam = new Set<AbilityKeywordType>(AbilityParamKeywords)

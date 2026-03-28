/**
 * タイプ表示マスタ。
 *
 * カードタイプ（Vo / Da / Vi / アシスト）ごとの表示ラベル、
 * バッジ色、ストライプ色などのカラー設定を定義する。
 */
import { type CardType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** タイプ表示マスタの1行分。ラベル・色設定をフラットに持つ。 */
export interface TypeDisplayEntry {
  card_type: CardType
  label: TranslationKey
  display_label: TranslationKey
  text: string
  bg: string
  border: string
  badge: string
  stripe: string
  dot: string
}

/** タイプ表示エントリ一覧 */
export const TypeDisplayEntries: readonly TypeDisplayEntry[] = [
  { card_type: 'vocal', label: 'common.type.short.vocal', display_label: 'common.type.vocal', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-500 text-white', stripe: 'border-l-red-500', dot: 'bg-red-500' },
  { card_type: 'dance', label: 'common.type.short.dance', display_label: 'common.type.dance', text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-500 text-white', stripe: 'border-l-blue-500', dot: 'bg-blue-500' },
  { card_type: 'visual', label: 'common.type.short.visual', display_label: 'common.type.visual', text: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-500 text-white', stripe: 'border-l-yellow-500', dot: 'bg-yellow-500' },
  { card_type: 'assist', label: 'common.type.assist', display_label: 'common.type.assist', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-500 text-white', stripe: 'border-l-green-500', dot: 'bg-green-500' },
]

/** タイプフィルター選択肢の型 */
interface TypeFilterEntry {
  label: TranslationKey
  value: CardType
  activeColor: string
}

/** タイプフィルター一覧 */
export const TypeFilterList: TypeFilterEntry[] = TypeDisplayEntries.map((entry) => ({
  label: entry.label,
  value: entry.card_type,
  activeColor: entry.badge,
}))

/**
 * タイプ表示エントリを丸ごと返す。
 *
 * @param type - カードタイプ
 * @returns TypeDisplayEntry オブジェクト
 */
export function getTypeEntry(type: CardType): TypeDisplayEntry {
  return TypeDisplayEntries.find((e) => e.card_type === type)!
}

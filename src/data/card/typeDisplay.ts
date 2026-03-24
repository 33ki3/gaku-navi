/**
 * タイプ表示マスタ。
 *
 * カードタイプ（Vo / Da / Vi / アシスト）ごとの表示ラベル、
 * バッジ色、ストライプ色などのカラー設定を定義する。
 */

import rawData from '../json/typeDisplay.json'
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

const entries = rawData as TypeDisplayEntry[]

/** タイプフィルター選択肢の型 */
interface TypeFilterEntry {
  label: TranslationKey
  value: CardType
  activeColor: string
}

/** タイプフィルター一覧 */
export const TypeFilterList: TypeFilterEntry[] = entries.map((entry) => ({
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
  return entries.find((e) => e.card_type === type)!
}

/**
 * タイプ表示マスタ。
 *
 * サポートタイプ（Vo / Da / Vi / アシスト）ごとの表示ラベル、
 * バッジ色、ストライプ色などのカラー設定を定義する。
 */
import { CardType, ParameterType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** タイプ表示マスタの1行分。ラベル・色設定をフラットに持つ。 */
export interface TypeDisplayEntry {
  cardType: CardType
  label: TranslationKey
  displayLabel: TranslationKey
  /** パラメータタイプ（Assist には対応する軸がないため undefined） */
  parameterType?: ParameterType
  text: string
  bg: string
  border: string
  badge: string
  stripe: string
  dot: string
}

/** タイプ表示エントリ一覧 */
export const TypeDisplayEntries: readonly TypeDisplayEntry[] = [
  {
    cardType: CardType.Vocal,
    label: 'common.type.short.vocal',
    displayLabel: 'common.type.vocal',
    parameterType: ParameterType.Vocal,
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-500 text-white',
    stripe: 'border-l-red-500',
    dot: 'bg-red-500',
  },
  {
    cardType: CardType.Dance,
    label: 'common.type.short.dance',
    displayLabel: 'common.type.dance',
    parameterType: ParameterType.Dance,
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-500 text-white',
    stripe: 'border-l-blue-500',
    dot: 'bg-blue-500',
  },
  {
    cardType: CardType.Visual,
    label: 'common.type.short.visual',
    displayLabel: 'common.type.visual',
    parameterType: ParameterType.Visual,
    text: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-500 text-white',
    stripe: 'border-l-yellow-500',
    dot: 'bg-yellow-500',
  },
  {
    cardType: CardType.Assist,
    label: 'common.type.assist',
    displayLabel: 'common.type.assist',
    text: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-500 text-white',
    stripe: 'border-l-green-500',
    dot: 'bg-green-500',
  },
]

/**
 * タイプ表示エントリを丸ごと返す。
 *
 * @param type - サポートタイプ
 * @returns TypeDisplayEntry オブジェクト
 */
export function getTypeEntry(type: CardType): TypeDisplayEntry {
  return TypeDisplayEntries.find((e) => e.cardType === type)!
}

/** 最適編成で選択可能なタイプ一覧（Assist を除外、parameterType 必須） */
export const SelectableTypeEntries = TypeDisplayEntries.filter(
  (e): e is TypeDisplayEntry & { parameterType: ParameterType } => e.parameterType !== undefined,
)

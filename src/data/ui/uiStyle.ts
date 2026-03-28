/**
 * UI コンポーネントスタイルマスタデータ。
 *
 * 全コンポーネントのスタイル定義を uiStyle.json に統合し、
 * セクション別のアクセサ関数を提供する。
 */
import rawData from './uiStyle.json'
import {
  type ParameterType,
  type ModalAlignType,
  type UncapSelectorVariantType,
  type FilterButtonCategory,
  type BadgeSizeType,
  type BadgeWeightType,
  type CollapsibleVariantType,
  type ButtonSizeType,
} from '../../types/enums'

/** CloseButton のサイズスタイル */
interface CloseButtonSizeStyle {
  button: string
  icon: string
}

/** 凸数セレクタ―のスタイル（gap + ボタン） */
interface UncapSelectorStyle {
  gap: string
  button: string
}

/** ボタンサイズのスタイル一式（閉じるボタン・アイコン・トグル） */
interface ButtonSizeStyle {
  close_button: string
  close_icon: string
  toggle: string
}

/** バッジのスタイル（サイズとウェイト） */
interface BadgeStyle {
  size: Record<BadgeSizeType, string>
  weight: Record<BadgeWeightType, string>
}

/** タブのスタイル（アクティブ・非アクティブ） */
interface TabStyle {
  active: string
  inactive: string
}

const data = rawData as {
  parameter_text_color: Record<ParameterType, string>
  modal_style: Record<ModalAlignType, string>
  uncap_selector_style: Record<UncapSelectorVariantType, UncapSelectorStyle>
  filter_button_style: Record<FilterButtonCategory, string>
  badge_style: BadgeStyle
  collapsible_style: Record<CollapsibleVariantType, string>
  button_style: Record<ButtonSizeType, ButtonSizeStyle>
  tab_style: TabStyle
}

/**
 * パラメータ属性に対応するテキスト色クラスを返す。
 *
 * @param parameter - パラメータ属性
 * @returns Tailwind CSS テキスト色クラス文字列
 */
export function getParameterTextColor(parameter: ParameterType): string {
  return data.parameter_text_color[parameter]
}

/**
 * ModalOverlay 配置に対応する Tailwind CSS クラスを返す。
 *
 * @param align - モーダルの配置種別
 * @returns Tailwind CSS クラス文字列
 */
export function getModalAlignClass(align: ModalAlignType): string {
  return data.modal_style[align]
}

/**
 * UncapSelector バリアントに対応するスタイルを返す。
 *
 * @param variant - セレクターのバリアント種別
 * @returns gap とボタンの Tailwind CSS クラス
 */
export function getUncapSelectorVariantStyle(variant: UncapSelectorVariantType): UncapSelectorStyle {
  return data.uncap_selector_style[variant]
}

/**
 * フィルターボタンカテゴリに対応する Tailwind CSS クラスを返す。
 *
 * @param category - フィルターボタンのカテゴリ
 * @returns Tailwind CSS クラス文字列
 */
export function getFilterButtonStyle(category: FilterButtonCategory): string {
  return data.filter_button_style[category]
}

/**
 * Badge サイズに対応する Tailwind CSS クラスを返す。
 *
 * @param size - Badge のサイズ種別
 * @returns Tailwind CSS クラス文字列
 */
export function getBadgeSizeStyle(size: BadgeSizeType): string {
  return data.badge_style.size[size]
}

/**
 * Badge ウェイトに対応するフォントクラスを返す。
 *
 * @param weight - Badge のフォントウェイト種別
 * @returns Tailwind CSS フォントクラス文字列
 */
export function getBadgeWeightClass(weight: BadgeWeightType): string {
  return data.badge_style.weight[weight]
}

/**
 * CollapsibleSection バリアントに対応するボタンクラスを返す。
 *
 * @param variant - 折りたたみセクションのバリアント
 * @returns Tailwind CSS クラス文字列
 */
export function getCollapsibleVariantClass(variant: CollapsibleVariantType): string {
  return data.collapsible_style[variant]
}

/**
 * CloseButton サイズに対応するスタイルを返す。
 *
 * @param size - ボタンのサイズ種別
 * @returns ボタン本体とアイコンの Tailwind CSS クラス
 */
export function getCloseButtonSizeStyle(size: ButtonSizeType): CloseButtonSizeStyle {
  const entry = data.button_style[size]
  return { button: entry.close_button, icon: entry.close_icon }
}

/**
 * ToggleButton サイズに対応する Tailwind CSS クラスを返す。
 *
 * @param size - ボタンのサイズ種別
 * @returns Tailwind CSS クラス文字列
 */
export function getToggleButtonSizeStyle(size: ButtonSizeType): string {
  return data.button_style[size].toggle
}

/**
 * タブボタンの active/inactive に応じたスタイルを返す。
 *
 * @param active - タブが選択中かどうか
 * @returns Tailwind CSS クラス文字列
 */
export function getTabStyle(active: boolean): string {
  return active ? data.tab_style.active : data.tab_style.inactive
}

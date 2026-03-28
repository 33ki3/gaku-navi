/**
 * UI コンポーネントスタイルマスタデータ。
 *
 * 全コンポーネントのスタイル定義を統合し、
 * セクション別のアクセサ関数を提供する。
 */
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

const data: {
  parameter_text_color: Record<ParameterType, string>
  modal_style: Record<ModalAlignType, string>
  uncap_selector_style: Record<UncapSelectorVariantType, UncapSelectorStyle>
  filter_button_style: Record<FilterButtonCategory, string>
  badge_style: BadgeStyle
  collapsible_style: Record<CollapsibleVariantType, string>
  button_style: Record<ButtonSizeType, ButtonSizeStyle>
  tab_style: TabStyle
} = {
  parameter_text_color: {
    vocal: 'text-red-500',
    dance: 'text-blue-500',
    visual: 'text-yellow-500',
  },
  modal_style: {
    center: 'items-center justify-center',
    end: 'justify-end',
  },
  uncap_selector_style: {
    compact: { gap: 'gap-1', button: 'px-2 py-0.5 rounded text-[10px] font-bold' },
    detail: { gap: 'gap-2', button: 'px-4 py-1.5 rounded-lg text-sm font-bold' },
  },
  filter_button_style: {
    active: 'bg-slate-700 text-white shadow border border-transparent',
    inactive: 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200',
    ability_param: 'bg-indigo-500 text-white shadow border border-transparent',
    ability_effect: 'bg-purple-500 text-white shadow border border-transparent',
    event_acquire: 'bg-teal-500 text-white shadow border border-transparent',
    event_modify: 'bg-cyan-600 text-white shadow border border-transparent',
  },
  badge_style: {
    size: {
      sm: 'px-1.5 py-0.5 rounded-full text-[9px]',
      md: 'px-2 py-0.5 rounded text-[10px]',
      md_rounded: 'px-2 py-0.5 rounded-full text-[10px]',
    },
    weight: {
      bold: 'font-bold',
      black: 'font-black',
    },
  },
  collapsible_style: {
    modal: 'flex items-center gap-1.5 w-full text-left text-xs font-black text-slate-400 uppercase tracking-widest mb-3 hover:text-slate-600 transition-colors',
    panel: 'flex items-center gap-1.5 w-full text-left text-xs font-black text-slate-500 uppercase tracking-widest py-1 hover:text-slate-700 transition-colors',
  },
  button_style: {
    sm: {
      close_button: 'text-slate-400 hover:text-slate-600',
      close_icon: 'w-3.5 h-3.5',
      toggle: 'px-2 py-1 text-xs',
    },
    md: {
      close_button: 'w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 text-slate-500',
      close_icon: 'w-4 h-4',
      toggle: 'px-3 py-1 text-xs',
    },
    lg: {
      close_button: 'w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 text-slate-500',
      close_icon: 'w-5 h-5',
      toggle: 'px-4 py-1.5 text-xs',
    },
  },
  tab_style: {
    active: 'text-sm font-black pb-2 border-b-2 transition-colors text-slate-800 border-slate-800',
    inactive: 'text-sm font-black pb-2 border-b-2 transition-colors text-slate-400 border-transparent hover:text-slate-500',
  },
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

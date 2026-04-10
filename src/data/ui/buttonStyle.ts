/**
 * ボタンスタイルマスタ。
 *
 * CloseButton / ToggleButton / FilterButton のサイズ・状態に対応する
 * スタイルクラスを提供する。
 */
import { ButtonSizeType, FilterButtonCategory } from '../../types/enums'

/** CloseButton のサイズスタイル */
interface CloseButtonSizeStyle {
  button: string
  icon: string
}

/** ボタンサイズのスタイル一式（閉じるボタン・アイコン・トグル） */
interface ButtonSizeStyle {
  closeButton: string
  closeIcon: string
  toggle: string
}

const buttonStyle: Record<ButtonSizeType, ButtonSizeStyle> = {
  [ButtonSizeType.Sm]: {
    closeButton: 'text-slate-400 hover:text-slate-600',
    closeIcon: 'w-3.5 h-3.5',
    toggle: 'px-2 py-1 text-xs',
  },
  [ButtonSizeType.Md]: {
    closeButton: 'w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 text-slate-500',
    closeIcon: 'w-4 h-4',
    toggle: 'px-3 py-1 text-xs',
  },
  [ButtonSizeType.Lg]: {
    closeButton: 'w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 text-slate-500',
    closeIcon: 'w-5 h-5',
    toggle: 'px-4 py-1.5 text-xs',
  },
}

const filterButtonStyle: Record<FilterButtonCategory, string> = {
  [FilterButtonCategory.Active]: 'bg-slate-700 text-white shadow border border-transparent',
  [FilterButtonCategory.Inactive]: 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200',
  [FilterButtonCategory.AbilityParam]: 'bg-indigo-500 text-white shadow border border-transparent',
  [FilterButtonCategory.AbilityEffect]: 'bg-purple-500 text-white shadow border border-transparent',
  [FilterButtonCategory.EventAcquire]: 'bg-teal-500 text-white shadow border border-transparent',
  [FilterButtonCategory.EventModify]: 'bg-cyan-600 text-white shadow border border-transparent',
  [FilterButtonCategory.Source]: 'bg-green-600 text-white shadow border border-transparent',
}

/**
 * CloseButton サイズに対応するスタイルを返す。
 *
 * @param size - ボタンのサイズ種別
 * @returns ボタン本体とアイコンの Tailwind CSS クラス
 */
export function getCloseButtonSizeStyle(size: ButtonSizeType): CloseButtonSizeStyle {
  const entry = buttonStyle[size]
  return { button: entry.closeButton, icon: entry.closeIcon }
}

/**
 * ToggleButton サイズに対応する Tailwind CSS クラスを返す。
 *
 * @param size - ボタンのサイズ種別
 * @returns Tailwind CSS クラス文字列
 */
export function getToggleButtonSizeStyle(size: ButtonSizeType): string {
  return buttonStyle[size].toggle
}

/**
 * フィルターボタンカテゴリに対応する Tailwind CSS クラスを返す。
 *
 * @param category - フィルターボタンのカテゴリ
 * @returns Tailwind CSS クラス文字列
 */
export function getFilterButtonStyle(category: FilterButtonCategory): string {
  return filterButtonStyle[category]
}

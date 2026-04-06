/**
 * セクション・タブ・セレクタースタイルマスタ。
 *
 * CollapsibleSection / Tab / UncapSelector のバリアントに対応する
 * スタイルクラスを提供する。
 */
import { CollapsibleVariantType, UncapSelectorVariantType } from '../../types/enums'

/** 凸数セレクタ―のスタイル（gap + ボタン） */
interface UncapSelectorStyle {
  gap: string
  button: string
}

/** タブのスタイル（アクティブ・非アクティブ） */
interface TabStyle {
  active: string
  inactive: string
}

const collapsibleStyle: Record<CollapsibleVariantType, string> = {
  [CollapsibleVariantType.Modal]:
    'flex items-center gap-1.5 w-full text-left text-xs font-black text-slate-500 uppercase tracking-widest mb-3 hover:text-slate-600 transition-colors',
  [CollapsibleVariantType.Panel]:
    'flex items-center gap-1.5 w-full text-left text-xs font-black text-slate-500 uppercase tracking-widest py-1 hover:text-slate-700 transition-colors',
}

const uncapSelectorStyle: Record<UncapSelectorVariantType, UncapSelectorStyle> = {
  [UncapSelectorVariantType.Compact]: {
    gap: 'gap-1 flex-nowrap',
    button:
      'flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5 rounded text-[10px] font-bold whitespace-nowrap text-center',
  },
  [UncapSelectorVariantType.Detail]: {
    gap: 'gap-2 flex-nowrap',
    button: 'px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap',
  },
}

const tabStyle: TabStyle = {
  active: 'text-sm font-black pb-2 border-b-2 transition-colors text-slate-800 border-slate-800',
  inactive:
    'text-sm font-black pb-2 border-b-2 transition-colors text-slate-500 border-transparent hover:text-slate-600',
}

/**
 * CollapsibleSection バリアントに対応するボタンクラスを返す。
 *
 * @param variant - 折りたたみセクションのバリアント
 * @returns Tailwind CSS クラス文字列
 */
export function getCollapsibleVariantClass(variant: CollapsibleVariantType): string {
  return collapsibleStyle[variant]
}

/**
 * UncapSelector バリアントに対応するスタイルを返す。
 *
 * @param variant - セレクターのバリアント種別
 * @returns gap とボタンの Tailwind CSS クラス
 */
export function getUncapSelectorVariantStyle(variant: UncapSelectorVariantType): UncapSelectorStyle {
  return uncapSelectorStyle[variant]
}

/**
 * タブボタンの active/inactive に応じたスタイルを返す。
 *
 * @param active - タブが選択中かどうか
 * @returns Tailwind CSS クラス文字列
 */
export function getTabStyle(active: boolean): string {
  return active ? tabStyle.active : tabStyle.inactive
}

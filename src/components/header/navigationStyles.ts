/**
 * ヘッダーとモバイルナビゲーションで共有するスタイル定数。
 *
 * 同じ役割のボタンが表示場所によってずれないよう、状態色と
 * 繰り返し使うレイアウトをこのファイルで一元管理する
 */

/**
 * 選択されていないモバイルナビゲーション項目。境界線を確保して
 * 選択時のサイズ変化を防ぐ
 */
export const INACTIVE_MOBILE_ITEM_CLASS =
  'border border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'

/** モバイル下部ナビゲーションのボタン */
export const MOBILE_NAV_BUTTON_CLASS =
  'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-bold transition-colors'

/** PCヘッダーのタイル型ボタン */
export const HEADER_TILE_CLASS =
  'flex h-11 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-0.5 text-[9px] font-bold leading-tight transition-colors lg:w-16'

/** PCヘッダーのタイル型ボタン内アイコン */
export const HEADER_TILE_ICON_CLASS = 'h-4 w-4 shrink-0'

/** スマホ右上メニューの項目 */
export const MOBILE_HEADER_MENU_ITEM_CLASS =
  'flex w-full items-center gap-2 px-4 py-2 text-xs font-bold transition-colors'

/** 「その他」メニューの共通項目 */
export const MORE_MENU_ITEM_CLASS =
  'flex w-full items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50'

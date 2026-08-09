/**
 * データ管理モーダル専用のスタイル定数。
 *
 * 同じ役割のボタンで見た目がずれないように、共通部分と用途ごとの差分を一か所で管理する。
 */
import * as constant from '../../../constant'

/** データ管理モーダルのパネル */
export const MODAL_PANEL = `relative flex ${constant.MODAL_PANEL_SIZE} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`

/** モーダル内のアクションボタンに共通するスタイル */
const ACTION_BUTTON_BASE = 'flex items-center justify-center rounded-xl text-xs font-bold transition-colors'

/** 黒色のファイル選択ボタン */
export const FILE_IMPORT_BUTTON = `${ACTION_BUTTON_BASE} min-h-11 gap-2 bg-slate-900 px-4 py-2.5 text-white hover:bg-slate-800`

/** 青色のファイル出力ボタン */
export const FILE_EXPORT_BUTTON = `${ACTION_BUTTON_BASE} min-h-11 gap-2 bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700`

/** JSON文字列を表示・編集する入力欄 */
export const JSON_TEXTAREA =
  'h-[min(60dvh,32rem)] min-h-80 w-full resize-none rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-100 outline-none transition-shadow focus:ring-2 focus:ring-blue-500'

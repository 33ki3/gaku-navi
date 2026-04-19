/**
 * 共通 Tailwind CSS クラス定数。
 *
 * アプリ全体で使いまわすボタン・バッジ・モーダル・入力などの
 * Tailwind CSS クラス文字列をまとめたファイル。デザイン変更時に
 * 1 箇所だけ直せば全箇所に反映される。
 */

/** フィルターセクションラベル（10px） */
export const FILTER_SECTION_LABEL = 'text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5'

/** セクション見出し（小・パディング付き） */
export const SECTION_HEADING_SM_PX = 'text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 px-1'

/** テキスト入力（小、角丸XL） */
export const INPUT_TEXT_XS =
  'block w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-xl bg-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-[border-color,box-shadow] text-xs'

/** アクションボタン（白背景、小テキスト） */
export const BTN_HEADER_ACTION = 'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors'

/** アクションボタン（青塗り、小テキスト） */
export const BTN_ACTION_PRIMARY =
  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors whitespace-nowrap'

/** アクションボタン（ダーク塗り、小テキスト） */
export const BTN_ACTION_DARK =
  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors whitespace-nowrap'

/** サポートアイテム外枠（stripe色は動的付与） */
export const CARD_ITEM_CONTAINER =
  'relative flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-[box-shadow,transform] duration-150 cursor-pointer group'

/** サポート スコア行 */
export const CARD_SCORE_ROW =
  'pt-1 pb-0.5 -mx-2 -mb-0.5 px-2 border-t border-slate-100 flex items-center gap-1 cursor-pointer hover:bg-slate-50 transition-colors rounded-b-xl overflow-x-auto scrollbar-none'

/** ピン固定パネル */
export const PANEL_PINNED =
  'fixed right-0 top-0 bottom-0 w-full md:w-96 bg-white shadow-2xl z-40 overflow-y-auto border-l border-slate-200'

/** ピン固定パネル（2枚目・左側） */
export const PANEL_PINNED_SECOND =
  'fixed right-96 top-0 bottom-0 w-full md:w-96 bg-white shadow-2xl z-30 overflow-y-auto border-l border-slate-200'

/** オーバーレイパネル */
export const PANEL_OVERLAY = 'relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-in-right'

/** ドロップダウンパネル */
export const DROPDOWN_PANEL =
  'absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50'

/** アビリティバッジ（グリッドサポート用） */
export const BADGE_ABILITY_GRID =
  'px-1 py-0.5 rounded-full text-[8px] font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap shrink-0'

/** フィルターグループ間の縦線 */
export const FILTER_SEPARATOR = 'w-px h-5 bg-slate-200'

/** セクション区切り（上罫線 + 上余白） */
export const SECTION_DIVIDER = 'border-t border-slate-200 pt-3'

/** ユーザーフォーム：セクション区切り（上罫線 + 上下余白） */
export const USER_FORM_SECTION_DIVIDER = 'border-t border-slate-200 pt-4 mt-4'

/** トグルボタン: 非活性状態 */
export const BTN_TOGGLE_INACTIVE = 'bg-slate-100 text-slate-600 hover:bg-slate-200'

/** トグルボタン: 活性状態 */
export const BTN_TOGGLE_ACTIVE = 'bg-slate-900 text-white'

/** ボタン: 無効状態 */
export const BTN_DISABLED = 'bg-slate-50 text-slate-300 cursor-not-allowed'

/** 入力: ロック状態（自動設定中） */
export const INPUT_LOCKED = 'bg-blue-50 border-blue-200 text-blue-600 cursor-not-allowed'

/** モーダル背景オーバーレイ */
export const MODAL_BACKDROP = 'absolute inset-0 bg-black/40 backdrop-blur-sm'

/** モーダル白パネル（サポート詳細用） */
export const MODAL_PANEL_DETAIL = 'relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full h-[90%] overflow-y-auto'

/** モーダル白パネル（スコア内訳用） */
export const MODAL_PANEL_SCORE =
  'relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80%] flex flex-col overflow-hidden'

/** モーダル白パネル（フィルタ・ソート用） */
export const MODAL_PANEL_FILTER =
  'relative bg-white rounded-2xl shadow-2xl max-w-md w-full h-[85%] flex flex-col overflow-hidden'

/** モーダル白パネル（ユーザーカード登録・編集用） */
export const MODAL_PANEL_USER_CARD =
  'relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90%] flex flex-col overflow-hidden'

/** SpinnerInput: +/- ボタン（通常時） */
export const SPINNER_BTN = 'w-6 h-6 flex items-center justify-center rounded text-xs font-bold'

/** SpinnerInput: 数値入力欄（通常時） */
export const SPINNER_INPUT =
  'w-12 text-center text-xs border rounded py-1 focus:outline-none focus:ring-1 focus:ring-blue-500'

/** チェックボックス入力 */
export const CHECKBOX_INPUT = 'w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600'

/** セクションラベル（フォーム用） */
export const FORM_SECTION_LABEL = 'text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5'

/** SSR のバッジグラデーション */
export const RARITY_COLOR_SSR = 'bg-gradient-to-r from-rose-400 via-amber-300 to-sky-400 text-white'

/** SR のバッジグラデーション */
export const RARITY_COLOR_SR = 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white'

/** R のバッジグラデーション */
export const RARITY_COLOR_R = 'bg-gradient-to-r from-slate-300 to-slate-400 text-white'

/** ユーザーフォーム：セクションラベル（12px・太字・スレートグレー） */
export const USER_FORM_SECTION_LABEL = 'text-xs font-bold text-slate-600 mb-1'

/** ユーザーフォーム：テキスト入力（14px角丸） */
export const USER_FORM_INPUT =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

/** ユーザーフォーム：セレクト・小入力（12px角丸） */
export const USER_FORM_SELECT =
  'w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500'

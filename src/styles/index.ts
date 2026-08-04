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
export const BTN_HEADER_ACTION =
  'flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-bold transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1'

/** サポートアイテム外枠（stripe色は動的付与） */
export const CARD_ITEM_CONTAINER =
  'relative flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-[box-shadow,transform] duration-150 cursor-pointer group'

/** サポート スコア行 */
export const CARD_SCORE_ROW =
  'pt-1 pb-0.5 -mx-2 -mb-0.5 px-2 border-t border-slate-100 flex items-center gap-1 cursor-pointer hover:bg-slate-50 transition-colors rounded-b-xl overflow-x-auto scrollbar-none'

/** ピン固定パネル */
export const PANEL_PINNED =
  'fixed right-0 top-[var(--app-header-height,4rem)] bottom-0 w-full md:w-96 bg-white shadow-2xl z-40 overflow-y-auto border-l border-slate-200'

/** ピン固定パネル（2枚目・左側） */
export const PANEL_PINNED_SECOND =
  'fixed right-96 top-[var(--app-header-height,4rem)] bottom-0 w-full md:w-96 bg-white shadow-2xl z-30 overflow-y-auto border-l border-slate-200'

/** オーバーレイパネル */
export const PANEL_OVERLAY = 'relative w-full max-w-md bg-white shadow-2xl overflow-y-auto'

/** 内容更新時にブラウザがスクロール位置を自動補正しないパネル */
export const PANEL_SCROLL_STABLE = '[overflow-anchor:none]'

/** サイドパネル共通ヘッダー（アプリヘッダーと同じ高さ） */
export const PANEL_HEADER =
  'sticky top-0 z-10 h-[var(--app-header-height,3.5rem)] border-b border-slate-200 bg-white px-2'

/** サイドパネル共通ヘッダー内側 */
export const PANEL_HEADER_INNER = 'flex h-full items-center justify-between pl-3'

/** サイドパネル共通の閉じるボタン（44pxの押下領域） */
export const PANEL_HEADER_CLOSE = '!h-11 !w-11 hover:bg-slate-100'

/** アビリティバッジ（グリッドサポート用） */
export const BADGE_ABILITY_GRID =
  'px-1 py-0.5 rounded-full text-[8px] font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap shrink-0'

/** フィルターグループ間の縦線 */
export const FILTER_SEPARATOR = 'w-px h-5 bg-slate-200'

/** セクション区切り（上罫線 + 上余白） */
export const SECTION_DIVIDER = 'border-t border-slate-200 pt-3'

/** 最適編成設定の入力エラー表示 */
export const UNIT_SETTINGS_WARNING_TEXT = 'mt-1 text-[10px] font-bold text-red-500'

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

/** 共通モーダル外枠サイズ */
export const MODAL_PANEL_SIZE = 'h-[min(88dvh,44rem)] w-full max-w-2xl'

/** 確認ダイアログの背景レイヤー */
export const CONFIRMATION_OVERLAY =
  'absolute inset-0 z-[70] flex items-center justify-center rounded-2xl bg-slate-950/25 p-5 backdrop-blur-sm'

/** 確認ダイアログの白いパネル */
export const CONFIRMATION_PANEL = 'w-full max-w-sm rounded-2xl border bg-white p-5 shadow-2xl'

/** 確認ダイアログの通常タイトル */
export const CONFIRMATION_NORMAL_TITLE = 'text-slate-900'

/** 確認ダイアログの通常メッセージ */
export const CONFIRMATION_NORMAL_MESSAGE = 'text-slate-600'

/** 確認ダイアログの通常パネル */
export const CONFIRMATION_NORMAL_PANEL = 'border-slate-200'

/** 確認ダイアログの警告タイトル */
export const CONFIRMATION_DANGER_TITLE = 'text-red-700'

/** 確認ダイアログの警告メッセージ */
export const CONFIRMATION_DANGER_MESSAGE = 'text-red-600'

/** 確認ダイアログの警告パネル */
export const CONFIRMATION_DANGER_PANEL = 'border-red-200'

/** 確認ダイアログの主要・補助ボタン */
export const CONFIRMATION_PRIMARY_BUTTON =
  'flex min-h-10 items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700'
/** 確認ダイアログのキャンセル・補助ボタン */
export const CONFIRMATION_SECONDARY_BUTTON =
  'flex min-h-10 items-center justify-center rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200'

/** モーダル白パネル（サポート詳細用） */
export const MODAL_PANEL_DETAIL = `relative ${MODAL_PANEL_SIZE} overflow-y-auto rounded-2xl bg-white shadow-2xl`

/** モーダル白パネル（スコア内訳用） */
export const MODAL_PANEL_SCORE = `relative ${MODAL_PANEL_SIZE} flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`

/** モーダル白パネル（フィルタ・ソート用） */
export const MODAL_PANEL_FILTER = `relative ${MODAL_PANEL_SIZE} flex flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-slate-900/5`

/** モーダル白パネル（ユーザーカード登録・編集用） */
export const MODAL_PANEL_USER_CARD = `relative ${MODAL_PANEL_SIZE} flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`

/** モーダル白パネル（オプション用） */
export const MODAL_PANEL_OPTIONS = `relative flex ${MODAL_PANEL_SIZE} max-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`

/** SpinnerInput: +/- ボタン（通常時） */
export const SPINNER_BTN = 'w-6 h-6 flex items-center justify-center rounded text-xs font-bold'

/** SpinnerInput: 数値入力欄（通常時） */
export const SPINNER_INPUT =
  'w-12 text-center text-xs border rounded py-1 focus:outline-none focus:ring-1 focus:ring-blue-500'

/** チェックボックス入力 */
export const CHECKBOX_INPUT = 'w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600'

/** 適用中の絞り込み件数を表示する共通バッジ */
export const FILTER_COUNT_BADGE =
  'inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black leading-none text-white shadow-sm ring-2 ring-white'

/**
 * ヘッダーと下部メニューで共通の選択中状態。境界線幅を固定してサイズ変化を防ぐ
 */
export const NAV_ITEM_ACTIVE = 'border border-transparent bg-blue-50 text-blue-700 hover:bg-blue-100'

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
  'min-w-0 max-w-full w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500'

/** アプリのルートで使う基本スタイル */
export const PAGE_ROOT = 'min-h-screen bg-[#f8fafc] font-sans text-slate-900 md:pb-0'

/** スマホ下部メニューを表示するときの本文下余白 */
export const PAGE_WITH_MOBILE_NAV = 'pb-20'

/** スマホ下部メニューを表示しないときの本文下余白 */
export const PAGE_WITHOUT_MOBILE_NAV = 'pb-0'

/** 固定パネルがないときの本文最大幅 */
export const CONTENT_DEFAULT_WIDTH = 'max-w-7xl'

/** 1枚の固定パネルを避ける本文右余白 */
export const CONTENT_ONE_PANEL_OFFSET = 'md:pr-96'

/** 2枚の固定パネルを避ける本文右余白 */
export const CONTENT_TWO_PANEL_OFFSET = 'md:pr-[48rem]'

/** 1枚の固定パネルを避けるモーダル右位置 */
export const MODAL_ONE_PANEL_OFFSET = 'md:right-96'

/** 2枚の固定パネルを避けるモーダル右位置 */
export const MODAL_TWO_PANEL_OFFSET = 'md:right-[48rem]'

/** 固定パネル表示中の本文左右余白 */
export const CONTENT_COMPACT_PADDING = 'md:px-3 xl:px-8'

/** 手動編成の選択完了バー */
export const MANUAL_SELECTION_BAR =
  'fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-blue-600 px-5 py-3 text-white shadow-lg md:bottom-[max(1rem,env(safe-area-inset-bottom))]'

/** スマホ下部メニューを避ける選択完了バー位置 */
export const MANUAL_SELECTION_WITH_NAV = 'bottom-[calc(5rem+env(safe-area-inset-bottom))]'

/** スマホ下部メニューがないときの選択完了バー位置 */
export const MANUAL_SELECTION_WITHOUT_NAV = 'bottom-[max(1rem,env(safe-area-inset-bottom))]'

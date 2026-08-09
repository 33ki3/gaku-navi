/**
 * アプリ全体の表示設定に関する型定義
 */

/** 画面全体に適用するユーザー設定 */
export interface AppPreferences {
  /** スマホ画面で下部メニューを表示するか */
  showMobileBottomNav: boolean
  /** スクロール中もスマホ下部メニューを固定表示するか */
  keepMobileBottomNavFixed: boolean
}

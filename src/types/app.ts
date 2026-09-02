/**
 * アプリ全体の表示設定に関する型定義
 */
import type { CardListInteractionModeType } from './enums'

/** 画面全体に適用するユーザー設定 */
export interface AppPreferences {
  /** スマホ画面で下部メニューを表示するか */
  showMobileBottomNav: boolean
  /** スクロール中もスマホ下部メニューを固定表示するか */
  keepMobileBottomNavFixed: boolean
}

/** サポート一覧の相互排他モードと切り替え操作 */
export interface CardListModeController {
  /** 現在の操作モード */
  mode: CardListInteractionModeType
  /** 手動選択モードを開始または終了する */
  setManualSelection: (enabled: boolean) => void
  /** 手動選択を完了する */
  finishManualSelection: () => void
  /** 除外設定モードを開始または終了する */
  toggleExclusion: () => void
}

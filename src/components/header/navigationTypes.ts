/**
 * ヘッダーとモバイルナビゲーションで共有する型定義。
 *
 * 表示状態と操作を機能単位でまとめ、コンポーネント間で多数の
 * boolean・コールバックを個別に受け渡さずに済むようにする
 */

/** 「その他」メニューから実行できる操作 */
export interface MoreMenuActions {
  /** ユーザーサポート追加画面を開く */
  openUserCardForm: () => void
  /** データ管理モーダルを開く */
  openDataManagement: () => void
  /** オプション画面を開く */
  openOptions: () => void
  /** ヘルプ画面を開く */
  openHelp: () => void
  /** このサイトについての画面を開く */
  openAbout: () => void
}

/** モバイルから開く設定パネル1つ分の状態と操作 */
export interface MobilePanelNavigationItem {
  /** パネルが現在表示されているか */
  active: boolean
  /** パネルがPC表示で固定されているか */
  pinned: boolean
  /** パネルを開く */
  open: () => void
}

/** 点数設定・最適編成パネルのモバイルナビゲーション情報 */
export interface MobilePanelNavigation {
  /** 点数設定パネル */
  scoreSettings: MobilePanelNavigationItem
  /** 最適編成パネル */
  simulator: MobilePanelNavigationItem
}

/** モバイルの絞り込み・並び替えボタンに必要な情報 */
export interface MobileFilterNavigation {
  /** ボタンに表示する現在の並び順 */
  label: string
  /** 適用中の絞り込み件数 */
  count: number
  /** 並び順が昇順か */
  sortReverse: boolean
  /** 絞り込み・並び替え画面を開く */
  open: () => void
}

/** モバイル下部ナビゲーションの表示設定 */
export interface MobileBottomNavigationPreferences {
  /** 下部ナビゲーションを表示するか */
  show: boolean
  /** スクロール時も下部ナビゲーションを固定するか */
  keepFixed: boolean
}

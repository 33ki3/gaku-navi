/**
 * データ管理モーダル内で共有する型。
 *
 * 状態管理フックと表示コンポーネントの受け渡しを明示し、個々のコンポーネントに処理の詳細を持ち込まないために使用する。
 */
import type { ChangeEvent, RefObject } from 'react'
import type { ExportKey } from '../../../data/ui'
import * as enums from '../../../types/enums'
import type { ImportPreview } from '../../../utils/exportImport'

/** 操作結果としてモーダルに表示するメッセージ */
export interface DataManagementMessage {
  /** 利用者に表示する文章 */
  text: string
  /** 成功・失敗に応じた表示種別 */
  type: enums.DataManagementMessageType
  /** メッセージを表示する操作セクション */
  section: enums.DataManagementSectionKey
}

/** 確認ポップアップに保持する検証済みインポートデータ */
export interface PendingImport {
  /** 保存前に検証したデータ */
  preview: ImportPreview
  /** 結果メッセージを表示するセクション */
  section: enums.DataManagementSectionKey
}

/** データ管理モーダルの状態と操作 */
export interface DataManagementController {
  /** モーダルが開いているか */
  isOpen: boolean
  /** 保存項目の選択セクションが開いているか */
  isSelectionSectionOpen: boolean
  /** ファイルセクションが開いているか */
  isFileSectionOpen: boolean
  /** JSONセクションが開いているか */
  isJsonSectionOpen: boolean
  /** JSON入力欄に表示する文字列 */
  jsonText: string
  /** ファイルとJSON文字列で扱う保存キー */
  selectedKeys: readonly ExportKey[]
  /** インポート確認画面が開いているか */
  isConfirmationOpen: boolean
  /** 確認中のインポートデータ */
  pendingImport: PendingImport | null
  /** 直前の操作結果。未操作の場合は null */
  message: DataManagementMessage | null
  /** 画面に表示しないファイル入力への参照 */
  fileInputRef: RefObject<HTMLInputElement | null>
  /** 起動ボタンからモーダルを開閉する */
  toggleModal: () => void
  /** データ管理モーダルを開く */
  openModal: () => void
  /** モーダルを閉じる */
  closeModal: () => void
  /** 指定したセクションの開閉を切り替える */
  toggleSection: (section: enums.DataManagementSectionKey) => void
  /** ファイル選択画面を開く */
  selectImportFile: () => void
  /** 選択されたファイルを読み込む */
  importFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  /** 現在のデータをファイルとして出力する */
  exportFile: () => void
  /** JSON入力欄の値を更新する */
  setJsonText: (value: string) => void
  /** JSON入力欄を現在のデータで更新する */
  reloadJsonText: () => void
  /** 保存キーの選択状態を切り替える */
  toggleKey: (key: ExportKey) => void
  /** 保存キーをすべて選択する */
  selectAllKeys: () => void
  /** 保存キーをすべて選択解除する */
  clearAllKeys: () => void
  /** JSON反映の確認画面を開く */
  openConfirmation: () => void
  /** インポート確認画面を閉じる */
  closeConfirmation: () => void
  /** 確認済みのインポートデータを保存して画面を再読み込みする */
  confirmImport: () => void
}

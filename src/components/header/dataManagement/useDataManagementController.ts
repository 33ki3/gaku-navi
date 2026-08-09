/**
 * データ管理モーダルの状態と操作をまとめるフック。
 *
 * 表示コンポーネントに条件分岐や保存処理を持たせず、モーダル内の状態遷移を一か所で追えるようにする。
 */
import type { ChangeEvent } from 'react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccordionState } from '../../../hooks/useAccordionState'
import * as enums from '../../../types/enums'
import * as exportImport from '../../../utils/exportImport'
import type { DataManagementController, DataManagementMessage, PendingImport } from './types'

/** フックに渡す設定 */
interface UseDataManagementControllerOptions {
  /** インポート成功後に呼ばれる関数 */
  onImportComplete?: () => void
}

/** モーダルを開いた直後に表示するセクション。初期状態を一か所で再利用する */
const INITIAL_SECTION_VISIBILITY = {
  [enums.DataManagementSectionKey.File]: true,
  [enums.DataManagementSectionKey.JsonText]: true,
} satisfies Record<enums.DataManagementSectionKey, boolean>

/**
 * データ管理モーダルの状態と操作を作成する
 *
 * @param options - インポート完了後の処理
 * @returns 表示コンポーネントから利用する状態と操作
 */
export function useDataManagementController({
  onImportComplete,
}: UseDataManagementControllerOptions): DataManagementController {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState<DataManagementMessage | null>(null)
  const {
    state: openSections,
    toggle: toggleSectionState,
    reset: resetOpenSections,
  } = useAccordionState(INITIAL_SECTION_VISIBILITY)
  const [jsonText, setJsonText] = useState('')
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /** 保存中のデータを読み込み、失敗時は操作可能なモーダル内へエラーを表示する */
  const reloadJsonText = useCallback(() => {
    try {
      setJsonText(exportImport.getUserDataJson())
    } catch {
      setJsonText('')
      setMessage({
        text: t('ui.message.data_read_failed'),
        type: enums.DataManagementMessageType.Error,
        section: enums.DataManagementSectionKey.JsonText,
      })
    }
  }, [t])

  /** 検証結果をデータ管理欄へ表示し、保存前の確認画面を開く */
  const showImportPreview = useCallback(
    (preview: exportImport.ImportPreview, section: enums.DataManagementSectionKey) => {
      // 構文エラー・警告・正常系で確認ダイアログのトーンを切り替える
      const messageType = !preview.canImport
        ? enums.DataManagementMessageType.Error
        : preview.warnings.length > 0
          ? enums.DataManagementMessageType.Warning
          : enums.DataManagementMessageType.Success

      setMessage({ text: preview.message, type: messageType, section })
      setPendingImport({ preview, section })
      setIsConfirmationOpen(true)
    },
    [],
  )

  /** モーダルを開くたびに、現在保存されているデータを初期表示する */
  const openModal = useCallback(() => {
    // 前回の編集内容や確認状態を持ち越さず、保存中の値から毎回開始する
    setIsOpen(true)
    setMessage(null)
    resetOpenSections()
    setIsConfirmationOpen(false)
    setPendingImport(null)
    reloadJsonText()
  }, [reloadJsonText, resetOpenSections])

  const closeModal = useCallback(() => {
    // 未確定のインポートだけを破棄し、保存データは変更しない
    setIsOpen(false)
    setMessage(null)
    setIsConfirmationOpen(false)
    setPendingImport(null)
  }, [])

  const toggleModal = useCallback(() => {
    if (isOpen) {
      closeModal()
      return
    }
    openModal()
  }, [closeModal, isOpen, openModal])

  const toggleSection = useCallback(
    (section: enums.DataManagementSectionKey) => {
      const willOpen = !openSections[section]
      toggleSectionState(section)

      // JSONが空のまま再表示された場合だけ、保存中のデータを補う
      if (section === enums.DataManagementSectionKey.JsonText && willOpen && jsonText === '') {
        reloadJsonText()
      }
    },
    [jsonText, openSections, reloadJsonText, toggleSectionState],
  )

  const selectImportFile = useCallback(() => {
    // 非表示のfile inputをクリックして、ブラウザ標準のファイル選択を開く
    fileInputRef.current?.click()
  }, [])

  const importFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      showImportPreview(await exportImport.prepareImportFile(file), enums.DataManagementSectionKey.File)

      // 値を空にすると、同じファイルを続けて選び直せる
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [showImportPreview],
  )

  const exportFile = useCallback(() => {
    // ダウンロード失敗もモーダル内のファイルセクションへ表示する
    try {
      exportImport.exportUserData()
      setMessage({
        text: t('ui.message.export_success'),
        type: enums.DataManagementMessageType.Success,
        section: enums.DataManagementSectionKey.File,
      })
    } catch {
      setMessage({
        text: t('ui.message.export_failed'),
        type: enums.DataManagementMessageType.Error,
        section: enums.DataManagementSectionKey.File,
      })
    }
  }, [t])

  const openConfirmation = useCallback(() => {
    // JSON編集欄の現在値を検証してから、読み込み確認を1回だけ開く
    showImportPreview(exportImport.prepareImportText(jsonText), enums.DataManagementSectionKey.JsonText)
  }, [jsonText, showImportPreview])

  const closeConfirmation = useCallback(() => {
    // キャンセル時は保留中の検証結果を破棄し、編集欄の内容は残す
    setIsConfirmationOpen(false)
    setPendingImport(null)
  }, [])

  /** 確認済みのデータを保存し、画面へ反映する */
  const confirmImport = useCallback(() => {
    if (!pendingImport) return

    setIsConfirmationOpen(false)
    setPendingImport(null)

    // 確認済みのプレビューだけを永続化し、成功時に画面全体を再読み込みする
    const result = exportImport.applyImportPreview(pendingImport.preview)
    if (!result.success) {
      setMessage({
        text: result.message,
        type: enums.DataManagementMessageType.Error,
        section: pendingImport.section,
      })
      return
    }

    if (onImportComplete) {
      onImportComplete()
      return
    }
    window.location.reload()
  }, [onImportComplete, pendingImport])

  return {
    isOpen,
    isFileSectionOpen: openSections[enums.DataManagementSectionKey.File],
    isJsonSectionOpen: openSections[enums.DataManagementSectionKey.JsonText],
    jsonText,
    isConfirmationOpen,
    pendingImport,
    message,
    fileInputRef,
    toggleModal,
    openModal,
    closeModal,
    toggleSection,
    selectImportFile,
    importFile,
    exportFile,
    setJsonText,
    reloadJsonText,
    openConfirmation,
    closeConfirmation,
    confirmImport,
  }
}

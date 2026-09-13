/**
 * データ管理モーダルの状態と操作をまとめるフック。
 *
 * 表示コンポーネントに条件分岐や保存処理を持たせず、モーダル内の状態遷移を一か所で追えるようにする。
 */
import type { ChangeEvent } from 'react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as data from '../../../data/ui'
import type { ExportKey } from '../../../data/ui'
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
  [enums.DataManagementSectionKey.Selection]: false,
  [enums.DataManagementSectionKey.File]: true,
  [enums.DataManagementSectionKey.JsonText]: false,
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
  const [sourceJsonText, setSourceJsonText] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<ExportKey[]>(() => [...data.EXPORT_KEYS])
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectedKeysRef = useRef<ExportKey[]>([...data.EXPORT_KEYS])

  /** 保存中のデータを読み込み、失敗時は操作可能なモーダル内へエラーを表示する */
  const loadJsonText = useCallback(
    (keys: readonly ExportKey[]) => {
      try {
        const fullJsonText = exportImport.getUserDataJson(new Date(), data.EXPORT_KEYS)
        setSourceJsonText(fullJsonText)
        setJsonText(exportImport.filterImportJsonText(fullJsonText, keys))
      } catch {
        setSourceJsonText('')
        setJsonText('')
        setMessage({
          text: t('ui.message.data_read_failed'),
          type: enums.DataManagementMessageType.Error,
          section: enums.DataManagementSectionKey.JsonText,
        })
      }
    },
    [t],
  )

  /** 現在選択中の保存データをJSON入力欄へ読み込む */
  const reloadJsonText = useCallback(() => {
    loadJsonText(selectedKeys)
  }, [loadJsonText, selectedKeys])

  /** 選択状態を更新し、表示対象を変えても編集中のJSONを失わないようにする */
  const changeSelectedKeys = useCallback(
    (keys: readonly ExportKey[]) => {
      const nextKeys = data.EXPORT_KEYS.filter((key) => keys.includes(key))
      const mergedSourceText = exportImport.mergeImportJsonText(sourceJsonText, jsonText, selectedKeys)
      if (mergedSourceText === null) {
        const preview = exportImport.prepareImportText(jsonText, selectedKeys)
        setMessage({
          text: preview.message,
          type: enums.DataManagementMessageType.Error,
          section: enums.DataManagementSectionKey.JsonText,
        })
        return
      }

      selectedKeysRef.current = nextKeys
      setSelectedKeys(nextKeys)
      setSourceJsonText(mergedSourceText)
      setJsonText(exportImport.filterImportJsonText(mergedSourceText, nextKeys))
      // 選択状態が変わった確認結果は対象が変わっているため破棄する
      setMessage(null)
      setIsConfirmationOpen(false)
      setPendingImport(null)
    },
    [jsonText, selectedKeys, sourceJsonText],
  )

  /** 保存項目を1件切り替える */
  const toggleKey = useCallback(
    (key: ExportKey) => {
      const nextKeys = selectedKeys.includes(key)
        ? selectedKeys.filter((selectedKey) => selectedKey !== key)
        : [...selectedKeys, key]
      changeSelectedKeys(nextKeys)
    },
    [changeSelectedKeys, selectedKeys],
  )

  /** 保存項目をすべて選択する */
  const selectAllKeys = useCallback(() => {
    changeSelectedKeys(data.EXPORT_KEYS)
  }, [changeSelectedKeys])

  /** 保存項目をすべて選択解除する */
  const clearAllKeys = useCallback(() => {
    changeSelectedKeys([])
  }, [changeSelectedKeys])

  /** JSON入力欄を更新し、構文が正しい場合だけ全選択分の編集元へ反映する */
  const handleJsonTextChange = useCallback(
    (value: string) => {
      setJsonText(value)
      const mergedSourceText = exportImport.mergeImportJsonText(sourceJsonText, value, selectedKeys)
      if (mergedSourceText !== null) setSourceJsonText(mergedSourceText)
    },
    [selectedKeys, sourceJsonText],
  )

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
      if (!preview.canImport) {
        // 反映対象がない場合は確認操作を表示せず、元の欄に理由だけを残す
        setPendingImport(null)
        setIsConfirmationOpen(false)
        return
      }
      setPendingImport({ preview, section })
      setIsConfirmationOpen(true)
    },
    [],
  )

  /** モーダルを開くたびに、現在保存されているデータを初期表示する */
  const openModal = useCallback(() => {
    // 前回の編集内容や確認状態を持ち越さず、保存中の値から毎回開始する
    const initialKeys = [...data.EXPORT_KEYS]
    setIsOpen(true)
    setMessage(null)
    resetOpenSections()
    selectedKeysRef.current = initialKeys
    setSelectedKeys(initialKeys)
    setIsConfirmationOpen(false)
    setPendingImport(null)
    loadJsonText(initialKeys)
  }, [loadJsonText, resetOpenSections])

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

      showImportPreview(
        await exportImport.prepareImportFile(file, () => selectedKeysRef.current),
        enums.DataManagementSectionKey.File,
      )

      // 値を空にすると、同じファイルを続けて選び直せる
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [showImportPreview],
  )

  const exportFile = useCallback(() => {
    // ダウンロード失敗もモーダル内のファイルセクションへ表示する
    try {
      exportImport.exportUserData(selectedKeys)
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
  }, [selectedKeys, t])

  const openConfirmation = useCallback(() => {
    // JSON編集欄の現在値を検証してから、読み込み確認を1回だけ開く
    showImportPreview(exportImport.prepareImportText(jsonText, selectedKeys), enums.DataManagementSectionKey.JsonText)
  }, [jsonText, selectedKeys, showImportPreview])

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
    isSelectionSectionOpen: openSections[enums.DataManagementSectionKey.Selection],
    isFileSectionOpen: openSections[enums.DataManagementSectionKey.File],
    isJsonSectionOpen: openSections[enums.DataManagementSectionKey.JsonText],
    jsonText,
    selectedKeys,
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
    setJsonText: handleJsonTextChange,
    reloadJsonText,
    toggleKey,
    selectAllKeys,
    clearAllKeys,
    openConfirmation,
    closeConfirmation,
    confirmImport,
  }
}

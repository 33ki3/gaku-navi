/**
 * データ管理パネルコンポーネント
 *
 * ユーザーデータ（凸数設定・スコア設定等）を
 * JSONファイルとしてエクスポート/インポートする機能。
 * ボタンを押すとドロップダウンが開く。
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { exportUserData, importUserData } from '../../utils/exportImport'
import * as constant from '../../constant'
import { getFilterButtonStyle } from '../../data/ui'
import { DownloadIcon, UploadIcon } from '../ui/icons'
import { FilterButtonCategory } from '../../types/enums'

/** DataManagementPanel コンポーネントに渡すプロパティ */
interface DataManagementPanelProps {
  /** インポート成功後に呼ばれる関数（省略時はページリロード） */
  onImportComplete?: () => void
}

/** データのエクスポート/インポートパネル */
export default function DataManagementPanel({ onImportComplete }: DataManagementPanelProps) {
  const { t } = useTranslation()

  /** パネルの開閉状態 */
  const [isOpen, setIsOpen] = useState(false)
  /** 操作結果メッセージ（成功 / エラー） */
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  /** 非表示の file input への参照 */
  const fileInputRef = useRef<HTMLInputElement>(null)
  /** パネル外クリック判定用の参照 */
  const panelRef = useRef<HTMLDivElement>(null)

  // パネル外クリックで閉じる
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setMessage(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  /** エクスポートボタンのクリックハンドラ */
  const handleExport = useCallback(() => {
    try {
      exportUserData()
      setMessage({ text: t('ui.message.export_success'), type: 'success' })
    } catch {
      setMessage({ text: t('ui.message.export_failed'), type: 'error' })
    }
  }, [t])

  /** インポートボタンのクリックハンドラ */
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  /** ファイル選択後のハンドラ */
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const result = await importUserData(file)
      setMessage({ text: result.message, type: result.success ? 'success' : 'error' })

      // ファイル入力をリセット（同じファイルを再選択できるようにする）
      if (fileInputRef.current) fileInputRef.current.value = ''

      // 成功時はリロードして反映
      if (result.success) {
        setTimeout(() => {
          if (onImportComplete) {
            onImportComplete()
          } else {
            location.reload()
          }
        }, constant.IMPORT_RELOAD_DELAY)
      }
    },
    [onImportComplete],
  )

  return (
    <div ref={panelRef} className="relative">
      {/* トグルボタン */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setMessage(null)
        }}
        title={t('ui.data_management.title_full')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${getFilterButtonStyle(FilterButtonCategory.Inactive)}`}
      >
        <UploadIcon className="w-3.5 h-3.5" />
        {t('ui.data_management.title')}
      </button>

      {/* トグルボタンクリックで isOpen が true になったとき表示されるドロップダウン */}
      {isOpen && (
        <div className={constant.DROPDOWN_PANEL}>
          <p className="text-[10px] text-slate-500 mb-2">{t('ui.data_management.description')}</p>

          <div className="flex gap-2">
            {/* インポート */}
            <button onClick={handleImportClick} className={constant.BTN_ACTION_DARK}>
              <UploadIcon className="w-3.5 h-3.5 shrink-0" />
              {t('ui.data_management.import')}
            </button>

            {/* エクスポート */}
            <button onClick={handleExport} className={constant.BTN_ACTION_PRIMARY}>
              <DownloadIcon className="w-3.5 h-3.5 shrink-0" />
              {t('ui.data_management.export')}
            </button>
          </div>

          {/* 隠しファイル入力 */}
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />

          {/* エクスポート/インポート操作後に結果メッセージを表示する */}
          {message && (
            <p
              className={`mt-2 text-[11px] font-medium ${
                message.type === 'success' ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

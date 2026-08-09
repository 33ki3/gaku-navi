/**
 * JSONファイルによるインポート・エクスポート欄
 */
import type { ChangeEvent, RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import CollapsibleSection from '../../ui/CollapsibleSection'
import { HelpTooltip } from '../../ui/HelpTooltip'
import { DownloadIcon, UploadIcon } from '../../ui/icons'
import DataManagementMessage from './DataManagementMessage'
import * as styles from './styles'
import type { DataManagementMessage as DataManagementMessageValue } from './types'

/** ファイル操作セクションに渡すプロパティ */
interface DataManagementFileSectionProps {
  /** セクションが開いているか */
  isOpen: boolean
  /** 見出しを押した時に呼ばれる関数 */
  onToggle: () => void
  /** ファイル選択画面を開く関数 */
  onImportClick: () => void
  /** 選択されたファイルを読み込む関数 */
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  /** 現在のデータをファイルとして出力する関数 */
  onExport: () => void
  /** 画面に表示しないファイル入力への参照 */
  fileInputRef: RefObject<HTMLInputElement | null>
  /** ファイル操作の結果メッセージ */
  message: DataManagementMessageValue | null
}

/**
 * ファイルを使ったデータ入出力セクションを表示する
 *
 * @param props - 開閉状態とファイル操作
 * @returns 折りたたみ可能なファイル操作欄
 */
export default function DataManagementFileSection({
  isOpen,
  onToggle,
  onImportClick,
  onFileChange,
  onExport,
  fileInputRef,
  message,
}: DataManagementFileSectionProps) {
  const { t } = useTranslation()

  return (
    /* ファイル入出力セクション */
    <CollapsibleSection
      title={
        <>
          {t('ui.data_management.file_tab')}
          <HelpTooltip text={t('ui.data_management.file_tip')} />
        </>
      }
      isOpen={isOpen}
      onToggle={onToggle}
    >
      {/* ファイル入出力の説明と操作ボタン */}
      <div>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">{t('ui.data_management.file_description')}</p>
        <div className="grid grid-cols-2 gap-3">
          {/* JSONファイル読み込みボタン */}
          <button onClick={onImportClick} className={styles.FILE_IMPORT_BUTTON}>
            <UploadIcon className="h-4 w-4 shrink-0" />
            {t('ui.data_management.import')}
          </button>
          {/* JSONファイル書き出しボタン */}
          <button onClick={onExport} className={styles.FILE_EXPORT_BUTTON}>
            <DownloadIcon className="h-4 w-4 shrink-0" />
            {t('ui.data_management.export')}
          </button>
        </div>
        {/* ファイル操作の結果メッセージ */}
        {message && <DataManagementMessage message={message} />}
        <input ref={fileInputRef} type="file" accept=".json" onChange={onFileChange} className="hidden" />
      </div>
    </CollapsibleSection>
  )
}

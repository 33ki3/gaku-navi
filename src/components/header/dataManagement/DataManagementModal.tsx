/**
 * データ管理モーダルのレイアウト。
 *
 * 状態遷移の実装はコントローラーへ委譲し、このファイルではcontrollerの初期化と各セクションの配置を扱う。
 */
import { useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
import * as enums from '../../../types/enums'
import CloseButton from '../../ui/CloseButton'
import { ConfirmationDialog } from '../../ui/ConfirmationDialog'
import { HelpTooltip } from '../../ui/HelpTooltip'
import ModalOverlay from '../../ui/ModalOverlay'
import DataManagementFileSection from './DataManagementFileSection'
import DataManagementJsonSection from './DataManagementJsonSection'
import * as styles from './styles'
import { useDataManagementController } from './useDataManagementController'

/** データ管理モーダルに渡すプロパティ */
interface DataManagementModalProps {
  /** ヘッダーやメニューから開いた状態を閉じる */
  onClose: () => void
}

/**
 * ファイルとJSON文字列のデータ管理モーダルを表示する
 *
 * @param props - モーダルの状態と操作
 * @returns データ管理用の共通サイズモーダル
 */
export default function DataManagementModal({ onClose }: DataManagementModalProps) {
  const { t } = useTranslation()
  const controller = useDataManagementController({})
  const { openModal } = controller

  // 遅延チャンクの表示直後に保存値を読み込み、前回の編集状態を持ち込まない
  useLayoutEffect(() => {
    openModal()
  }, [openModal])

  const closeModal = () => {
    controller.closeModal()
    onClose?.()
  }
  // 操作結果はファイル欄・JSON欄のどちらで発生したかに応じて表示場所を分ける
  const fileMessage = controller.message?.section === enums.DataManagementSectionKey.File ? controller.message : null
  const jsonMessage =
    controller.message?.section === enums.DataManagementSectionKey.JsonText ? controller.message : null
  const pendingPreview = controller.pendingImport?.preview ?? null
  const hasImportWarnings = (pendingPreview?.warnings.length ?? 0) > 0
  // インポート結果に応じて、通常確認・警告確認・エラー確認の文言を決める
  const importConfirmationTitle = !pendingPreview?.canImport
    ? t('ui.data_management.import_error_confirm_title')
    : hasImportWarnings
      ? t('ui.data_management.import_warning_confirm_title')
      : t('ui.data_management.import_ready_confirm_title')
  const importConfirmationMessage = !pendingPreview
    ? ''
    : !pendingPreview.canImport
      ? pendingPreview.message
      : hasImportWarnings
        ? t('ui.data_management.import_warning_confirm', { message: pendingPreview.message })
        : t('ui.data_management.import_ready_confirm', { count: pendingPreview.importedKeys })

  return (
    <ModalOverlay onClose={closeModal} panelClassName={styles.MODAL_PANEL}>
      {/* データ管理モーダルのヘッダー */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-1.5">
          <h2 className="text-base font-black text-slate-900">{t('ui.data_management.title')}</h2>
          {/* データ管理の説明ツールチップ */}
          <HelpTooltip text={t('ui.data_management.description')} />
        </div>
        {/* データ管理モーダルを閉じるボタン */}
        <CloseButton onClick={closeModal} size={enums.ButtonSizeType.Sm} className="ml-3" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6">
        {/* JSONファイルのインポート・エクスポート欄 */}
        <DataManagementFileSection
          isOpen={controller.isFileSectionOpen}
          onToggle={() => controller.toggleSection(enums.DataManagementSectionKey.File)}
          onImportClick={controller.selectImportFile}
          onFileChange={controller.importFile}
          onExport={controller.exportFile}
          fileInputRef={controller.fileInputRef}
          message={fileMessage}
        />

        {/* JSON文字列の確認・編集欄 */}
        <DataManagementJsonSection
          isOpen={controller.isJsonSectionOpen}
          jsonText={controller.jsonText}
          onToggle={() => controller.toggleSection(enums.DataManagementSectionKey.JsonText)}
          onJsonTextChange={controller.setJsonText}
          onReload={controller.reloadJsonText}
          onApply={controller.openConfirmation}
          message={jsonMessage}
        />
      </div>

      {controller.isConfirmationOpen && pendingPreview && (
        /* インポート確認ダイアログ */
        <ConfirmationDialog
          title={importConfirmationTitle}
          message={importConfirmationMessage}
          confirmLabel={
            hasImportWarnings
              ? t('ui.data_management.import_warning_confirm_button')
              : t('ui.data_management.import_confirm_button')
          }
          cancelLabel={
            pendingPreview.canImport ? t('ui.data_management.cancel_apply') : t('ui.data_management.import_close')
          }
          canConfirm={pendingPreview.canImport}
          danger={!pendingPreview.canImport || hasImportWarnings}
          onCancel={controller.closeConfirmation}
          onConfirm={controller.confirmImport}
        />
      )}
    </ModalOverlay>
  )
}

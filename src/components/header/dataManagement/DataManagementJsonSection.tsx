/**
 * JSON文字列を直接確認・編集するセクション
 */
import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../../constant'
import CollapsibleSection from '../../ui/CollapsibleSection'
import { HelpTooltip } from '../../ui/HelpTooltip'
import DataManagementMessage from './DataManagementMessage'
import * as styles from './styles'
import type { DataManagementMessage as DataManagementMessageValue } from './types'

/** JSON文字列セクションに渡すプロパティ */
interface DataManagementJsonSectionProps {
  /** セクションが開いているか */
  isOpen: boolean
  /** JSON入力欄に表示する文字列 */
  jsonText: string
  /** 見出しを押した時に呼ばれる関数 */
  onToggle: () => void
  /** JSON入力欄を変更した時に呼ばれる関数 */
  onJsonTextChange: (value: string) => void
  /** 現在のデータでJSON入力欄を更新する関数 */
  onReload: () => void
  /** JSON反映の確認を始める関数 */
  onApply: () => void
  /** JSON操作の結果メッセージ */
  message: DataManagementMessageValue | null
}

/**
 * JSON文字列を使ったデータ入出力セクションを表示する
 *
 * @param props - 開閉状態、JSON文字列、各操作
 * @returns 折りたたみ可能なJSON文字列操作欄
 */
export default function DataManagementJsonSection({
  isOpen,
  jsonText,
  onToggle,
  onJsonTextChange,
  onReload,
  onApply,
  message,
}: DataManagementJsonSectionProps) {
  const { t } = useTranslation()

  /** Reactのイベントから文字列だけを親へ渡す */
  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onJsonTextChange(event.target.value)
  }

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      {/* JSON文字列操作セクション */}
      <CollapsibleSection
        title={
          <>
            {t('ui.data_management.text_tab')}
            <HelpTooltip text={t('ui.data_management.text_tip')} />
          </>
        }
        isOpen={isOpen}
        onToggle={onToggle}
      >
        {/* JSON文字列の説明と操作ボタン */}
        <div>
          <p className="mb-2 text-xs leading-relaxed text-slate-500">{t('ui.data_management.text_description')}</p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {/* 保存済みデータからJSON入力欄への反映ボタン */}
            <button type="button" onClick={onReload} className={constant.CONFIRMATION_SECONDARY_BUTTON}>
              {t('ui.data_management.reload_text')}
            </button>
            {/* JSON入力欄の反映ボタン */}
            <button type="button" onClick={onApply} className={constant.CONFIRMATION_PRIMARY_BUTTON}>
              {t('ui.data_management.apply_text')}
            </button>
          </div>
          {/* JSON操作の結果メッセージ */}
          {message && <DataManagementMessage message={message} />}
          {/* JSON文字列の確認・編集入力欄 */}
          <textarea
            value={jsonText}
            onChange={handleTextChange}
            spellCheck={false}
            aria-label={t('ui.data_management.text_label')}
            className={styles.JSON_TEXTAREA}
          />
        </div>
      </CollapsibleSection>
    </div>
  )
}

/**
 * データ管理で扱う保存項目の選択欄。
 *
 * ファイル操作とJSON文字列操作で同じ選択状態を使うため、モーダルから状態だけを受け取る。
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../../constant'
import * as data from '../../../data/ui'
import type { ExportKey } from '../../../data/ui'
import * as enums from '../../../types/enums'
import CollapsibleSection from '../../ui/CollapsibleSection'
import { ToggleButton } from '../../ui/ToggleButton'
import * as styles from './styles'

/** 保存項目の選択欄に渡すプロパティ */
interface DataManagementKeySelectorProps {
  /** セクションが開いているか */
  isOpen: boolean
  /** 見出しを押した時に呼ばれる関数 */
  onToggle: () => void
  /** 現在選択されている保存キー */
  selectedKeys: readonly ExportKey[]
  /** 1項目の選択状態を切り替える関数 */
  onToggleKey: (key: ExportKey) => void
  /** 全項目を選択する関数 */
  onSelectAll: () => void
  /** 全項目の選択を解除する関数 */
  onClearAll: () => void
}

/** ファイルとJSON文字列で共通して使う保存項目の選択欄を表示する */
export default function DataManagementKeySelector({
  isOpen,
  onToggle,
  selectedKeys,
  onToggleKey,
  onSelectAll,
  onClearAll,
}: DataManagementKeySelectorProps) {
  const { t } = useTranslation()
  const selectedKeySet = new Set(selectedKeys)
  const allSelected = selectedKeys.length === data.EXPORT_KEYS.length
  const activeButtonClass = data.getFilterButtonStyle(enums.FilterButtonCategory.Active)
  const inactiveButtonClass = data.getFilterButtonStyle(enums.FilterButtonCategory.Inactive)

  const hasStoredValue = (key: ExportKey) => {
    try {
      return localStorage.getItem(key) !== null
    } catch {
      return false
    }
  }

  return (
    <CollapsibleSection
      title={
        <div className="flex min-w-0 items-center gap-2">
          <span>{t('ui.data_management.selection_title')}</span>
          <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-blue-700">
            {t('ui.data_management.selection_count', {
              selected: selectedKeys.length,
              total: data.EXPORT_KEYS.length,
            })}
          </span>
        </div>
      }
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <p className="mb-3 text-xs leading-relaxed text-slate-500">{t('ui.data_management.selection_description')}</p>

        <div className="grid gap-2 sm:grid-cols-2">
          {data.EXPORT_KEYS.map((key) => {
            const isActive = selectedKeySet.has(key)
            const isStored = hasStoredValue(key)
            return (
              <ToggleButton
                key={key}
                isActive={isActive}
                onClick={() => onToggleKey(key)}
                activeClass={activeButtonClass}
                inactiveClass={inactiveButtonClass}
                size={enums.ButtonSizeType.Sm}
                className="flex min-h-10 w-full items-center justify-between gap-2 px-3 text-left"
              >
                <span className="min-w-0 text-[11px] leading-tight">{t(data.IMPORT_VALUE_METADATA[key].labelKey)}</span>
                {!isStored && (
                  <span className={`shrink-0 text-[9px] font-normal ${isActive ? 'text-slate-200' : 'text-slate-400'}`}>
                    {t('ui.data_management.not_stored')}
                  </span>
                )}
              </ToggleButton>
            )
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={allSelected}
            className={`${styles.SELECTION_ACTION_BUTTON} ${allSelected ? constant.BTN_DISABLED : styles.SELECTION_ACTION_ACTIVE}`}
          >
            {t('ui.data_management.select_all')}
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={selectedKeys.length === 0}
            className={`${styles.SELECTION_ACTION_BUTTON} ${selectedKeys.length === 0 ? constant.BTN_DISABLED : styles.SELECTION_ACTION_ACTIVE}`}
          >
            {t('ui.data_management.select_none')}
          </button>
        </div>
      </div>
    </CollapsibleSection>
  )
}

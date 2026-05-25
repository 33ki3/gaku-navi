/**
 * 設定パネルヘッダーコンポーネント
 *
 * 「点数設定」タイトルと閉じるボタンを表示するヘッダー。
 */
import { useTranslation } from 'react-i18next'
import { ButtonSizeType } from '../../types/enums'
import CloseButton from '../ui/CloseButton'

/** SettingsPanelHeader コンポーネントに渡すプロパティ */
interface SettingsPanelHeaderProps {
  /** パネルを閉じる関数 */
  onClose: () => void
  /** モバイルで最適編成パネルへ切り替える関数 */
  onSwitchToSimulator?: () => void
}

/** 設定パネルのヘッダー */
export function SettingsPanelHeader({ onClose, onSwitchToSimulator }: SettingsPanelHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4">
      <div className="flex items-center justify-between">
        <h2 className="hidden sm:block text-base font-black text-slate-900">{t('ui.settings.score_settings')}</h2>
        <div className="sm:hidden flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 flex-1 mr-2">
          <button className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white">
            {t('ui.settings.score_settings')}
          </button>
          <button onClick={onSwitchToSimulator} className="flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-600">
            {t('ui.settings.unit_simulator')}
          </button>
        </div>
        <CloseButton onClick={onClose} size={ButtonSizeType.Lg} className="hover:bg-slate-100" />
      </div>
    </div>
  )
}

/**
 * 設定パネルヘッダーコンポーネント
 *
 * 「点数設定」タイトルと閉じるボタンを表示するヘッダー。
 */
import { useTranslation } from 'react-i18next'
import { ButtonSizeType } from '../../types/enums'
import CloseButton from '../ui/CloseButton'

/** 設定パネルのヘッダー */
export function SettingsPanelHeader({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-slate-900">{t('ui.settings.score_settings')}</h2>
        <CloseButton onClick={onClose} size={ButtonSizeType.Lg} className="hover:bg-slate-100" />
      </div>
    </div>
  )
}

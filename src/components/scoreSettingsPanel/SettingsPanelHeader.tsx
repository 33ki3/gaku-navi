/**
 * 設定パネルヘッダーコンポーネント
 *
 * 「点数設定」タイトルと閉じるボタンを表示するヘッダー。
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import CloseButton from '../ui/CloseButton'
import { PanelSwitcher } from '../ui/PanelSwitcher'

/** SettingsPanelHeader コンポーネントに渡すプロパティ */
interface SettingsPanelHeaderProps {
  /** パネルを閉じる関数 */
  onClose: () => void
  /** 最適編成パネルへ切り替える関数 */
  onSwitchToSimulator?: () => void
}

/**
 * 点数設定パネルの共通ヘッダーを描画する。
 *
 * @param props - 閉じる処理と最適編成へ切り替える処理
 * @returns 点数設定パネルのヘッダー
 */
export function SettingsPanelHeader({ onClose, onSwitchToSimulator }: SettingsPanelHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className={constant.PANEL_HEADER}>
      <div className={constant.PANEL_HEADER_INNER}>
        {/* 点数設定・最適編成切り替え操作 */}
        <PanelSwitcher activePanel={enums.SettingsPanelType.Score} onSwitchToSimulator={onSwitchToSimulator} />
        <h2 className="hidden text-base font-black text-slate-900 md:block">{t('ui.settings.score_settings')}</h2>
        {/* 点数設定パネルを閉じるボタン */}
        <CloseButton onClick={onClose} size={enums.ButtonSizeType.Lg} className={constant.PANEL_HEADER_CLOSE} />
      </div>
    </div>
  )
}

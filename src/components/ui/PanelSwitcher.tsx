/**
 * スマホ用の設定パネル切り替え。
 *
 * 点数設定と最適編成のどちらを表示中か示し、もう一方へ移動する操作を提供する。
 */
import { useTranslation } from 'react-i18next'
import * as enums from '../../types/enums'

interface PanelSwitcherProps {
  /** 現在表示している設定パネル */
  activePanel: enums.SettingsPanelType
  /** 点数設定へ切り替える関数 */
  onSwitchToScore?: () => void
  /** 最適編成へ切り替える関数 */
  onSwitchToSimulator?: () => void
}

/**
 * スマホの点数設定・最適編成パネル切り替えを描画する
 *
 * @param props - 現在のパネル種別と切り替え処理
 * @returns 2択のパネル切り替えタブ
 */
export function PanelSwitcher({ activePanel, onSwitchToScore, onSwitchToSimulator }: PanelSwitcherProps) {
  const { t } = useTranslation()
  const baseClass = 'h-full flex-1 rounded-md px-2 text-xs font-bold transition-[color,background-color,box-shadow]'
  const activeClass = 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
  const inactiveClass = 'text-slate-500 hover:bg-white/70 hover:text-slate-800'

  return (
    <div
      className="mr-2 grid h-9 flex-1 grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 md:hidden"
      role="tablist"
      aria-label={t('ui.accessibility.panel_switcher')}
    >
      <button
        type="button"
        role="tab"
        aria-selected={activePanel === enums.SettingsPanelType.Score}
        onClick={activePanel === enums.SettingsPanelType.Score ? undefined : onSwitchToScore}
        className={`${baseClass} ${activePanel === enums.SettingsPanelType.Score ? activeClass : inactiveClass}`}
      >
        {t('ui.settings.score_settings')}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activePanel === enums.SettingsPanelType.UnitSimulator}
        onClick={activePanel === enums.SettingsPanelType.UnitSimulator ? undefined : onSwitchToSimulator}
        className={`${baseClass} ${
          activePanel === enums.SettingsPanelType.UnitSimulator ? activeClass : inactiveClass
        }`}
      >
        {t('ui.settings.unit_simulator')}
      </button>
    </div>
  )
}

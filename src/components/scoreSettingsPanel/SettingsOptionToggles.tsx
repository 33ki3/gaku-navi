/**
 * 設定オプショントグルコンポーネント
 *
 * 「自己発動を含む」「Pアイテムを含む」のチェックボックス。
 */
import { useTranslation } from 'react-i18next'
import type { ScoreSettings } from '../../types/card'
import { CheckboxField } from '../ui/CheckboxField'

/** SettingsOptionToggles に渡すプロパティ */
interface SettingsOptionTogglesProps {
  /** 現在の点数設定 */
  settings: ScoreSettings
  /** 設定変更コールバック */
  onSettingsChange: (s: ScoreSettings) => void
}

/**
 * 点数計算に影響する真偽値オプションを表示する。
 *
 * @param props - 現在の点数設定と更新操作
 * @returns 点数設定オプションのチェックボックス一覧
 */
export function SettingsOptionToggles({ settings, onSettingsChange }: SettingsOptionTogglesProps) {
  const { t } = useTranslation()

  // 点数計算に影響するオプション（自己トリガー・Pアイテム・4凸固定）のチェックボックス
  return (
    <div className="space-y-3">
      <CheckboxField
        label={t('ui.option.self_trigger')}
        checked={settings.includeSelfTrigger}
        onChange={(checked) => onSettingsChange({ ...settings, includeSelfTrigger: checked })}
        description={t('ui.option.self_trigger_desc')}
      />
      <CheckboxField
        label={t('ui.option.p_item')}
        checked={settings.includePItem}
        onChange={(checked) => onSettingsChange({ ...settings, includePItem: checked })}
        description={t('ui.option.p_item_desc')}
      />
      <CheckboxField
        label={t('ui.option.fixed_uncap')}
        checked={settings.useFixedUncap}
        onChange={(checked) => onSettingsChange({ ...settings, useFixedUncap: checked })}
        description={t('ui.option.fixed_uncap_desc')}
      />
    </div>
  )
}

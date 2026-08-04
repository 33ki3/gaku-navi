/**
 * アプリ全体に関わる表示オプション
 */
import { useTranslation } from 'react-i18next'
import type { AppPreferences } from '../../types/app'
import { CheckboxField } from '../ui/CheckboxField'

interface GeneralOptionsProps {
  /** アプリ全体の表示設定 */
  preferences: AppPreferences
  /** 表示設定を更新する */
  onChange: (preferences: AppPreferences) => void
}

/**
 * スマホ下部ナビゲーションに関する一般設定を表示する
 *
 * @param props - 表示設定と更新処理
 * @returns 一般設定のチェックボックス群
 */
export function GeneralOptions({ preferences, onChange }: GeneralOptionsProps) {
  const { t } = useTranslation()
  return (
    <>
      {/* スマホ下部ナビを使うかどうかを切り替える */}
      <CheckboxField
        label={t('ui.options.show_mobile_bottom_nav')}
        checked={preferences.showMobileBottomNav}
        onChange={(checked) => onChange({ ...preferences, showMobileBottomNav: checked })}
        description={t('ui.options.show_mobile_bottom_nav_desc')}
      />
      <div className="mt-3">
        {/* 下部ナビをスクロールで隠さず、常に画面下へ固定するかを切り替える */}
        <CheckboxField
          label={t('ui.options.keep_mobile_bottom_nav_fixed')}
          checked={preferences.keepMobileBottomNavFixed}
          onChange={(checked) => onChange({ ...preferences, keepMobileBottomNavFixed: checked })}
          description={t('ui.options.keep_mobile_bottom_nav_fixed_desc')}
        />
      </div>
    </>
  )
}

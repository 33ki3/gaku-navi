/**
 * アプリ全体のオプションモーダル。
 *
 * 一般設定・最適編成・点数設定を折りたたみセクションでまとめ、各画面と同じ設定オブジェクトを更新する。
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import type { AppPreferences } from '../../types/app'
import type { ScoreSettings } from '../../types/card'
import * as enums from '../../types/enums'
import type { UnitSimulatorSettings } from '../../types/unit'
import { SettingsOptionToggles } from '../scoreSettingsPanel/SettingsOptionToggles'
import CloseButton from '../ui/CloseButton'
import CollapsibleSection from '../ui/CollapsibleSection'
import ModalOverlay from '../ui/ModalOverlay'
import { UnitOptimizerOptions } from '../unitSimulator/UnitOptimizerOptions'
import { GeneralOptions } from './GeneralOptions'

interface OptionsModalProps {
  /** モーダルを閉じる関数 */
  onClose: () => void
  /** アプリ全体の表示設定 */
  preferences: AppPreferences
  /** アプリ全体の表示設定を更新する関数 */
  onPreferencesChange: (preferences: AppPreferences) => void
  /** 現在の点数設定 */
  scoreSettings: ScoreSettings
  /** 点数設定を更新する関数 */
  onScoreSettingsChange: (settings: ScoreSettings) => void
  /** 現在の最適編成設定 */
  unitSettings: UnitSimulatorSettings
  /** 最適編成設定を更新する関数 */
  onUnitSettingsChange: (settings: UnitSimulatorSettings) => void
}

/**
 * アプリ全体・点数設定・最適編成のオプションをまとめて表示する
 *
 * @param props - 各設定値、更新処理、モーダルを閉じる処理
 * @returns セクション形式のオプションモーダル
 */
export default function OptionsModal({
  onClose,
  preferences,
  onPreferencesChange,
  scoreSettings,
  onScoreSettingsChange,
  unitSettings,
  onUnitSettingsChange,
}: OptionsModalProps) {
  const { t } = useTranslation()
  const [openSections, setOpenSections] = useState<Record<enums.OptionsSectionKey, boolean>>({
    [enums.OptionsSectionKey.General]: true,
    [enums.OptionsSectionKey.UnitSimulator]: true,
    [enums.OptionsSectionKey.Score]: true,
  })

  /** 指定したオプションセクションだけを開閉する */
  const toggleSection = (section: enums.OptionsSectionKey) => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }))
  }

  return (
    <ModalOverlay onClose={onClose} panelClassName={constant.MODAL_PANEL_OPTIONS}>
      {/* モーダル見出しは固定し、セクション本文だけをスクロールさせる */}
      <div className="flex min-h-12 shrink-0 items-center justify-between border-b border-slate-200 px-4">
        <h2 className="text-base font-black text-slate-900">{t('ui.options.title')}</h2>
        {/* オプションモーダルを閉じるボタン */}
        <CloseButton onClick={onClose} size={enums.ButtonSizeType.Lg} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4">
        {/* 表示全体に関わる設定を最初に配置する */}
        <section>
          {/* 一般設定セクション */}
          <CollapsibleSection
            title={t('ui.options.general')}
            isOpen={openSections[enums.OptionsSectionKey.General]}
            onToggle={() => toggleSection(enums.OptionsSectionKey.General)}
          >
            {/* 一般設定の項目 */}
            <GeneralOptions preferences={preferences} onChange={onPreferencesChange} />
          </CollapsibleSection>
        </section>

        <section className="mt-5 border-t border-slate-200 pt-4">
          {/* 最適編成パネルと同じ設定値を、数値入力なしで編集する */}
          {/* 最適編成設定セクション */}
          <CollapsibleSection
            title={t('ui.settings.unit_simulator')}
            isOpen={openSections[enums.OptionsSectionKey.UnitSimulator]}
            onToggle={() => toggleSection(enums.OptionsSectionKey.UnitSimulator)}
          >
            {/* 最適編成のチェック項目 */}
            <UnitOptimizerOptions settings={unitSettings} onChange={onUnitSettingsChange} showNumericOptions={false} />
          </CollapsibleSection>
        </section>

        <section className="mt-5 border-t border-slate-200 pt-4">
          {/* 点数設定パネルのチェック項目を同じ状態へ反映する */}
          {/* 点数設定セクション */}
          <CollapsibleSection
            title={t('ui.settings.score_settings')}
            isOpen={openSections[enums.OptionsSectionKey.Score]}
            onToggle={() => toggleSection(enums.OptionsSectionKey.Score)}
          >
            {/* 点数設定のチェック項目 */}
            <SettingsOptionToggles settings={scoreSettings} onSettingsChange={onScoreSettingsChange} />
          </CollapsibleSection>
        </section>
      </div>
    </ModalOverlay>
  )
}

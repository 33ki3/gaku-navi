/**
 * 点数設定の中身コンポーネント
 *
 * シナリオ/難易度・スケジュール・アクション回数・パラメータボーナス・
 * オプションの各セクションを含む設定フォーム本体。
 * レイアウトラッパー（SidePanelLayout）なしで使える。
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScoreSettings } from '../../types/card'
import CollapsibleSection from '../ui/CollapsibleSection'
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import { CollapsibleVariantType } from '../../types/enums'
import * as data from '../../data'
import { calculateCountsFromSchedule } from '../../utils/scoreSettings'
import { useAccordionState } from '../../hooks'
import { ScenarioDifficultySection } from './ScenarioDifficultySection'
import { ActionCountsSection } from './ActionCountsSection'
import { ParameterBonusInputs } from './ParameterBonusInputs'
import { SettingsOptionToggles } from './SettingsOptionToggles'
import { PresetSection } from './PresetSection'
import { HelpTooltip } from '../ui/HelpTooltip'
import { ScheduleSection } from './ScheduleSection'

/** ScoreSettingsContent コンポーネントに渡すプロパティ */
interface ScoreSettingsContentProps {
  /** 現在の設定値 */
  settings: ScoreSettings
  /** 設定値が変わったときに呼ばれる関数 */
  onSettingsChange: (settings: ScoreSettings) => void
}

/** 点数設定の中身（レイアウトラッパーなし） */
export function ScoreSettingsContent({ settings, onSettingsChange }: ScoreSettingsContentProps) {
  const { t } = useTranslation()

  const { state: sections, toggle } = useAccordionState({
    [enums.ScoreSettingsSectionKey.Preset]: false,
    [enums.ScoreSettingsSectionKey.Scenario]: true,
    [enums.ScoreSettingsSectionKey.Schedule]: false,
    [enums.ScoreSettingsSectionKey.ParamBonus]: false,
    [enums.ScoreSettingsSectionKey.Actions]: true,
    [enums.ScoreSettingsSectionKey.Options]: false,
  })

  // 固定難易度シナリオ（HIF/Custom）では difficulty=null のため None を使う
  const resolvedDifficulty =
    settings.difficulty ??
    (settings.scenario === enums.ScenarioType.Hif || settings.scenario === enums.ScenarioType.Custom
      ? enums.DifficultyType.None
      : constant.DEFAULT_DIFFICULTY)

  const scheduleData = useMemo(
    () => data.getScheduleData(settings.scenario, resolvedDifficulty),
    [settings.scenario, resolvedDifficulty],
  )

  const scheduleCounts = useMemo(() => {
    if (!settings.useScheduleLimits || settings.useCustomMode) return null
    return calculateCountsFromSchedule(settings.scheduleSelections, scheduleData)
  }, [scheduleData, settings.scheduleSelections, settings.useScheduleLimits, settings.useCustomMode])

  return (
    <div className="p-5 space-y-5">
      {/* プリセットセクション */}
      <div className={constant.SECTION_DIVIDER}>
        <CollapsibleSection
          title={
            <>
              {t('ui.header.preset')} <HelpTooltip text={t('ui.help.tooltip_preset')} />
            </>
          }
          isOpen={sections[enums.ScoreSettingsSectionKey.Preset]}
          onToggle={() => toggle(enums.ScoreSettingsSectionKey.Preset)}
          variant={CollapsibleVariantType.Panel}
        >
          <div className="mt-2">
            <PresetSection settings={settings} onSettingsChange={onSettingsChange} />
          </div>
        </CollapsibleSection>
      </div>

      {/* シナリオ/難易度セクション */}
      <div className={constant.SECTION_DIVIDER}>
        <CollapsibleSection
          title={
            <>
              {t('ui.header.scenario_difficulty')} <HelpTooltip text={t('ui.help.tooltip_scenario')} />
            </>
          }
          isOpen={sections[enums.ScoreSettingsSectionKey.Scenario]}
          onToggle={() => toggle(enums.ScoreSettingsSectionKey.Scenario)}
          variant={CollapsibleVariantType.Panel}
        >
          <ScenarioDifficultySection settings={settings} onSettingsChange={onSettingsChange} />
        </CollapsibleSection>
      </div>

      {/* スケジュールセクション（カスタム/HIF/初編を ScheduleSection 内で出し分け） */}
      <div className={constant.SECTION_DIVIDER}>
        <ScheduleSection
          settings={settings}
          onSettingsChange={onSettingsChange}
          resolvedDifficulty={resolvedDifficulty}
          scheduleData={scheduleData}
          scheduleCounts={scheduleCounts}
          isOpen={sections[enums.ScoreSettingsSectionKey.Schedule]}
          onToggle={() => toggle(enums.ScoreSettingsSectionKey.Schedule)}
        />
      </div>

      {/* パラメータボーナス入力（カスタムモード時は非表示、スケジュール有効時は自動ロック） */}
      {!settings.useCustomMode && (
        <div className={constant.SECTION_DIVIDER}>
          <CollapsibleSection
            title={
              <span className="inline-flex items-center gap-1">
                {t('ui.settings.param_bonus_target')}
                {settings.useScheduleLimits && scheduleData ? ` (${t('ui.settings.auto')})` : ''}
                <HelpTooltip text={t('ui.help.tooltip_param_bonus')} />
              </span>
            }
            isOpen={sections[enums.ScoreSettingsSectionKey.ParamBonus]}
            onToggle={() => toggle(enums.ScoreSettingsSectionKey.ParamBonus)}
            variant={CollapsibleVariantType.Panel}
          >
            <div className="mt-2">
              <ParameterBonusInputs
                settings={settings}
                onSettingsChange={onSettingsChange}
                isLocked={settings.useScheduleLimits && scheduleData != null}
              />
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* アクション回数セクション */}
      <div className={constant.SECTION_DIVIDER}>
        <CollapsibleSection
          title={
            <>
              {t('ui.header.action_counts')} <HelpTooltip text={t('ui.help.tooltip_actions')} />
            </>
          }
          isOpen={sections[enums.ScoreSettingsSectionKey.Actions]}
          onToggle={() => toggle(enums.ScoreSettingsSectionKey.Actions)}
          variant={CollapsibleVariantType.Panel}
        >
          <ActionCountsSection
            settings={settings}
            onSettingsChange={onSettingsChange}
            scheduleCounts={scheduleCounts}
            scheduleData={scheduleData}
          />
        </CollapsibleSection>
      </div>

      {/* オプション（自己発動・Pアイテム） */}
      <div className={constant.SECTION_DIVIDER}>
        <CollapsibleSection
          title={
            <>
              {t('ui.header.options')} <HelpTooltip text={t('ui.help.tooltip_options')} />
            </>
          }
          isOpen={sections[enums.ScoreSettingsSectionKey.Options]}
          onToggle={() => toggle(enums.ScoreSettingsSectionKey.Options)}
          variant={CollapsibleVariantType.Panel}
        >
          <SettingsOptionToggles settings={settings} onSettingsChange={onSettingsChange} />
        </CollapsibleSection>
      </div>
    </div>
  )
}

/**
 * 点数設定の中身コンポーネント
 *
 * シナリオ/難易度・スケジュール・アクション回数・パラメータボーナス・
 * オプションの各セクションを含む設定フォーム本体。
 * レイアウトラッパー（SidePanelLayout）なしで使える。
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as data from '../../data'
import { useAccordionState } from '../../hooks'
import type { ScoreSettings } from '../../types/card'
import * as enums from '../../types/enums'
import { calculateCountsFromSchedule } from '../../utils/scoreSettings'
import CollapsibleSection from '../ui/CollapsibleSection'
import { HelpTooltip } from '../ui/HelpTooltip'
import { ActionCountsSection } from './ActionCountsSection'
import { ParameterBonusInputs } from './ParameterBonusInputs'
import { PresetSection } from './PresetSection'
import { ScenarioDifficultySection } from './ScenarioDifficultySection'
import { ScheduleSection } from './ScheduleSection'
import { SettingsOptionToggles } from './SettingsOptionToggles'

/** ScoreSettingsContent コンポーネントに渡すプロパティ */
interface ScoreSettingsContentProps {
  /** 現在の設定値 */
  settings: ScoreSettings
  /** 設定値が変わったときに呼ばれる関数 */
  onSettingsChange: (settings: ScoreSettings) => void
}

/**
 * 点数設定を責務別の折りたたみセクションとして表示する。
 *
 * @param props - 現在の点数設定と更新操作
 * @returns レイアウトラッパーを含まない点数設定フォーム
 */
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
    <div className="space-y-5 px-5 pb-5 pt-0">
      {/* プリセットセクション */}
      <div className="pt-3">
        {/* プリセット設定セクション */}
        <CollapsibleSection
          title={
            <>
              {t('ui.header.preset')} <HelpTooltip text={t('ui.help.tooltip_preset')} />
            </>
          }
          isOpen={sections[enums.ScoreSettingsSectionKey.Preset]}
          onToggle={() => toggle(enums.ScoreSettingsSectionKey.Preset)}
          variant={enums.CollapsibleVariantType.Panel}
        >
          <div className="mt-2">
            {/* 点数設定のプリセット */}
            <PresetSection settings={settings} onSettingsChange={onSettingsChange} />
          </div>
        </CollapsibleSection>
      </div>

      {/* シナリオ/難易度セクション */}
      <div className={constant.SECTION_DIVIDER}>
        {/* シナリオと難易度の設定セクション */}
        <CollapsibleSection
          title={
            <>
              {t('ui.header.scenario_difficulty')} <HelpTooltip text={t('ui.help.tooltip_scenario')} />
            </>
          }
          isOpen={sections[enums.ScoreSettingsSectionKey.Scenario]}
          onToggle={() => toggle(enums.ScoreSettingsSectionKey.Scenario)}
          variant={enums.CollapsibleVariantType.Panel}
        >
          {/* シナリオと難易度の入力欄 */}
          <ScenarioDifficultySection settings={settings} onSettingsChange={onSettingsChange} />
        </CollapsibleSection>
      </div>

      {/* スケジュールセクション（カスタム/HIF/初編を ScheduleSection 内で出し分け） */}
      <div className={constant.SECTION_DIVIDER}>
        {/* スケジュール設定セクション */}
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
          {/* パラメータボーナス設定セクション */}
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
            variant={enums.CollapsibleVariantType.Panel}
          >
            <div className="mt-2">
              {/* パラメータボーナスの入力欄 */}
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
        {/* アクション回数設定セクション */}
        <CollapsibleSection
          title={
            <>
              {t('ui.header.action_counts')} <HelpTooltip text={t('ui.help.tooltip_actions')} />
            </>
          }
          isOpen={sections[enums.ScoreSettingsSectionKey.Actions]}
          onToggle={() => toggle(enums.ScoreSettingsSectionKey.Actions)}
          variant={enums.CollapsibleVariantType.Panel}
        >
          {/* アクション回数の入力欄 */}
          <ActionCountsSection
            settings={settings}
            onSettingsChange={onSettingsChange}
            scheduleCounts={scheduleCounts}
            scheduleData={scheduleData}
          />
        </CollapsibleSection>
      </div>

      {/* 点数計算オプション（オプションモーダルと同じ設定値を共有） */}
      <div className={constant.SECTION_DIVIDER}>
        {/* 点数計算オプションセクション */}
        <CollapsibleSection
          title={
            <>
              {t('ui.header.options')} <HelpTooltip text={t('ui.help.tooltip_options')} />
            </>
          }
          isOpen={sections[enums.ScoreSettingsSectionKey.Options]}
          onToggle={() => toggle(enums.ScoreSettingsSectionKey.Options)}
          variant={enums.CollapsibleVariantType.Panel}
        >
          {/* 点数計算オプションのチェック項目 */}
          <SettingsOptionToggles settings={settings} onSettingsChange={onSettingsChange} />
        </CollapsibleSection>
      </div>
    </div>
  )
}

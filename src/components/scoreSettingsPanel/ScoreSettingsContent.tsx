/**
 * 点数設定の中身コンポーネント
 *
 * シナリオ、難易度、スケジュール、アクション回数、
 * パラメータボーナス、オプションの各セクションを含む設定フォーム本体
 * 設定フォーム単体でも表示できるよう、パネルの枠は親コンポーネントで管理する
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PresetCommand } from '../../application/command'
import * as constant from '../../constant'
import * as data from '../../data'
import { useAccordionState } from '../../hooks'
import type { ScoreSettings } from '../../types/card'
import * as enums from '../../types/enums'
import type { ScorePreset } from '../../utils/presetHelpers'
import {
  calculateCountsFromSchedule,
  getEffectiveScheduleSelections,
  resolveScoreSettingsDifficulty,
} from '../../utils/scoreSettings'
import CollapsibleSection from '../ui/CollapsibleSection'
import { HelpTooltip } from '../ui/HelpTooltip'
import { ActionCountsSection } from './ActionCountsSection'
import { ParameterBonusInputs } from './ParameterBonusInputs'
import { PresetSection } from './PresetSection'
import { ScenarioDifficultySection } from './ScenarioDifficultySection'
import { ScheduleSection } from './ScheduleSection'
import { SettingsOptionToggles } from './SettingsOptionToggles'

/** 点数設定フォームの値と更新操作 */
interface ScoreSettingsContentProps {
  /** 現在の設定値 */
  settings: ScoreSettings
  /** 保存待ち入力と外部更新を区別する保存済み設定 */
  persistedSettings: ScoreSettings
  /** アクション回数入力時に計算結果だけを即時更新する関数 */
  onSettingsPreviewChange: (settings: ScoreSettings) => void
  /** 設定値が変わったときに呼ばれる関数 */
  onSettingsChange: (settings: ScoreSettings) => void
  /** 保存済みプリセット一覧 */
  presets: readonly ScorePreset[]
  /** プリセットの保存・削除を行う共通処理 */
  presetCommand: PresetCommand
}

/**
 * 点数設定を責務別の折りたたみセクションとして表示する
 *
 * @param props - 現在の点数設定と更新操作
 * @returns 点数設定フォーム
 */
export function ScoreSettingsContent({
  settings,
  persistedSettings,
  onSettingsPreviewChange,
  onSettingsChange,
  presets,
  presetCommand,
}: ScoreSettingsContentProps) {
  const { t } = useTranslation()

  const { state: sections, toggle } = useAccordionState({
    [enums.ScoreSettingsSectionKey.Preset]: false,
    [enums.ScoreSettingsSectionKey.Scenario]: true,
    [enums.ScoreSettingsSectionKey.Schedule]: false,
    [enums.ScoreSettingsSectionKey.ParamBonus]: false,
    [enums.ScoreSettingsSectionKey.Actions]: true,
    [enums.ScoreSettingsSectionKey.Options]: false,
  })

  // HIFとカスタムでは難易度を選ばず、それ以外では設定した難易度を使う
  const resolvedDifficulty = resolveScoreSettingsDifficulty(settings.scenario, settings.difficulty)

  const scheduleData = useMemo(
    () => data.getScheduleData(settings.scenario, resolvedDifficulty),
    [settings.scenario, resolvedDifficulty],
  )
  // 固定週の補完値を設定画面と計算処理で共通化する
  const effectiveSettings = useMemo(
    () => ({
      ...settings,
      scheduleSelections: getEffectiveScheduleSelections(settings.scheduleSelections, scheduleData),
    }),
    [scheduleData, settings],
  )

  const scheduleCounts = useMemo(() => {
    // 自動計算が無効、またはカスタムモードではスケジュール由来の回数を表示しない
    if (!settings.useScheduleLimits || settings.useCustomMode) return null
    // シナリオとHIF表示モードに合わせ、選べない活動を集計から除外する
    return calculateCountsFromSchedule(
      settings.scheduleSelections,
      scheduleData,
      settings.scenario,
      settings.hifLessonSplitSub,
    )
  }, [
    scheduleData,
    settings.scheduleSelections,
    settings.scenario,
    settings.hifLessonSplitSub,
    settings.useScheduleLimits,
    settings.useCustomMode,
  ])

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
            <PresetSection
              settings={settings}
              onSettingsChange={onSettingsChange}
              presets={presets}
              presetCommand={presetCommand}
            />
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
          settings={effectiveSettings}
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
            persistedSettings={persistedSettings}
            onSettingsPreviewChange={onSettingsPreviewChange}
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

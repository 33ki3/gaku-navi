/**
 * 点数設定パネルコンポーネント
 *
 * シナリオ/難易度・スケジュール・アクション回数・パラメータボーナス・
 * オプションの設定をまとめて含むメインパネル。
 * ピン留めまたはオーバーレイとして表示される。
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScoreSettings } from '../../types/card'
import CollapsibleSection from '../ui/CollapsibleSection'
import { CheckboxField } from '../ui/CheckboxField'
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import { CollapsibleVariantType } from '../../types/enums'
import * as data from '../../data'
import {
  calculateCountsFromSchedule,
  calculateParameterBonusFromSchedule,
  getParameterBonusBreakdown,
} from '../../utils/scoreSettings'
import { useAccordionState } from '../../hooks'
import { ScoreSettingsPanelLayout } from './ScoreSettingsPanelLayout'
import { ScenarioDifficultySection } from './ScenarioDifficultySection'
import { ActionCountsSection } from './ActionCountsSection'
import { ParameterBonusInputs } from './ParameterBonusInputs'
import { ScheduleSummary } from './ScheduleSummary'
import { ScheduleWeekSelector } from './ScheduleWeekSelector'
import { SettingsPanelHeader } from './SettingsPanelHeader'
import { SettingsOptionToggles } from './SettingsOptionToggles'
import { PresetSection } from './PresetSection'
import { HelpTooltip } from '../ui/HelpTooltip'

/** ScoreSettingsPanel コンポーネントに渡すプロパティ */
interface ScoreSettingsPanelProps {
  /** パネルが開いているか */
  isOpen: boolean
  /** パネルを閉じる関数 */
  onClose: () => void
  /** ピン留めかどうか */
  pinned: boolean
  /** 現在の設定値 */
  settings: ScoreSettings
  /** 設定値が変わったときに呼ばれる関数 */
  onSettingsChange: (settings: ScoreSettings) => void
}

/** 点数設定パネル */
export default function ScoreSettingsPanel({
  isOpen,
  onClose,
  pinned,
  settings,
  onSettingsChange,
}: ScoreSettingsPanelProps) {
  const { t } = useTranslation()

  // 各セクションの開閉状態を管理するアコーディオン（enumキーを動的プロパティとして使用）
  const { state: sections, toggle } = useAccordionState({
    [enums.ScoreSettingsSectionKey.Preset]: false,
    [enums.ScoreSettingsSectionKey.Scenario]: true,
    [enums.ScoreSettingsSectionKey.Schedule]: false,
    [enums.ScoreSettingsSectionKey.ParamBonus]: false,
    [enums.ScoreSettingsSectionKey.Actions]: true,
    [enums.ScoreSettingsSectionKey.Options]: false,
  })

  // シナリオと難易度からスケジュールデータを取得
  const scheduleData = useMemo(
    () => data.getScheduleData(settings.scenario, settings.difficulty),
    [settings.scenario, settings.difficulty],
  )

  // スケジュールからアクション回数を自動計算
  const scheduleCounts = useMemo(() => {
    if (!settings.useScheduleLimits) return null
    return calculateCountsFromSchedule(settings.scheduleSelections, scheduleData)
  }, [scheduleData, settings.scheduleSelections, settings.useScheduleLimits])

  // パラメータボーナスの週別内訳
  const paramBonusBreakdown = useMemo(() => {
    if (!settings.useScheduleLimits) return []
    return getParameterBonusBreakdown(settings.scheduleSelections, settings.scenario, settings.difficulty)
  }, [settings.scheduleSelections, settings.scenario, settings.difficulty, settings.useScheduleLimits])

  // スケジュール選択が変わったらパラメータボーナスも再計算
  const handleScheduleSelect = (week: number, activityId: enums.ActivityIdType) => {
    const newSelections = { ...settings.scheduleSelections, [week]: activityId }
    const newBonus = calculateParameterBonusFromSchedule(newSelections, settings.scenario, settings.difficulty)
    onSettingsChange({
      ...settings,
      scheduleSelections: newSelections,
      parameterBonusBase: newBonus,
    })
  }

  // パネルが閉じていてピン留めでもない場合は何も描画しない
  if (!isOpen && !pinned) return null

  return (
    // ピン留め時はサイドパネル、非ピン時はオーバーレイモーダルとして表示
    <ScoreSettingsPanelLayout isOpen={isOpen} onClose={onClose} pinned={pinned}>
      {/* ヘッダー: タイトル + 閉じるボタン */}
      <SettingsPanelHeader onClose={onClose} />

      <div className="p-5 space-y-5">
        {/* プリセットセクション */}
        <div className={constant.SECTION_DIVIDER}>
          <CollapsibleSection
            title={<>{t('ui.header.preset')} <HelpTooltip text={t('ui.help.tooltip_preset')} /></>}
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
            title={<>{t('ui.header.scenario_difficulty')} <HelpTooltip text={t('ui.help.tooltip_scenario')} /></>}
            isOpen={sections[enums.ScoreSettingsSectionKey.Scenario]}
            onToggle={() => toggle(enums.ScoreSettingsSectionKey.Scenario)}
            variant={CollapsibleVariantType.Panel}
          >
            <ScenarioDifficultySection settings={settings} onSettingsChange={onSettingsChange} />
          </CollapsibleSection>
        </div>
        {/* スケジュール週毎選択 UI */}
        <div className={constant.SECTION_DIVIDER}>
          <CollapsibleSection
            title={<>{t('ui.header.schedule')} <HelpTooltip text={t('ui.help.tooltip_schedule')} /></>}
            isOpen={sections[enums.ScoreSettingsSectionKey.Schedule]}
            onToggle={() => toggle(enums.ScoreSettingsSectionKey.Schedule)}
            variant={CollapsibleVariantType.Panel}
          >
            <div className="mt-2 space-y-2">
              {/* スケジュール自動計算の有効/無効チェックボックス */}
              <CheckboxField
                label={t('ui.settings.schedule_auto')}
                checked={settings.useScheduleLimits}
                onChange={(checked) => onSettingsChange({ ...settings, useScheduleLimits: checked })}
              />
              {/* 週ごとのアクティビティ選択UI */}
              <ScheduleWeekSelector
                scheduleData={scheduleData!}
                scheduleSelections={settings.scheduleSelections}
                onSelect={handleScheduleSelect}
              />
              {/* スケジュールから算出した回数サマリー（自動計算有効時のみ） */}
              {scheduleCounts && (
                <ScheduleSummary
                  scheduleCounts={scheduleCounts}
                  settings={settings}
                  paramBonusBreakdown={paramBonusBreakdown}
                />
              )}
            </div>
          </CollapsibleSection>
        </div>

        {/* パラメータボーナス入力（スケジュール有効時は自動ロック） */}
        <div className={constant.SECTION_DIVIDER}>
          <CollapsibleSection
            title={
              <>{t('ui.settings.param_bonus_target')}
              {settings.useScheduleLimits && scheduleData ? ` (${t('ui.settings.auto')})` : ''}
              {' '}<HelpTooltip text={t('ui.help.tooltip_param_bonus')} /></>
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

        {/* アクション回数セクション */}
        <div className={constant.SECTION_DIVIDER}>
          <CollapsibleSection
            title={<>{t('ui.header.action_counts')} <HelpTooltip text={t('ui.help.tooltip_actions')} /></>}
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
            title={<>{t('ui.header.options')} <HelpTooltip text={t('ui.help.tooltip_options')} /></>}
            isOpen={sections[enums.ScoreSettingsSectionKey.Options]}
            onToggle={() => toggle(enums.ScoreSettingsSectionKey.Options)}
            variant={CollapsibleVariantType.Panel}
          >
            <SettingsOptionToggles settings={settings} onSettingsChange={onSettingsChange} />
          </CollapsibleSection>
        </div>
      </div>
    </ScoreSettingsPanelLayout>
  )
}

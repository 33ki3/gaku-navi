/**
 * スケジュールセクションコンポーネント
 *
 * カスタムモード・HIF・初編の3モードに応じてスケジュール設定UIを出し分ける。
 * - カスタムモード: パラメータボーナス行の手動入力
 * - HIF: HIF専用の週選択・試験比率設定
 * - 初編/Nia: 通常の週ごとアクティビティ選択
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScoreSettings } from '../../types/card'
import CollapsibleSection from '../ui/CollapsibleSection'
import * as enums from '../../types/enums'
import { CollapsibleVariantType } from '../../types/enums'
import type { ScheduleWeekData } from '../../data/score'
import type { ActionIdType } from '../../types/enums'
import { calculateParameterBonusFromSchedule, getParameterBonusBreakdown } from '../../utils/calculator/parameterBonus'
import { CustomParamBonusRows } from './CustomParamBonusRows'
import { HelpTooltip } from '../ui/HelpTooltip'
import { HifScheduleContent } from './hif/HifScheduleContent'
import { HajimeScheduleContent } from './hajime/HajimeScheduleContent'

/** ScheduleSection コンポーネントに渡すプロパティ */
interface ScheduleSectionProps {
  /** 現在の設定値 */
  settings: ScoreSettings
  /** 設定値変更コールバック */
  onSettingsChange: (settings: ScoreSettings) => void
  /** 解決済み難易度（null を DEFAULT_DIFFICULTY で代替済み） */
  resolvedDifficulty: enums.DifficultyType
  /** 週スケジュールデータ */
  scheduleData: ScheduleWeekData[] | null
  /** スケジュールから算出した回数（自動計算無効時は null） */
  scheduleCounts: Partial<Record<ActionIdType, number>> | null
  /** CollapsibleSection の開閉状態 */
  isOpen: boolean
  /** 開閉トグルコールバック */
  onToggle: () => void
}

/** スケジュールセクション（カスタム/HIF/初編を出し分ける） */
export function ScheduleSection({
  settings,
  onSettingsChange,
  resolvedDifficulty,
  scheduleData,
  scheduleCounts,
  isOpen,
  onToggle,
}: ScheduleSectionProps) {
  const { t } = useTranslation()

  const paramBonusBreakdown = useMemo(() => {
    if (!settings.useScheduleLimits || settings.useCustomMode) return []
    return getParameterBonusBreakdown(
      settings.scheduleSelections,
      settings.scenario,
      resolvedDifficulty,
      settings.hifExamRatios,
      settings.hifLessonSplitSub,
    )
  }, [
    settings.scheduleSelections,
    settings.scenario,
    resolvedDifficulty,
    settings.useScheduleLimits,
    settings.useCustomMode,
    settings.hifExamRatios,
    settings.hifLessonSplitSub,
  ])

  const handleScheduleSelect = (week: number, activityId: enums.ActivityIdType) => {
    const newSelections = { ...settings.scheduleSelections, [week]: activityId }
    const newBonus = calculateParameterBonusFromSchedule(
      newSelections,
      settings.scenario,
      resolvedDifficulty,
      settings.hifLessonSplitSub,
      settings.hifExamRatios,
    )
    onSettingsChange({
      ...settings,
      scheduleSelections: newSelections,
      parameterBonusBase: newBonus,
    })
  }

  return (
    <CollapsibleSection
      title={
        <span className="inline-flex items-center gap-1">
          {settings.useCustomMode ? t('ui.header.param_bonus_settings') : t('ui.header.schedule')}
          <HelpTooltip
            text={settings.useCustomMode ? t('ui.help.tooltip_custom_param_settings') : t('ui.help.tooltip_schedule')}
          />
        </span>
      }
      isOpen={isOpen}
      onToggle={onToggle}
      variant={CollapsibleVariantType.Panel}
    >
      <div className="mt-2 space-y-2">
        {settings.useCustomMode ? (
          /* カスタムシナリオ: パラメータボーナス行の手動入力 */
          <CustomParamBonusRows settings={settings} onSettingsChange={onSettingsChange} />
        ) : settings.scenario === enums.ScenarioType.Hif ? (
          /* HIF: HIF専用チェックボックス + HIF週選択UI */
          <HifScheduleContent
            settings={settings}
            onSettingsChange={onSettingsChange}
            resolvedDifficulty={resolvedDifficulty}
            scheduleData={scheduleData}
            scheduleCounts={scheduleCounts}
            paramBonusBreakdown={paramBonusBreakdown}
            onScheduleSelect={handleScheduleSelect}
          />
        ) : (
          /* 初編/Nia: 通常の週選択UI */
          <HajimeScheduleContent
            settings={settings}
            onSettingsChange={onSettingsChange}
            scheduleData={scheduleData}
            scheduleCounts={scheduleCounts}
            paramBonusBreakdown={paramBonusBreakdown}
            onScheduleSelect={handleScheduleSelect}
          />
        )}
      </div>
    </CollapsibleSection>
  )
}

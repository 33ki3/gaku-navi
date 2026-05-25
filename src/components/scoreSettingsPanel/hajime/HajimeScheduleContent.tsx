/**
 * 初編スケジュール内容コンポーネント
 *
 * スケジュール自動計算チェックボックス・週ごとのアクティビティ選択UI・
 * サマリーを表示する。
 */
import { useTranslation } from 'react-i18next'
import type { ScoreSettings } from '../../../types/card'
import { CheckboxField } from '../../ui/CheckboxField'
import * as enums from '../../../types/enums'
import type { ScheduleWeekData } from '../../../data/score'
import type { ActionIdType } from '../../../types/enums'
import { getParameterBonusBreakdown } from '../../../utils/calculator/parameterBonus'
import { ScheduleWeekSelector } from '../ScheduleWeekSelector'
import { ScheduleSummary } from '../ScheduleSummary'

/** HajimeScheduleContent コンポーネントに渡すプロパティ */
interface HajimeScheduleContentProps {
  /** 現在の設定値 */
  settings: ScoreSettings
  /** 設定値変更コールバック */
  onSettingsChange: (settings: ScoreSettings) => void
  /** 週スケジュールデータ */
  scheduleData: ScheduleWeekData[] | null
  /** スケジュールから算出した回数（自動計算無効時は null） */
  scheduleCounts: Partial<Record<ActionIdType, number>> | null
  /** パラメータボーナス内訳 */
  paramBonusBreakdown: ReturnType<typeof getParameterBonusBreakdown>
  /** 週・アクティビティ選択コールバック */
  onScheduleSelect: (week: number, activityId: enums.ActivityIdType) => void
}

/**
 * 初編スケジュール設定セクションを表示する。
 *
 * @param props - コンポーネントプロパティ
 * @returns 初編スケジュール内容要素
 */
export function HajimeScheduleContent({
  settings,
  onSettingsChange,
  scheduleData,
  scheduleCounts,
  paramBonusBreakdown,
  onScheduleSelect,
}: HajimeScheduleContentProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* スケジュール自動計算の有効/無効チェックボックス */}
      <CheckboxField
        label={t('ui.settings.schedule_auto')}
        checked={settings.useScheduleLimits}
        onChange={(checked) => onSettingsChange({ ...settings, useScheduleLimits: checked })}
      />
      {/* 週ごとのアクティビティ選択UI */}
      {scheduleData && (
        <ScheduleWeekSelector
          scheduleData={scheduleData}
          scheduleSelections={settings.scheduleSelections}
          onSelect={onScheduleSelect}
        />
      )}
      {/* スケジュールから算出した回数サマリー（自動計算有効時のみ） */}
      {scheduleCounts && (
        <ScheduleSummary
          scheduleCounts={scheduleCounts}
          settings={settings}
          paramBonusBreakdown={paramBonusBreakdown}
        />
      )}
    </>
  )
}

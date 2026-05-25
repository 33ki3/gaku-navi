/**
 * HIF専用スケジュール内容コンポーネント
 *
 * スケジュール自動計算チェックボックス・Sub分割チェックボックス・
 * HIF週選択UI・サマリーを表示する。
 */
import { useTranslation } from 'react-i18next'
import type { ScoreSettings } from '../../../types/card'
import { CheckboxField } from '../../ui/CheckboxField'
import * as enums from '../../../types/enums'
import type { ScheduleWeekData } from '../../../data/score'
import type { ActionIdType } from '../../../types/enums'
import {
  calculateParameterBonusFromSchedule,
  getParameterBonusBreakdown,
} from '../../../utils/calculator/parameterBonus'
import { HifScheduleWeekSelector } from './HifScheduleWeekSelector'
import { ScheduleSummary } from '../ScheduleSummary'
import { normalizeHifLessonActivityForPairMode } from '../../../utils/hifScheduleHelpers'

/** HifScheduleContent コンポーネントに渡すプロパティ */
interface HifScheduleContentProps {
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
  /** パラメータボーナス内訳 */
  paramBonusBreakdown: ReturnType<typeof getParameterBonusBreakdown>
  /** 週・アクティビティ選択コールバック */
  onScheduleSelect: (week: number, activityId: enums.ActivityIdType) => void
}

/**
 * HIF専用スケジュール内容を表示する。
 *
 * @param props - コンポーネントプロパティ
 * @returns HIFスケジュール内容要素
 */
export function HifScheduleContent({
  settings,
  onSettingsChange,
  resolvedDifficulty,
  scheduleData,
  scheduleCounts,
  paramBonusBreakdown,
  onScheduleSelect,
}: HifScheduleContentProps) {
  const { t } = useTranslation()
  const hifLessonSplitSub = settings.hifLessonSplitSub ?? true
  const hifExamRatios = settings.hifExamRatios ?? []

  return (
    <>
      {/* スケジュール自動計算の有効/無効チェックボックス */}
      <CheckboxField
        label={t('ui.settings.schedule_auto')}
        checked={settings.useScheduleLimits}
        onChange={(checked) => onSettingsChange({ ...settings, useScheduleLimits: checked })}
      />
      {/* HIF: サブを半分ずつ割り振るチェックボックス */}
      <CheckboxField
        label={t('ui.settings.hif_lesson_split_sub')}
        checked={hifLessonSplitSub}
        onChange={(value) => {
          const normalizedSelections = !value
            ? Object.fromEntries(
                Object.entries(settings.scheduleSelections).map(([week, activityId]) => [
                  Number(week),
                  normalizeHifLessonActivityForPairMode(activityId),
                ]),
              )
            : settings.scheduleSelections
          const newBonus = calculateParameterBonusFromSchedule(
            normalizedSelections,
            settings.scenario,
            resolvedDifficulty,
            value,
            hifExamRatios,
          )
          onSettingsChange({
            ...settings,
            scheduleSelections: normalizedSelections,
            hifLessonSplitSub: value,
            parameterBonusBase: newBonus,
          })
        }}
      />
      {/* HIF週毎選択・試験比率設定UI */}
      {scheduleData && (
        <HifScheduleWeekSelector
          scheduleData={scheduleData}
          scheduleSelections={settings.scheduleSelections}
          onSelect={onScheduleSelect}
          hifExamRatios={hifExamRatios}
          onHifExamRatiosChange={(ratios) => {
            const newBonus = calculateParameterBonusFromSchedule(
              settings.scheduleSelections,
              settings.scenario,
              resolvedDifficulty,
              hifLessonSplitSub,
              ratios,
            )
            onSettingsChange({ ...settings, hifExamRatios: ratios, parameterBonusBase: newBonus })
          }}
          hifLessonSplitSub={hifLessonSplitSub}
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

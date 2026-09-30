/**
 * HIF専用スケジュール内容コンポーネント
 *
 * スケジュール自動計算チェックボックス・Sub分割チェックボックス・
 * HIF週選択UI・サマリーを表示する。
 */
import { useTranslation } from 'react-i18next'
import type { ScheduleWeekData } from '../../../data/score'
import type { ScoreSettings } from '../../../types/card'
import type { ActionIdType } from '../../../types/enums'
import * as enums from '../../../types/enums'
import { getParameterBonusBreakdown } from '../../../utils/calculator/parameterBonus'
import { normalizeHifLessonActivityForPairMode } from '../../../utils/hifScheduleHelpers'
import { normalizeScoreSettingsDerived } from '../../../utils/scoreSettings'
import { CheckboxField } from '../../ui/CheckboxField'
import { ScheduleSummary } from '../ScheduleSummary'
import { HifScheduleWeekSelector } from './HifScheduleWeekSelector'

/** HifScheduleContent コンポーネントに渡すプロパティ */
interface HifScheduleContentProps {
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
 * HIF専用スケジュール内容を表示する。
 *
 * @param props - コンポーネントプロパティ
 * @returns HIFスケジュール内容要素
 */
export function HifScheduleContent({
  settings,
  onSettingsChange,
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
        onChange={(checked) =>
          onSettingsChange(
            normalizeScoreSettingsDerived({
              ...settings,
              useScheduleLimits: checked,
            }),
          )
        }
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
          onSettingsChange(
            normalizeScoreSettingsDerived({
              ...settings,
              scheduleSelections: normalizedSelections,
              hifLessonSplitSub: value,
            }),
          )
        }}
      />
      {/* HIF週毎選択・試験比率設定UI */}
      {scheduleData && (
        <HifScheduleWeekSelector
          scheduleData={scheduleData}
          scheduleSelections={settings.scheduleSelections}
          onSelect={onScheduleSelect}
          hifExamRatios={hifExamRatios}
          onHifExamRatiosChange={(ratios) =>
            onSettingsChange(
              normalizeScoreSettingsDerived({
                ...settings,
                hifExamRatios: ratios,
              }),
            )
          }
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

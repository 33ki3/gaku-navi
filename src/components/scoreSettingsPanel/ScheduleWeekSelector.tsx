/**
 * スケジュール週毎選択コンポーネント
 *
 * 各週のアクティビティ（レッスン・お出かけ・お休みなど）を
 * トグルボタンで選ぶ。固定週（試験など）はテキストのみ表示。
 */
import { useTranslation } from 'react-i18next'
import type { TranslationKey } from '../../i18n'
import type { ScheduleWeekData } from '../../data'
import { ToggleButton } from '../ui/ToggleButton'
import * as enums from '../../types/enums'
import { ButtonSizeType } from '../../types/enums'
import * as data from '../../data'

/** ScheduleWeekSelector コンポーネントに渡すプロパティ */
interface ScheduleWeekSelectorProps {
  /** スケジュールデータ（週毎の選択肢） */
  scheduleData: ScheduleWeekData[]
  /** 現在の選択（週番号 → アクティビティID） */
  scheduleSelections: Record<number, enums.ActivityIdType>
  /** アクティビティが選ばれたときに呼ばれる関数 */
  onSelect: (week: number, activityId: enums.ActivityIdType) => void
}

/** スケジュール週毎選択 UI */
export function ScheduleWeekSelector({
  scheduleData,
  scheduleSelections,
  onSelect,
}: ScheduleWeekSelectorProps) {
  const { t } = useTranslation()

  // 各週のアクティビティ選択ボタンリストを描画する（固定週は自動選択、それ以外はユーザーが選ぶ）
  return (
    <div className="space-y-0.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
      {scheduleData.map((week) => {
        const selected = scheduleSelections[week.week] ?? ''
        // 固定週（試験など）は選択できない
        const isFixed = week.fixed && !week.can_rest
        // お休みできる週は「お休み」ボタンを追加
        const allOptions = [
          ...week.activities,
          ...(week.can_rest
            ? [{ id: enums.ActionIdType.Rest, label: 'score.activity.rest' as TranslationKey }]
            : []),
        ]

        const isMidExam = week.activities.some((a) => a.id === enums.ActivityIdType.MidExam)
        const isExam = isMidExam || week.activities.some((a) => a.id === enums.ActivityIdType.FinalExam)

        return (
          // 1週分の行: 試験週は上側区切り、中間試験は下側区切りも付ける
          <div
            key={week.week}
            className={`flex items-start gap-2 py-1 ${isExam ? 'border-t border-slate-200 pt-2 mt-1' : ''} ${isMidExam ? 'border-b border-slate-200 pb-2 mb-1' : ''}`}
          >
            {/* 週番号ラベル */}
            <span
              className={`w-7 text-right text-[10px] font-black shrink-0 pt-0.5 ${isFixed ? 'text-slate-400' : 'text-slate-600'}`}
            >
              {week.week}
              {t('ui.unit.week')}
            </span>
            {/* 固定週はテキスト表示、その他はアクティビティトグルボタン */}
            {isFixed ? (
              <span className="text-[11px] text-slate-400 font-medium pt-0.5">
                {t(week.activities[0].label)}
              </span>
            ) : (
              // アクティビティ選択ボタン群（お休み含む）
              <div className="flex flex-wrap gap-1">
                {allOptions.map((act) => (
                  <ToggleButton
                    key={act.id}
                    isActive={selected === act.id}
                    onClick={() => onSelect(week.week, act.id)}
                    activeClass={`${data.getActivityColor(act.id)} border border-transparent`}
                    inactiveClass="bg-white text-slate-400 border border-slate-200 hover:bg-slate-100"
                    size={ButtonSizeType.Sm}
                    className="text-[10px]"
                  >
                    {t(act.label)}
                  </ToggleButton>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

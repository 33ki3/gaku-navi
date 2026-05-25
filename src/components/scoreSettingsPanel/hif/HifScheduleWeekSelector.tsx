/**
 * HIF専用スケジュール週毎選択コンポーネント
 *
 * 選抜ステージと本選ステージを別セクションに分けて表示する。
 * 公開レッスン週はメイン/サブの属性選択、試験週は比率入力 UI を持つ。
 */
import { useTranslation } from 'react-i18next'
import type { ParameterValues } from '../../../types/card'
import type { ScheduleWeekData } from '../../../data'
import * as enums from '../../../types/enums'
import { ParameterType } from '../../../types/enums'
import { getHifExamWeeks, updateHifExamRatio, filterByStage } from '../../../utils/hifScheduleHelpers'
import { HifWeekRows } from './HifWeekRows'

/** HifScheduleWeekSelector コンポーネントに渡すプロパティ */
interface HifScheduleWeekSelectorProps {
  /** スケジュールデータ（週毎の選択肢） */
  scheduleData: ScheduleWeekData[]
  /** 現在の選択（週番号 → アクティビティID） */
  scheduleSelections: Record<number, enums.ActivityIdType>
  /** アクティビティが選ばれたときに呼ばれる関数 */
  onSelect: (week: number, activityId: enums.ActivityIdType) => void
  /** HIF選抜試験比率 */
  hifExamRatios: ParameterValues[]
  /** HIF選抜試験比率変更時コールバック */
  onHifExamRatiosChange: (ratios: ParameterValues[]) => void
  /** HIFレッスンのサブ値を残り2属性に半分ずつ割り振るか */
  hifLessonSplitSub: boolean
}

/**
 * HIF専用スケジュール週毎選択UIを表示する。
 *
 * @param props - コンポーネントプロパティ
 * @returns HIFスケジュール選択UI要素
 */
export function HifScheduleWeekSelector({
  scheduleData,
  scheduleSelections,
  onSelect,
  hifExamRatios,
  onHifExamRatiosChange,
  hifLessonSplitSub,
}: HifScheduleWeekSelectorProps) {
  const { t } = useTranslation()
  const hifExamWeeks = getHifExamWeeks(scheduleData)
  const normalizedExamRatios: ParameterValues[] = [0, 1, 2].map((index) => ({
    vocal: hifExamRatios[index]?.vocal ?? 0,
    dance: hifExamRatios[index]?.dance ?? 0,
    visual: hifExamRatios[index]?.visual ?? 0,
  }))

  // 試験比率スライダーの変更を hifExamRatios 配列に反映して親に通知する
  const handleExamRatioChange = (examIndex: number, key: ParameterType, value: number) => {
    if (examIndex < 0 || examIndex > 2) return
    onHifExamRatiosChange(updateHifExamRatio(normalizedExamRatios, examIndex, key, value))
  }

  // 選抜ステージ（週1〜14）と本選ステージ（週15〜）の週データを分離する
  const selectionWeeks = filterByStage(scheduleData, enums.HifStage.Selection)
  const finalWeeks = filterByStage(scheduleData, enums.HifStage.Final)
  // 本選の週番号表示を選抜終了後の相対番号（週1〜）にするためのオフセット
  const finalWeekOffset = finalWeeks[0] !== undefined ? finalWeeks[0].week - 1 : 0

  // 選抜ステージと本選ステージをそれぞれ別パネルとして表示する
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
      <div className="rounded border border-slate-200 bg-white/70 px-2 py-1">
        <div className="text-[10px] font-black text-slate-600">{t('ui.settings.hif_stage_selection')}</div>
        <div className="space-y-0.5">
          {/* 選抜ステージ（前半）の週一覧 */}
          <HifWeekRows
            weeks={selectionWeeks}
            scheduleSelections={scheduleSelections}
            hifExamWeeks={hifExamWeeks}
            normalizedExamRatios={normalizedExamRatios}
            hifLessonSplitSub={hifLessonSplitSub}
            onSelect={onSelect}
            onExamRatioChange={handleExamRatioChange}
          />
        </div>
      </div>
      <div className="rounded border border-slate-200 bg-white/70 px-2 py-1">
        <div className="text-[10px] font-black text-slate-600">{t('ui.settings.hif_stage_final')}</div>
        <div className="space-y-0.5">
          {/* 本選ステージ（後半）の週一覧 */}
          <HifWeekRows
            weeks={finalWeeks}
            weekOffset={finalWeekOffset}
            scheduleSelections={scheduleSelections}
            hifExamWeeks={hifExamWeeks}
            normalizedExamRatios={normalizedExamRatios}
            hifLessonSplitSub={hifLessonSplitSub}
            onSelect={onSelect}
            onExamRatioChange={handleExamRatioChange}
          />
        </div>
      </div>
    </div>
  )
}

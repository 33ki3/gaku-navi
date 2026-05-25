/**
 * HIF公開レッスン週の表示コンポーネント。
 *
 * splitSub 設定に応じて、メイン属性トグルまたは Main/Sub 2段の選択 UI を表示する。
 */
import { useTranslation } from 'react-i18next'
import * as enums from '../../../types/enums'
import { HIF_LESSON_BASE_OPTIONS } from '../../../data/score/hifScheduleMaster'
import {
  normalizeHifLessonActivityForPairMode,
  resolveHifLessonActivity,
  resolveHifLessonPair,
} from '../../../utils/hifScheduleHelpers'
import { LessonMainSelector } from './LessonMainSelector'
import { HifLessonPartRows } from './HifLessonPartRows'

/** HifLessonWeekRow コンポーネントに渡すプロパティ */
interface HifLessonWeekRowProps {
  /** 週番号の表示オフセット */
  weekOffset: number
  /** 表示中の週番号 */
  weekNumber: number
  /** 現在の選択値 */
  selected: enums.ActivityIdType | undefined
  /** サブ属性をメイン以外2属性へ自動配分するか */
  hifLessonSplitSub: boolean
  /** 活動選択時のコールバック */
  onSelect: (activityId: enums.ActivityIdType) => void
}

/**
 * HIF公開レッスン週の1行表示を描画する。
 *
 * @param props - コンポーネントプロパティ
 * @returns 公開レッスン週の表示要素
 */
export function HifLessonWeekRow({
  weekOffset,
  weekNumber,
  selected,
  hifLessonSplitSub,
  onSelect,
}: HifLessonWeekRowProps) {
  const { t } = useTranslation()
  const currentPair = (() => {
    if (hifLessonSplitSub || selected === undefined) return { main: undefined, sub: undefined }
    const normalizedSelected = normalizeHifLessonActivityForPairMode(selected)
    return resolveHifLessonPair(normalizedSelected) ?? { main: undefined, sub: undefined }
  })()

  const pickAlternative = (picked: enums.ActivityIdType) =>
    HIF_LESSON_BASE_OPTIONS.find((option) => option !== picked) ?? enums.ActivityIdType.VoLesson

  // Main/Sub の選択変更時は同一属性の重複を避けて複合アクティビティIDへ変換する
  const handleHifLessonPartSelect = (part: enums.LessonPart, picked: enums.ActivityIdType) => {
    const fallback = pickAlternative(picked)
    let nextMain = part === enums.LessonPart.Main ? picked : (currentPair.main ?? fallback)
    let nextSub = part === enums.LessonPart.Sub ? picked : (currentPair.sub ?? fallback)
    if (nextMain === nextSub) {
      if (part === enums.LessonPart.Main) nextSub = pickAlternative(nextMain)
      else nextMain = pickAlternative(nextSub)
    }
    onSelect(resolveHifLessonActivity(nextMain, nextSub))
  }

  return (
    <>
      <div className="flex items-start gap-2">
        <span className="w-7 text-right text-[10px] font-black shrink-0 pt-0.5 text-slate-600">
          {weekNumber - weekOffset}
          {t('ui.unit.week')}
        </span>
        {hifLessonSplitSub ? (
          <LessonMainSelector selected={selected} onSelect={onSelect} />
        ) : (
          <div className="text-[10px] font-bold text-slate-500">{t('ui.settings.hif_lesson_select')}</div>
        )}
      </div>
      {!hifLessonSplitSub && <HifLessonPartRows currentPair={currentPair} onPartSelect={handleHifLessonPartSelect} />}
    </>
  )
}

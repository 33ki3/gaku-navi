/**
 * HIF 公開レッスン週のメイン属性選択コンポーネント。
 *
 * HIF の splitSub=true 表示で使用し、Vo/Da/Vi のメイン属性を
 * トグルボタンで切り替える UI を提供する。
 */
import { useTranslation } from 'react-i18next'

import { ToggleButton } from '../../ui/ToggleButton'
import * as enums from '../../../types/enums'
import { ButtonSizeType } from '../../../types/enums'
import * as data from '../../../data'
import { HIF_LESSON_BASE_OPTIONS } from '../../../data/score/hifScheduleMaster'
import { resolveHifLessonPair } from '../../../utils/hifScheduleHelpers'

/** LessonMainSelector コンポーネントに渡すプロパティ */
interface LessonMainSelectorProps {
  /** 現在の選択値 */
  selected: enums.ActivityIdType | undefined
  /** メイン属性選択時のコールバック */
  onSelect: (activityId: enums.ActivityIdType) => void
}

/**
 * 公開レッスン週のメイン属性トグル群を表示する。
 *
 * @param props - コンポーネントプロパティ
 * @returns メイン属性選択トグル群
 */
export function LessonMainSelector({ selected, onSelect }: LessonMainSelectorProps) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-0.5">
      {HIF_LESSON_BASE_OPTIONS.map((act) => {
        const effectiveMain = selected !== undefined ? (resolveHifLessonPair(selected)?.main ?? selected) : undefined
        return (
          <ToggleButton
            key={act}
            isActive={effectiveMain === act}
            onClick={() => onSelect(act)}
            activeClass={`${data.getActivityColor(act)} border border-transparent`}
            inactiveClass="bg-white text-slate-400 border border-slate-200 hover:bg-slate-100"
            size={ButtonSizeType.Sm}
            className="text-[10px]"
          >
            {act === enums.ActivityIdType.VoLesson
              ? t('score.activity.vo_lesson')
              : act === enums.ActivityIdType.DaLesson
                ? t('score.activity.da_lesson')
                : t('score.activity.vi_lesson')}
          </ToggleButton>
        )
      })}
    </div>
  )
}

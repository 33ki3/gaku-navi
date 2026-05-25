/**
 * HIF公開レッスンのメイン/サブ属性選択行コンポーネント
 *
 * splitSub=false のときにレッスン週の下に表示される Main/Sub 選択ボタン群。
 */
import { useTranslation } from 'react-i18next'
import * as enums from '../../../types/enums'
import { ButtonSizeType } from '../../../types/enums'
import * as data from '../../../data'
import { HIF_LESSON_BASE_OPTIONS, HIF_LESSON_OPTION_LABELS } from '../../../data/score/hifScheduleMaster'
import { ToggleButton } from '../../ui/ToggleButton'

/** HifLessonPartRows コンポーネントに渡すプロパティ */
interface HifLessonPartRowsProps {
  /** 現在の Main/Sub ペア */
  currentPair: { main?: enums.ActivityIdType; sub?: enums.ActivityIdType }
  /** Main/Sub ボタンを選択したときのコールバック */
  onPartSelect: (part: enums.LessonPart, picked: enums.ActivityIdType) => void
}

/**
 * HIF公開レッスンの Main/Sub 選択行を表示する（splitSub=false時のみ）。
 *
 * @param props - コンポーネントプロパティ
 * @returns Main/Sub 選択行要素
 */
export function HifLessonPartRows({ currentPair, onPartSelect }: HifLessonPartRowsProps) {
  const { t } = useTranslation()

  // Main/Sub どちらのパートでも共通の属性選択ボタン行を生成する
  const renderPartButtons = (part: enums.LessonPart, active: enums.ActivityIdType | undefined, label: string) => (
    <div className="flex items-center gap-2">
      <span className="w-7"></span>
      <span className="text-[10px] font-bold text-slate-500 mr-2">{label}</span>
      {HIF_LESSON_BASE_OPTIONS.map((act) => (
        <ToggleButton
          key={`${part}-${act}`}
          isActive={active === act}
          onClick={() => onPartSelect(part, act)}
          activeClass={`${data.getActivityColor(act)} border border-transparent`}
          inactiveClass="bg-white text-slate-400 border border-slate-200 hover:bg-slate-100"
          size={ButtonSizeType.Sm}
          className="text-[10px]"
        >
          {t(HIF_LESSON_OPTION_LABELS[act]!)}
        </ToggleButton>
      ))}
    </div>
  )

  return (
    <>
      {renderPartButtons(enums.LessonPart.Main, currentPair.main, t('ui.settings.hif_lesson_main'))}
      {renderPartButtons(enums.LessonPart.Sub, currentPair.sub, t('ui.settings.hif_lesson_sub'))}
    </>
  )
}

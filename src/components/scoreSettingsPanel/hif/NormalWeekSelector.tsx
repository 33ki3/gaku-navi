/**
 * HIF 通常週の選択肢トグル表示コンポーネント。
 *
 * 活動候補（必要に応じて休むを含む）を横並びのトグルで表示する。
 */
import { useTranslation } from 'react-i18next'

import { ToggleButton } from '../../ui/ToggleButton'
import * as data from '../../../data'
import * as enums from '../../../types/enums'
import { ButtonSizeType } from '../../../types/enums'
import type { ScheduleWeekData } from '../../../data'

/** 通常週の活動オプション */
type NormalWeekOption = ScheduleWeekData['activities'][number] | typeof data.RestOption

/** NormalWeekSelector コンポーネントに渡すプロパティ */
interface NormalWeekSelectorProps {
  /** 表示する活動オプション一覧 */
  options: NormalWeekOption[]
  /** 現在の選択値 */
  selected: enums.ActivityIdType | undefined
  /** 活動選択時のコールバック */
  onSelect: (activityId: enums.ActivityIdType) => void
}

/**
 * HIF通常週の活動選択トグル群を表示する。
 *
 * @param props - コンポーネントプロパティ
 * @returns 活動選択トグル群
 */
export function NormalWeekSelector({ options, selected, onSelect }: NormalWeekSelectorProps) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-0.5">
      {options.map((act) => (
        <ToggleButton
          key={act.id}
          isActive={selected !== undefined && selected === act.id}
          onClick={() => onSelect(act.id)}
          activeClass={`${data.getActivityColor(act.id)} border border-transparent`}
          inactiveClass="bg-white text-slate-400 border border-slate-200 hover:bg-slate-100"
          size={ButtonSizeType.Sm}
          className="text-[10px]"
        >
          {t(act.label)}
        </ToggleButton>
      ))}
    </div>
  )
}

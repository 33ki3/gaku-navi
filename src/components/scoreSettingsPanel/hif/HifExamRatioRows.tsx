/**
 * HIF試験週の比率入力行コンポーネント
 *
 * 試験週の Vo/Da/Vi ごとのパラメータ比率を入力する行を表示する。
 */
import { useTranslation } from 'react-i18next'
import type { ParameterValues } from '../../../types/card'
import { ParameterType } from '../../../types/enums'
import * as data from '../../../data'
import { SpinnerInput } from '../../ui/SpinnerInput'

/** HifExamRatioRows コンポーネントに渡すプロパティ */
interface HifExamRatioRowsProps {
  /** 対象試験のインデックス（0〜2） */
  examIndex: number
  /** 正規化済みの試験比率配列 */
  normalizedExamRatios: ParameterValues[]
  /** 比率変更時のコールバック */
  onExamRatioChange: (examIndex: number, key: ParameterType, value: number) => void
}

/**
 * 試験週の Vo/Da/Vi 比率入力行を表示する。
 *
 * @param props - コンポーネントプロパティ
 * @returns 比率入力行要素
 */
export function HifExamRatioRows({ examIndex, normalizedExamRatios, onExamRatioChange }: HifExamRatioRowsProps) {
  const { t } = useTranslation()
  const ratioRow = normalizedExamRatios[examIndex] ?? { vocal: 0, dance: 0, visual: 0 }
  return (
    <>
      {([ParameterType.Vocal, ParameterType.Dance, ParameterType.Visual] as const).map((p) => (
        <div key={p} className="flex items-center gap-2">
          <span className="w-7"></span>
          <div className="flex-1 min-w-0">
            <label className={`text-[10px] font-bold ${data.getParameterTextColor(p)}`}>
              {p === ParameterType.Vocal
                ? t('ui.settings.attr_vo')
                : p === ParameterType.Dance
                  ? t('ui.settings.attr_da')
                  : t('ui.settings.attr_vi')}
            </label>
          </div>
          <SpinnerInput value={ratioRow[p]} onChange={(val) => onExamRatioChange(examIndex, p, val)} min={0} />
        </div>
      ))}
    </>
  )
}

/** 現在値に応じた進捗バーと右側の進捗率を表示し、span構造でボタン内にも配置する */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'

/** 進捗の読み上げ名・現在値・上限と表示色の上書き */
interface ProgressBarProps {
  /** アチーブ名や「目標レベルまでの進捗度」など、読み上げる対象名 */
  label: string
  /** 進捗へ反映する現在値 */
  value: number
  /** 100%となる達成条件 */
  max: number
  /** バーと進捗率を包む行の余白や配置を調整する追加クラス */
  className?: string
  /** 未達成部分の色を変更する場合に指定する */
  trackClassName?: string
  /** 達成部分の色を変更する場合に指定する */
  fillClassName?: string
  /** バー右側の進捗率の文字色・文字サイズを変更する追加クラス */
  percentClassName?: string
}

/**
 * 現在値を範囲内に収め、バーと右側の進捗率に同じ値を表示する
 * @param props 進捗値と上限、読み上げ名、表示スタイル
 * @returns 全達成時に色が切り替わる進捗バー
 */
export function ProgressBar({
  label,
  value,
  max,
  className = '',
  trackClassName,
  fillClassName,
  percentClassName,
}: ProgressBarProps) {
  const { t } = useTranslation()
  const isCompleted = max > 0 && value >= max
  const currentValue = Math.max(0, Math.min(value, max))
  const percent = max > 0 ? (currentValue / max) * 100 : 100
  // 小さい達成量も表示し、目標PLvと個別アチーブで同じ進捗率の表記を使う
  const percentLabel = t('ui.format.percent', {
    value:
      percent > 0 && percent < 1
        ? percent.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : Math.round(percent).toLocaleString(),
  })

  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span
        className={`h-1.5 flex-1 overflow-hidden rounded-full ${trackClassName ?? (isCompleted ? constant.ACHIEVEMENT_COMPLETE_TRACK_CLASS : 'bg-slate-100')}`}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={currentValue}
      >
        <span
          className={`block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${fillClassName ?? (isCompleted ? constant.ACHIEVEMENT_COMPLETE_FILL_CLASS : 'bg-sky-500')}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span
        className={`w-9 shrink-0 text-right text-[11px] font-bold tabular-nums ${percentClassName ?? (isCompleted ? constant.ACHIEVEMENT_COMPLETE_TEXT_CLASS : 'text-sky-700')}`}
      >
        {percentLabel}
      </span>
    </span>
  )
}

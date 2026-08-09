/**
 * 最適編成の計算・キャンセルボタン
 */
import { useTranslation } from 'react-i18next'
import type { ExhaustiveProgress } from '../../types/unit'

interface OptimizeUnitButtonProps {
  /** 最適編成を計算中か */
  isCalculating: boolean
  /** 総当たり計算の進捗 */
  exhaustiveProgress: ExhaustiveProgress | null
  /** 最適編成計算を開始する関数 */
  onOptimize: () => void
  /** 計算中の処理をキャンセルする関数 */
  onCancel: () => void
}
/**
 * 計算状態に応じたラベルと色で最適編成ボタンを表示する
 *
 * @param props - 計算状態、進捗、開始・キャンセル処理
 * @returns 最適編成の計算ボタン
 */
export function OptimizeUnitButton({
  isCalculating,
  exhaustiveProgress,
  onOptimize,
  onCancel,
}: OptimizeUnitButtonProps) {
  const { t } = useTranslation()

  /** 計算中は確認後にキャンセルし、待機中は計算を開始する */
  const handleClick = () => {
    if (!isCalculating) {
      onOptimize()
      return
    }
    if (window.confirm(t('unit.cancel_confirm'))) onCancel()
  }

  const label =
    isCalculating && exhaustiveProgress
      ? t('unit.progress_count', {
          done: exhaustiveProgress.done.toLocaleString(),
          total: exhaustiveProgress.total.toLocaleString(),
        })
      : isCalculating
        ? t('unit.calculating')
        : t('unit.auto_optimize')

  const progressValue =
    isCalculating && exhaustiveProgress && exhaustiveProgress.total > 0
      ? Math.min(Math.max(exhaustiveProgress.done, 0), exhaustiveProgress.total)
      : null

  return (
    <button
      type="button"
      onClick={handleClick}
      title={t('unit.auto_optimize_tip')}
      className={`relative flex-1 overflow-hidden rounded-xl py-2 text-xs font-bold transition-colors ${
        isCalculating
          ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 active:bg-slate-400'
          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
      }`}
    >
      {progressValue !== null && exhaustiveProgress && (
        /* 計算中の進捗トラック（ボタン全体への重ね表示） */
        <span
          role="progressbar"
          aria-label={t('unit.progress_count', {
            done: progressValue.toLocaleString(),
            total: exhaustiveProgress.total.toLocaleString(),
          })}
          aria-valuemin={0}
          aria-valuemax={exhaustiveProgress.total}
          aria-valuenow={progressValue}
          className="pointer-events-none absolute inset-0 bg-slate-100"
        >
          {/* 進捗バー（左から右へ伸長） */}
          <span
            aria-hidden="true"
            // 更新間隔より長いCSSトランジションは高速端末で進捗に追随できず、途中で止まって見えるため使わない
            className="block h-full bg-amber-500 transition-none"
            style={{ width: `${(progressValue / exhaustiveProgress.total) * 100}%` }}
          />
        </span>
      )}
      <span className="relative">{label}</span>
    </button>
  )
}

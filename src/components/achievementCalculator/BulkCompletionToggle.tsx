/** 未達成・一部達成・全達成を示す、共通の一括切り替え操作 */
import { useTranslation } from 'react-i18next'

/** 対象全体の達成状況と一括操作の通知先 */
interface BulkCompletionToggleProps {
  /** 操作対象を読み上げとヘルプに示す名称 */
  name: string
  /** 対象がすべて達成済みか */
  isCompleted: boolean
  /** 一部だけ達成済みで中間状態を表示するか */
  isPartial: boolean
  /** 全達成または全未達成へ変更する */
  onChange: (completed: boolean) => void
}

/**
 * 一部達成からは全達成へ、全達成からは全未達成へ切り替える
 * @param props 対象の名称・達成状態・一括変更の通知先
 * @returns 一部達成を中間状態として表示するチェック操作
 */
export function BulkCompletionToggle({ name, isCompleted, isPartial, onChange }: BulkCompletionToggleProps) {
  const { t } = useTranslation()
  const label = t('achievement_calculator.form.bulk_completion_toggle', { name })
  const hint = t(
    isCompleted ? 'achievement_calculator.form.bulk_clear_hint' : 'achievement_calculator.form.bulk_complete_hint',
  )

  // 中間状態をaria-checkedにも伝え、見た目だけに依存せず一部達成を識別できるようにする
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isCompleted ? true : isPartial ? 'mixed' : false}
      aria-label={label}
      title={t('achievement_calculator.form.bulk_completion_title', { label, hint })}
      onClick={() => onChange(!isCompleted)}
      className="flex h-8 w-10 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
    >
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 rounded-full border transition-colors ${isCompleted ? 'border-emerald-500 bg-emerald-500' : isPartial ? 'border-sky-300 bg-sky-100' : 'border-slate-300 bg-slate-200'}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${isCompleted ? 'translate-x-4 text-emerald-700' : isPartial ? 'translate-x-2 text-sky-700' : 'text-slate-500'}`}
        >
          {isCompleted ? (
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 8 3 3 7-7" />
            </svg>
          ) : isPartial ? (
            <span className="h-0.5 w-2 rounded bg-current" />
          ) : null}
        </span>
      </span>
    </button>
  )
}

/**
 * デフォルトのエラーフォールバック UI
 *
 * ErrorBoundary がカスタムフォールバックを受け取っていない場合に表示する。
 * 関数コンポーネントとして定義し useTranslation で i18n に対応する。
 * 画面描画を妨げている可能性がある保存データを特定し、可能な範囲で修復できる。
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StorageHealthIssue } from '../../utils/storageHealth'
import { inspectStoredData, repairStoredDataBatch } from '../../utils/storageHealth'

/** ErrorFallback に渡すプロパティ */
interface ErrorFallbackProps {
  /** キャッチしたエラー */
  error: Error | null
  /** 「キャンセル」ボタン押下時のコールバック（省略時はボタン非表示） */
  onCancel?: () => void
}

/**
 * エラー発生時に表示するデフォルトのフォールバック UI。
 *
 * @param props - フォールバック表示に必要な値
 * @returns エラーフォールバック要素
 */
export function ErrorFallback({ error, onCancel }: ErrorFallbackProps) {
  const { t } = useTranslation()
  const storageIssues: StorageHealthIssue[] = (() => {
    try {
      return inspectStoredData()
    } catch {
      return []
    }
  })()
  const [repairError, setRepairError] = useState(false)

  /** 検出されたデータを可能な範囲で修復して、アプリを再読み込みする */
  const handleRepairAll = () => {
    if (!window.confirm(t('ui.message.error_boundary_storage_repair_all_confirm'))) return

    if (!repairStoredDataBatch(storageIssues.map((issue) => issue.key))) {
      setRepairError(true)
      return
    }
    window.location.reload()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[120px] p-4 rounded-lg border border-red-200 bg-red-50 text-center gap-2">
      <p className="text-sm font-bold text-red-600">{t('ui.message.error_boundary_title')}</p>
      <p className="text-xs text-red-400">{error?.message ?? t('ui.message.error_boundary_unknown')}</p>
      <div className="flex gap-2 mt-1">
        {onCancel && (
          /* フォールバック表示のみを閉じて呼び出し側へ制御を戻す */
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-xs font-bold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            {t('ui.message.error_boundary_cancel')}
          </button>
        )}
        {storageIssues.length === 0 && (
          /* 保存データに原因が見つからない場合だけ、データを変更せずリロードする */
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-1 text-xs font-bold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            {t('ui.message.error_boundary_reload')}
          </button>
        )}
      </div>
      {storageIssues.length > 0 && (
        <section className="mt-3 w-full max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
          <p className="text-xs font-bold text-amber-800">{t('ui.message.error_boundary_storage_title')}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
            {t('ui.message.error_boundary_storage_description')}
          </p>
          <ul className="mt-2 space-y-2">
            {storageIssues.map((issue) => (
              <li key={issue.key} className="rounded-md border border-amber-200 bg-white/70 p-2">
                <p className="text-[11px] font-bold leading-relaxed text-slate-700">
                  {t('ui.message.error_boundary_storage_reason', {
                    item: issue.item,
                    reason: issue.reason,
                  })}
                </p>
                {issue.details.length > 0 && (
                  <ul className="mt-1 space-y-0.5 pl-3 text-[11px] leading-relaxed text-slate-600">
                    {issue.details.map((detail) => (
                      <li key={`${issue.key}-${detail.index}`}>
                        {t('ui.message.error_boundary_storage_detail', {
                          index: detail.index,
                          name: detail.item ? `（${detail.item}）` : '',
                          reason: detail.reason,
                        })}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleRepairAll}
            className="mt-3 rounded border border-amber-300 bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-900 transition-colors hover:bg-amber-200"
          >
            {t('ui.message.error_boundary_storage_repair_all')}
          </button>
          {repairError && <p className="mt-2 text-[11px] text-red-600">{t('ui.message.import_write_error')}</p>}
        </section>
      )}
    </div>
  )
}

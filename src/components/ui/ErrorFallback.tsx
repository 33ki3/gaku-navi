/**
 * デフォルトのエラーフォールバック UI
 *
 * ErrorBoundary がカスタムフォールバックを受け取っていない場合に表示する。
 * 関数コンポーネントとして定義し useTranslation で i18n に対応する。
 */
import { useTranslation } from 'react-i18next'

/** ErrorFallback に渡すプロパティ */
interface ErrorFallbackProps {
  /** キャッチしたエラー */
  error: Error | null
  /** 「リセットして再試行」or「再試行」ボタン押下時のコールバック */
  onReset: () => void
  /** onReset が外部リセット付きかどうか（ラベル切り替えに使用） */
  hasExternalReset: boolean
  /** 「キャンセル」ボタン押下時のコールバック（省略時はボタン非表示） */
  onCancel?: () => void
  /** リセット対象の説明テキスト（例: 「スケジュール設定」） */
  resetDescription?: string
}

/**
 * エラー発生時に表示するデフォルトのフォールバック UI。
 *
 * @param props - フォールバック表示に必要な値
 * @returns エラーフォールバック要素
 */
export function ErrorFallback({ error, onReset, hasExternalReset, onCancel, resetDescription }: ErrorFallbackProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center min-h-[120px] p-4 rounded-lg border border-red-200 bg-red-50 text-center gap-2">
      <p className="text-sm font-bold text-red-600">{t('ui.message.error_boundary_title')}</p>
      <p className="text-xs text-red-400">{error?.message ?? t('ui.message.error_boundary_unknown')}</p>
      {resetDescription && (
        <p className="text-xs text-red-500">
          {t('ui.message.error_boundary_reset_target', { target: resetDescription })}
        </p>
      )}
      <div className="flex gap-2 mt-1">
        {/* 状態をリセットして対象コンポーネントの再描画を試す */}
        <button
          onClick={onReset}
          className="px-3 py-1 text-xs font-bold rounded bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition-colors"
        >
          {hasExternalReset ? t('ui.message.error_boundary_reset') : t('ui.message.error_boundary_retry')}
        </button>
        {onCancel && (
          /* フォールバック表示のみを閉じて呼び出し側へ制御を戻す */
          <button
            onClick={onCancel}
            className="px-3 py-1 text-xs font-bold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            {t('ui.message.error_boundary_cancel')}
          </button>
        )}
        {/* ページ全体を再読み込みして復旧を試す */}
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1 text-xs font-bold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
        >
          {t('ui.message.error_boundary_reload')}
        </button>
      </div>
    </div>
  )
}

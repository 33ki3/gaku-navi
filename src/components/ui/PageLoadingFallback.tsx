/** 独立ページの遅延読み込み中に、サポート一覧と共通のスケルトンを表示する */
import { useTranslation } from 'react-i18next'
import { LoadingSkeleton } from './LoadingSkeleton'

/**
 * ページ本体の読み込み完了まで、読み込み状態と配置の目安を示す
 * @returns 読み込み中の独立ページを表すスケルトン
 */
export function PageLoadingFallback() {
  const { t } = useTranslation()
  return (
    <main className="min-h-screen bg-slate-50" aria-busy="true" aria-label={t('ui.loading')}>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="h-10 w-2/5 animate-pulse rounded-lg bg-slate-200" aria-hidden="true" />
        <LoadingSkeleton />
      </div>
    </main>
  )
}

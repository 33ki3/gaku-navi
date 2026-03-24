/**
 * 検索結果なし表示コンポーネント
 *
 * フィルター結果が0件の時に表示される。
 * 「フィルターをクリア」ボタンで全フィルターをリセットできる。
 */
import { useTranslation } from 'react-i18next'

/** EmptyState コンポーネントに渡すプロパティ */
interface EmptyStateProps {
  /** 全フィルターをリセットする関数 */
  onClearFilters: () => void
}

/** 検索結果が空の時のメッセージを表示する */
export default function EmptyState({ onClearFilters }: EmptyStateProps) {
  const { t } = useTranslation()

  return (
    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-100 mt-3">
      <svg className="h-8 w-8 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <h3 className="text-base font-bold text-slate-800 mb-1">{t('ui.message.not_found')}</h3>
      {/* フィルタークリアボタン */}
      <button onClick={onClearFilters} className="mt-2 text-sm font-bold text-blue-500 hover:underline">
        {t('ui.message.clear_filters')}
      </button>
    </div>
  )
}

/**
 * フィルター用テキスト検索入力コンポーネント
 *
 * カード名・Pアイテム名・スキルカード名・イベント名で
 * 部分一致検索するためのテキスト入力欄。
 * 虫眼鏡アイコン付き。
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import { CloseIcon, SearchIcon } from '../ui/icons'

/** FilterSearchInput コンポーネントに渡すプロパティ */
interface FilterSearchInputProps {
  /** 現在の検索文字列 */
  value: string
  /** 検索文字列が変わった時に呼ばれる関数 */
  onChange: (value: string) => void
  /** 親要素いっぱいに広げる */
  fullWidth?: boolean
}

/**
 * サポート名などを対象にした共通テキスト検索欄を表示する。
 *
 * @param props - 検索文字列、更新操作、横幅設定
 * @returns 検索アイコン付きテキスト入力
 */
export function FilterSearchInput({ value, onChange, fullWidth = false }: FilterSearchInputProps) {
  const { t } = useTranslation()

  return (
    <div className={`w-full min-w-0 ${fullWidth ? '' : 'max-w-64'}`}>
      <div className="relative group">
        {/* 左側の虫眼鏡アイコン */}
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <SearchIcon className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        {/* 検索欄の入力タイプと標準×ボタンの扱い */}
        <input
          type="search"
          placeholder={t('ui.filter.search_placeholder')}
          aria-label={t('ui.filter.search_placeholder')}
          className={`${constant.INPUT_TEXT_XS} pr-7 [&::-webkit-search-cancel-button]:hidden`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={t('ui.accessibility.clear_search')}
            className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 transition-colors hover:text-slate-700"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

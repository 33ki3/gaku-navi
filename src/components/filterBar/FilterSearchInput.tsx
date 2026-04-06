/**
 * フィルター用テキスト検索入力コンポーネント
 *
 * カード名・Pアイテム名・スキルカード名・イベント名で
 * 部分一致検索するためのテキスト入力欄。
 * 虫眼鏡アイコン付き。
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import { SearchIcon } from '../ui/icons'

/** FilterSearchInput コンポーネントに渡すプロパティ */
interface FilterSearchInputProps {
  /** 現在の検索文字列 */
  value: string
  /** 検索文字列が変わった時に呼ばれる関数 */
  onChange: (value: string) => void
}

/** テキスト検索入力フィールド */
export function FilterSearchInput({ value, onChange }: FilterSearchInputProps) {
  const { t } = useTranslation()

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-80">
        <div className="relative group">
          {/* 左側の虫眼鏡アイコン */}
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <SearchIcon className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          {/* テキスト入力欄 */}
          <input
            type="text"
            placeholder={t('ui.filter.search_placeholder')}
            className={constant.INPUT_TEXT_XS}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

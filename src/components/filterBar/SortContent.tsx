/**
 * ソートタブの内容。
 *
 * 並び順の方向とソート対象を、UIマスタの定義順で表示する
 */
import { useTranslation } from 'react-i18next'
import * as uiData from '../../data/ui'
import type { CardFiltersReturn } from '../../hooks'
import { SortIcon } from '../ui/icons'

/** ソート設定を表示する */
export function SortContent({ filters }: { filters: CardFiltersReturn }) {
  const { t } = useTranslation()

  return (
    <div>
      {/* 並び順の昇順・降順切り替えボタン */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {uiData.SortDirectionOrder.map((direction) => {
          const { value, reverse, label } = uiData.getSortDirectionEntry(direction)
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                if (filters.sortReverse !== reverse) filters.toggleSortReverse()
              }}
              className={`rounded-lg px-2 py-2 text-xs font-bold transition-colors ${
                filters.sortReverse === reverse
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <SortIcon className="h-3.5 w-3.5" ascending={reverse} />
                {t(label)}
              </span>
            </button>
          )
        })}
      </div>
      {/* 並び替え対象の選択ボタン */}
      <div className="flex flex-col gap-2">
        {uiData.SortModeOrder.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => filters.setSortMode(mode)}
            className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors ${
              filters.sortMode === mode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t(uiData.getSortModeLabel(mode))}
          </button>
        ))}
      </div>
    </div>
  )
}

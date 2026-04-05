/**
 * 空きスロットコンポーネント
 *
 * サポート追加ボタンとして機能し、通常・レンタル・選択中の3状態を持つ。
 */
import { useTranslation } from 'react-i18next'
import { memo } from 'react'

/** EmptySlot に渡すプロパティ */
interface EmptySlotProps {
  /** 追加ボタン押下時のコールバック */
  onAdd: () => void
  /** 一覧選択モード中か */
  selectMode: boolean
  /** レンタル枠として表示するか（デフォルト: false） */
  isRental?: boolean
}

/**
 * 空きスロット
 *
 * @param props - コンポーネントプロパティ
 * @returns 空きスロット要素
 */
export const EmptySlot = memo(function EmptySlot({ onAdd, selectMode, isRental = false }: EmptySlotProps) {
  const { t } = useTranslation()

  return (
    <button
      onClick={onAdd}
      className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 border-dashed transition-colors ${
        isRental
          ? selectMode
            ? 'border-emerald-300 bg-emerald-50 text-emerald-500'
            : 'border-emerald-200 bg-emerald-50/50 text-emerald-400 hover:border-emerald-300 hover:bg-emerald-50'
          : selectMode
            ? 'border-blue-300 bg-blue-50 text-blue-500'
            : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-slate-100'
      }`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      <span className="text-xs font-bold">
        {isRental ? t('unit.rental_slot_empty') : selectMode ? t('unit.manual_select_bar') : t('unit.slot_empty')}
      </span>
    </button>
  )
})

/**
 * 埋まっているスロットコンポーネント
 *
 * サポート名・タイプバッジ・レンタルバッジ・削除ボタンを表示する。
 */
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import * as data from '../../data'
import type { SupportCard } from '../../types/card'
import { BadgeSizeType } from '../../types/enums'
import { Badge } from '../ui/Badge'
import { CloseIcon } from '../ui/icons'

/** FilledSlot に渡すプロパティ */
interface FilledSlotProps {
  /** サポート名 */
  cardName: string
  /** マスタまたはユーザー追加分のサポート */
  card?: SupportCard
  /** レンタルサポートか */
  isRental: boolean
  /** 削除ボタン押下時のコールバック */
  onRemove: () => void
}

/**
 * 埋まっているスロット
 *
 * @param props - コンポーネントプロパティ
 * @returns 埋まりスロット要素
 */
export const FilledSlot = memo(function FilledSlot({ cardName, card, isRental, onRemove }: FilledSlotProps) {
  const { t } = useTranslation()

  // 保存済み設定に削除済みカード名が残っていても、スロット自体は表示して
  // 破棄操作を可能にする。通常のカードは typeEntry から従来の配色を使う。
  const typeEntry = card ? data.getTypeEntry(card.type) : null

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-l-4 ${isRental ? 'border-emerald-400' : (typeEntry?.stripe ?? 'border-slate-300')} bg-white rounded-lg border border-slate-200`}
    >
      {/* サポート名 + タイプバッジ */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-[13px] font-bold text-slate-700 truncate">{cardName}</span>
        {typeEntry && (
          <Badge size={BadgeSizeType.Sm} color={typeEntry.badge}>
            {t(typeEntry.label)}
          </Badge>
        )}
        {isRental && (
          <Badge size={BadgeSizeType.Sm} color="bg-emerald-100 text-emerald-700">
            {t('unit.result.rental_label')}
          </Badge>
        )}
      </div>
      {/* 削除ボタン */}
      <button onClick={onRemove} className="shrink-0 text-slate-400 hover:text-red-500 transition-colors">
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  )
})

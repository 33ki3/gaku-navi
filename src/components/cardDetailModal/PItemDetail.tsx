/**
 * Pアイテム詳細コンポーネント
 *
 * カード詳細モーダル内でPアイテムの名前・レアリティ・
 * コンテスト情報・効果を表示する。
 */
import { useTranslation } from 'react-i18next'
import type { SupportCard } from '../../types/card'
import type { TypeDisplayEntry } from '../../data'
import * as data from '../../data'
import { Badge } from '../ui/Badge'
import { getPItemEffectLabel } from '../../utils/display/effectLabels'

/** PItemDetail コンポーネントに渡すプロパティ */
interface PItemDetailProps {
  /** Pアイテムデータ */
  pItem: NonNullable<SupportCard['p_item']>
  /** タイプ別の色設定 */
  colors: TypeDisplayEntry
}

/** Pアイテムの詳細表示 */
export function PItemDetail({ pItem, colors }: PItemDetailProps) {
  const { t } = useTranslation()
  const memoryEntry = pItem.memory ? data.MemoryBadge[pItem.memory] : undefined
  const rarityEntry = data.getPItemRarityEntry(pItem.rarity)

  return (
    <div className={`p-4 rounded-xl ${colors.bg} border ${colors.border}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Pアイテム名 */}
        <p className="text-sm text-slate-800">{pItem.name}</p>
        {/* レアリティバッジ（「SSR」など） */}
        <Badge color={rarityEntry.color}>
          {t(rarityEntry.label)}
        </Badge>
        {/* メモリ化可否バッジ（「メモリ化可」など） */}
        {memoryEntry && (
          <Badge color={memoryEntry.badge}>
            {t(memoryEntry.label)}
          </Badge>
        )}
      </div>
      {/* 効果テキスト */}
      {pItem.effect && (
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">{getPItemEffectLabel(pItem.effect, t)}</p>
      )}
    </div>
  )
}

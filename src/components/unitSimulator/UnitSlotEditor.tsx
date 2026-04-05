/**
 * ユニット編成スロットエディター
 *
 * 6枠のビジュアルスロットでサポート追加・削除・凸数変更を行う。
 * 空きスロットは「+」ボタンで一覧選択モードに入る。
 */
import { memo } from 'react'

import * as constant from '../../constant'
import { FilledSlot } from './FilledSlot'
import { EmptySlot } from './EmptySlot'

/** UnitSlotEditor に渡すプロパティ */
interface UnitSlotEditorProps {
  /** 選択済みサポート名リスト（null はスロット空き） */
  cards: (string | null)[]
  /** サポートを削除するコールバック */
  onRemoveCard: (name: string) => void
  /** 一覧選択モードを開始するコールバック（クリックされたスロットのインデックスを渡す） */
  onStartSelect: (slotIndex: number) => void
  /** 一覧選択モード中か */
  selectMode: boolean
  /** レンタルサポート名（一致するスロットにレンタルバッジを表示） */
  rentalCardName?: string | null
}

/**
 * 6枠のサポートスロットエディター
 *
 * @param props - コンポーネントプロパティ
 * @returns スロットエディター要素
 */
export default memo(function UnitSlotEditor({
  cards,
  onRemoveCard,
  onStartSelect,
  selectMode,
  rentalCardName,
}: UnitSlotEditorProps) {
  const filledCount = cards.filter((n) => n !== null).length
  const rentalCard = rentalCardName && cards.includes(rentalCardName) ? rentalCardName : null

  // cards の位置をそのまま維持して6枠にパディングする
  const slots: (string | null)[] = [...cards]
  while (slots.length < constant.UNIT_SIZE) slots.push(null)

  return (
    <div className="space-y-1.5">
      {slots.map((cardName, i) =>
        cardName !== null ? (
          <FilledSlot
            key={cardName}
            cardName={cardName}
            isRental={cardName === rentalCard}
            onRemove={() => onRemoveCard(cardName)}
          />
        ) : filledCount < constant.UNIT_SIZE ? (
          <EmptySlot key={`empty-${i}`} onAdd={() => onStartSelect(i)} selectMode={selectMode} />
        ) : null,
      )}
    </div>
  )
})

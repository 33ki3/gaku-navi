/**
 * カードリストコンポーネント（仮想スクロール対応）
 *
 * @tanstack/react-virtual を使って、画面に見えている行だけを描画する。
 * ResizeObserver でグリッドの幅を監視し、1〜4列を自動で切り替える。
 * 設定パネルがピン留めされているときは4列の閾値を広げる。
 */
import { useEffect, useRef, useState, memo } from 'react'
import type { SupportCard } from '../../types/card'
import type { TranslationKey } from '../../i18n'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useCardContext } from '../../contexts/CardContext'
import * as constant from '../../constant'
import { CardListItem } from './CardListItem'

/** CardList コンポーネントに渡すプロパティ */
interface CardListProps {
  /** フィルター済みのカード一覧 */
  filteredCards: readonly SupportCard[]
  /** カード名 → スコアのマップ */
  cardScores: ReadonlyMap<string, number>
  /** カード名 → アビリティバッジ一覧のマップ */
  abilityBadgeMap: ReadonlyMap<string, TranslationKey[]>
  /** 設定パネルがピン留めされているか */
  settingsPinned: boolean
}

/** 仮想スクロール付きカードリスト */
export default memo(function CardList({
  filteredCards,
  cardScores,
  abilityBadgeMap,
  settingsPinned,
}: CardListProps) {
  // カードの凸数取得用コンテキスト
  const { getCardUncap } = useCardContext()
  const gridRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)

  // グリッドの幅が変わったら列数を再計算する（ブレークポイント: 1/2/3/4列）
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    // ピン留め時は4列・3列の閾値を変更する（サイドパネル分狭くなるから）
    const bp4 = settingsPinned ? constant.BREAKPOINT_4COL_PINNED : constant.BREAKPOINT_4COL
    const bp3 = settingsPinned ? constant.BREAKPOINT_3COL_PINNED : constant.BREAKPOINT_3COL
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width
      if (width >= bp4) setColumns(4)
      else if (width >= bp3) setColumns(3)
      else if (width >= constant.BREAKPOINT_2COL) setColumns(2)
      else setColumns(1)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [settingsPinned])

  // 行数 = カード総数 ÷ 列数（切り上げ）
  const rowCount = Math.ceil(filteredCards.length / columns)

  // 仮想スクローラーの初期化（行高さから表示範囲を計算する）
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => constant.ROW_HEIGHT + constant.GRID_GAP,
    overscan: constant.VIRTUAL_OVERSCAN,
  })

  return (
    <div ref={gridRef}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* 画面に見えている行だけ描画する */}
        {virtualizer.getVirtualItems().map((virtualRow) => {
          // この行に表示するカードを切り出す
          const startIndex = virtualRow.index * columns
          const rowCards = filteredCards.slice(startIndex, startIndex + columns)

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: `${constant.GRID_COL_GAP}px`,
                paddingBottom: `${constant.GRID_GAP}px`,
              }}
            >
              {/* 行内の各カードをレンダリング */}
              {rowCards.map((card) => {
                const score = cardScores.get(card.name)!
                const uncap = getCardUncap(card.name)
                const abilityBadges = abilityBadgeMap.get(card.name) ?? []
                return (
                  <CardListItem
                    key={card.name}
                    card={card}
                    uncap={uncap}
                    score={score}
                    abilityBadges={abilityBadges}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
})

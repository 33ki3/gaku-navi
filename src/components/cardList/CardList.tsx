/**
 * サポート一覧を表示するコンポーネント
 *
 * 画面に見えている行だけを描画し、グリッドの幅に応じて1〜4列を自動で切り替える
 * 設定パネルがピン留めされているときは4列の閾値を広げる
 */
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { memo, useEffect, useRef, useState } from 'react'
import * as constant from '../../constant'
import { useCardDataContext } from '../../contexts/CardContext'
import type { TranslationKey } from '../../i18n'
import type { CardCountCustom, SupportCard } from '../../types/card'
import { CardListItem } from './CardListItem'

/** 絞り込み済みのサポート一覧と表示設定 */
interface CardListProps {
  /** フィルター済みのサポート一覧 */
  filteredCards: readonly SupportCard[]
  /** サポート名ごとの点数 */
  cardScores: ReadonlyMap<string, number>
  /** サポート名ごとのアビリティバッジ一覧 */
  abilityBadgeMap: ReadonlyMap<string, TranslationKey[]>
  /** サポート別回数調整 */
  cardCountCustom: CardCountCustom
  /** 設定パネルがピン留めされているか */
  settingsPinned: boolean
  /** 両パネルがピン留めされているか */
  bothPanelsPinned: boolean
}

/** 大量のサポートを効率よく表示する一覧 */
export default memo(function CardList({
  filteredCards,
  cardScores,
  abilityBadgeMap,
  cardCountCustom,
  settingsPinned,
  bothPanelsPinned,
}: CardListProps) {
  // 表示するサポートの凸数を取得する
  const { getCardUncap } = useCardDataContext()
  const gridRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)

  // グリッド幅に応じて列数を1〜4列へ切り替える
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    // パネルを固定すると表示幅が狭くなるため、列数を切り替える境界を調整する
    const bp4 = settingsPinned ? constant.BREAKPOINT_4COL_PINNED : constant.BREAKPOINT_4COL
    const bp3 = bothPanelsPinned
      ? constant.BREAKPOINT_3COL_BOTH
      : settingsPinned
        ? constant.BREAKPOINT_3COL_PINNED
        : constant.BREAKPOINT_3COL
    const bp2 = bothPanelsPinned ? constant.BREAKPOINT_2COL_BOTH : constant.BREAKPOINT_2COL
    // 両方のパネルを固定しているときは3列までにする
    const maxCols = bothPanelsPinned ? 3 : 4
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width
      if (maxCols >= 4 && width >= bp4) setColumns(4)
      else if (width >= bp3) setColumns(3)
      else if (width >= bp2) setColumns(2)
      else setColumns(1)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [settingsPinned, bothPanelsPinned])

  // 現在の列数から、一覧全体に必要な行数を求める
  const rowCount = Math.ceil(filteredCards.length / columns)

  // 表示範囲だけを描画するためのスクロール管理を作る
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
          // この行に表示するサポートを切り出す
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
              {/* 行内の各サポートをレンダリング */}
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
                    hasCountCustom={card.name in cardCountCustom}
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

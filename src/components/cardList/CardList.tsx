/**
 * サポートリストコンポーネント（仮想スクロール対応）
 *
 * @tanstack/react-virtual を使って、画面に見えている行だけを描画する。
 * ResizeObserver でグリッドの幅を監視し、1〜4列を自動で切り替える。
 * 設定パネルがピン留めされているときは4列の閾値を広げる。
 */
import { useEffect, useRef, useState, memo } from 'react'
import type { SupportCard } from '../../types/card'
import type { TranslationKey } from '../../i18n'
import type { CardCountCustom } from '../../hooks/useCardCountCustom'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useCardDataContext } from '../../contexts/CardContext'
import * as constant from '../../constant'
import { CardListItem } from './CardListItem'

/** CardList コンポーネントに渡すプロパティ */
interface CardListProps {
  /** フィルター済みのサポート一覧 */
  filteredCards: readonly SupportCard[]
  /** サポート名 → スコアのマップ */
  cardScores: ReadonlyMap<string, number>
  /** サポート名 → アビリティバッジ一覧のマップ */
  abilityBadgeMap: ReadonlyMap<string, TranslationKey[]>
  /** サポート別回数調整 */
  cardCountCustom: CardCountCustom
  /** 設定パネルがピン留めされているか */
  settingsPinned: boolean
  /** 両パネルがピン留めされているか */
  bothPanelsPinned: boolean
}

/** 仮想スクロール付きサポートリスト */
export default memo(function CardList({
  filteredCards,
  cardScores,
  abilityBadgeMap,
  cardCountCustom,
  settingsPinned,
  bothPanelsPinned,
}: CardListProps) {
  // サポートの凸数取得用コンテキスト
  const { getCardUncap } = useCardDataContext()
  const gridRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)

  // グリッドの幅が変わったら列数を再計算する（ブレークポイント: 1/2/3/4列）
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    // ピン留め時は4列・3列の閾値を変更する（サイドパネル分狭くなるから）
    const bp4 = settingsPinned ? constant.BREAKPOINT_4COL_PINNED : constant.BREAKPOINT_4COL
    const bp3 = bothPanelsPinned
      ? constant.BREAKPOINT_3COL_BOTH
      : settingsPinned
        ? constant.BREAKPOINT_3COL_PINNED
        : constant.BREAKPOINT_3COL
    const bp2 = bothPanelsPinned ? constant.BREAKPOINT_2COL_BOTH : constant.BREAKPOINT_2COL
    // 両パネルピン時の最大列数
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

  // 行数 = サポート総数 ÷ 列数（切り上げ）
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

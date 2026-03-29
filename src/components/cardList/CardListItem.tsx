/**
 * カードリストの個別カードコンポーネント
 *
 * 1枚のサポートカードを表示する。
 * カード名・レアリティ・タイプ・プラン・イベント概要・スコアなどを
 * まとめて表示し、クリックで詳細モーダルを開く。
 * memoでラップして、不要な再描画を防ぐ。
 */
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupportCard } from '../../types/card'
import type { UncapType } from '../../types/enums'
import { BadgeSizeType, BadgeWeightType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'
import { useCardContext } from '../../contexts/CardContext'
import * as data from '../../data'
import * as constant from '../../constant'
import { getEventSummaryParts, hasSPAbility } from '../../utils/cardQuery'
import { Badge } from '../ui/Badge'
import { UncapSelector } from '../ui/UncapSelector'

/** CardListItem コンポーネントに渡すプロパティ */
interface CardListItemProps {
  /** サポートカードデータ */
  card: SupportCard
  /** 現在の凸数 */
  uncap: UncapType
  /** スコア（未計算時は 0） */
  score: number
  /** アビリティバッジの翻訳キー一覧 */
  abilityBadges: TranslationKey[]
  /** カウントオーバーライドが設定されているか */
  hasCountOverride: boolean
}

/** カードグリッドの1枚分のカード */
export const CardListItem = memo(function CardListItem({
  card,
  uncap,
  score,
  abilityBadges,
  hasCountOverride,
}: CardListItemProps) {
  const { t } = useTranslation()
  const { uncapEditMode, onCardClick, onScoreClick, onUncapChange } = useCardContext()

  // カードの見た目に必要な色やラベルを準備する
  const typeEntry = data.getTypeEntry(card.type)
  const rarityEntry = data.getRarityEntry(card.rarity)
  const planEntry = data.getPlanBadge(card.plan)
  const eventParts = getEventSummaryParts(card)
  const hasSP = hasSPAbility(card)
  const sourceEntry = data.getSourceBadge(card.source)
  const typeLabel = t(typeEntry.label)

  // クリックハンドラをメモ化して再描画を減らす
  const handleClick = useCallback(() => onCardClick(card), [onCardClick, card])
  const handleScoreClick = useCallback(
    (e: React.MouseEvent) => onScoreClick(card, e),
    [onScoreClick, card],
  )
  const handleUncapChange = useCallback(
    (u: UncapType) => onUncapChange(card.name, u),
    [onUncapChange, card.name],
  )

  return (
    <div
      onClick={handleClick}
      className={`${constant.CARD_ITEM_CONTAINER} ${typeEntry.stripe}`}
    >
      {/* SPアビリティがあるカードは右上にSPバッジを表示 */}
      {hasSP && (
        <Badge
          size={BadgeSizeType.Sm}
          weight={BadgeWeightType.Black}
          color="bg-amber-400 text-amber-900"
          className="absolute top-2 right-2 z-[1] pointer-events-none"
        >
          {t('card.sp_badge')}
        </Badge>
      )}
      <div className="p-2 flex-1 flex flex-col gap-1">
        <div className={hasSP ? 'pr-8' : ''}>
          {/* カード名 */}
          <div className="flex items-start gap-1.5 mb-1.5">
            <h2 className="text-[13px] font-black text-slate-800 leading-tight flex-1 min-w-0 group-hover:text-slate-900">
              {card.name}
            </h2>
          </div>
          <div className="flex flex-nowrap gap-1 overflow-hidden">
            {/* レアリティバッジ（SSR / SR / R） */}
            <Badge size={BadgeSizeType.Sm} weight={BadgeWeightType.Black} color={rarityEntry.color}>
              {t(rarityEntry.label)}
            </Badge>
            {/* タイプバッジ（Vo / Da / Vi） */}
            <Badge size={BadgeSizeType.Sm} color={typeEntry.badge}>{typeLabel}</Badge>
            {/* プランバッジ（センス / ロジック 等） */}
            <Badge size={BadgeSizeType.Sm} color={planEntry.badge}>
              {t(planEntry.label)}
            </Badge>
            {/* 入手先バッジ */}
            <Badge size={BadgeSizeType.Sm} color={sourceEntry.badge}>
              {t(sourceEntry.label)}
            </Badge>
          </div>
        </div>
        {/* イベント概要（「スキルカード / カード強化」 等） */}
        <div className={`text-[10px] font-medium ${typeEntry.text} ${typeEntry.bg} rounded px-2 py-1`}>
          {eventParts.map((key) => t(key)).join(t('ui.format.event_separator'))}
        </div>
        {/* スコア行 */}
        <div
          onClick={handleScoreClick}
          className={constant.CARD_SCORE_ROW}
          title={t('card.click_breakdown')}
        >
          {/* スコア値 */}
          <span className={`text-xs font-black ${typeEntry.text} shrink-0`}>
            {score}
            {t('ui.unit.score')}
          </span>
          {/* カウント調整済みアイコン */}
          {hasCountOverride && (
            <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <title>{t('card.count_adjusted')}</title>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
          )}
          {/* アビリティバッジ */}
          {abilityBadges.length > 0 && (
            <div className="flex-1 flex flex-nowrap gap-0.5 overflow-x-auto scrollbar-none min-w-0" style={{ direction: 'rtl' }}>
              {abilityBadges.map((badge, i) => (
                <span key={i} className={constant.BADGE_ABILITY_GRID} style={{ direction: 'ltr' }}>{t(badge)}</span>
              ))}
            </div>
          )}
        </div>
        {/* 凸数編集モードのときは凸数セレクターを表示 */}
        {uncapEditMode && (
          <div className="pt-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
            <UncapSelector
              value={uncap}
              onChange={handleUncapChange}
              activeClass="bg-amber-400 text-amber-900"
              inactiveClass="bg-slate-100 text-slate-400 hover:bg-slate-200"
            />
          </div>
        )}
      </div>
    </div>
  )
})

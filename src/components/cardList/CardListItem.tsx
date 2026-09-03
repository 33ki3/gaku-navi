/**
 * サポートリストの個別サポートコンポーネント
 *
 * 1枚のサポートカードを表示する。
 * サポート名・レアリティ・タイプ・プラン・イベント概要・スコアなどを
 * まとめて表示し、クリックで詳細モーダルを開く。除外中のカードは右上のバッジで示す。
 * memoでラップして、不要な再描画を防ぐ。
 */
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import { useCardDataContext, useCardUIContext } from '../../contexts/CardContext'
import * as data from '../../data'
import type { TranslationKey } from '../../i18n'
import type { SupportCard } from '../../types/card'
import type { UncapType } from '../../types/enums'
import { BadgeSizeType, BadgeWeightType, CardListInteractionModeType } from '../../types/enums'
import { getEventSummaryParts, hasSPAbility } from '../../utils/cardQuery'
import { Badge } from '../ui/Badge'
import { UncapSelector } from '../ui/UncapSelector'
import { AdjustedIcon } from '../ui/icons'

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
  /** 回数調整が設定されているか */
  hasCountCustom: boolean
}

/** サポートグリッドの1枚分のサポート */
export const CardListItem = memo(function CardListItem({
  card,
  uncap,
  score,
  abilityBadges,
  hasCountCustom,
}: CardListItemProps) {
  const { t } = useTranslation()
  const { onCardClick, onScoreClick, onUncapChange, isCardExcluded } = useCardDataContext()
  const { cardListMode, uncapEditMode, isCardEligible } = useCardUIContext()
  const isUnitCardSelectMode = cardListMode === CardListInteractionModeType.UnitCardSelect
  const excluded = isCardExcluded(card.name)
  const isCardExclusionEditMode = cardListMode === CardListInteractionModeType.CardExclusionEdit

  // サポート選択モード中の選択可否判定
  const eligible = !isUnitCardSelectMode || (isCardEligible ? isCardEligible(card) : true)

  // サポートの見た目に必要な色やラベルを準備する
  const typeEntry = data.getTypeEntry(card.type)
  const rarityEntry = data.getRarityEntry(card.rarity)
  const planEntry = data.getPlanBadge(card.plan)
  const eventParts = getEventSummaryParts(card)
  const hasSP = hasSPAbility(card)
  const sourceEntry = data.getSourceEntry(card.source)
  const typeLabel = t(typeEntry.label)

  // クリックハンドラをメモ化して再描画を減らす
  const handleClick = useCallback(() => {
    // サポート選択モード中で対象外のサポートはクリック不可
    if (isUnitCardSelectMode && !eligible) return
    onCardClick(card)
  }, [eligible, onCardClick, card, isUnitCardSelectMode])
  const handleScoreClick = useCallback(
    (e: React.MouseEvent) => {
      // 手動編成・除外設定中はスコア行も共通のカード選択処理として扱う
      // スコア詳細を開かず、親カードのクリック処理との二重実行も止める
      if (isCardExclusionEditMode || isUnitCardSelectMode) {
        e.stopPropagation()
        if (!isUnitCardSelectMode || eligible) onCardClick(card)
        return
      }
      onScoreClick(card, e)
    },
    [onScoreClick, onCardClick, card, isUnitCardSelectMode, eligible, isCardExclusionEditMode],
  )
  const handleUncapChange = useCallback((u: UncapType) => onUncapChange(card.name, u), [onUncapChange, card.name])
  return (
    <div
      onClick={handleClick}
      className={`${constant.CARD_ITEM_CONTAINER} ${typeEntry.stripe} ${isUnitCardSelectMode ? (eligible ? 'ring-2 ring-blue-300 cursor-copy' : 'opacity-40 grayscale cursor-not-allowed') : ''} ${isCardExclusionEditMode ? 'cursor-pointer' : ''}`}
    >
      {/* バッジは同じ高さで右揃えにし、除外中を右端、SPをその左隣に表示する */}
      {(excluded || hasSP) && (
        <div className="pointer-events-none absolute top-2 right-2 z-[2] flex items-center gap-1">
          {hasSP && (
            <Badge size={BadgeSizeType.Sm} weight={BadgeWeightType.Black} color="bg-amber-400 text-amber-900">
              {t('card.sp_badge')}
            </Badge>
          )}
          {excluded && (
            <Badge size={BadgeSizeType.Sm} weight={BadgeWeightType.Black} color="bg-slate-700 text-white">
              {t('card.excluded_from_optimizer')}
            </Badge>
          )}
        </div>
      )}
      <div className="p-2 flex-1 flex flex-col gap-1 min-w-0">
        <div className={excluded ? 'pr-12' : hasSP ? 'pr-8' : ''}>
          {/* サポート名 */}
          <div className="mb-1.5 overflow-x-auto scrollbar-none">
            <h2 className="text-[13px] font-black text-slate-800 leading-tight whitespace-nowrap group-hover:text-slate-900">
              {card.name}
            </h2>
          </div>
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {/* レアリティバッジ（SSR / SR / R） */}
            <Badge size={BadgeSizeType.Sm} weight={BadgeWeightType.Black} color={rarityEntry.color}>
              {t(rarityEntry.label)}
            </Badge>
            {/* タイプバッジ（Vo / Da / Vi） */}
            <Badge size={BadgeSizeType.Sm} color={typeEntry.badge}>
              {typeLabel}
            </Badge>
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
        <div
          className={`text-[10px] font-medium ${typeEntry.text} ${typeEntry.bg} rounded px-2 py-1 overflow-x-auto scrollbar-none whitespace-nowrap`}
        >
          {eventParts.map((key) => t(key)).join(t('ui.format.event_separator'))}
        </div>
        {/* スコア行 */}
        <div onClick={handleScoreClick} className={constant.CARD_SCORE_ROW} title={t('card.click_breakdown')}>
          {/* スコア値 */}
          <span className={`text-xs font-black ${typeEntry.text} shrink-0`}>
            {score}
            {t('ui.unit.score')}
          </span>
          {/* 回数調整済みアイコン */}
          <span
            className={`w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${hasCountCustom ? 'bg-violet-100' : ''}`}
          >
            {hasCountCustom && <AdjustedIcon className="w-3 h-3 text-violet-500" title={t('card.count_adjusted')} />}
          </span>
          {/* アビリティバッジ */}
          {abilityBadges.length > 0 && (
            <div className="flex gap-0.5 ml-auto shrink-0">
              {abilityBadges.map((badge, i) => (
                <span key={i} className={constant.BADGE_ABILITY_GRID}>
                  {t(badge)}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* 凸数編集モードのときは凸数セレクターを表示 */}
        {uncapEditMode && (
          <div className="pt-1 border-t border-slate-100 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <UncapSelector
              value={uncap}
              onChange={handleUncapChange}
              disabled={isUnitCardSelectMode || isCardExclusionEditMode}
              activeClass="bg-amber-400 text-amber-900"
              inactiveClass="bg-slate-100 text-slate-400 hover:bg-slate-200"
            />
          </div>
        )}
      </div>
    </div>
  )
})

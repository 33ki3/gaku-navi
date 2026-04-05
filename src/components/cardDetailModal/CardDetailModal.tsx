/**
 * サポート詳細モーダルコンポーネント
 *
 * サポートをクリックしたときに開くモーダル。
 * ヘッダーにサポート名・レアリティ・タイプ・プラン・入手先を、
 * ボディにイベント・アビリティ・Pアイテム・スキルカードを表示する。
 */
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupportCard, CardCalculationResult } from '../../types/card'
import * as data from '../../data'
import * as constant from '../../constant'
import { BadgeSizeType, BadgeWeightType, ButtonSizeType, UncapType } from '../../types/enums'
import { Badge } from '../ui/Badge'
import CloseButton from '../ui/CloseButton'
import ModalOverlay from '../ui/ModalOverlay'
import { CardDetailSections } from './CardDetailSections'

/** CardDetailModal コンポーネントに渡すプロパティ */
interface CardDetailModalProps {
  /** 表示するサポートカードデータ */
  card: SupportCard
  /** 初期凸数（省略時はデフォルト値） */
  uncap?: UncapType
  /** スコア計算結果（初期凸数での計算済み） */
  scoreResult: CardCalculationResult
  /** 任意のサポート・凸数でスコアを個別計算する関数 */
  calculateForCard: (card: SupportCard, uncap: UncapType) => CardCalculationResult | undefined
  /** モーダルを閉じる関数 */
  onClose: () => void
}

/** サポート詳細モーダル */
export default function CardDetailModal({
  card,
  uncap: initialUncap = constant.DEFAULT_UNCAP,
  scoreResult: initialScoreResult,
  calculateForCard,
  onClose,
}: CardDetailModalProps) {
  const { t } = useTranslation()
  // 未所持サポートは4凸で表示する（モーダル内で凸数を切り替え可能、永続保存はしない）
  const [uncap, setUncap] = useState<UncapType>(
    initialUncap === UncapType.NotOwned ? constant.DEFAULT_UNCAP : initialUncap,
  )
  const typeEntry = data.getTypeEntry(card.type)
  const rarityEntry = data.getRarityEntry(card.rarity)
  const planEntry = data.getPlanBadge(card.plan)
  const sourceEntry = data.getSourceBadge(card.source)

  // 凸数が変わったら点数内訳を再計算する
  const scoreResult = useMemo(() => {
    if (uncap === initialUncap) return initialScoreResult
    return calculateForCard(card, uncap) ?? initialScoreResult
  }, [uncap, initialUncap, initialScoreResult, calculateForCard, card])

  return (
    <ModalOverlay onClose={onClose} panelClassName={constant.MODAL_PANEL_DETAIL}>
      {/* ヘッダー: サポート名とバッジ類 */}
      <div className={`sticky top-0 z-10 ${typeEntry.bg} border-b ${typeEntry.border} rounded-t-2xl px-6 py-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-slate-900 leading-tight">{card.name}</h2>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {/* レアリティを示すバッジ */}
              <Badge size={BadgeSizeType.MdRounded} weight={BadgeWeightType.Black} color={rarityEntry.color}>
                {t(rarityEntry.label)}
              </Badge>
              {/* サポートタイプを示すバッジ */}
              <Badge size={BadgeSizeType.MdRounded} color={typeEntry.badge}>
                {t(typeEntry.label)}
              </Badge>
              {/* プラン制限を示すバッジ */}
              <Badge size={BadgeSizeType.MdRounded} color={planEntry.badge}>
                {t(planEntry.label)}
              </Badge>
              {/* 入手カテゴリを示すバッジ */}
              <Badge size={BadgeSizeType.MdRounded} color={sourceEntry.badge}>
                {t(sourceEntry.label)}
              </Badge>
            </div>
            {/* 入手先の詳細情報（イベント名・ショップ名等） */}
            {card.source_detail && (
              <p className="mt-2 text-sm text-slate-600 leading-snug">
                {t('card.source_detail')}: {card.source_detail}
              </p>
            )}
          </div>
          {/* 閉じるボタン */}
          <CloseButton onClick={onClose} size={ButtonSizeType.Lg} className="shrink-0 transition-colors" />
        </div>
      </div>

      {/* ボディ: 各セクション（イベント・アビリティ・Pアイテム・スキルカード・点数内訳） */}
      <CardDetailSections
        card={card}
        colors={typeEntry}
        uncap={uncap}
        onUncapChange={setUncap}
        scoreResult={scoreResult}
      />
    </ModalOverlay>
  )
}

/**
 * 編成結果サポート1枚分の表示コンポーネント
 *
 * 最適編成結果の各サポートを表示する
 * サポート名・レアリティ・タイプ・スコアを表示する
 * サポート間連携とインライン回数設定にも対応する
 */
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import * as constant from '../../constant'
import * as data from '../../data'
import type { CardCustomData } from '../../types/card'
import type { ActionIdType } from '../../types/enums'
import * as enums from '../../types/enums'
import type { UnitMember } from '../../types/unit'
import { hasSPAbility } from '../../utils/cardQuery'
import { getScoreStyles } from '../../utils/display/scoreStyles'
import { AbilityRow } from '../scoreDetailModal/AbilityRow'
import { CountCustomSection } from '../scoreDetailModal/CountCustomSection'
import { EventBoostSection } from '../scoreDetailModal/EventBoostSection'
import { Badge } from '../ui/Badge'
import { AdjustedIcon, ChevronDownIcon, CloseIcon, LockIcon } from '../ui/icons'

/** 編成結果のサポート表示と操作 */
interface UnitCardItemProps {
  /** 編成メンバー情報 */
  member: UnitMember
  /** このサポートが固定されているか */
  isLocked: boolean
  /** 回数調整が設定されているか */
  hasCustom: boolean
  /** 固定状態を切り替える操作 */
  onToggleLock: (cardName: string) => void
  /** 編成からサポートを外す操作 */
  onRemove: (cardName: string) => void
  /** 詳細が展開中かどうか */
  expanded: boolean
  /** 詳細の表示を切り替える操作（サポート名を受け取る） */
  onToggleExpand: (cardName: string) => void
  /** このサポートの回数調整データ */
  cardCustom: CardCustomData
  /** サポート自身の提供回数を変更する操作（カード名を受け取る） */
  onSelfTriggerChange: (cardName: string, actionId: ActionIdType, count: number) => void
  /** サポート自身の提供回数設定を削除する操作（カード名を受け取る） */
  onRemoveSelfTrigger: (cardName: string, actionId: ActionIdType) => void
  /** Pアイテムの発動回数を変更する操作（サポート名を受け取る） */
  onPItemCountChange: (cardName: string, actionId: ActionIdType, count: number) => void
  /** Pアイテムの発動回数設定を削除する操作（サポート名を受け取る） */
  onRemovePItemCount: (cardName: string, actionId: ActionIdType) => void
  /** サポートの回数設定をすべて戻す操作（サポート名を受け取る） */
  onClearCustom: (cardName: string) => void
}

/**
 * 編成結果のサポート1枚を表示する
 *
 * @param props - サポート情報、固定・削除・展開・回数調整の操作
 * @returns サポート要素
 */
export default memo(function UnitCardItem({
  member,
  isLocked,
  hasCustom,
  onToggleLock,
  onRemove,
  expanded,
  onToggleExpand,
  cardCustom,
  onSelfTriggerChange,
  onRemoveSelfTrigger,
  onPItemCountChange,
  onRemovePItemCount,
  onClearCustom,
}: UnitCardItemProps) {
  const { t } = useTranslation()
  const { card, isRental, result, supportSynergy, supportSynergyDetail, synergyProviders } = member
  const typeEntry = data.getTypeEntry(card.type)
  const rarityEntry = data.getRarityEntry(card.rarity)
  const planEntry = data.getPlanBadge(card.plan)
  const hasSP = hasSPAbility(card)

  // カード名をあらかじめ結び付け、各行の操作を安定させる
  const handleToggleExpand = useCallback(() => onToggleExpand(card.name), [card.name, onToggleExpand])
  const handleSelfTriggerChange = useCallback(
    (actionId: ActionIdType, count: number) => onSelfTriggerChange(card.name, actionId, count),
    [card.name, onSelfTriggerChange],
  )
  const handleRemoveSelfTrigger = useCallback(
    (actionId: ActionIdType) => onRemoveSelfTrigger(card.name, actionId),
    [card.name, onRemoveSelfTrigger],
  )
  const handlePItemCountChange = useCallback(
    (actionId: ActionIdType, count: number) => onPItemCountChange(card.name, actionId, count),
    [card.name, onPItemCountChange],
  )
  const handleRemovePItemCount = useCallback(
    (actionId: ActionIdType) => onRemovePItemCount(card.name, actionId),
    [card.name, onRemovePItemCount],
  )
  const handleClearCustom = useCallback(() => onClearCustom(card.name), [card.name, onClearCustom])

  // 実質点数（サポート自身のパラメータボーナスを含む）
  const effectiveScore = result.totalIncrease + supportSynergy

  // このサポートにパラメータボーナスがあるか
  const hasParamBonus =
    member.paramBonusPercent.vocal > 0 || member.paramBonusPercent.dance > 0 || member.paramBonusPercent.visual > 0

  // アビリティとPアイテムを分け、点数詳細と同じく全件を表示する
  const { abilities, pItems } = useMemo(
    () => ({
      abilities: result.allAbilityDetails.filter((ab) => ab.nameKey != null),
      pItems: result.allAbilityDetails.filter((ab) => ab.displayName != null),
    }),
    [result.allAbilityDetails],
  )

  // 提供元をサポート名ごとにグループ化する
  const providerGroups = useMemo(() => {
    if (synergyProviders.length === 0) return []
    const grouped = new Map<string, { actionId: ActionIdType; label: string; count: number }[]>()
    for (const p of synergyProviders) {
      if (!grouped.has(p.providerName)) grouped.set(p.providerName, [])
      const category = data.getActionCategory(p.actionId)
      const label = category ? t(category.label) : p.actionId
      grouped.get(p.providerName)!.push({ actionId: p.actionId, label, count: p.count })
    }
    return [...grouped.entries()]
  }, [synergyProviders, t])

  return (
    <div className={`border-l-4 ${typeEntry.stripe} bg-white rounded-lg border border-slate-200`}>
      <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer" onClick={handleToggleExpand}>
        {/* 固定・削除ボタン（縦並び） */}
        <div className="shrink-0 flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleLock(card.name)
            }}
            className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
              isLocked ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'
            }`}
            title={isLocked ? t('unit.result.locked_label') : ''}
          >
            <LockIcon className="w-3.5 h-3.5" filled={isLocked} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove(card.name)
            }}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-300 hover:text-red-400 transition-colors"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* サポート情報 */}
        <div className="flex-1 min-w-0">
          {/* サポート名 */}
          <div className="mb-1 overflow-x-auto scrollbar-none">
            <span className="text-[13px] font-black text-slate-800 whitespace-nowrap">{card.name}</span>
          </div>
          {/* バッジ行 */}
          <div className="flex flex-nowrap gap-1 overflow-x-auto scrollbar-none">
            <Badge size={enums.BadgeSizeType.Sm} weight={enums.BadgeWeightType.Black} color={rarityEntry.color}>
              {t(rarityEntry.label)}
            </Badge>
            <Badge size={enums.BadgeSizeType.Sm} color={typeEntry.badge}>
              {t(typeEntry.label)}
            </Badge>
            <Badge size={enums.BadgeSizeType.Sm} color={planEntry.badge}>
              {t(planEntry.label)}
            </Badge>
            {isRental && (
              <Badge
                size={enums.BadgeSizeType.Sm}
                weight={enums.BadgeWeightType.Black}
                color="bg-emerald-500 text-white"
              >
                {t('unit.result.rental_label')}
              </Badge>
            )}
          </div>
        </div>

        {/* スコア表示 + マーク */}
        <div className="shrink-0 text-right flex items-center gap-1">
          {/* SP発生率マーク（上固定）+ 点数調整済みマーク（下固定）を縦並び */}
          <div className="w-5 flex flex-col items-center justify-start gap-0.5 shrink-0">
            {/* SPバッジ（常に上） */}
            {hasSP ? (
              <Badge
                size={enums.BadgeSizeType.Sm}
                weight={enums.BadgeWeightType.Black}
                color="bg-amber-400 text-amber-900"
              >
                {t('card.sp_badge')}
              </Badge>
            ) : (
              <span className="w-5 h-5" />
            )}
            {/* 調整済みマーク（常に下） */}
            {hasCustom ? (
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-violet-100 shrink-0">
                <AdjustedIcon className="w-3 h-3 text-violet-500" title={t('card.count_adjusted')} />
              </span>
            ) : (
              <span className="w-5 h-5" />
            )}
          </div>
          <div className={`text-sm font-black ${typeEntry.text}`}>
            {effectiveScore.toLocaleString()}
            <span className="text-[10px] font-bold text-slate-500 ml-0.5">{t('ui.unit.score')}</span>
          </div>
        </div>

        {/* 展開インジケーター */}
        <ChevronDownIcon
          className={`shrink-0 w-3.5 h-3.5 text-slate-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* 展開時の点数内訳（点数詳細モーダルと同じ形式で表示） */}
      {expanded && (
        <div className="px-3 pb-2.5 space-y-0.5">
          <div className="border-t border-slate-100 pt-2 space-y-2">
            {/* サポートイベント（基礎値 + ボーナス率% + 最終値） */}
            {(result.eventBoost > 0 || result.eventBoostBase > 0) && <EventBoostSection result={result} />}
            {/* サポートアビリティ（パラメータボーナス + 各アビリティ） */}
            {(abilities.length > 0 || hasParamBonus) && (
              <div>
                <h4 className={constant.SECTION_HEADING_SM_PX}>{t('ui.header.support_abilities')}</h4>
                <div className="space-y-0.5">
                  {/* パラメータボーナス（基礎値 × ボーナス率%） */}
                  {hasParamBonus &&
                    (() => {
                      const paramStyles = getScoreStyles(result.parameterBonus)
                      return (
                        <div className={`flex items-end text-xs px-2 py-1 rounded ${paramStyles.rowBackground}`}>
                          <span className={`flex-1 mr-2 leading-snug break-words ${paramStyles.textColor}`}>
                            {t('ui.settings.param_bonus_label')}
                          </span>
                          <span
                            className={`text-[10px] shrink-0 text-right mr-2 min-w-[3.5rem] pb-0.5 ${paramStyles.subTextColor}`}
                          >
                            {result.paramBonusBase} {t('ui.symbol.multiply')} {result.paramBonusPercent}
                            {t('ui.symbol.percent')}
                          </span>
                          <span className={`shrink-0 text-right min-w-[3rem] pb-0.5 ${paramStyles.scoreColor}`}>
                            {t('ui.symbol.plus')}
                            {result.parameterBonus}
                          </span>
                        </div>
                      )
                    })()}
                  {/* 各アビリティ行（サポート間連携込み） */}
                  {abilities.map((ab) => (
                    <AbilityRow key={ab.trigger} ab={ab} extraCount={supportSynergyDetail[ab.trigger] ?? 0} />
                  ))}
                </div>
              </div>
            )}
            {/* Pアイテム（効果説明付き・サポート間連携込み） */}
            {pItems.length > 0 && (
              <div>
                <h4 className={constant.SECTION_HEADING_SM_PX}>{t('ui.header.produce_item')}</h4>
                <div className="space-y-0.5">
                  {pItems.map((ab) => (
                    <AbilityRow key={ab.trigger} ab={ab} extraCount={supportSynergyDetail[ab.trigger] ?? 0} />
                  ))}
                </div>
              </div>
            )}
            {/* 提供元詳細 */}
            {providerGroups.length > 0 && (
              <div className="border-t border-slate-100 pt-1 mt-1 space-y-0.5">
                {providerGroups.map(([providerName, actions]) => (
                  <div key={providerName} className="flex items-end text-xs rounded px-2 py-0.5">
                    <span className="flex-1 mr-2 leading-snug break-words text-emerald-700 font-bold">
                      {providerName}
                    </span>
                    <span className="shrink-0 text-right text-[10px] text-emerald-600">
                      {actions.map((a, i) => (
                        <span key={a.actionId}>
                          {i > 0 && ', '}
                          {a.label}
                          {t('ui.symbol.plus')}
                          {a.count}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {/* インライン回数設定 */}
            <div className="relative">
              {hasCustom && (
                <button
                  type="button"
                  className="absolute top-0 right-0 z-[1] text-[10px] text-blue-600 hover:text-blue-700 font-bold"
                  onClick={handleClearCustom}
                >
                  {t('ui.button.reset')}
                </button>
              )}
              <CountCustomSection
                card={card}
                selfTriggerCustom={cardCustom.selfTrigger ?? {}}
                pItemCountCustom={cardCustom.pItemCount ?? {}}
                autoCounts={member.result.autoCounts}
                onSelfTriggerChange={handleSelfTriggerChange}
                onRemoveSelfTrigger={handleRemoveSelfTrigger}
                onPItemCountChange={handlePItemCountChange}
                onRemovePItemCount={handleRemovePItemCount}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

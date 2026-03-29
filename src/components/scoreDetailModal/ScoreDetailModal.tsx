/**
 * スコア内訳モーダルコンポーネント
 *
 * カードグリッドでスコアをクリックしたときに開くモーダル。
 * イベントブースト・アビリティ・パラメータボーナス・Pアイテムの
 * 内訳を表示し、右側に合計スコアを表示する。
 * カード別のアクション回数オーバーライドも設定できる。
 */
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupportCard, CardCalculationResult } from '../../types/card'
import type { ActionIdType } from '../../types/enums'
import * as enums from '../../types/enums'
import type { CardOverrideData } from '../../hooks/useCardCountOverrides'
import * as data from '../../data'
import * as constant from '../../constant'
import { TriggerActionMap } from '../../data/score'
import { getSelfAcquisitionBonus } from '../../utils/calculator/events'
import CollapsibleSection from '../ui/CollapsibleSection'
import CloseButton from '../ui/CloseButton'
import ModalOverlay from '../ui/ModalOverlay'
import { HelpTooltip } from '../ui/HelpTooltip'
import { AbilityBreakdownList } from './AbilityBreakdownList'
import { CountOverrideSection } from './CountOverrideSection'
import { useAccordionState } from '../../hooks'

/** ScoreDetailModal コンポーネントに渡すプロパティ */
interface ScoreDetailModalProps {
  /** サポートカードデータ */
  card: SupportCard
  /** スコア計算結果 */
  result: CardCalculationResult
  /** このカードのオーバーライドデータ */
  countOverrides: CardOverrideData
  /** 自動カウントのオーバーライドを変更する関数 */
  onSelfTriggerChange: (actionId: ActionIdType, count: number) => void
  /** Pアイテム発動回数のオーバーライドを変更する関数 */
  onPItemCountChange: (actionId: ActionIdType, count: number) => void
  /** 自身イベント効果の自動カウントが有効か */
  includeSelfTrigger: boolean
  /** このカードの全オーバーライドをリセットする関数 */
  onClearCardOverrides: () => void
  /** モーダルを閉じる関数 */
  onClose: () => void
}

/** スコア内訳モーダル */
export default function ScoreDetailModal({
  card,
  result,
  countOverrides,
  onSelfTriggerChange,
  onPItemCountChange,
  includeSelfTrigger,
  onClearCardOverrides,
  onClose,
}: ScoreDetailModalProps) {
  const { t } = useTranslation()
  const typeEntry = data.getTypeEntry(card.type)
  const { state: sections, toggle } = useAccordionState({
    [enums.ScoreDetailSectionKey.CountOverride]: false,
  })

  // カウントオーバーライドがあるかどうか
  const hasOverrides = Object.keys(countOverrides.selfTrigger ?? {}).length > 0
    || Object.keys(countOverrides.pItemCount ?? {}).length > 0

  // カウント調整の対象項目があるかどうか（なければセクション自体を非表示）
  const hasCountItems = useMemo(() => {
    if (includeSelfTrigger && Object.keys(getSelfAcquisitionBonus(card)).length > 0) return true
    if (card.p_item?.boost && TriggerActionMap[card.p_item.boost.trigger_key]) return true
    return false
  }, [card, includeSelfTrigger])

  /** 自動カウント変更ハンドラ */
  const handleSelfTriggerChange = useCallback(
    (actionId: ActionIdType, count: number) => {
      onSelfTriggerChange(actionId, count)
    },
    [onSelfTriggerChange],
  )

  /** Pアイテム発動回数変更ハンドラ */
  const handlePItemCountChange = useCallback(
    (actionId: ActionIdType, count: number) => {
      onPItemCountChange(actionId, count)
    },
    [onPItemCountChange],
  )

  return (
    <ModalOverlay onClose={onClose} panelClassName={constant.MODAL_PANEL_SCORE}>
      {/* ヘッダー: カード名 + 閉じるボタン */}
      <div className={`${typeEntry.bg} border-b ${typeEntry.border} rounded-t-2xl px-5 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-black text-slate-900">{card.name}</h3>
            <HelpTooltip text={t('ui.help.tooltip_score_detail')} />
          </div>
          <CloseButton onClick={onClose} />
        </div>
      </div>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* 左: カテゴリ別内訳リスト + カウント設定 */}
          <div className="flex-1 overflow-y-auto p-4">
            <AbilityBreakdownList result={result} />

            {/* カード別カウント設定（対象項目がある場合のみ表示） */}
            {hasCountItems && (
            <div className="mt-3">
              <CollapsibleSection
                title={
                  <div className="flex items-center gap-1.5">
                    <span>{t('ui.header.count_override')}</span>
                    <HelpTooltip text={t('ui.help.tooltip_count_override')} />
                    {hasOverrides && (
                      <button
                        type="button"
                        className="text-[10px] text-blue-500 hover:text-blue-700 font-bold ml-auto"
                        onClick={(e) => {
                          e.stopPropagation()
                          onClearCardOverrides()
                        }}
                      >
                        {t('ui.button.reset')}
                      </button>
                    )}
                  </div>
                }
                isOpen={sections[enums.ScoreDetailSectionKey.CountOverride]}
                onToggle={() => toggle(enums.ScoreDetailSectionKey.CountOverride)}
              >
                <div className="pt-2 pb-1 px-1">
                  <CountOverrideSection
                    card={card}
                    selfTriggerOverrides={countOverrides.selfTrigger ?? {}}
                    pItemCountOverrides={countOverrides.pItemCount ?? {}}
                    autoActionCounts={result.autoActionCounts}
                    includeSelfTrigger={includeSelfTrigger}
                    onSelfTriggerChange={handleSelfTriggerChange}
                    onPItemCountChange={handlePItemCountChange}
                  />
                </div>
              </CollapsibleSection>
            </div>
            )}
          </div>

          {/* 右: 合計スコア表示 */}
          <div
            className={`flex flex-row sm:flex-col items-center justify-center px-4 py-2 sm:py-0 border-t sm:border-t-0 sm:border-l ${typeEntry.border} ${typeEntry.bg}`}
          >
            {/* 「合計」ラベル */}
            <span className="text-[10px] font-bold text-slate-400 sm:mb-1 mr-2 sm:mr-0">{t('ui.settings.total')}</span>
            {/* 合計スコア値 */}
            <span className={`text-2xl font-black ${typeEntry.text} mr-2 sm:mr-0`}>{result.totalIncrease}</span>
            {/* 「点」単位 */}
            <span className="text-[10px] font-bold text-slate-400">{t('ui.unit.score')}</span>
          </div>
        </div>
    </ModalOverlay>
  )
}

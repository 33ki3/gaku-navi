/**
 * スコア内訳モーダルコンポーネント
 *
 * サポートグリッドでスコアをクリックしたときに開くモーダル。
 * イベントブースト・アビリティ・パラメータボーナス・Pアイテムの
 * 内訳を表示し、右側に合計スコアを表示する。
 * サポート別のアクション回数回数調整も設定できる。
 */
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupportCard, CardCalculationResult } from '../../types/card'
import type { ActionIdType } from '../../types/enums'
import * as enums from '../../types/enums'
import type { CardCustomData } from '../../hooks/useCardCountCustom'
import * as data from '../../data'
import * as constant from '../../constant'
import { TriggerActionMap } from '../../data/score'
import { getProvidedActions } from '../../utils/supportSynergy'
import CollapsibleSection from '../ui/CollapsibleSection'
import CloseButton from '../ui/CloseButton'
import ModalOverlay from '../ui/ModalOverlay'
import { HelpTooltip } from '../ui/HelpTooltip'
import { AbilityBreakdownList } from './AbilityBreakdownList'
import { CountCustomSection } from './CountCustomSection'
import { useAccordionState } from '../../hooks'

/** ScoreDetailModal コンポーネントに渡すプロパティ */
interface ScoreDetailModalProps {
  /** サポートカードデータ */
  card: SupportCard
  /** スコア計算結果 */
  result: CardCalculationResult
  /** このサポートの回数調整データ */
  countCustom: CardCustomData
  /** 自動カウントの回数調整を変更する関数 */
  onSelfTriggerChange: (actionId: ActionIdType, count: number) => void
  /** 自動カウントの回数調整を個別に削除する関数 */
  onRemoveSelfTrigger: (actionId: ActionIdType) => void
  /** Pアイテム発動回数の回数調整を変更する関数 */
  onPItemCountChange: (actionId: ActionIdType, count: number) => void
  /** Pアイテム発動回数の回数調整を個別に削除する関数 */
  onRemovePItemCount: (actionId: ActionIdType) => void
  /** このサポートの全回数調整をリセットする関数 */
  onClearCardCustom: () => void
  /** モーダルを閉じる関数 */
  onClose: () => void
}

/** スコア内訳モーダル */
export default function ScoreDetailModal({
  card,
  result,
  countCustom,
  onSelfTriggerChange,
  onRemoveSelfTrigger,
  onPItemCountChange,
  onRemovePItemCount,
  onClearCardCustom,
  onClose,
}: ScoreDetailModalProps) {
  const { t } = useTranslation()
  const typeEntry = data.getTypeEntry(card.type)
  const { state: sections, toggle } = useAccordionState({
    [enums.ScoreDetailSectionKey.CountCustom]: false,
  })

  // 回数調整があるかどうか
  const hasCustom =
    Object.keys(countCustom.selfTrigger ?? {}).length > 0 || Object.keys(countCustom.pItemCount ?? {}).length > 0

  // 回数調整の対象項目があるかどうか（なければセクション自体を非表示）
  const hasCountItems = useMemo(() => {
    if (Object.keys(getProvidedActions(card)).length > 0) return true
    if (card.p_item?.boost && TriggerActionMap[card.p_item.boost.trigger_key]) return true
    return false
  }, [card])

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
      {/* ヘッダー: サポート名 + 閉じるボタン */}
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

          {/* サポート別カウント設定（対象項目がある場合のみ表示） */}
          {hasCountItems && (
            <div className="mt-3">
              <CollapsibleSection
                title={
                  <div className="flex items-center gap-1.5">
                    <span>{t('ui.header.count_custom')}</span>
                    <HelpTooltip text={t('ui.help.tooltip_count_custom')} />
                    {hasCustom && (
                      <button
                        type="button"
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-bold ml-auto"
                        onClick={(e) => {
                          e.stopPropagation()
                          onClearCardCustom()
                        }}
                      >
                        {t('ui.button.reset')}
                      </button>
                    )}
                  </div>
                }
                isOpen={sections[enums.ScoreDetailSectionKey.CountCustom]}
                onToggle={() => toggle(enums.ScoreDetailSectionKey.CountCustom)}
              >
                <div className="pt-2 pb-1 px-1">
                  <CountCustomSection
                    card={card}
                    selfTriggerCustom={countCustom.selfTrigger ?? {}}
                    pItemCountCustom={countCustom.pItemCount ?? {}}
                    autoCounts={result.autoCounts}
                    onSelfTriggerChange={handleSelfTriggerChange}
                    onRemoveSelfTrigger={onRemoveSelfTrigger}
                    onPItemCountChange={handlePItemCountChange}
                    onRemovePItemCount={onRemovePItemCount}
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
          <span className="text-[10px] font-bold text-slate-500 sm:mb-1 mr-2 sm:mr-0">{t('ui.settings.total')}</span>
          {/* 合計スコア値 */}
          <span className={`text-2xl font-black ${typeEntry.text} mr-2 sm:mr-0`}>{result.totalIncrease}</span>
          {/* 「点」単位 */}
          <span className="text-[10px] font-bold text-slate-500">{t('ui.unit.score')}</span>
        </div>
      </div>
    </ModalOverlay>
  )
}

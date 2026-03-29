/**
 * カード別カウント設定セクション
 *
 * 点数詳細モーダル内で、カードの自動カウント（自身イベント効果の加算値）と
 * Pアイテムの発動回数をカード個別にオーバーライドできるUI。
 * 各項目に SpinnerInput を表示し、変更時に再計算をトリガーする。
 * アビリティやPアイテムに発動回数上限がある場合、SpinnerInput の最大値を制限する。
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupportCard } from '../../types/card'
import type { ActionIdType } from '../../types/enums'
import { TriggerActionMap, getActionCategory } from '../../data/score'
import { getSelfAcquisitionBonus } from '../../utils/calculator/events'
import { SpinnerInput } from '../ui/SpinnerInput'

/** CountOverrideSection コンポーネントに渡すプロパティ */
interface CountOverrideSectionProps {
  /** サポートカードデータ */
  card: SupportCard
  /** 自動カウント（selfBonus）のオーバーライド値 */
  selfTriggerOverrides: Partial<Record<ActionIdType, number>>
  /** Pアイテム発動回数のオーバーライド値 */
  pItemCountOverrides: Partial<Record<ActionIdType, number>>
  /** 自動計算回数（オーバーライドなし。Pアイテムの自動値表示用） */
  autoActionCounts: Partial<Record<ActionIdType, number>>
  /** 自身イベント効果が有効か */
  includeSelfTrigger: boolean
  /** 自動カウントのオーバーライドを変更する関数 */
  onSelfTriggerChange: (actionId: ActionIdType, count: number) => void
  /** Pアイテム発動回数のオーバーライドを変更する関数 */
  onPItemCountChange: (actionId: ActionIdType, count: number) => void
}

/** カード別カウント設定セクション */
export function CountOverrideSection({
  card,
  selfTriggerOverrides,
  pItemCountOverrides,
  autoActionCounts,
  includeSelfTrigger,
  onSelfTriggerChange,
  onPItemCountChange,
}: CountOverrideSectionProps) {
  const { t } = useTranslation()

  // アビリティの発動回数上限をアクションID別に取得する
  // 同一アクションIDに複数アビリティがある場合は最大値を採用する
  const abilityMaxCounts = useMemo(() => {
    const maxCounts: Partial<Record<ActionIdType, number>> = {}
    for (const ability of card.abilities) {
      if (!ability.trigger_key || ability.max_count === undefined) continue
      const actionId = TriggerActionMap[ability.trigger_key]
      if (!actionId) continue
      const current = maxCounts[actionId]
      maxCounts[actionId] = current !== undefined ? Math.max(current, ability.max_count) : ability.max_count
    }
    return maxCounts
  }, [card.abilities])

  // 自動カウント（selfBonus）の項目を取得する
  const selfBonusEntries = useMemo(() => {
    if (!includeSelfTrigger) return []
    const bonus = getSelfAcquisitionBonus(card)
    return Object.entries(bonus).map(([actionId, autoCount]) => ({
      actionId: actionId as ActionIdType,
      autoCount: autoCount ?? 0,
    }))
  }, [card, includeSelfTrigger])

  // Pアイテムの発動トリガーを取得する
  const pItemEntry = useMemo(() => {
    if (!card.p_item?.boost) return null
    const actionId = TriggerActionMap[card.p_item.boost.trigger_key]
    if (!actionId) return null
    const autoCount = autoActionCounts[actionId] ?? 0
    const maxCount = card.p_item.boost.max_count
    return { actionId, autoCount, maxCount, name: card.p_item.name }
  }, [card, autoActionCounts])

  // 表示する項目がなければ何も表示しない
  if (selfBonusEntries.length === 0 && !pItemEntry) return null

  return (
    <div className="space-y-2.5">
      {/* 自動カウント（自身イベント効果）セクション */}
      {selfBonusEntries.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('ui.header.self_trigger_count')}</div>
          {selfBonusEntries.map(({ actionId, autoCount }) => {
            const label = getActionCategory(actionId)!.label
            const maxCount = abilityMaxCounts[actionId]
            const currentValue = selfTriggerOverrides[actionId] ?? autoCount
            const isOverridden = actionId in selfTriggerOverrides

            return (
              <div key={actionId} className="flex items-center justify-between gap-2">
                <span className={`text-xs flex-1 min-w-0 truncate ${isOverridden ? 'font-bold text-slate-700' : 'text-slate-500'}`}>
                  {t(label)}
                </span>
                <SpinnerInput value={currentValue} max={maxCount} onChange={(v) => onSelfTriggerChange(actionId, v)} />
              </div>
            )
          })}
        </div>
      )}

      {/* Pアイテム発動回数セクション */}
      {pItemEntry && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('ui.header.p_item_count')}</div>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs flex-1 min-w-0 truncate ${pItemEntry.actionId in pItemCountOverrides ? 'font-bold text-slate-700' : 'text-slate-500'}`}>
              {pItemEntry.name}
            </span>
            <SpinnerInput

              value={Math.min(pItemCountOverrides[pItemEntry.actionId] ?? pItemEntry.autoCount, pItemEntry.maxCount ?? Infinity)}
              max={pItemEntry.maxCount}
              onChange={(v) => onPItemCountChange(pItemEntry.actionId, v)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

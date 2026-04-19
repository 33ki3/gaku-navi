/**
 * サポート別カウント設定セクション
 *
 * 点数詳細モーダル内で、サポートのイベント・Pアイテムが提供するアクション回数と
 * Pアイテムの発動回数をサポート個別に回数調整できるUI。
 * 各項目に SpinnerInput を表示し、変更時に再計算をトリガーする。
 * アビリティやPアイテムに発動回数上限がある場合、SpinnerInput の最大値を制限する。
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupportCard } from '../../types/card'
import type { ActionIdType } from '../../types/enums'
import { TriggerActionMap, getActionCategory, LinkedActionGroups } from '../../data/score'
import { getProvidedActions } from '../../utils/supportSynergy'
import { SpinnerInput } from '../ui/SpinnerInput'

/** CountCustomSection コンポーネントに渡すプロパティ */
interface CountCustomSectionProps {
  /** サポートカードデータ */
  card: SupportCard
  /** イベント提供アクション回数の回数調整値（スキルカード獲得、Pアイテム獲得等の回数を手動設定） */
  selfTriggerCustom: Partial<Record<ActionIdType, number>>
  /** Pアイテム発動回数の回数調整値 */
  pItemCountCustom: Partial<Record<ActionIdType, number>>
  /** 自動カウント回数（回数調整なし。Pアイテムの自動値表示用） */
  autoCounts: Partial<Record<ActionIdType, number>>
  /** イベント提供アクション回数の回数調整を変更する関数 */
  onSelfTriggerChange: (actionId: ActionIdType, count: number) => void
  /** イベント提供アクション回数の回数調整を個別に削除する関数 */
  onRemoveSelfTrigger: (actionId: ActionIdType) => void
  /** Pアイテム発動回数の回数調整を変更する関数 */
  onPItemCountChange: (actionId: ActionIdType, count: number) => void
  /** Pアイテム発動回数の回数調整を個別に削除する関数 */
  onRemovePItemCount: (actionId: ActionIdType) => void
}

/** サポート別カウント設定セクション */
export function CountCustomSection({
  card,
  selfTriggerCustom,
  pItemCountCustom,
  autoCounts,
  onSelfTriggerChange,
  onRemoveSelfTrigger,
  onPItemCountChange,
  onRemovePItemCount,
}: CountCustomSectionProps) {
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

  // サポートが提供するアクション回数を取得する（イベント・Pアイテム由来）
  // autoCounts にスケジュール由来のアクション回数が含まれるため、actionCounts として渡す
  const providedEntries = useMemo(() => {
    const provided = getProvidedActions(card, { actionCounts: autoCounts })
    return Object.entries(provided).map(([actionId, autoCount]) => ({
      actionId: actionId as ActionIdType,
      autoCount: autoCount ?? 0,
    }))
  }, [card, autoCounts])

  // 汎用アクションの提供回数を、特化アクションの上限として引き継ぐ
  // 例: skill_enhance が提供されている場合、m_skill_enhance / a_skill_enhance の上限は skill_enhance の提供回数になる
  const linkedGroupLimitMap = useMemo(() => {
    const map: Partial<Record<ActionIdType, number>> = {}
    const providedMap = Object.fromEntries(providedEntries.map((e) => [e.actionId, e.autoCount]))
    for (const [parentId, ...childIds] of LinkedActionGroups) {
      const parentCount = providedMap[parentId]
      if (parentCount === undefined) continue
      for (const childId of childIds) {
        if (childId in providedMap) {
          map[childId] = parentCount
        }
      }
    }
    return map
  }, [providedEntries])

  // Pアイテムの発動トリガーを取得する
  const pItemEntry = useMemo(() => {
    if (!card.p_item?.boost) return null
    const actionId = TriggerActionMap[card.p_item.boost.trigger_key]
    if (!actionId) return null
    const rawAutoCount = autoCounts[actionId] ?? 0
    const maxCount = card.p_item.boost.max_count
    // max_count がある場合、自動カウントの下限を max_count で保証する（PItem発動回数をデフォルトに反映）
    const autoCount = maxCount !== undefined ? Math.max(rawAutoCount, maxCount) : rawAutoCount
    return { actionId, autoCount, maxCount, name: card.p_item.name }
  }, [card, autoCounts])

  // 表示する項目がなければ何も表示しない
  if (providedEntries.length === 0 && !pItemEntry) return null

  return (
    <div className="space-y-2.5">
      {/* イベント・Pアイテム提供回数セクション */}
      {providedEntries.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {t('ui.header.self_trigger_count')}
          </div>
          {providedEntries.map(({ actionId, autoCount }) => {
            const label = getActionCategory(actionId)!.label
            const abilityMax = abilityMaxCounts[actionId]
            const currentValue = selfTriggerCustom[actionId] ?? autoCount
            const isCustomized = actionId in selfTriggerCustom
            // 上限計算: アビリティに発動回数上限がある場合、スケジュール由来の回数を差し引いた残り余地
            // 例: abilityMax=5, autoTotal=3, currentValue=1 → scheduleBase=2, abilityLimit=3
            // abilityMax を絶対上限としてキャップする（scheduleBase が負の場合に超過しないようにする）
            const autoTotal = autoCounts[actionId] ?? 0
            const scheduleBase = autoTotal - currentValue
            const abilityLimit =
              abilityMax !== undefined ? Math.min(abilityMax, Math.max(0, abilityMax - scheduleBase)) : undefined
            // サブタイプは汎用（親）アクションの提供回数を超えられない
            // 例: SkillEnhance=3回の場合、MSkillEnhance+ASkillEnhanceの合計が3以下になる
            const linkedGroupLimit = linkedGroupLimitMap[actionId]
            const maxCount =
              abilityLimit !== undefined && linkedGroupLimit !== undefined
                ? Math.min(abilityLimit, linkedGroupLimit)
                : (abilityLimit ?? linkedGroupLimit)

            return (
              <div key={actionId} className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs flex-1 min-w-0 truncate ${isCustomized ? 'font-bold text-slate-700' : 'text-slate-500'}`}
                >
                  {t(label)}
                </span>
                <SpinnerInput
                  value={currentValue}
                  max={maxCount}
                  onChange={(v) => {
                    if (v === autoCount) onRemoveSelfTrigger(actionId)
                    else onSelfTriggerChange(actionId, v)
                  }}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Pアイテム発動回数セクション */}
      {pItemEntry && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {t('ui.header.p_item_count')}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs flex-1 min-w-0 truncate ${pItemEntry.actionId in pItemCountCustom ? 'font-bold text-slate-700' : 'text-slate-500'}`}
            >
              {pItemEntry.name}
            </span>
            <SpinnerInput
              value={Math.min(
                pItemCountCustom[pItemEntry.actionId] ?? pItemEntry.autoCount,
                pItemEntry.maxCount ?? Infinity,
              )}
              max={pItemEntry.maxCount}
              onChange={(v) => {
                if (v === pItemEntry.autoCount) onRemovePItemCount(pItemEntry.actionId)
                else onPItemCountChange(pItemEntry.actionId, v)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

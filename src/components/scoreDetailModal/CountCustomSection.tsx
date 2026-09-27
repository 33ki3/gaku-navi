/**
 * サポート別カウント設定セクション
 *
 * 点数詳細モーダルで、サポートが提供するアクションとPアイテムの発動回数を
 * サポートごとに調整できるようにする
 * 発動回数に上限がある効果は、入力できる回数もその上限に合わせる
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LinkedActionGroups, TriggerActionMap, getActionCategory } from '../../data/score'
import type { SupportCard } from '../../types/card'
import type { ActionIdType } from '../../types/enums'
import { isActionId } from '../../utils/domainValueValidation'
import { getProvidedActions } from '../../utils/supportSynergy'
import { SpinnerInput } from '../ui/SpinnerInput'

/** サポート別の回数調整と表示データ */
interface CountCustomSectionProps {
  /** サポートカードデータ */
  card: SupportCard
  /** イベント提供アクションの回数調整値（スキルカード・Pアイテム獲得など） */
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
  // スケジュール由来の回数も含めて、サポートが提供する回数を計算する
  const providedEntries = useMemo(() => {
    const provided = getProvidedActions(card, { actionCounts: autoCounts })
    // 保存データ由来の未知IDを画面へ渡さず、既知のアクションだけ回数調整対象にする
    return Object.entries(provided)
      .filter((entry): entry is [ActionIdType, number] => isActionId(entry[0]))
      .map(([actionId, autoCount]) => ({
        actionId,
        autoCount: autoCount ?? 0,
      }))
  }, [card, autoCounts])

  // 汎用アクションの提供回数を、特化アクションの上限として引き継ぐ
  // 例: skill_enhanceが3回なら、m_skill_enhanceとa_skill_enhanceの合計を3回以下にする
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
    // Pアイテムに発動回数の指定がある場合は自動カウントの下限にし、Pアイテムの発動回数を初期値として表示する
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
            // 発動回数の入力上限を計算する
            // アビリティ上限からスケジュール分を差し引き、残りの範囲に収める
            // 例: 上限5回・自動3回・個別1回なら、個別入力は3回までにする
            const autoTotal = autoCounts[actionId] ?? 0
            const scheduleBase = autoTotal - currentValue
            const abilityLimit =
              abilityMax !== undefined ? Math.min(abilityMax, Math.max(0, abilityMax - scheduleBase)) : undefined
            // 特化アクションは汎用アクションの提供回数を超えられない
            // 例: 汎用が3回なら、特化2種の合計も3回以下にする
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

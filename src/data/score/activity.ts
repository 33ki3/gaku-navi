/**
 * 活動マスタデータ。
 *
 * 各活動の表示名・ボタン色・対応アクション一覧を統合的に定義する。
 */

import { type ActivityIdType, type ActionIdType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** 活動エントリの型 */
interface ActivityEntry {
  id: ActivityIdType
  label: TranslationKey
  color: string
  actions: ActionIdType[]
}

const entries: ActivityEntry[] = [
  { id: 'vo_lesson', label: 'score.activity.vo_lesson', color: 'bg-red-500 text-white', actions: ['sp_lesson_vo'] },
  { id: 'da_lesson', label: 'score.activity.da_lesson', color: 'bg-blue-500 text-white', actions: ['sp_lesson_da'] },
  { id: 'vi_lesson', label: 'score.activity.vi_lesson', color: 'bg-yellow-500 text-white', actions: ['sp_lesson_vi'] },
  { id: 'class', label: 'score.activity.class', color: 'bg-indigo-700 text-white', actions: ['class_work'] },
  { id: 'outing', label: 'score.activity.outing', color: 'bg-sky-400 text-white', actions: ['outing'] },
  { id: 'consult', label: 'score.activity.consult', color: 'bg-teal-500 text-white', actions: ['consult'] },
  { id: 'activity_supply', label: 'score.activity.activity_supply', color: 'bg-amber-500 text-white', actions: ['activity_supply_gift'] },
  { id: 'supply_gift', label: 'score.activity.supply_gift', color: 'bg-amber-500 text-white', actions: ['activity_supply_gift'] },
  { id: 'special_training', label: 'score.activity.special_training', color: 'bg-emerald-600 text-white', actions: ['special_training'] },
  { id: 'mid_exam', label: 'score.activity.mid_exam', color: 'bg-orange-600 text-white', actions: ['exam_end', 'exam_p_item_acquire'] },
  { id: 'final_exam', label: 'score.activity.final_exam', color: 'bg-orange-600 text-white', actions: ['exam_end'] },
  { id: 'rest', label: 'score.activity.rest', color: 'bg-slate-400 text-white', actions: ['rest'] },
]

/**
 * 活動IDから表示名を取得する。
 *
 * @param id - 活動ID
 * @returns i18n キー
 */
export function getActivityLabel(id: ActivityIdType): TranslationKey {
  return entries.find((e) => e.id === id)!.label
}

/**
 * 活動IDに応じたボタン色クラスを返す。
 *
 * @param activityId - 活動ID
 * @returns Tailwind CSS のボタン色クラス
 */
export function getActivityColor(activityId: ActivityIdType): string {
  return entries.find((e) => e.id === activityId)!.color
}

/** 活動ID→アクションIDリストの逆引きマップ（entries から派生） */
export const ActivityActionMap: Record<ActivityIdType, ActionIdType[]> = Object.fromEntries(
  entries.map((e) => [e.id, e.actions]),
) as Record<ActivityIdType, ActionIdType[]>

/** スケジュール自動計算で制御されるアクションIDの集合（entries から派生） */
export const ScheduleControlledIds: ReadonlySet<ActionIdType> = new Set(
  entries.flatMap((e) => e.actions),
)

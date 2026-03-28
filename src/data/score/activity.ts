/**
 * 活動マスタデータ。
 *
 * 各活動の表示名・ボタン色・対応アクション一覧を統合的に定義する。
 */

import rawData from './activity.json'
import { type ActivityIdType, type ActionIdType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** 活動エントリの型 */
interface ActivityEntry {
  id: ActivityIdType
  label: TranslationKey
  color: string
  actions: ActionIdType[]
}

const data = rawData as {
  entries: ActivityEntry[]
  action_map: Record<ActivityIdType, ActionIdType[]>
  controlled_action_ids: ActionIdType[]
}

/**
 * 活動IDから表示名を取得する。
 *
 * @param id - 活動ID
 * @returns i18n キー
 */
export function getActivityLabel(id: ActivityIdType): TranslationKey {
  return data.entries.find((e) => e.id === id)!.label
}

/**
 * 活動IDに応じたボタン色クラスを返す。
 *
 * @param activityId - 活動ID
 * @returns Tailwind CSS のボタン色クラス
 */
export function getActivityColor(activityId: ActivityIdType): string {
  return data.entries.find((e) => e.id === activityId)!.color
}

/** 活動ID→アクションIDリストの逆引きマップ（JSON から直接取得） */
export const ActivityActionMap: Record<ActivityIdType, ActionIdType[]> = data.action_map

/** スケジュール自動計算で制御されるアクションIDの集合（JSON から直接取得） */
export const ScheduleControlledIds: ReadonlySet<ActionIdType> = new Set(data.controlled_action_ids)

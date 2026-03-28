/**
 * フィルタ用トリガーキーマスタ。
 *
 * カードフィルタリングに必要なトリガーキーの定義を提供する。
 */
import type { TriggerKeyType } from '../../types/enums'

/** SP レッスン発生率に該当する trigger_key のセット */
export const SpRateTriggers: ReadonlySet<TriggerKeyType> = new Set<TriggerKeyType>([
  'sp_lesson_rate',
  'vo_sp_lesson_rate',
  'da_sp_lesson_rate',
  'vi_sp_lesson_rate',
  'sp_lesson_rate_all',
])

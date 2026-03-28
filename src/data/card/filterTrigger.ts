/**
 * フィルタ用トリガーキーマスタ。
 *
 * カードフィルタリングに必要なトリガーキーの定義を提供する。
 */
import { TriggerKeyType } from '../../types/enums'

/** SP レッスン発生率に該当する trigger_key のセット */
export const SpRateTriggers: ReadonlySet<TriggerKeyType> = new Set<TriggerKeyType>([
  TriggerKeyType.SpLessonRate,
  TriggerKeyType.VoSpLessonRate,
  TriggerKeyType.DaSpLessonRate,
  TriggerKeyType.ViSpLessonRate,
  TriggerKeyType.SpLessonRateAll,
])

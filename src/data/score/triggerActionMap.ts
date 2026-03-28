/**
 * trigger_key → アクション回数キーのマッピングマスタ。
 *
 * アビリティの trigger_key（例: 'lesson_end'）を
 * スケジュール上のアクション回数キー（例: 'lesson'）に変換するためのデータ。
 */
import rawData from './triggerActionMap.json'
import type { TriggerKeyType, ActionIdType } from '../../types/enums'

/** trigger_key → アクション回数キーのマッピング */
export const TriggerActionMap = rawData as Record<TriggerKeyType, ActionIdType>

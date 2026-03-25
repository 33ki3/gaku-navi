/**
 * フィルタ用トリガーキーマスタ。
 *
 * カードフィルタリングに必要なトリガーキーの定義を
 * JSON マスタから読み込み、Set として提供する。
 */
import rawData from '../json/filterTrigger.json'
import type { TriggerKeyType } from '../../types/enums'

const data = rawData as { sp_rate_triggers: TriggerKeyType[] }

/** SP レッスン発生率に該当する trigger_key のセット */
export const SpRateTriggers: ReadonlySet<TriggerKeyType> = new Set(data.sp_rate_triggers)

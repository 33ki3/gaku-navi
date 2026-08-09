/**
 * 保存データに現れるドメイン共通値の検証。
 *
 * Vo・Da・Vi の3値や enum 配列など、複数の設定形式で共通する
 * 小さな構造だけを扱う
 */
import * as enums from '../types/enums'
import { isEnumValue, isFiniteNumber, isRecord } from './valueValidation'

/**
 * Vo・Da・Vi の3値がすべて有限数か判定する
 *
 * @param value - 判定する値
 * @returns パラメータ3値として安全に読める場合に true
 */
export function isParameterValues(value: unknown): boolean {
  return isRecord(value) && isFiniteNumber(value.vocal) && isFiniteNumber(value.dance) && isFiniteNumber(value.visual)
}

/**
 * 配列の全要素が指定 enum の値か判定する
 *
 * @param value - 判定する値
 * @param enumValues - 比較対象の enum 相当定数
 * @returns enum 値だけで構成された配列なら true
 */
export function isEnumArray(value: unknown, enumValues: Readonly<Record<string, string | number>>): boolean {
  return Array.isArray(value) && value.every((item) => isEnumValue(item, enumValues))
}

/** ActionIdType専用の型ガード。呼び出し元で同じenum判定を重複させない */
export function isActionId(value: unknown): value is enums.ActionIdType {
  return isEnumValue(value, enums.ActionIdType)
}

/**
 * アクションIDをキー、有限数を値とするマップか判定する
 *
 * @param value - 判定する値
 * @returns 有効なアクションIDと数値だけを含む場合に true
 */
export function isActionCountRecord(value: unknown): boolean {
  if (!isRecord(value)) return false
  // JSONオブジェクトのキーは文字列になるため、ActionIdTypeの値を実行時に照合する
  return Object.entries(value).every(
    ([actionId, count]) => isEnumValue(actionId, enums.ActionIdType) && isFiniteNumber(count),
  )
}

/**
 * 週番号をキー、活動IDを値とするマップか判定する
 *
 * @param value - 判定する値
 * @returns 正の整数週と有効な活動IDだけを含む場合に true
 */
export function isScheduleSelectionRecord(value: unknown): boolean {
  if (!isRecord(value)) return false
  return Object.entries(value).every(([week, activityId]) => {
    const weekNumber = Number(week)
    return Number.isSafeInteger(weekNumber) && weekNumber > 0 && isEnumValue(activityId, enums.ActivityIdType)
  })
}

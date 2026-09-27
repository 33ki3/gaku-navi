/**
 * 保存データに現れる共通の値を検証する処理
 *
 * Vo・Da・Vi の3値や定義済み選択肢の配列など、複数の設定形式で共通する
 * 小さな構造だけを扱う
 */
import * as constant from '../constant'
import type { ParameterValues } from '../types/card'
import * as enums from '../types/enums'
import { isEnumValue, isFiniteNumber, isRecord } from './valueValidation'

/**
 * Vo・Da・Vi の3値がすべて有限数か判定する
 *
 * @param value - 判定する値
 * @returns パラメータ3値として安全に読める場合に true
 */
export function isParameterValues(value: unknown): value is ParameterValues {
  // オブジェクトであることと、Vo/Da/Viの3軸が有限数であることを同時に確認する
  return isRecord(value) && isFiniteNumber(value.vocal) && isFiniteNumber(value.dance) && isFiniteNumber(value.visual)
}

/**
 * 配列の全要素が指定した選択肢に含まれるか判定する
 *
 * @param value - 判定する値
 * @param enumValues - 受け付ける選択肢の一覧
 * @returns 受け付ける値だけで構成された配列なら true
 */
export function isEnumArray<T extends Readonly<Record<string, string | number>>>(
  value: unknown,
  enumValues: T,
): value is T[keyof T][] {
  // 空配列は許可し、要素がある場合はすべて受け付ける選択肢へ照合する
  return Array.isArray(value) && value.every((item) => isEnumValue(item, enumValues))
}

/**
 * アクションID専用の型ガード。呼び出し元で同じ選択肢判定を重複させない
 *
 * @param value - 判定する値
 * @returns 有効なアクションIDなら true
 */
export function isActionId(value: unknown): value is enums.ActionIdType {
  // 複数の保存経路で同じアクションID判定を再利用する
  return isEnumValue(value, enums.ActionIdType)
}

/**
 * アクションIDをキー、有限数を値とするマップか判定する
 *
 * @param value - 判定する値
 * @returns 有効なアクションIDと数値だけを含む場合に true
 */
export function isActionCountRecord(value: unknown): value is Partial<Record<enums.ActionIdType, number>> {
  if (!isRecord(value)) return false
  // JSONのキーは文字列になるため、アクションIDとして有効かを実行時に照合する
  return Object.entries(value).every(
    ([actionId, count]) =>
      // 回数調整の保存値なので、既知のアクションと安全な整数だけを受け入れる
      isEnumValue(actionId, enums.ActionIdType) &&
      typeof count === 'number' &&
      Number.isSafeInteger(count) &&
      count >= 0 &&
      count <= constant.ACTION_COUNT_MAX,
  )
}

/**
 * 週番号をキー、活動IDを値とするマップか判定する
 *
 * @param value - 判定する値
 * @returns 正の整数週と有効な活動IDだけを含む場合に true
 */
export function isScheduleSelectionRecord(value: unknown): value is Record<number, enums.ActivityIdType> {
  if (!isRecord(value)) return false
  return Object.entries(value).every(([week, activityId]) => {
    // 週番号は正の整数、活動IDは定義済みの選択肢に限定する
    const weekNumber = Number(week)
    return Number.isSafeInteger(weekNumber) && weekNumber > 0 && isEnumValue(activityId, enums.ActivityIdType)
  })
}

/** 回帰比較とPRコメント生成で共有する端末IDとJSON検証処理 */

/** 回帰レポートと画面画像で共通して使う端末ID */
export const RegressionDevice = {
  /** PC幅で撮影した画面 */
  Desktop: 'desktop',
  /** iPhone幅で撮影した画面 */
  IPhone: 'iphone',
  /** Android幅で撮影した画面 */
  Android: 'android',
} as const

/** 回帰レポートに保存する端末ID */
export type RegressionDevice = (typeof RegressionDevice)[keyof typeof RegressionDevice]

/** 各端末IDを画面に表示するときのラベル */
export const regressionDeviceLabels: Record<RegressionDevice, string> = {
  [RegressionDevice.Desktop]: 'PC',
  [RegressionDevice.IPhone]: 'iOS',
  [RegressionDevice.Android]: 'Android',
}

/** 回帰処理で走査する端末ID */
export const regressionDevices: readonly RegressionDevice[] = Object.freeze(Object.values(RegressionDevice))

/** JSONの値をキー参照可能なオブジェクトへ絞り込む */
export type JsonObject = Record<string, unknown>

/** JSON由来の値がnull・配列でないオブジェクトか判定する */
export function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** JSONや画像の任意入力が既知の端末IDか判定する */
export function isRegressionDevice(value: unknown): value is RegressionDevice {
  return typeof value === 'string' && regressionDevices.some((device) => device === value)
}

/** ファイルがまだ存在しない場合だけtrueを返す */
export function isMissingFileError(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT'
}

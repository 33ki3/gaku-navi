/** 回帰関連スクリプトで共有する端末IDと検証処理 */

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

/** 同じシナリオの端末差分をPC・iOS・Androidの順で代表表示へまとめる */
export function selectRepresentativeDeviceChanges<T extends { scenarioId: string; device: RegressionDevice }>(
  changes: readonly T[],
): T[] {
  const scenariosWithDesktopChange = new Set(
    changes.filter((change) => change.device === RegressionDevice.Desktop).map((change) => change.scenarioId),
  )
  const scenariosWithIphoneChange = new Set(
    changes.filter((change) => change.device === RegressionDevice.IPhone).map((change) => change.scenarioId),
  )
  return changes.filter((change) => {
    if (change.device === RegressionDevice.Desktop) return true
    if (scenariosWithDesktopChange.has(change.scenarioId)) return false
    if (change.device === RegressionDevice.IPhone) return true
    return !scenariosWithIphoneChange.has(change.scenarioId)
  })
}

/** JSONの値をキー参照可能なオブジェクトへ絞り込む */
export type JsonObject = Record<string, unknown>

/** JSON由来の値がnull・配列でないオブジェクトか判定する */
export function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 値が有限数か判定する */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** 値が文字列配列か判定する */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

/** ファイルまたはディレクトリがまだ存在しない場合だけtrueを返す */
export function isMissingPathError(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT'
}

/** JSONや画像の任意入力が既知の端末IDか判定する */
export function isRegressionDevice(value: unknown): value is RegressionDevice {
  return typeof value === 'string' && regressionDevices.some((device) => device === value)
}

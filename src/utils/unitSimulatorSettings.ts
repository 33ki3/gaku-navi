/** 最適編成設定をブラウザの保存領域へ保存・復元する */
import * as constant from '../constant'
import type { UnitSimulatorSettings } from '../types/unit'
import { isUnitSimulatorSettings } from './settingsValidation'
import { isRecord } from './valueValidation'

/**
 * 共有既定値の入れ子を変更しないよう、新しい設定一式を作る
 *
 * @returns 新しい最適編成設定オブジェクト
 */
function createDefaultSettings(): UnitSimulatorSettings {
  // 既定値そのものを返さず、画面側で変更しても共有の既定値を壊さないようにする
  const defaults = constant.DEFAULT_UNIT_SIMULATOR_SETTINGS
  return {
    ...defaults,
    allowedTypes: [...defaults.allowedTypes],
    spConstraint: { ...defaults.spConstraint },
    typeCountMin: { ...defaults.typeCountMin },
    typeCountMax: { ...defaults.typeCountMax },
    paramBonusPercent: { ...defaults.paramBonusPercent },
    lockedCards: [...defaults.lockedCards],
    manualCards: [...defaults.manualCards],
    excludedCardNames: [...defaults.excludedCardNames],
    initialParams: { ...defaults.initialParams },
  }
}

/**
 * 検証済み設定を、共有参照を持たないオブジェクトへ複製する
 *
 * @param settings - 複製する検証済み設定
 * @returns 入れ子まで複製した最適編成設定
 */
function cloneSettings(settings: UnitSimulatorSettings): UnitSimulatorSettings {
  // 入れ子の配列・対応表も複製し、読み込み後の画面変更から既定値を守る
  return {
    ...createDefaultSettings(),
    ...settings,
    allowedTypes: [...settings.allowedTypes],
    spConstraint: { ...settings.spConstraint },
    typeCountMin: { ...settings.typeCountMin },
    typeCountMax: { ...settings.typeCountMax },
    paramBonusPercent: { ...settings.paramBonusPercent },
    lockedCards: [...settings.lockedCards],
    manualCards: [...settings.manualCards],
    excludedCardNames: [...settings.excludedCardNames],
    initialParams: { ...settings.initialParams },
  }
}

/**
 * 保存済み最適編成設定へ、コード側の既定値を補完する
 *
 * @param value - 保存データから読み込んだ値
 * @returns 補完済み設定。設定の構造が壊れている場合は null
 */
function parseUnitSimulatorSettings(value: unknown): UnitSimulatorSettings | null {
  // 保存値にない項目だけを既定値で補ってから、設定全体を検証する
  const settings = isRecord(value) ? { ...createDefaultSettings(), ...value } : value
  return isUnitSimulatorSettings(settings) ? cloneSettings(settings) : null
}

/**
 * ブラウザの保存領域から最適編成設定を読み込む
 *
 * @returns 保存済み設定。未保存または不正な場合は既定値
 */
export function loadUnitSimulatorSettings(): UnitSimulatorSettings {
  try {
    // 保存データの構文エラーや保存領域の例外があっても、既定設定で起動する
    const raw = localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY)
    if (raw === null) return createDefaultSettings()

    const parsed: unknown = JSON.parse(raw)
    return parseUnitSimulatorSettings(parsed) ?? createDefaultSettings()
  } catch {
    return createDefaultSettings()
  }
}

/**
 * 最適編成設定を保存する
 *
 * @param settings - 保存する最適編成設定
 * @returns 保存できた場合はtrue
 */
export function saveUnitSimulatorSettings(settings: UnitSimulatorSettings): boolean {
  // どの保存経路から呼ばれても、不完全な設定を保存領域へ残さない
  if (!isUnitSimulatorSettings(settings)) return false
  try {
    localStorage.setItem(constant.UNIT_SIMULATOR_STORAGE_KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}

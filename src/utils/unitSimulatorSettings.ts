/**
 * 最適編成設定を localStorage へ保存・復元し、変更を画面内へ通知する
 */
import * as constant from '../constant'
import type { UnitSimulatorSettings } from '../types/unit'
import { isUnitSimulatorSettings } from './settingsValidation'

/**
 * 共有既定値の入れ子を変更しないよう、新しい設定一式を作る
 *
 * @returns 新しい最適編成設定オブジェクト
 */
function createDefaultSettings(): UnitSimulatorSettings {
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
 * localStorage から最適編成設定を読み込む
 *
 * @returns 保存済み設定。未保存または不正な場合は既定値
 */
export function loadUnitSimulatorSettings(): UnitSimulatorSettings {
  try {
    const raw = localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY)
    if (raw === null) return createDefaultSettings()

    const parsed: unknown = JSON.parse(raw)
    return isUnitSimulatorSettings(parsed) ? cloneSettings(parsed) : createDefaultSettings()
  } catch {
    return createDefaultSettings()
  }
}

/**
 * 最適編成設定を保存し、同じ画面内の利用箇所へ変更を通知する
 *
 * @param settings - 保存・通知する最適編成設定
 * @returns 戻り値なし
 */
export function saveUnitSimulatorSettings(settings: UnitSimulatorSettings): void {
  try {
    localStorage.setItem(constant.UNIT_SIMULATOR_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    /** ストレージを利用できない環境でも、画面内の変更通知は続ける */
  }

  // 同一タブ内のオプション画面へ、storageイベントを待たず即時に変更を通知する
  window.dispatchEvent(
    new CustomEvent<UnitSimulatorSettings>(constant.UNIT_SIMULATOR_SETTINGS_CHANGED_EVENT, { detail: settings }),
  )
}

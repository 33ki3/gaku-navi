/**
 * プリセット管理ユーティリティ
 *
 * 点数設定のプリセット（名前付きの設定セット）を
 * localStorage に保存・読み込み・削除する。
 */

import * as constant from '../constant'
import type { ScoreSettings } from '../types/card'
import { getScoreSettingsForStorage, normalizeScoreSettings, normalizeScoreSettingsDerived } from './scoreSettings'
import { isRecord } from './valueValidation'

/** プリセット1件のデータ。保存名と設定値を持つ。 */
export interface ScorePreset {
  /** プリセット名 */
  name: string
  /** 保存された点数設定 */
  settings: ScoreSettings
}

/** プリセット一覧をlocalStorage保存形式へ変換する */
function getScorePresetsForStorage(presets: readonly ScorePreset[]) {
  return presets.map(({ name, settings }) => ({
    name,
    settings: getScoreSettingsForStorage(settings),
  }))
}

/** 保存データのプリセット配列を実行時設定へ変換する */
function normalizeScorePresets(value: unknown): ScorePreset[] | null {
  if (!Array.isArray(value)) return null

  return value.flatMap((item): ScorePreset[] => {
    if (!isRecord(item) || typeof item.name !== 'string') return []
    const settings = normalizeScoreSettings(item.settings)
    return settings ? [{ name: item.name, settings: normalizeScoreSettingsDerived(settings) }] : []
  })
}

/**
 * localStorage からプリセット一覧を読み込む
 *
 * @returns プリセット配列（保存データがないか壊れている場合は空配列）
 */
export function loadPresets(): ScorePreset[] {
  try {
    const raw = localStorage.getItem(constant.SCORE_PRESETS_STORAGE_KEY)
    if (!raw) return []
    // 配列でない値・名前のない項目・設定が壊れた項目は除外し、読めるプリセットだけを残す
    return normalizeScorePresets(JSON.parse(raw)) ?? []
  } catch {
    return []
  }
}

/**
 * プリセット一覧を localStorage に保存する
 *
 * @param presets - 保存するプリセット配列
 */
function savePresets(presets: ScorePreset[]): void {
  try {
    localStorage.setItem(constant.SCORE_PRESETS_STORAGE_KEY, JSON.stringify(getScorePresetsForStorage(presets)))
  } catch {
    /* 容量超過等は無視する */
  }
}

/**
 * 新しいプリセットを保存する
 * 同名のプリセットがある場合は上書きする。
 *
 * @param name - プリセット名
 * @param settings - 保存する点数設定
 * @returns 更新後のプリセット一覧
 */
export function savePreset(name: string, settings: ScoreSettings): ScorePreset[] {
  const presets = loadPresets()

  // 設定の name フィールドもプリセット名に合わせる
  const savedSettings: ScoreSettings = { ...normalizeScoreSettingsDerived(settings), name }

  // 同名のプリセットがあれば上書き、なければ追加する
  const existing = presets.findIndex((p) => p.name === name)
  if (existing >= 0) {
    presets[existing] = { name, settings: savedSettings }
  } else {
    presets.push({ name, settings: savedSettings })
  }

  savePresets(presets)
  return presets
}

/**
 * プリセットを削除する
 *
 * @param name - 削除するプリセット名
 * @returns 更新後のプリセット一覧
 */
export function deletePreset(name: string): ScorePreset[] {
  const presets = loadPresets().filter((p) => p.name !== name)
  savePresets(presets)
  return presets
}

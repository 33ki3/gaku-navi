/**
 * プリセット管理ユーティリティ
 *
 * 点数設定のプリセット（名前付きの設定セット）を
 * localStorage に保存・読み込み・削除する。
 */

import * as constant from '../constant'
import type { ScoreSettings } from '../types/card'
import { normalizeScoreSettings, normalizeScoreSettingsDerived } from './scoreSettings'
import { isRecord } from './valueValidation'

/** プリセット1件のデータ。保存名と設定値を持つ。 */
export interface ScorePreset {
  /** プリセット名 */
  name: string
  /** 保存された点数設定 */
  settings: ScoreSettings
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

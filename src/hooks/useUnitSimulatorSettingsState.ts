/**
 * 最適編成設定の画面表示と保存を管理する
 * */
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

import * as constant from '../constant'
import type { UnitSimulatorSettings } from '../types/unit'
import { isUnitSimulatorSettings } from '../utils/settingsValidation'
import { loadUnitSimulatorSettings, saveUnitSimulatorSettings } from '../utils/unitSimulatorSettings'
import { useStorageEvent } from './useStorageEvent'

/** 最適編成設定と永続更新操作を受け渡すcontroller */
export interface UnitSimulatorSettingsController {
  /** 現在の設定 */
  settings: UnitSimulatorSettings
  /** 設定を更新して永続化する */
  setSettings: (next: UnitSimulatorSettings) => void
}

/** 最適編成設定状態フックの返却値 */
export interface UnitSimulatorSettingsState extends UnitSimulatorSettingsController {
  /** 保存を行わず、確定済みの設定だけを画面へ反映する */
  applySettings: (next: UnitSimulatorSettings) => boolean
  /** 非同期計算が最新設定を読むための参照 */
  settingsRef: RefObject<UnitSimulatorSettings>
}

/**
 * 最適編成設定を1か所で保持し、変更をブラウザの保存領域へ保存する
 *
 * @returns 現在設定・更新関数・最新設定参照
 */
export function useUnitSimulatorSettingsState(): UnitSimulatorSettingsState {
  // 初期化時に保存値を一度読み、以降はここで最適編成設定を一元管理する
  const [settings, setSettingsRaw] = useState<UnitSimulatorSettings>(loadUnitSimulatorSettings)
  const settingsRef = useRef(settings)

  useEffect(() => {
    // 非同期計算の完了時にも、最後に描画された設定を参照できるよう同期する
    settingsRef.current = settings
  }, [settings])

  // 別タブで変更された最適編成設定を、保存処理を再発火させずに画面へ反映する
  useStorageEvent(constant.UNIT_SIMULATOR_STORAGE_KEY, () => {
    const next = loadUnitSimulatorSettings()
    settingsRef.current = next
    // 非同期計算が参照する値と、画面表示を同じ設定へ更新する
    setSettingsRaw(next)
  })

  const setSettings = useCallback(
    (next: UnitSimulatorSettings): void => {
      // 画面操作・インポート・外部入力のどの経路でもフォームで扱える範囲の値だけを画面へ入れる
      if (!isUnitSimulatorSettings(next)) return
      if (!saveUnitSimulatorSettings(next)) return
      // 設定の更新をここへ集約し、利用側が同じ現在値を参照できるようにする
      settingsRef.current = next
      setSettingsRaw(next)
    },
    [settingsRef],
  )

  const applySettings = useCallback((next: UnitSimulatorSettings): boolean => {
    if (!isUnitSimulatorSettings(next)) return false
    settingsRef.current = next
    setSettingsRaw(next)
    return true
  }, [])

  return { settings, setSettings, applySettings, settingsRef }
}

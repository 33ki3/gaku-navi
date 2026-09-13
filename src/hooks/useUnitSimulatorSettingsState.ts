/**
 * 最適編成設定の React 状態と画面内同期イベントを管理する
 */
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

import * as constant from '../constant'
import type { UnitSimulatorSettings } from '../types/unit'
import { isUnitSimulatorSettings } from '../utils/settingsValidation'
import { loadUnitSimulatorSettings, saveUnitSimulatorSettings } from '../utils/unitSimulatorSettings'

/** 最適編成設定状態フックの返却値 */
interface UnitSimulatorSettingsState {
  /** 現在の設定 */
  settings: UnitSimulatorSettings
  /** 設定を更新して永続化する */
  setSettings: (next: UnitSimulatorSettings) => void
  /** localStorage の最新値を読み直す */
  reload: () => void
  /** 非同期処理から最新設定を参照するための ref */
  settingsRef: RefObject<UnitSimulatorSettings>
}

/**
 * 最適編成設定を復元し、変更を localStorage と同一画面内へ同期する
 *
 * @returns 現在設定・更新関数・最新設定参照
 */
export function useUnitSimulatorSettingsState(): UnitSimulatorSettingsState {
  const [settings, setSettingsRaw] = useState<UnitSimulatorSettings>(loadUnitSimulatorSettings)
  const settingsRef = useRef(settings)

  useEffect(() => {
    // 非同期計算の完了時にも、最後に描画された設定を参照できるよう同期する
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    const handleExternalSettingsChange = (event: Event) => {
      // オプションモーダルなど同一タブ内の変更だけを安全な型へ絞って反映する
      if (!(event instanceof CustomEvent)) return

      const detail: unknown = event.detail
      if (isUnitSimulatorSettings(detail)) {
        settingsRef.current = detail
        setSettingsRaw(detail)
      }
    }

    window.addEventListener(constant.UNIT_SIMULATOR_SETTINGS_CHANGED_EVENT, handleExternalSettingsChange)
    return () => {
      window.removeEventListener(constant.UNIT_SIMULATOR_SETTINGS_CHANGED_EVENT, handleExternalSettingsChange)
    }
  }, [])

  const setSettings = useCallback(
    (next: UnitSimulatorSettings) => {
      // 画面とlocalStorageを同じ値で更新し、別コンポーネントへ変更イベントを通知する
      settingsRef.current = next
      setSettingsRaw(next)
      saveUnitSimulatorSettings(next)
    },
    [settingsRef],
  )

  const reload = useCallback(() => {
    // モーダルを開く前など、保存済みの最新設定を読み直す
    const next = loadUnitSimulatorSettings()
    settingsRef.current = next
    setSettingsRaw(next)
  }, [settingsRef])

  return { settings, setSettings, reload, settingsRef }
}

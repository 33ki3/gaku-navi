/**
 * オプション画面で編集する設定をまとめて管理する
 *
 * 表示設定の保存と、共有された最適編成設定の表示を App コンポーネントから分離する
 */
import { useCallback, useState } from 'react'
import * as constant from '../constant'
import type { AppPreferences } from '../types/app'
import type { UnitSimulatorSettings } from '../types/unit'
import { loadAppPreferences, saveAppPreferences } from '../utils/appPreferences'
import { isAppPreferences } from '../utils/settingsValidation'
import { useStorageEvent } from './useStorageEvent'
import type { UnitSimulatorSettingsController } from './useUnitSimulatorSettingsState'

/** オプション画面の状態と操作 */
export interface AppOptionsState {
  /** オプション画面を表示しているか */
  isOpen: boolean
  /** アプリ全体の表示設定 */
  preferences: AppPreferences
  /** 最適編成の設定 */
  unitSettings: UnitSimulatorSettings
  /** 共有中の設定値を表示してオプション画面を開く */
  open: () => void
  /** オプション画面を閉じる */
  close: () => void
  /** 表示設定を更新して保存する */
  updatePreferences: (preferences: AppPreferences) => boolean
  /** 保存を行わず、共通の更新処理が確定した値だけを画面へ反映する */
  applyPreferences: (preferences: AppPreferences) => boolean
  /** 最適編成設定を更新して保存する */
  updateUnitSettings: (settings: UnitSimulatorSettings) => void
}

/**
 * オプション画面と永続化対象の設定を管理する
 *
 * @param unitSettingsState - 最適編成設定を保持・更新する状態と操作
 * @returns オプション画面の状態、設定値、更新操作
 */
export function useAppOptions(unitSettingsState: UnitSimulatorSettingsController): AppOptionsState {
  // オプションモーダルの開閉状態と、
  // ブラウザの保存領域へ保存する表示設定を保持する
  const [isOpen, setIsOpen] = useState(false)
  const [preferences, setPreferences] = useState(loadAppPreferences)
  const { settings: unitSettings, setSettings: updateUnitSettings } = unitSettingsState

  // 別タブで変更された表示設定を、保存処理を再発火させずに画面へ反映する
  useStorageEvent(constant.APP_PREFERENCES_STORAGE_KEY, () => setPreferences(loadAppPreferences()))

  const open = useCallback(() => {
    // モーダルの開閉だけを変更し、表示設定の保存値には触れない
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    // モーダルだけを閉じ、保存済みの設定値はそのまま残す
    setIsOpen(false)
  }, [])

  const updatePreferences = useCallback((nextPreferences: AppPreferences): boolean => {
    // 画面操作・外部入力のどちらから来ても、表示設定として認めない値は保存しない
    if (!isAppPreferences(nextPreferences)) return false
    // 保存が確定してから画面を更新し、呼び出し元へ誤った成功を返さない
    if (!saveAppPreferences(nextPreferences)) return false
    setPreferences(nextPreferences)
    return true
  }, [])
  const applyPreferences = useCallback((nextPreferences: AppPreferences): boolean => {
    if (!isAppPreferences(nextPreferences)) return false
    setPreferences(nextPreferences)
    return true
  }, [])

  return {
    isOpen,
    preferences,
    unitSettings,
    open,
    close,
    updatePreferences,
    applyPreferences,
    updateUnitSettings,
  }
}

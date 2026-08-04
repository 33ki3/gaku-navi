/**
 * オプション画面で編集する設定をまとめて管理する。
 *
 * 表示設定と最適編成設定の保存、別コンポーネントから通知された
 * 最適編成設定の同期を App コンポーネントから分離する
 */
import { useCallback, useState } from 'react'
import type { AppPreferences } from '../types/app'
import type { UnitSimulatorSettings } from '../types/unit'
import { loadAppPreferences, saveAppPreferences } from '../utils/appPreferences'
import { useUnitSimulatorSettingsState } from './useUnitSimulatorSettingsState'

/** オプション画面の状態と操作 */
export interface AppOptionsState {
  /** オプション画面を表示しているか */
  isOpen: boolean
  /** アプリ全体の表示設定 */
  preferences: AppPreferences
  /** 最適編成の設定 */
  unitSettings: UnitSimulatorSettings
  /** 保存済みの最新値を読み直してオプション画面を開く */
  open: () => void
  /** オプション画面を閉じる */
  close: () => void
  /** 表示設定を更新して保存する */
  updatePreferences: (preferences: AppPreferences) => void
  /** 最適編成設定を更新して保存する */
  updateUnitSettings: (settings: UnitSimulatorSettings) => void
}

/**
 * オプション画面と永続化対象の設定を管理する
 *
 * @returns オプション画面の状態、設定値、更新操作
 */
export function useAppOptions(): AppOptionsState {
  // オプションモーダルの開閉状態と、localStorageへ保存する表示設定を保持する
  const [isOpen, setIsOpen] = useState(false)
  const [preferences, setPreferences] = useState(loadAppPreferences)
  const {
    settings: unitSettings,
    setSettings: updateUnitSettings,
    reload: reloadUnitSettings,
  } = useUnitSimulatorSettingsState()

  const open = useCallback(() => {
    // 別画面から変更された最適編成設定を読み直してからモーダルを開く
    reloadUnitSettings()
    setIsOpen(true)
  }, [reloadUnitSettings])

  const close = useCallback(() => {
    // モーダルだけを閉じ、保存済みの設定値はそのまま残す
    setIsOpen(false)
  }, [])

  const updatePreferences = useCallback((nextPreferences: AppPreferences) => {
    // 表示を即時更新し、次回アクセスでも同じ値を復元できるよう保存する
    setPreferences(nextPreferences)
    saveAppPreferences(nextPreferences)
  }, [])

  return {
    isOpen,
    preferences,
    unitSettings,
    open,
    close,
    updatePreferences,
    updateUnitSettings,
  }
}

/**
 * 点数設定・最適編成・凸数編集の画面遷移を管理する。
 *
 * PCではパネルの同時固定を許可し、スマホでは対象画面を
 * 排他的に開くという表示幅ごとの差を1か所へ集約する
 */
import { useCallback } from 'react'
import * as constant from '../constant'
import type { AppState } from './useAppState'

/** 設定パネル間を移動する操作 */
export interface PanelNavigationActions {
  /** 点数設定パネルを開く。スマホで再選択した場合は閉じる */
  openScoreSettings: () => void
  /** 最適編成パネルを開く。スマホで再選択した場合は閉じる */
  openUnitSimulator: () => void
  /** 一覧内の点数設定ボタンから、表示幅に適した形で開く */
  openScoreSettingsFromList: () => void
  /** 点数設定パネルの固定を切り替える */
  toggleScoreSettingsPin: () => void
  /** 最適編成パネルの固定を切り替える */
  toggleUnitSimulatorPin: () => void
  /** スマホの凸数編集を切り替え、競合するパネルを閉じる */
  toggleMobileUncapEdit: () => void
  /** 現在の表示幅がスマホかを判定する */
  isMobileViewport: () => boolean
}

interface UsePanelNavigationParams {
  /** アプリ全体のUI状態 */
  ui: AppState['ui']
  /** 凸数編集状態を切り替える既存操作 */
  toggleUncapEdit: () => void
}

/**
 * PCとスマホで異なる設定パネルの開閉規則を提供する
 *
 * @param params - UI状態と凸数編集操作
 * @returns 設定パネル間を移動する操作
 */
export function usePanelNavigation({ ui, toggleUncapEdit }: UsePanelNavigationParams): PanelNavigationActions {
  // matchMediaは呼び出し時に判定し、画面回転やウィンドウ幅変更後も最新状態を使う
  const isMobileViewport = useCallback(() => !window.matchMedia(constant.DESKTOP_MEDIA_QUERY).matches, [])

  const openScoreSettings = useCallback(() => {
    // スマホでは同じボタンを再度押すと閉じ、別パネルと凸数編集を閉じて1枚だけ表示する
    if (isMobileViewport()) {
      if (ui.scoreSettingsOpen) {
        ui.setScoreSettingsOpen(false)
        return
      }
      ui.setSimulatorOpen(false)
      ui.setSimulatorPinned(false)
      ui.setUncapEditMode(false)
    }
    ui.setScoreSettingsOpen(true)
  }, [isMobileViewport, ui])

  const openUnitSimulator = useCallback(() => {
    // スマホでは最適編成と点数設定を排他的に切り替える
    if (isMobileViewport()) {
      if (ui.simulatorOpen) {
        ui.setSimulatorOpen(false)
        return
      }
      ui.setScoreSettingsOpen(false)
      ui.setSettingsPinned(false)
      ui.setUncapEditMode(false)
    }
    ui.setSimulatorOpen(true)
  }, [isMobileViewport, ui])

  const openScoreSettingsFromList = useCallback(() => {
    // 一覧からの操作はPCでは固定、スマホでは通常の開閉へ委譲する
    if (isMobileViewport()) {
      openScoreSettings()
      return
    }
    ui.setSettingsPinned(true)
  }, [isMobileViewport, openScoreSettings, ui])

  const toggleScoreSettingsPin = useCallback(() => {
    // PCのサイドパネル固定状態だけを切り替える
    ui.setSettingsPinned(!ui.settingsPinned)
  }, [ui])

  const toggleUnitSimulatorPin = useCallback(() => {
    // PCの最適編成パネル固定状態だけを切り替える
    ui.setSimulatorPinned(!ui.simulatorPinned)
  }, [ui])

  const toggleMobileUncapEdit = useCallback(() => {
    // 凸数編集へ移るときは、スマホで競合するパネルをすべて閉じる
    if (isMobileViewport()) {
      ui.setScoreSettingsOpen(false)
      ui.setSimulatorOpen(false)
      ui.setSettingsPinned(false)
      ui.setSimulatorPinned(false)
    }
    toggleUncapEdit()
  }, [isMobileViewport, toggleUncapEdit, ui])

  return {
    openScoreSettings,
    openUnitSimulator,
    openScoreSettingsFromList,
    toggleScoreSettingsPin,
    toggleUnitSimulatorPin,
    toggleMobileUncapEdit,
    isMobileViewport,
  }
}

/**
 * 点数設定パネルコンポーネント
 *
 * ピン留めまたはオーバーレイとして表示されるメインパネル
 * 設定項目の表示は設定フォームが受け持つ
 */
import type { PresetCommand } from '../../application/command'
import * as constant from '../../constant'
import type { ScoreSettings } from '../../types/card'
import type { ScorePreset } from '../../utils/presetHelpers'
import { SidePanelLayout } from '../ui/SidePanelLayout'
import { ScoreSettingsContent } from './ScoreSettingsContent'
import { SettingsPanelHeader } from './SettingsPanelHeader'

/** 点数設定パネルへ渡す表示状態と操作 */
interface ScoreSettingsPanelProps {
  /** パネルが開いているか */
  isOpen: boolean
  /** パネルを閉じる関数 */
  onClose: () => void
  /** ピン留めかどうか */
  pinned: boolean
  /** 現在の設定値 */
  settings: ScoreSettings
  /** 保存待ち入力と外部更新を区別する保存済み設定 */
  persistedSettings: ScoreSettings
  /** アクション回数入力時に計算結果だけを即時更新する関数 */
  onSettingsPreviewChange: (settings: ScoreSettings) => void
  /** 設定値が変わったときに呼ばれる関数 */
  onSettingsChange: (settings: ScoreSettings) => void
  /** 保存済みプリセット一覧 */
  presets: readonly ScorePreset[]
  /** プリセットの保存・削除を行う共通処理 */
  presetCommand: PresetCommand
  /** スマホ下部メニュー分の余白を確保するか */
  reserveMobileNavSpace?: boolean
  /** 最適編成パネルへ切り替える関数 */
  onSwitchToSimulator?: () => void
}

/**
 * 点数設定を固定サイドパネルまたはオーバーレイとして表示する
 *
 * @param props - パネル状態、点数設定、切り替え処理
 * @returns 点数設定パネル。閉じている場合は何も返さない
 */
export default function ScoreSettingsPanel({
  isOpen,
  onClose,
  pinned,
  settings,
  persistedSettings,
  onSettingsPreviewChange,
  onSettingsChange,
  presets,
  presetCommand,
  reserveMobileNavSpace,
  onSwitchToSimulator,
}: ScoreSettingsPanelProps) {
  // パネルが閉じていてピン留めでもない場合は何も描画しない
  if (!isOpen && !pinned) return null

  return (
    <SidePanelLayout
      isOpen={isOpen}
      onClose={onClose}
      pinned={pinned}
      scrollStorageKey={constant.SCORE_SETTINGS_PANEL_SCROLL_KEY}
      reserveMobileNavSpace={reserveMobileNavSpace}
    >
      {/* 点数設定パネルのヘッダーと切り替え操作 */}
      <SettingsPanelHeader onClose={onClose} onSwitchToSimulator={onSwitchToSimulator} />
      {/* 点数設定の各セクション */}
      <ScoreSettingsContent
        settings={settings}
        persistedSettings={persistedSettings}
        onSettingsPreviewChange={onSettingsPreviewChange}
        onSettingsChange={onSettingsChange}
        presets={presets}
        presetCommand={presetCommand}
      />
    </SidePanelLayout>
  )
}

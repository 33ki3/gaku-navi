/**
 * 点数設定パネルコンポーネント
 *
 * ピン留めまたはオーバーレイとして表示されるメインパネル。
 * 中身は ScoreSettingsContent に委譲する。
 */
import * as constant from '../../constant'
import type { ScoreSettings } from '../../types/card'
import { SidePanelLayout } from '../ui/SidePanelLayout'
import { ScoreSettingsContent } from './ScoreSettingsContent'
import { SettingsPanelHeader } from './SettingsPanelHeader'

/** ScoreSettingsPanel コンポーネントに渡すプロパティ */
interface ScoreSettingsPanelProps {
  /** パネルが開いているか */
  isOpen: boolean
  /** パネルを閉じる関数 */
  onClose: () => void
  /** ピン留めかどうか */
  pinned: boolean
  /** 現在の設定値 */
  settings: ScoreSettings
  /** 設定値が変わったときに呼ばれる関数 */
  onSettingsChange: (settings: ScoreSettings) => void
  /** スマホ下部メニュー分の余白を確保するか */
  reserveMobileNavSpace?: boolean
  /** 最適編成パネルへ切り替える関数 */
  onSwitchToSimulator?: () => void
}

/**
 * 点数設定を固定サイドパネルまたはオーバーレイとして表示する。
 *
 * @param props - パネル状態、点数設定、切り替え処理
 * @returns 点数設定パネル。閉じている場合は何も返さない
 */
export default function ScoreSettingsPanel({
  isOpen,
  onClose,
  pinned,
  settings,
  onSettingsChange,
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
      <ScoreSettingsContent settings={settings} onSettingsChange={onSettingsChange} />
    </SidePanelLayout>
  )
}

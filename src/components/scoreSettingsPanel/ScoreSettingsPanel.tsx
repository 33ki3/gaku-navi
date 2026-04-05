/**
 * 点数設定パネルコンポーネント
 *
 * ピン留めまたはオーバーレイとして表示されるメインパネル。
 * 中身は ScoreSettingsContent に委譲する。
 */
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
}

/** 点数設定パネル */
export default function ScoreSettingsPanel({
  isOpen,
  onClose,
  pinned,
  settings,
  onSettingsChange,
}: ScoreSettingsPanelProps) {
  // パネルが閉じていてピン留めでもない場合は何も描画しない
  if (!isOpen && !pinned) return null

  return (
    // ピン留め時はサイドパネル、非ピン時はオーバーレイモーダルとして表示
    <SidePanelLayout isOpen={isOpen} onClose={onClose} pinned={pinned}>
      {/* ヘッダー: タイトル + 閉じるボタン */}
      <SettingsPanelHeader onClose={onClose} />
      <ScoreSettingsContent settings={settings} onSettingsChange={onSettingsChange} />
    </SidePanelLayout>
  )
}

/**
 * サイドパネルのレイアウトコンポーネント
 *
 * ピン留め時はサイドパネルとして固定表示、
 * そうでないときはオーバーレイ（右からスライドイン）として表示する。
 * Escapeキーで閉じることができる。
 */
import { useEffect, useRef, useCallback } from 'react'
import * as constant from '../../constant'

/** SidePanelLayout コンポーネントに渡すプロパティ */
interface SidePanelLayoutProps {
  /** パネルが開いているか */
  isOpen: boolean
  /** パネルを閉じる関数 */
  onClose: () => void
  /** ピン留めかどうか */
  pinned: boolean
  /** 2枚目パネル（左側に配置）かどうか */
  secondPanel?: boolean
  /** パネルの中身 */
  children: React.ReactNode
}

/** パネルのレイアウト（ピン留め or オーバーレイ） */
export function SidePanelLayout({ isOpen, onClose, pinned, secondPanel, children }: SidePanelLayoutProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Escapeキーが押されたらパネルを閉じる
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  // ピン留めでないときだけEscapeキーを監視
  useEffect(() => {
    if (isOpen && !pinned) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, pinned, handleKeyDown])

  // パネルが開いておらずピン留めでもない場合は何も描画しない
  if (!isOpen && !pinned) return null

  // ピン留め: サイドパネルとして固定表示
  if (pinned) {
    return <div className={secondPanel ? constant.PANEL_PINNED_SECOND : constant.PANEL_PINNED}>{children}</div>
  }

  // オーバーレイ: 背景クリックでも閉じる
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      onClick={onClose}
    >
      <div className={constant.MODAL_BACKDROP} />
      <div ref={panelRef} onClick={(e) => e.stopPropagation()} className={constant.PANEL_OVERLAY}>
        {children}
      </div>
    </div>
  )
}

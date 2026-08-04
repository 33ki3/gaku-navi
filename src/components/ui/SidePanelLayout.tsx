/**
 * サイドパネルのレイアウトコンポーネント
 *
 * ピン留め時はサイドパネルとして固定表示し、そうでないときはオーバーレイ（右からスライドイン）として表示する。
 * Escapeキーで閉じることができる。
 */
import { useCallback, useEffect, useRef } from 'react'
import * as constant from '../../constant'
import { usePanelScrollRestoration } from '../../hooks/usePanelScrollRestoration'
import { lockBodyScroll } from '../../utils/bodyScrollLock'

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
  /** パネルごとにスクロール位置を保存する識別子 */
  scrollStorageKey?: string
  /** スマホ下部メニュー分の余白を確保するか */
  reserveMobileNavSpace?: boolean
  /** パネルの中身 */
  children: React.ReactNode
}

/**
 * 表示幅と固定状態に応じてサイドパネルの配置を切り替える。
 *
 * @param props - 開閉状態、固定状態、スクロール保存設定、内容
 * @returns 固定パネルまたはモバイルオーバーレイ
 */
export function SidePanelLayout({
  isOpen,
  onClose,
  pinned,
  secondPanel,
  scrollStorageKey,
  reserveMobileNavSpace = true,
  children,
}: SidePanelLayoutProps) {
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
      const unlockBodyScroll = lockBodyScroll()
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        unlockBodyScroll()
      }
    }
  }, [isOpen, pinned, handleKeyDown])

  const { handleScroll } = usePanelScrollRestoration({ panelRef, isOpen, pinned, storageKey: scrollStorageKey })

  // パネルが開いておらずピン留めでもない場合は何も描画しない
  if (!isOpen && !pinned) return null

  // ピン留め: サイドパネルとして固定表示
  if (pinned) {
    // childrenはReactツリー内へそのまま描画し、パネルの位置だけをこのレイアウトで決める
    return (
      <div
        ref={panelRef}
        onScroll={handleScroll}
        className={`${secondPanel ? constant.PANEL_PINNED_SECOND : constant.PANEL_PINNED} ${constant.PANEL_SCROLL_STABLE} overscroll-y-contain`}
      >
        {children}
      </div>
    )
  }

  // オーバーレイ: 背景クリックでも閉じる
  return (
    <div
      className="fixed inset-0 z-30 flex overscroll-none justify-end pt-[env(safe-area-inset-top)] md:z-50 md:pb-[env(safe-area-inset-bottom)]"
      onClick={onClose}
    >
      <div className={constant.MODAL_BACKDROP} />
      <div
        ref={panelRef}
        onScroll={handleScroll}
        onClick={(e) => e.stopPropagation()}
        className={`${constant.PANEL_OVERLAY} ${constant.PANEL_SCROLL_STABLE} overscroll-y-contain md:pb-0 ${
          reserveMobileNavSpace ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]' : 'pb-[env(safe-area-inset-bottom)]'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

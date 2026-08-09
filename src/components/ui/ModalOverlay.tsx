/**
 * モーダルオーバーレイ
 *
 * 画面全体を覆う半透明の背景（バックドロップ）と、その上にモーダルの白パネルを表示する汎用コンポーネント。
 * 背景クリックやEscキーでモーダルを閉じることができる。
 * bodyのスクロールを自動でロックする。
 */
import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import * as constant from '../../constant'
import * as uiData from '../../data/ui'
import * as enums from '../../types/enums'
import { lockBodyScroll } from '../../utils/bodyScrollLock'

/** ModalOverlay コンポーネントに渡すプロパティ */
interface ModalOverlayProps {
  /** モーダルを閉じる時に呼ばれる関数 */
  onClose: () => void
  /** モーダルの配置位置（center / top）。デフォルトは center */
  align?: enums.ModalAlignType
  /** モーダルパネル（白い箱）に適用するCSSクラス */
  panelClassName?: string
  /** 外側コンテナに追加するCSSクラス */
  className?: string
  /** モーダルの中に表示する内容 */
  children: React.ReactNode
}

/**
 * 背景スクロールを止め、document.body直下へモーダルを表示する。
 *
 * @param props - 閉じる操作、配置、パネルスタイル、内容
 * @returns ポータル表示されるモーダルオーバーレイ
 */
export default function ModalOverlay({
  onClose,
  align = enums.ModalAlignType.Center,
  panelClassName,
  className = '',
  children,
}: ModalOverlayProps) {
  /** Escキーが押されたら閉じるハンドラ */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  // Escキー監視の登録とbodyのスクロールをロックする（モーダル表示中は背景がスクロールしない）
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    const unlockBodyScroll = lockBodyScroll()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      unlockBodyScroll()
    }
  }, [handleKeyDown])

  return createPortal(
    <div
      className={`fixed inset-0 z-[80] flex ${uiData.getModalAlignClass(align)} px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] ${className}`}
      onClick={onClose}
    >
      {/* 半透明の背景 */}
      <div className={constant.MODAL_BACKDROP} />
      {/* stopPropagation でモーダル内側のクリックが背景に伝わらないようにする */}
      <div className={panelClassName} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

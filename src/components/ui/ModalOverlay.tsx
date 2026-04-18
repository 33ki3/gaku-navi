/**
 * モーダルオーバーレイ
 *
 * 画面全体を覆う半透明の背景（バックドロップ）と、
 * その上にモーダルの白パネルを表示する汎用コンポーネント。
 * 背景クリックやEscキーでモーダルを閉じることができる。
 * bodyのスクロールを自動でロックする。
 */
import { useEffect, useCallback } from 'react'
import type { ModalAlignType } from '../../types/enums'
import { ModalAlignType as ModalAlignEnum } from '../../types/enums'
import { getModalAlignClass } from '../../data/ui'
import { MODAL_BACKDROP } from '../../constant'

/** ModalOverlay コンポーネントに渡すプロパティ */
interface ModalOverlayProps {
  /** モーダルを閉じる時に呼ばれる関数 */
  onClose: () => void
  /** モーダルの配置位置（center / top）。デフォルトは center */
  align?: ModalAlignType
  /** モーダルパネル（白い箱）に適用するCSSクラス */
  panelClassName?: string
  /** 外側コンテナに追加するCSSクラス */
  className?: string
  /** モーダルの中に表示する内容 */
  children: React.ReactNode
}

/** モーダルオーバーレイを描画する */
export default function ModalOverlay({
  onClose,
  align = ModalAlignEnum.Center,
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

  // Escキー監視の登録 + body のスクロールをロック（モーダル表示中は背景がスクロールしない）
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  return (
    <div
      className={`fixed inset-0 z-50 flex ${getModalAlignClass(align)} px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] ${className}`}
      onClick={onClose}
    >
      {/* 半透明の背景 */}
      <div className={MODAL_BACKDROP} />
      {/* stopPropagation でモーダル内側のクリックが背景に伝わらないようにする */}
      <div className={panelClassName} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

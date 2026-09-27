/**
 * モーダルオーバーレイ
 *
 * 画面全体を覆う半透明の背景（バックドロップ）と、その上にモーダルの白パネルを表示する汎用コンポーネント。
 * 背景クリックやEscキーでモーダルを閉じることができる。
 * bodyのスクロールを自動でロックする。
 */
import { useCallback, useEffect, useRef } from 'react'
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
  /** 支援技術へ伝えるモーダル名 */
  ariaLabel: string
  /** 外側コンテナに追加するCSSクラス */
  className?: string
  /** モーダルの中に表示する内容 */
  children: React.ReactNode
}

/** ダイアログ内でTab移動できる表示中の要素を返す */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [contenteditable="true"], [tabindex]',
    ),
  ).filter((element) => {
    if (element.tabIndex < 0 || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false

    let ancestor: HTMLElement | null = element
    while (ancestor && container.contains(ancestor)) {
      const style = window.getComputedStyle(ancestor)
      if (ancestor.hidden || style.display === 'none' || style.visibility === 'hidden') return false
      if (ancestor === container) break
      ancestor = ancestor.parentElement
    }
    return true
  })
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
  ariaLabel,
  className = '',
  children,
}: ModalOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  /** 最前面のダイアログ内にキーボードフォーカスを保つ */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const panel = panelRef.current
    if (!panel) return

    // ネストしたダイアログでは、最前面のものだけがキー操作を処理する
    const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')
    if (dialogs.item(dialogs.length - 1) !== panel) return

    if (e.key === 'Escape') {
      e.preventDefault()
      onCloseRef.current()
      return
    }

    if (e.key !== 'Tab') return
    const focusableElements = getFocusableElements(panel)
    if (focusableElements.length === 0) {
      e.preventDefault()
      panel.focus()
      return
    }

    const first = focusableElements[0]
    const last = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement
    if (!panel.contains(activeElement)) {
      e.preventDefault()
      ;(e.shiftKey ? last : first).focus()
    } else if (e.shiftKey && activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  // 表示中は背景操作を止め、モーダル内へフォーカスを移し、閉じた後に起点へ戻す
  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.addEventListener('keydown', handleKeyDown)
    const unlockBodyScroll = lockBodyScroll()
    const panel = panelRef.current
    // 最初に操作できる要素へフォーカスを移し、キーボード操作の開始位置を明確にする
    const initialFocus = panel ? getFocusableElements(panel)[0] : undefined
    ;(initialFocus ?? panel)?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      unlockBodyScroll()
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus()
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
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={panelClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

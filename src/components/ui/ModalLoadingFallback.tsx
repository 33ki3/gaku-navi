/** モーダルの遅延チャンク取得中に表示領域を保つfallback */
import { createPortal } from 'react-dom'
import * as constant from '../../constant'
import { LoadingSkeleton } from './LoadingSkeleton'

interface ModalLoadingFallbackProps {
  /** モーダル本体のサイズ・配置クラス */
  panelClassName?: string
  /** モーダル外側へ追加する配置クラス */
  className?: string
}

/** モーダルの遅延読込中に、実際のモーダルと同じ外枠を表示する */
export function ModalLoadingFallback({
  panelClassName = constant.MODAL_PANEL_DETAIL,
  className = '',
}: ModalLoadingFallbackProps) {
  return createPortal(
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] ${className}`}
      aria-busy="true"
    >
      <div className={constant.MODAL_BACKDROP} />
      <div className={panelClassName}>
        <LoadingSkeleton />
      </div>
    </div>,
    document.body,
  )
}

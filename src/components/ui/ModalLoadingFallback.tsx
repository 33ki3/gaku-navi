/** モーダルの遅延チャンク取得中に表示領域を保つfallback */
import { createPortal } from 'react-dom'
import * as constant from '../../constant'

interface ModalLoadingFallbackProps {
  /** モーダル本体のサイズ・配置クラス */
  panelClassName?: string
  /** モーダル外側へ追加する配置クラス */
  className?: string
}

function LoadingBars() {
  return (
    <div className="space-y-4 p-5" aria-hidden="true">
      <div className="h-5 w-2/5 animate-pulse rounded bg-slate-300" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-100 ring-1 ring-slate-200" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-10 animate-pulse rounded-lg bg-slate-100 ring-1 ring-slate-200" />
        <div className="h-10 animate-pulse rounded-lg bg-slate-100 ring-1 ring-slate-200" />
      </div>
      <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
    </div>
  )
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
        <LoadingBars />
      </div>
    </div>,
    document.body,
  )
}

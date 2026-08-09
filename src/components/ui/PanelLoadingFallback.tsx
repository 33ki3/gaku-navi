/** サイドパネルの遅延チャンク取得中に表示領域を保つfallback */
import * as constant from '../../constant'

interface PanelLoadingFallbackProps {
  /** パネルを固定表示するか */
  pinned: boolean
  /** 2枚目の固定パネルとして表示するか */
  secondPanel?: boolean
  /** スマホ下部ナビ分の余白を確保するか */
  reserveMobileNavSpace?: boolean
}

/** サイドパネルの遅延読込中に、固定・オーバーレイの表示領域を確保する */
export function PanelLoadingFallback({
  pinned,
  secondPanel = false,
  reserveMobileNavSpace = true,
}: PanelLoadingFallbackProps) {
  const content = (
    <div className="h-full" aria-busy="true">
      <div className="h-[var(--app-header-height,3.5rem)] border-b border-slate-200 bg-white" />
      <div className="space-y-4 p-5" aria-hidden="true">
        <div className="h-5 w-2/5 animate-pulse rounded bg-slate-300" />
        <div className="h-28 animate-pulse rounded-xl bg-slate-100 ring-1 ring-slate-200" />
        <div className="h-10 animate-pulse rounded-lg bg-slate-100 ring-1 ring-slate-200" />
        <div className="h-10 animate-pulse rounded-lg bg-slate-100 ring-1 ring-slate-200" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  )

  if (pinned) {
    return (
      <div
        className={`${secondPanel ? constant.PANEL_PINNED_SECOND : constant.PANEL_PINNED} ${constant.PANEL_SCROLL_STABLE} overscroll-y-contain`}
      >
        {content}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-30 flex overscroll-none justify-end pt-[env(safe-area-inset-top)] md:z-50 md:pb-[env(safe-area-inset-bottom)]">
      <div className={constant.MODAL_BACKDROP} />
      <div
        className={`${constant.PANEL_OVERLAY} ${constant.PANEL_SCROLL_STABLE} overscroll-y-contain md:pb-0 ${reserveMobileNavSpace ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]' : 'pb-[env(safe-area-inset-bottom)]'}`}
      >
        {content}
      </div>
    </div>
  )
}

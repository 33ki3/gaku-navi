/**
 * スクロール方向に応じてスマホ下部ナビゲーションを表示・非表示にするフック
 */
import { useCallback, useEffect, useState } from 'react'
import * as constants from '../constant'

interface MobileNavigationVisibilityOptions {
  /** スクロール時も固定表示するか */
  keepFixed: boolean
  /** メニュー表示中など、一時的に自動非表示を止めるか */
  preventHiding: boolean
}

interface MobileNavigationVisibility {
  /** 下部ナビゲーションが隠れているか */
  hidden: boolean
  /** 操作開始時などに下部ナビゲーションを再表示する */
  show: () => void
}

/**
 * スクロールイベントから対象要素と現在位置を取得する
 *
 * @param event - documentが捕捉したスクロールイベント
 * @returns スクロールした要素と0以上に補正した現在位置
 */
function getScrollPosition(event: Event): { target: EventTarget; top: number } {
  const eventTarget = event.target ?? document
  // ブラウザによってページスクロールのtargetがwindow/documentのどちらにもなるため、同じキーへ正規化する
  const isPageTarget =
    eventTarget === window ||
    eventTarget === document ||
    eventTarget === document.documentElement ||
    eventTarget === document.body
  const target = isPageTarget ? window : eventTarget
  const top = isPageTarget ? window.scrollY : target instanceof Element ? target.scrollTop : 0
  return { target, top: Math.max(0, top) }
}

/**
 * ページと固定パネル内のスクロールを監視し、下部ナビゲーションの表示状態を返す
 *
 * @param options - 固定表示と一時停止の設定
 * @returns 現在の表示状態と明示的に再表示する関数
 */
export function useMobileNavigationVisibility({
  keepFixed,
  preventHiding,
}: MobileNavigationVisibilityOptions): MobileNavigationVisibility {
  const [hidden, setHidden] = useState(false)
  const show = useCallback(() => setHidden(false), [])

  useEffect(() => {
    if (keepFixed) {
      // 設定変更中の同期的な再レンダーを避け、次の描画で固定表示へ戻す
      const frameId = window.requestAnimationFrame(() => setHidden(false))
      return () => window.cancelAnimationFrame(frameId)
    }

    // スクロール位置は要素ごとに保持する
    // ページ本体と固定パネルが同じイベントを共有するため、WeakMapで分ける
    const previousScrollPositions = new WeakMap<EventTarget, number>()

    const handleScroll = (event: Event) => {
      // PCでは下部ナビを使わないため、スクロール方向に関係なく表示状態を戻す
      if (!window.matchMedia(constants.MOBILE_MEDIA_QUERY).matches) {
        setHidden(false)
        return
      }

      // 前回位置との差分から、下方向では隠し、上方向では表示する
      const { target, top } = getScrollPosition(event)
      const previousTop = previousScrollPositions.get(target) ?? top
      const delta = top - previousTop

      // 上端付近とメニュー操作中は、操作対象を隠さない
      if (preventHiding || top <= constants.MOBILE_NAV_VISIBLE_SCROLL_TOP) {
        setHidden(false)
      } else if (delta > constants.MOBILE_NAV_SCROLL_DELTA && top > constants.MOBILE_NAV_HIDE_SCROLL_TOP) {
        setHidden(true)
      } else if (delta < -constants.MOBILE_NAV_SCROLL_DELTA) {
        setHidden(false)
      }

      previousScrollPositions.set(target, top)
    }

    // ページ本体はwindow、固定パネル内はdocumentのcaptureで捕捉する
    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('scroll', handleScroll, { capture: true })
    }
  }, [keepFixed, preventHiding])

  return { hidden, show }
}

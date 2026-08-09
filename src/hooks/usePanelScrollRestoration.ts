/**
 * パネルのスクロール位置を表示・非表示の切り替えをまたいで保持する。
 *
 * 手動カード選択のようにパネルを一度隠してから再表示する場合、再表示直後は結果やセクションの高さがまだ確定していないことがある。
 * そのため、初回表示だけでなく内容のリサイズ後にも保存位置を復元する
 */
import { type RefObject, useCallback, useLayoutEffect, useRef } from 'react'
import * as constant from '../constant'
/**
 * パネルごとの最新スクロール位置。コンポーネントを再マウントしても
 * 同じ画面内で保持する
 */
const panelScrollPositions = new Map<string, number>()

interface UsePanelScrollRestorationParams {
  /** パネルのスクロール対象要素へのref */
  panelRef: RefObject<HTMLElement | null>
  /** パネル表示状態 */
  isOpen: boolean
  /** ピン留め状態 */
  pinned: boolean
  /** パネルごとの保存キー */
  storageKey?: string
}

/**
 * パネルのスクロール保存・復元処理を提供する
 *
 * @param params - パネルref、表示状態、保存キー
 * @returns スクロールイベントへ渡すハンドラー
 */
export function usePanelScrollRestoration({ panelRef, isOpen, pinned, storageKey }: UsePanelScrollRestorationParams): {
  handleScroll: () => void
} {
  const latestScrollTopRef = useRef(0)

  useLayoutEffect(() => {
    if ((!isOpen && !pinned) || !storageKey) return

    const panel = panelRef.current
    if (!panel) return

    const savedScrollTop = panelScrollPositions.get(storageKey) ?? latestScrollTopRef.current
    let cancelled = false
    let frameCount = 0
    let frameId: number | null = null
    let resizeObserver: ResizeObserver | null = null

    const restore = () => {
      if (cancelled) return

      const maxScrollTop = Math.max(0, panel.scrollHeight - panel.clientHeight)
      panel.scrollTop = Math.min(savedScrollTop, maxScrollTop)

      // 非同期で内容が増える場合だけ、次のフレームでも保存位置を試す
      if (savedScrollTop > maxScrollTop && frameCount < constant.PANEL_SCROLL_RESTORE_MAX_FRAME_COUNT) {
        frameCount += 1
        frameId = requestAnimationFrame(restore)
      }
    }

    // レイアウト確定後に一度復元し、内容が後から伸びる場合は再度復元する
    restore()
    if (frameId === null) frameId = requestAnimationFrame(restore)

    if (savedScrollTop > 0 && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (cancelled) return

        const maxScrollTop = Math.max(0, panel.scrollHeight - panel.clientHeight)
        panel.scrollTop = Math.min(savedScrollTop, maxScrollTop)
        if (savedScrollTop <= maxScrollTop) resizeObserver?.disconnect()
      })
      resizeObserver.observe(panel)
      for (const child of Array.from(panel.children)) resizeObserver.observe(child)
    }

    return () => {
      cancelled = true
      if (frameId !== null) cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()

      // refがnullになった後でも、スクロールイベントで保持した最新値を失わない
      const currentScrollTop = panel.isConnected
        ? panel.scrollTop
        : Math.max(panel.scrollTop, latestScrollTopRef.current)
      latestScrollTopRef.current = currentScrollTop
      panelScrollPositions.set(storageKey, currentScrollTop)
    }
  }, [isOpen, panelRef, pinned, storageKey])

  const handleScroll = useCallback(() => {
    const panel = panelRef.current
    if (!panel || !storageKey) return

    latestScrollTopRef.current = panel.scrollTop
    panelScrollPositions.set(storageKey, panel.scrollTop)
  }, [panelRef, storageKey])

  return { handleScroll }
}

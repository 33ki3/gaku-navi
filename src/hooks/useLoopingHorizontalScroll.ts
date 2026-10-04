/** ブラウザ標準の横スクロールを使い、操作終了後に繰り返し列の中央へ表示位置を戻す */
import { useCallback, useLayoutEffect, useRef } from 'react'
import * as constant from '../constant'

/**
 * 繰り返し候補列の表示位置と、1周内の表示範囲を管理する
 * @returns 表示領域・中央列・位置ドットのrefと、ボタン／選択時の移動操作
 */
export function useLoopingHorizontalScroll() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const middleCopyRef = useRef<HTMLDivElement>(null)
  const positionDotsRef = useRef<HTMLDivElement>(null)
  const cycleWidthRef = useRef(0)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const middle = middleCopyRef.current
    if (!viewport || !middle) return
    let frame: number | undefined
    let idleTimer: ReturnType<typeof setTimeout> | undefined
    let pointerActive = false
    let previousMiddleOffset = 0

    // スクロール位置の取得を1フレームにまとめ、表示範囲のドットだけを更新する
    const paintPosition = () => {
      frame = undefined
      const cycleWidth = cycleWidthRef.current
      const dots = positionDotsRef.current
      if (cycleWidth <= 0 || !dots) return
      const relative = viewport.scrollLeft - middle.offsetLeft
      const start = ((relative % cycleWidth) + cycleWidth) % cycleWidth
      const end = start + viewport.clientWidth
      const middleLeft = middle.getBoundingClientRect().left
      const visible = Array.from(middle.children).map((child) => {
        const rectangle = child.getBoundingClientRect()
        const left = rectangle.left - middleLeft
        const right = left + rectangle.width
        return (left < end && right > start) || (left + cycleWidth < end && right + cycleWidth > start)
      })
      Array.from(dots.children).forEach((dot, index) => {
        if (dot instanceof HTMLElement) dot.dataset.visible = String(visible[index] ?? false)
      })
    }
    // 連続するスクロール通知を1フレームの位置表示更新へまとめる
    const schedulePaint = () => {
      if (frame === undefined) frame = requestAnimationFrame(paintPosition)
    }
    // 慣性や指の移動中には位置を変えず、同じ見た目の中央列へ操作終了後に戻す
    const recenterPosition = () => {
      if (cycleWidthRef.current <= 0) return
      const cycleWidth = cycleWidthRef.current
      const relative = viewport.scrollLeft - middle.offsetLeft
      const fraction = ((relative % cycleWidth) + cycleWidth) % cycleWidth
      const destination = middle.offsetLeft + fraction
      if (Math.abs(viewport.scrollLeft - destination) > 1) viewport.scrollLeft = destination
      schedulePaint()
    }
    // 指やマウスの操作中を避けて、循環列の位置を補正する
    const normalizePosition = () => {
      if (!pointerActive) recenterPosition()
    }
    // 連続ホイールが物理的な端へ届く前に、次の入力と同じタイミングで余白を戻す
    const prepareWheel = () => {
      const cycleWidth = cycleWidthRef.current
      const maximum = viewport.scrollWidth - viewport.clientWidth
      if (viewport.scrollLeft < cycleWidth || viewport.scrollLeft > maximum - cycleWidth) recenterPosition()
    }
    // 最後の移動から待機時間を置き、慣性移動と位置補正の競合を避ける
    const scheduleNormalize = () => {
      if (idleTimer !== undefined) clearTimeout(idleTimer)
      idleTimer = setTimeout(normalizePosition, constant.IDOL_SELECTOR_SCROLL_IDLE_MS)
    }
    // 表示範囲のドット更新と、操作終了後の位置補正を予約する
    const onScroll = () => {
      schedulePaint()
      scheduleNormalize()
    }
    // タッチ操作中の位置補正を保留する
    const beginTouch = () => {
      pointerActive = true
    }
    // タッチ終了後の慣性移動を待って位置補正を予約する
    const endTouch = () => {
      pointerActive = false
      scheduleNormalize()
    }
    // マウス操作中の位置補正を保留する
    const beginPointer = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') pointerActive = true
    }
    // マウス操作の終了後に位置補正を予約する
    const endPointer = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') endTouch()
    }
    // 列の幅を測り直し、表示位置を維持したまま循環幅を更新する
    const measure = () => {
      const middleOffset = middle.offsetLeft
      cycleWidthRef.current = middleOffset / constant.IDOL_SELECTOR_MIDDLE_COPY_INDEX
      viewport.scrollLeft += middleOffset - previousMiddleOffset
      previousMiddleOffset = middleOffset
      paintPosition()
    }
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(middle)
    measure()
    viewport.addEventListener('scroll', onScroll, { passive: true })
    viewport.addEventListener('scrollend', scheduleNormalize)
    viewport.addEventListener('wheel', prepareWheel, { passive: true })
    viewport.addEventListener('touchstart', beginTouch, { passive: true })
    viewport.addEventListener('touchend', endTouch, { passive: true })
    viewport.addEventListener('touchcancel', endTouch, { passive: true })
    viewport.addEventListener('pointerdown', beginPointer)
    window.addEventListener('pointerup', endPointer)
    return () => {
      observer.disconnect()
      if (frame !== undefined) cancelAnimationFrame(frame)
      if (idleTimer !== undefined) clearTimeout(idleTimer)
      viewport.removeEventListener('scroll', onScroll)
      viewport.removeEventListener('scrollend', scheduleNormalize)
      viewport.removeEventListener('wheel', prepareWheel)
      viewport.removeEventListener('touchstart', beginTouch)
      viewport.removeEventListener('touchend', endTouch)
      viewport.removeEventListener('touchcancel', endTouch)
      viewport.removeEventListener('pointerdown', beginPointer)
      window.removeEventListener('pointerup', endPointer)
    }
  }, [])

  // 利用者の動きを減らす設定に従い、横方向だけへ指定距離を移動する
  const scrollBy = useCallback((distance: number) => {
    viewportRef.current?.scrollBy({
      left: distance,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [])

  // 選択した候補と同じ表示を持つ列のうち、現在の表示範囲に最も近い位置へ移動する
  const revealElement = useCallback(
    (element: HTMLElement) => {
      const viewport = viewportRef.current
      const cycleWidth = cycleWidthRef.current
      if (!viewport || cycleWidth <= 0) return
      let left = element.getBoundingClientRect().left - viewport.getBoundingClientRect().left
      while (left + element.offsetWidth <= 0) left += cycleWidth
      while (left >= viewport.clientWidth) left -= cycleWidth
      if (left < 0) scrollBy(left)
      else if (left + element.offsetWidth > viewport.clientWidth)
        scrollBy(left + element.offsetWidth - viewport.clientWidth)
    },
    [scrollBy],
  )

  return { viewportRef, middleCopyRef, positionDotsRef, scrollBy, revealElement }
}

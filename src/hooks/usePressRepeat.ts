/** 増減ボタンの長押しを繰り返し操作へ変換し、解除・無効化時に停止する */
import type { CSSProperties, MouseEvent, PointerEvent } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import * as constant from '../constant'

/**
 * 通常クリックを保ち、長押し後のクリックによる二重反映を防ぐ
 * @param action 通常クリックまたは長押しの各回で実行する最新の更新操作と段階数
 * @param disabled 上下限などにより操作を無効にし、継続中の長押しも停止するか
 * @returns ボタンへ渡すポインターとクリックのイベントハンドラー
 */
export function usePressRepeat(action: (multiplier: number) => void, disabled = false) {
  const actionRef = useRef(action)
  const delayRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const repeatTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const repeatedRef = useRef(false)

  // 長押し中も最新の値を使い、押し始めた段階を繰り返し設定しないようにする
  useEffect(() => {
    actionRef.current = action
  }, [action])

  // 指を離す以外に、画面のフォーカス喪失やアンマウントでもタイマーを必ず止める
  const stop = useCallback(function stopPress() {
    clearTimeout(delayRef.current)
    clearTimeout(repeatTimerRef.current)
    delayRef.current = undefined
    repeatTimerRef.current = undefined
    window.removeEventListener('blur', stopPress)
    window.removeEventListener('pointerup', stopPress)
    window.removeEventListener('pointercancel', stopPress)
    document.removeEventListener('visibilitychange', stopPress)
  }, [])

  useEffect(() => {
    if (disabled) stop()
    return stop
  }, [disabled, stop])

  // 短いクリックを維持し、長押しが確定した場合だけ更新を繰り返す
  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || event.button > 0) return
    stop()
    repeatedRef.current = false
    event.currentTarget.setPointerCapture?.(event.pointerId)
    window.addEventListener('blur', stop, { once: true })
    // ボタン外で指を離した場合も、ポインター終了を確実に検知する
    window.addEventListener('pointerup', stop, { once: true })
    window.addEventListener('pointercancel', stop, { once: true })
    document.addEventListener('visibilitychange', stop, { once: true })
    const isNarrowViewport = window.innerWidth <= constant.BREAKPOINT_2COL
    const repeatInterval = isNarrowViewport
      ? constant.PRESS_REPEAT_NARROW_VIEWPORT_INTERVAL_MS
      : constant.PRESS_REPEAT_INTERVAL_MS
    const pointerDownAt = performance.now()
    // 更新頻度を保ち、長押し時間の二次曲線で増加量をなめらかに上げる
    const scheduleNextRepeat = () => {
      repeatTimerRef.current = setTimeout(() => {
        const heldDuration = performance.now() - pointerDownAt
        const acceleratedSeconds = Math.max(0, (heldDuration - constant.PRESS_REPEAT_ACCELERATION_START_MS) / 1000)
        const multiplier = Math.min(
          constant.PRESS_REPEAT_MAX_MULTIPLIER,
          Math.round(1 + constant.PRESS_REPEAT_ACCELERATION_CURVE_FACTOR * acceleratedSeconds ** 2),
        )
        actionRef.current(multiplier)
        scheduleNextRepeat()
      }, repeatInterval)
    }
    // 短いタップではクリックだけを実行し、長押しが確定してから繰り返す
    delayRef.current = setTimeout(() => {
      repeatedRef.current = true
      actionRef.current(1)
      scheduleNextRepeat()
    }, constant.PRESS_REPEAT_DELAY_MS)
  }

  // 通常クリックを反映し、長押し直後の同一操作による二重反映を防ぐ
  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    stop()
    if (disabled) return
    // キーボード操作にはクリック回数が付かないため、長押し直後でも独立して反映する
    if (repeatedRef.current && event.detail > 0) {
      repeatedRef.current = false
      return
    }
    actionRef.current(1)
  }

  // タッチの長押しをスクロール・文字選択・OSのコールアウトへ渡さず、ポインター操作として扱う
  const style: CSSProperties = { touchAction: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }
  return {
    style,
    onContextMenu: (event: MouseEvent<HTMLButtonElement>) => event.preventDefault(),
    onPointerDown,
    onPointerUp: stop,
    onPointerCancel: stop,
    onLostPointerCapture: stop,
    onClick,
  }
}

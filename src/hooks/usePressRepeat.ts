/** 増減ボタンの長押しを繰り返し操作へ変換し、解除・無効化時に停止する */
import type { CSSProperties, MouseEvent, PointerEvent } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import * as constant from '../constant'

/**
 * 通常クリックを保ち、長押し後のクリックによる二重反映を防ぐ
 * @param action 通常クリックと長押しの各回で実行する、最新の更新操作
 * @param disabled 上下限などにより操作を無効にし、継続中の長押しも停止するか
 * @returns ボタンへ渡すポインターとクリックのイベントハンドラー
 */
export function usePressRepeat(action: () => void, disabled = false) {
  const actionRef = useRef(action)
  const delayRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const repeatedRef = useRef(false)

  // 長押し中も最新の値を使い、押し始めた段階を繰り返し設定しないようにする
  useEffect(() => {
    actionRef.current = action
  }, [action])

  // 指を離す以外に、画面のフォーカス喪失やアンマウントでもタイマーを必ず止める
  const stop = useCallback(function stopPress() {
    clearTimeout(delayRef.current)
    clearInterval(intervalRef.current)
    delayRef.current = undefined
    intervalRef.current = undefined
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
    // OSのメニュー表示やポインターの捕捉解除でも、ボタン外の終了通知で確実に停止する
    window.addEventListener('pointerup', stop, { once: true })
    window.addEventListener('pointercancel', stop, { once: true })
    document.addEventListener('visibilitychange', stop, { once: true })
    // 短いタップではクリックだけを実行し、長押しが確定してから繰り返す
    delayRef.current = setTimeout(() => {
      repeatedRef.current = true
      actionRef.current()
      intervalRef.current = setInterval(() => actionRef.current(), constant.PRESS_REPEAT_INTERVAL_MS)
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
    actionRef.current()
  }

  // タッチの長押しをスクロール・文字選択・OSのコールアウトへ渡さず、ポインター操作として扱う
  const style: CSSProperties = { touchAction: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }
  return {
    style,
    onContextMenu: (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      stop()
    },
    onPointerDown,
    onPointerUp: stop,
    onPointerCancel: stop,
    onLostPointerCapture: stop,
    onClick,
  }
}

/** 現在値に応じた進捗表示を共通化し、編集可能な場合はスライダーも提供する */
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'

/** 進捗の読み上げ名・現在値・上限と表示色の上書き */
interface ProgressBarProps {
  /** アチーブ名や「目標レベルまでの進捗度」など、読み上げる対象名 */
  label: string
  /** 進捗へ反映する現在値 */
  value: number
  /** 100%となる達成条件 */
  max: number
  /** バーと進捗率を包む行の余白や配置を調整する追加クラス */
  className?: string
  /** 未達成部分の色を変更する場合に指定する */
  trackClassName?: string
  /** 達成部分の色を変更する場合に指定する */
  fillClassName?: string
  /** バー右側の進捗率の文字色・文字サイズを変更する追加クラス */
  percentClassName?: string
  /** 指定した場合、バーをドラッグして値を変更できる */
  onValueChange?: (value: number) => void
}

/**
 * 現在値を範囲内に収め、バーと右側の進捗率に同じ値を表示する
 * @param props 進捗値と上限、読み上げ名、表示スタイル
 * @returns 全達成時に色が切り替わる進捗バー
 */
export function ProgressBar({
  label,
  value,
  max,
  className = '',
  trackClassName,
  fillClassName,
  percentClassName,
  onValueChange,
}: ProgressBarProps) {
  const { t } = useTranslation()
  const boundedValue = Math.max(0, Math.min(value, max))
  const [sliderValue, setSliderValue] = useState(boundedValue)
  const [pointerActive, setPointerActive] = useState(false)
  const sliderValueRef = useRef(boundedValue)
  const pointerActiveRef = useRef(false)
  const pointerStartValueRef = useRef(boundedValue)
  const touchGestureRef = useRef<
    | {
        pointerId: number
        startX: number
        startY: number
        startValue: number
        pendingValue?: number
        state: 'pending' | 'dragging' | 'vertical'
      }
    | undefined
  >(undefined)
  const suppressNativeInputRef = useRef(false)
  const suppressNativeInputTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onValueChangeRef = useRef(onValueChange)
  const lastPublishedValueRef = useRef(boundedValue)
  const pendingValueRef = useRef<number | undefined>(undefined)
  const lastPublishedAtRef = useRef(0)
  const publishTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const sliderSyncIntervalRef = useRef(constant.PROGRESS_SLIDER_SYNC_INTERVAL_MS)

  // 遅延したドラッグ更新にも最新の親コールバックを使う
  useEffect(() => {
    onValueChangeRef.current = onValueChange
  }, [onValueChange])
  // スピナーや別タブから値が変わった場合も、入力イベントの重複判定を現在値に合わせる
  useEffect(() => {
    if (pointerActiveRef.current) return
    sliderValueRef.current = boundedValue
    lastPublishedValueRef.current = boundedValue
  }, [boundedValue])
  // 表示切替やアンマウントで保留中の更新が残らないようにする
  useEffect(
    () => () => {
      clearTimeout(publishTimerRef.current)
      clearTimeout(suppressNativeInputTimerRef.current)
    },
    [],
  )

  const isInteractive = onValueChange !== undefined && max > 0
  const currentValue = isInteractive && pointerActive ? sliderValue : boundedValue
  const isCompleted = max > 0 && currentValue >= max
  const percent = max > 0 ? (currentValue / max) * 100 : 100
  const displayedPercent = isCompleted || max <= 0 ? 100 : Math.floor(percent)
  // 小さい達成量も表示し、目標PLvと個別アチーブで同じ進捗率の表記を使う
  const percentLabel = t('ui.format.percent', {
    value:
      percent > 0 && percent < 1
        ? percent.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : displayedPercent.toLocaleString(),
  })
  // ドラッグ中のつまみとバーは毎入力で動かし、親側の再計算だけ間引く
  const updateSliderValue = (nextValue: number) => {
    if (nextValue === sliderValueRef.current) return
    sliderValueRef.current = nextValue
    setSliderValue(nextValue)
    if (!pointerActiveRef.current) {
      onValueChangeRef.current?.(nextValue)
      lastPublishedValueRef.current = nextValue
      return
    }

    pendingValueRef.current = nextValue
    const elapsed = performance.now() - lastPublishedAtRef.current
    if (lastPublishedAtRef.current === 0 || elapsed >= sliderSyncIntervalRef.current) {
      clearTimeout(publishTimerRef.current)
      publishTimerRef.current = undefined
      pendingValueRef.current = undefined
      lastPublishedAtRef.current = performance.now()
      lastPublishedValueRef.current = nextValue
      onValueChangeRef.current?.(nextValue)
      return
    }

    if (publishTimerRef.current === undefined) {
      publishTimerRef.current = setTimeout(() => {
        publishTimerRef.current = undefined
        const pendingValue = pendingValueRef.current
        if (pendingValue === undefined) return
        pendingValueRef.current = undefined
        lastPublishedAtRef.current = performance.now()
        lastPublishedValueRef.current = pendingValue
        onValueChangeRef.current?.(pendingValue)
      }, sliderSyncIntervalRef.current - elapsed)
    }
  }
  const finishSliderDrag = () => {
    if (!pointerActiveRef.current) return
    pointerActiveRef.current = false
    setPointerActive(false)
    clearTimeout(publishTimerRef.current)
    publishTimerRef.current = undefined
    pendingValueRef.current = undefined
    if (lastPublishedValueRef.current !== sliderValueRef.current) {
      lastPublishedValueRef.current = sliderValueRef.current
      lastPublishedAtRef.current = performance.now()
      onValueChangeRef.current?.(sliderValueRef.current)
    }
  }
  const cancelSliderDrag = (event: ReactPointerEvent<HTMLInputElement>) => {
    if (event.pointerType !== 'touch') {
      finishSliderDrag()
      return
    }

    // 縦スクロールへ切り替わるとpointercancelが届くため、タッチ開始時の値に戻す
    if (!pointerActiveRef.current) return
    const startValue = pointerStartValueRef.current
    pointerActiveRef.current = false
    setPointerActive(false)
    clearTimeout(publishTimerRef.current)
    publishTimerRef.current = undefined
    pendingValueRef.current = undefined
    sliderValueRef.current = startValue
    setSliderValue(startValue)
    if (lastPublishedValueRef.current !== startValue) {
      lastPublishedValueRef.current = startValue
      lastPublishedAtRef.current = performance.now()
      onValueChangeRef.current?.(startValue)
    }
  }
  const prepareSliderDrag = () => {
    sliderValueRef.current = boundedValue
    setSliderValue(boundedValue)
    lastPublishedValueRef.current = boundedValue
    lastPublishedAtRef.current = 0
    sliderSyncIntervalRef.current =
      window.innerWidth <= constant.BREAKPOINT_2COL
        ? constant.PROGRESS_SLIDER_NARROW_VIEWPORT_SYNC_INTERVAL_MS
        : constant.PROGRESS_SLIDER_SYNC_INTERVAL_MS
  }
  const beginSliderDrag = () => {
    prepareSliderDrag()
    pointerActiveRef.current = true
    setPointerActive(true)
  }
  const suppressNativeInputForCurrentTask = () => {
    suppressNativeInputRef.current = true
    clearTimeout(suppressNativeInputTimerRef.current)
    suppressNativeInputTimerRef.current = setTimeout(() => {
      suppressNativeInputRef.current = false
      suppressNativeInputTimerRef.current = undefined
    }, 0)
  }
  // バーの水平線から約20度以内の動きだけを横ドラッグとして扱う
  const getTouchGestureDirection = (deltaX: number, deltaY: number): 'horizontal' | 'vertical' | undefined => {
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    if (Math.max(absX, absY) < 10) return undefined
    if (absX > absY * 2.75) return 'horizontal'
    if (absY > absX * 1.25) return 'vertical'
    return undefined
  }
  const handlePointerDown = (event: ReactPointerEvent<HTMLInputElement>) => {
    pointerStartValueRef.current = boundedValue
    if (event.pointerType === 'touch') {
      // touch開始では値を確定せず、pointermoveで操作方向を判断する
      touchGestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startValue: boundedValue,
        state: 'pending',
      }
      return
    }
    touchGestureRef.current = undefined
    beginSliderDrag()
  }
  const handlePointerMove = (event: ReactPointerEvent<HTMLInputElement>) => {
    const gesture = touchGestureRef.current
    if (gesture?.pointerId !== event.pointerId || gesture.state !== 'pending') return
    const direction = getTouchGestureDirection(event.clientX - gesture.startX, event.clientY - gesture.startY)
    if (direction === undefined) return
    if (direction === 'vertical') {
      gesture.state = 'vertical'
      gesture.pendingValue = undefined
      event.currentTarget.value = String(gesture.startValue)
      return
    }
    gesture.state = 'dragging'
    beginSliderDrag()
    if (gesture.pendingValue !== undefined) updateSliderValue(gesture.pendingValue)
  }
  const handlePointerUp = (event: ReactPointerEvent<HTMLInputElement>) => {
    const gesture = touchGestureRef.current
    if (gesture?.pointerId !== event.pointerId) {
      finishSliderDrag()
      return
    }
    if (gesture.state === 'pending') {
      const deltaX = event.clientX - gesture.startX
      const deltaY = event.clientY - gesture.startY
      const direction = getTouchGestureDirection(deltaX, deltaY)
      if (direction === 'vertical') {
        gesture.state = 'vertical'
      } else if (direction === 'horizontal') {
        gesture.state = 'dragging'
        beginSliderDrag()
        const pendingValue = gesture.pendingValue ?? Number(event.currentTarget.value)
        updateSliderValue(pendingValue)
      } else if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= 10) {
        // 移動したのに方向が曖昧なら、誤タップ扱いせず値を破棄する
        gesture.state = 'vertical'
      }
    }
    touchGestureRef.current = undefined
    if (gesture.state === 'pending') {
      const nextValue = gesture.pendingValue ?? Number(event.currentTarget.value)
      suppressNativeInputForCurrentTask()
      event.currentTarget.value = String(gesture.startValue)
      updateSliderValue(nextValue)
    } else if (gesture.state === 'vertical') {
      suppressNativeInputForCurrentTask()
      event.currentTarget.value = String(gesture.startValue)
    } else {
      finishSliderDrag()
    }
  }
  const handlePointerCancel = (event: ReactPointerEvent<HTMLInputElement>) => {
    const gesture = touchGestureRef.current
    if (gesture?.pointerId !== event.pointerId) {
      cancelSliderDrag(event)
      return
    }
    touchGestureRef.current = undefined
    suppressNativeInputForCurrentTask()
    event.currentTarget.value = String(gesture.startValue)
    if (gesture.state === 'dragging') cancelSliderDrag(event)
  }
  const handleNativeSliderInput = (input: HTMLInputElement) => {
    const gesture = touchGestureRef.current
    if (suppressNativeInputRef.current) {
      input.value = String(sliderValueRef.current)
      return
    }
    if (gesture?.state === 'pending') {
      // native rangeのpointerdownによる変更も、方向確定までは保留する
      gesture.pendingValue = Number(input.value)
      input.value = String(gesture.startValue)
      return
    }
    if (gesture?.state === 'vertical') {
      input.value = String(gesture.startValue)
      return
    }
    updateSliderValue(Number(input.value))
  }

  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span className={`relative flex flex-1 items-center ${isInteractive ? 'h-11 sm:h-6' : 'h-1.5'}`}>
        <span
          className={`absolute inset-x-0 h-1.5 overflow-hidden rounded-full ${trackClassName ?? (isCompleted ? constant.ACHIEVEMENT_COMPLETE_TRACK_CLASS : 'bg-slate-100')}`}
          role={isInteractive ? undefined : 'progressbar'}
          aria-label={isInteractive ? undefined : label}
          aria-valuemin={isInteractive ? undefined : 0}
          aria-valuemax={isInteractive ? undefined : max}
          aria-valuenow={isInteractive ? undefined : currentValue}
          aria-hidden={isInteractive || undefined}
        >
          <span
            className={`block h-full rounded-full ${isInteractive ? '' : 'transition-[width] duration-300 motion-reduce:transition-none'} ${fillClassName ?? (isCompleted ? constant.ACHIEVEMENT_COMPLETE_FILL_CLASS : 'bg-sky-500')}`}
            style={{ width: `${percent}%` }}
          />
        </span>
        {isInteractive && (
          <input
            type="range"
            min={0}
            max={max}
            step={1}
            value={currentValue}
            aria-label={label}
            onInput={(event) => handleNativeSliderInput(event.currentTarget)}
            onChange={(event) => handleNativeSliderInput(event.currentTarget)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onBlur={finishSliderDrag}
            className="absolute inset-0 z-10 h-full w-full cursor-ew-resize touch-pan-y appearance-none bg-transparent outline-none focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-sky-600 [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-sky-600 [&::-moz-range-thumb]:shadow-[0_0_0_1px_rgb(2_132_199)] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-9px] [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-sky-600 [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgb(2_132_199)]"
          />
        )}
      </span>
      <span
        className={`w-9 shrink-0 text-right text-[11px] font-bold tabular-nums ${percentClassName ?? (isCompleted ? constant.ACHIEVEMENT_COMPLETE_TEXT_CLASS : 'text-sky-700')}`}
      >
        {percentLabel}
      </span>
    </span>
  )
}

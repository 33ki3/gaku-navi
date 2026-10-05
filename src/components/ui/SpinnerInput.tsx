/** 共通の数値入力欄に、クリック・長押しできる増減ボタンを添える */
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import { usePressRepeat } from '../../hooks/usePressRepeat'
import type { NumberInputProps } from './NumberInput'
import { NumberInput } from './NumberInput'

/** 入力欄の設定に増減ボタンのレイアウトを加える */
interface SpinnerInputProps extends NumberInputProps {
  /** 狭いグリッド内で入力欄だけを可変幅にする */
  fluid?: boolean
  /** 計算機など、増減ボタンの大きさと配色を揃える場合のクラス */
  buttonClassName?: string
  /** 入力欄とボタンの間隔・配置を上書きするクラス */
  className?: string
}

/**
 * 入力の検証はNumberInputに任せ、増減操作を追加する
 * @param props 数値入力の設定とボタンのレイアウト
 * @returns 入力欄と増減ボタン
 */
export function SpinnerInput({
  value,
  onChange,
  disabled = false,
  min = 0,
  max,
  step = 1,
  fluid = false,
  inputClassName,
  buttonClassName,
  className,
  ...inputProps
}: SpinnerInputProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  // 親側で保存を遅延していても、スピナー操作をすぐに表示へ反映する
  const [previousValue, setPreviousValue] = useState(value)
  const [displayValue, setDisplayValue] = useState(value)
  // 親から外部更新が届いた時だけ入力表示を揃え、未保存の操作値は維持する
  if (value !== previousValue) {
    setPreviousValue(value)
    setDisplayValue(value)
  }
  const btnClass =
    buttonClassName ??
    `${fluid ? 'flex h-6 w-5 shrink-0 items-center justify-center rounded text-xs font-bold' : constant.SPINNER_BTN} ${disabled ? constant.BTN_DISABLED : constant.BTN_TOGGLE_INACTIVE}`
  const decimals = step < 1 ? Math.max(0, -Math.floor(Math.log10(step))) : 0

  // 直接入力の途中でも、表示中の有限値を基準に増減する。空欄や不正入力は直近の確定値を使う
  const changeValue = (direction: number, multiplier = 1) => {
    const draft = inputRef.current?.value ?? ''
    const parsed = draft.trim() === '' ? NaN : Number(draft)
    const current = Number.isFinite(parsed) ? parsed : displayValue
    const changed = current + direction * step * multiplier
    const rounded = decimals > 0 ? parseFloat(changed.toFixed(decimals)) : changed
    const next = Math.max(min, max === undefined ? rounded : Math.min(max, rounded))
    handleValueChange(next)
  }
  const handleValueChange = (next: number) => {
    setDisplayValue(next)
    onChange(next)
  }
  const decrementDisabled = disabled || displayValue <= min
  const incrementDisabled = disabled || (max !== undefined && displayValue >= max)
  const decrementPress = usePressRepeat((multiplier) => changeValue(-1, multiplier), decrementDisabled)
  const incrementPress = usePressRepeat((multiplier) => changeValue(1, multiplier), incrementDisabled)
  const defaultInputClassName = `${constant.SPINNER_INPUT} ${fluid ? 'min-w-0 flex-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none' : ''} ${disabled ? constant.INPUT_LOCKED : 'border-slate-200'}`

  return (
    // Tab移動は入力欄へ直接進め、増減ボタンはクリック・長押しで操作する
    <div className={className ?? (fluid ? 'flex w-full min-w-0 items-center gap-0.5' : 'flex items-center gap-2')}>
      <button
        type="button"
        tabIndex={-1}
        {...decrementPress}
        disabled={decrementDisabled}
        className={`${btnClass} touch-none select-none`}
      >
        {t('ui.symbol.minus')}
      </button>
      <NumberInput
        {...inputProps}
        ref={inputRef}
        value={displayValue}
        onChange={handleValueChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        inputClassName={inputClassName ?? defaultInputClassName}
      />
      <button
        type="button"
        tabIndex={-1}
        {...incrementPress}
        disabled={incrementDisabled}
        className={`${btnClass} touch-none select-none`}
      >
        {t('ui.symbol.plus')}
      </button>
    </div>
  )
}

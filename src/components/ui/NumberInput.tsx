/** 数値の編集中表示と、範囲内の値だけを反映する共通入力欄 */
import type { InputHTMLAttributes } from 'react'
import { forwardRef, useEffect, useState } from 'react'
import * as constant from '../../constant'

/** 数値入力欄に渡すプロパティ */
export interface NumberInputProps {
  /** 今の数値 */
  value: number
  /** 数値が変わった時に呼ばれる関数 */
  onChange: (value: number) => void
  /** 入力を無効にするかどうか */
  disabled?: boolean
  /** 最小値（デフォルトは0、負数を許可する場合は明示する） */
  min?: number
  /** 最大値（省略可。指定時は確定値をこの値以下にする） */
  max?: number
  /** 増減ステップ（デフォルトは1） */
  step?: number
  /** 範囲外の編集中入力を保ち、確定時に範囲内へ丸める */
  clampOnBlur?: boolean
  /** 入力欄へ適用する追加クラス */
  inputClassName?: string
  /** アクセシビリティ用の入力欄ラベル */
  'aria-label'?: string
  /** モバイルキーボードの入力形式 */
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
}

/**
 * 未確定の文字列を保持し、確定時に入力範囲へ丸める
 * @param props 現在値、更新操作、入力範囲と表示スタイル
 * @param ref 増減ボタンなどが編集中の入力値を参照するための入力要素
 * @returns 数値入力欄
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    value,
    onChange,
    disabled = false,
    min = 0,
    max,
    step = 1,
    clampOnBlur = false,
    inputClassName,
    'aria-label': ariaLabel,
    inputMode,
  },
  ref,
) {
  // stepから小数桁数を導出する（浮動小数点誤差回避用）
  // 例: step=0.1 → log10(0.1)=-1 → decimals=1, step=0.01 → decimals=2
  // toFixed(decimals) で 0.1+0.2≠0.3 のような誤差を丸める
  const decimals = step < 1 ? Math.max(0, -Math.floor(Math.log10(step))) : 0

  // 値を min/max の範囲にクランプし、浮動小数点誤差を丸める
  const clamp = (v: number) => {
    const rounded = decimals > 0 ? parseFloat(v.toFixed(decimals)) : v
    const clamped = Math.max(min, rounded)
    return max !== undefined ? Math.min(max, clamped) : clamped
  }

  // 入力中の文字列をローカルで保持する
  const [rawValue, setRawValue] = useState(String(value))

  // 外部からの value 変更に追従（+/- ボタン等）
  useEffect(() => {
    setRawValue(String(value))
  }, [value])

  // 入力文字列を数値へ変換する
  const parseValue = (raw: string) => {
    if (raw.trim() === '') return undefined
    const parsed = clampOnBlur ? Number(raw) : decimals > 0 ? parseFloat(raw) : parseInt(raw)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  // 現在値として即時反映できる数値か確認する
  const isWithinRange = (parsed: number) =>
    parsed >= min && (max === undefined || parsed <= max) && (decimals > 0 || Number.isInteger(parsed))

  const parsedDraftValue = parseValue(rawValue)
  const hasInvalidDraft = clampOnBlur && parsedDraftValue !== undefined && !isWithinRange(parsedDraftValue)

  // 入力文字列を保持し、範囲内の数値だけを即時反映する
  const handleChange = (raw: string) => {
    setRawValue(raw)
    const parsed = parseValue(raw)
    if (parsed === undefined || (clampOnBlur && !isWithinRange(parsed))) return
    onChange(clamp(parsed))
  }

  // フォーカスが外れたら編集中の値を確定し、範囲外なら範囲内へ丸める
  const handleBlur = () => {
    if (clampOnBlur) {
      const parsed = parseValue(rawValue)
      const integerValue = parsed === undefined ? 0 : decimals > 0 ? parsed : Math.floor(parsed)
      const normalizedValue = clamp(integerValue)
      if (normalizedValue !== value) onChange(normalizedValue)
      setRawValue(String(normalizedValue))
      return
    }

    const parsed = parseValue(rawValue)
    if (parsed === undefined) {
      const clamped = clamp(0)
      onChange(clamped)
      setRawValue(String(clamped))
    } else {
      setRawValue(String(value))
    }
  }

  return (
    <input
      ref={ref}
      type="number"
      value={rawValue}
      min={min}
      max={max}
      step={step}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      inputMode={inputMode}
      aria-label={ariaLabel}
      aria-invalid={hasInvalidDraft || undefined}
      data-range-invalid={hasInvalidDraft || undefined}
      className={`${inputClassName ?? `${constant.SPINNER_INPUT} ${disabled ? constant.INPUT_LOCKED : 'border-slate-200'}`} ${
        clampOnBlur
          ? 'data-[range-invalid=true]:border-amber-500 data-[range-invalid=true]:bg-amber-50 data-[range-invalid=true]:focus:border-amber-500 data-[range-invalid=true]:focus:ring-amber-100'
          : ''
      }`}
    />
  )
})

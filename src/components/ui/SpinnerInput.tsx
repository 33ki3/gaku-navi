/**
 * スピナー入力コンポーネント
 *
 * [-] ボタン・数値入力欄・[+] ボタンを横に並べた数値入力UI。
 * アクション回数の設定などで使われる。
 */
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'

import * as constant from '../../constant'

/** SpinnerInput コンポーネントに渡すプロパティ */
interface SpinnerInputProps {
  /** 今の数値 */
  value: number
  /** 数値が変わった時に呼ばれる関数 */
  onChange: (value: number) => void
  /** 入力を無効にするかどうか */
  disabled?: boolean
  /** 最小値（デフォルトは0、0未満にはできない） */
  min?: number
  /** 最大値（省略可。指定されている場合、この値を超える入力は制限される） */
  max?: number
  /** 増減ステップ（デフォルトは1） */
  step?: number
}

/** +/- ボタン付き数値入力フィールド */
export function SpinnerInput({ value, onChange, disabled = false, min = 0, max, step = 1 }: SpinnerInputProps) {
  const { t } = useTranslation()
  const btnClass = `${constant.SPINNER_BTN} ${disabled ? constant.BTN_DISABLED : constant.BTN_TOGGLE_INACTIVE}`

  // stepから小数桁数を導出する（浮動小数点誤差回避用）
  // 例: step=0.1 → log10(0.1)=-1 → decimals=1, step=0.01 → decimals=2
  // toFixed(decimals) で 0.1+0.2≠0.3 のような誤差を丸める
  const decimals = step < 1 ? Math.max(0, -Math.floor(Math.log10(step))) : 0

  /** 値を min/max の範囲にクランプし、浮動小数点誤差を丸める */
  const clamp = (v: number) => {
    const rounded = decimals > 0 ? parseFloat(v.toFixed(decimals)) : v
    const clamped = Math.max(min, rounded)
    return max !== undefined ? Math.min(max, clamped) : clamped
  }

  // 入力中の文字列をローカルで保持し、確定時のみ onChange を呼ぶ
  const [rawValue, setRawValue] = useState(String(value))

  // 外部からの value 変更に追従（+/- ボタン等）
  useEffect(() => {
    setRawValue(String(value))
  }, [value])

  /** テキスト入力中は文字列をそのまま保持し、有効な数値の場合だけ onChange を呼ぶ */
  const handleChange = (raw: string) => {
    setRawValue(raw)
    const parsed = decimals > 0 ? parseFloat(raw) : parseInt(raw)
    if (!isNaN(parsed)) {
      onChange(clamp(parsed))
    }
  }

  /** フォーカスが外れたら値を確定する（空欄の場合は 0 として確定） */
  const handleBlur = () => {
    const parsed = decimals > 0 ? parseFloat(rawValue) : parseInt(rawValue)
    if (isNaN(parsed) || rawValue.trim() === '') {
      const clamped = clamp(0)
      onChange(clamped)
      setRawValue(String(clamped))
    } else {
      setRawValue(String(value))
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* マイナスボタン（値を step 分減らす。最小値で止まる） */}
      <button onClick={() => onChange(clamp(value - step))} disabled={disabled} className={btnClass}>
        {t('ui.symbol.minus')}
      </button>
      {/* 数値入力欄（直接キーボードで値を入力できる） */}
      <input
        type="number"
        value={rawValue}
        step={step}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
        className={`${constant.SPINNER_INPUT} ${disabled ? constant.INPUT_LOCKED : 'border-slate-200'}`}
      />
      {/* プラスボタン（値を step 分増やす） */}
      <button
        onClick={() => onChange(clamp(value + step))}
        disabled={disabled || (max !== undefined && value >= max)}
        className={btnClass}
      >
        {t('ui.symbol.plus')}
      </button>
    </div>
  )
}

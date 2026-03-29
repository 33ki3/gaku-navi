/**
 * スピナー入力コンポーネント
 *
 * [-] ボタン・数値入力欄・[+] ボタンを横に並べた数値入力UI。
 * アクション回数の設定などで使われる。
 */
import { useTranslation } from 'react-i18next'
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
}

/** +/- ボタン付き数値入力フィールド */
export function SpinnerInput({ value, onChange, disabled = false, min = 0, max }: SpinnerInputProps) {
  const { t } = useTranslation()
  const btnClass = `${constant.SPINNER_BTN} ${
    disabled ? constant.BTN_DISABLED : constant.BTN_TOGGLE_INACTIVE
  }`

  /** 値を min/max の範囲にクランプする */
  const clamp = (v: number) => {
    const clamped = Math.max(min, v)
    return max !== undefined ? Math.min(max, clamped) : clamped
  }

  return (
    <div className="flex items-center gap-1">
      {/* マイナスボタン（値を1減らす。最小値で止まる） */}
      <button onClick={() => onChange(clamp(value - 1))} disabled={disabled} className={btnClass}>
        {t('ui.symbol.minus')}
      </button>
      {/* 数値入力欄（直接キーボードで値を入力できる） */}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(clamp(parseInt(e.target.value) || 0))}
        disabled={disabled}
        className={`${constant.SPINNER_INPUT} ${disabled ? constant.INPUT_LOCKED : 'border-slate-200'}`}
      />
      {/* プラスボタン（値を1増やす） */}
      <button onClick={() => onChange(clamp(value + 1))} disabled={disabled || (max !== undefined && value >= max)} className={btnClass}>
        {t('ui.symbol.plus')}
      </button>
    </div>
  )
}

/**
 * Vo・Da・Viの数値入力グリッド。
 *
 * 最適編成設定で繰り返し使う3列のラベルと数値入力を、同じレイアウトと操作方法で描画する。
 */
import { useTranslation } from 'react-i18next'
import * as data from '../../data'
import type * as enums from '../../types/enums'
import { SpinnerInput } from '../ui/SpinnerInput'

interface ParameterSpinnerGridProps {
  /** Vo・Da・Viごとの現在値 */
  values: Record<enums.ParameterType, number>
  /** 入力できる最小値 */
  min: number
  /** 入力できる最大値 */
  max: number
  /** 増減単位 */
  step?: number
  /** 変更されたパラメータと値を受け取る関数 */
  onChange: (parameterType: enums.ParameterType, value: number) => void
}

/**
 * Vo・Da・Viの数値入力を3列で表示する
 *
 * @param props - パラメータ値、入力範囲、変更処理
 * @returns パラメータ別の数値入力グリッド
 */
export function ParameterSpinnerGrid({ values, min, max, step = 1, onChange }: ParameterSpinnerGridProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-3 gap-2">
      {data.SelectableTypeEntries.map((entry) => (
        <div key={entry.parameterType} className="flex flex-col items-center gap-1">
          <span className={`text-[10px] font-bold ${entry.text}`}>{t(entry.displayLabel)}</span>
          {/* fluidで親グリッドの幅へ合わせ、3列でも入力欄の幅を揃える */}
          <SpinnerInput
            value={values[entry.parameterType]}
            min={min}
            max={max}
            step={step}
            fluid
            onChange={(value) => onChange(entry.parameterType, value)}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * Vo/Da/Vi 入力欄コンポーネント
 *
 * カスタムモードのパラメータ上昇行で使う共通入力欄。
 * 3パラメータをグリッドレイアウトで横並びに表示する。
 */
import type { ParameterValues } from '../../types/card'
import * as enums from '../../types/enums'

/** ParameterValueInputs コンポーネントに渡すプロパティ */
interface ParameterValueInputsProps {
  /** 入力値 */
  values: ParameterValues
  /** 値変更時コールバック */
  onChange: (key: enums.ParameterType, raw: string) => void
}

/**
 * 共通の Vo/Da/Vi 入力欄を表示する。
 *
 * @param props - コンポーネントプロパティ
 * @returns 入力欄要素
 */
export function ParameterValueInputs({ values, onChange }: ParameterValueInputsProps) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {Object.values(enums.ParameterType).map((key) => (
        <input
          key={key}
          type="number"
          value={values[key]}
          onChange={(e) => onChange(key, e.target.value)}
          className={`w-full px-1.5 py-1 border rounded text-xs text-center focus:outline-none focus:ring-1 border-slate-200 ${
            key === enums.ParameterType.Vocal
              ? 'focus:ring-pink-300'
              : key === enums.ParameterType.Dance
                ? 'focus:ring-blue-300'
                : 'focus:ring-green-300'
          }`}
          min={0}
        />
      ))}
    </div>
  )
}

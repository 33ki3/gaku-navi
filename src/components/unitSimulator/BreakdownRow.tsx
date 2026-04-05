/**
 * 内訳行コンポーネント
 *
 * VoDaViの3軸パラメータを1行で表示する共通コンポーネント。
 */
import type { ParameterValues } from '../../types/unit'
import { SelectableTypeEntries } from '../../data/card'

/** BreakdownRow に渡すプロパティ */
interface BreakdownRowProps {
  /** 行ラベル */
  label: string
  /** VoDaVi のパラメータ値 */
  values: ParameterValues
}

/** 内訳行の共通コンポーネント */
export default function BreakdownRow({ label, values }: BreakdownRowProps) {
  return (
    <div className="grid grid-cols-4 gap-1">
      <span className="text-[10px] text-slate-500 shrink-0">{label}</span>
      {SelectableTypeEntries.map((entry) => (
        <span key={entry.parameterType} className="text-[10px] font-bold text-slate-700 text-center">
          {values[entry.parameterType].toLocaleString()}
        </span>
      ))}
    </div>
  )
}

/**
 * チェックボックスフィールド共通コンポーネント
 *
 * チェックボックス本体 + ラベル + 任意の補足テキストをまとめた
 * フォームの入力グループ。スコア設定パネルで使われる。
 */
import * as constant from '../../constant'

/** CheckboxField コンポーネントに渡すプロパティ */
interface CheckboxFieldProps {
  /** チェックボックスの横に表示するラベル */
  label: string
  /** 今チェックが入っているかどうか */
  checked: boolean
  /** チェックが変わった時に呼ばれる関数 */
  onChange: (checked: boolean) => void
  /** ラベルの下に表示する補足テキスト（省略可） */
  description?: string
}

/** チェックボックス + ラベル + 補足テキストのフォームグループ */
export function CheckboxField({ label, checked, onChange, description }: CheckboxFieldProps) {
  return (
    <div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={constant.CHECKBOX_INPUT}
        />
        <span className="text-[11px] font-bold text-slate-600 leading-tight">{label}</span>
      </label>
      {description && <p className="text-[9px] text-slate-500 mt-1 ml-5">{description}</p>}
    </div>
  )
}

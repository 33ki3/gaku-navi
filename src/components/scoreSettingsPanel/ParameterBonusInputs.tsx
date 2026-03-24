/**
 * パラメータボーナス入力コンポーネント
 *
 * Vo/Da/Vi の3つの数値入力欄を横に並べる。
 * スケジュール自動計算が有効なときは入力がロックされる。
 */
import { useTranslation } from 'react-i18next'
import type { ScoreSettings } from '../../types/card'
import * as data from '../../data'
import * as constant from '../../constant'

/** ParameterBonusInputs コンポーネントに渡すプロパティ */
interface ParameterBonusInputsProps {
  /** 現在の設定値 */
  settings: ScoreSettings
  /** 設定値が変わったときに呼ばれる関数 */
  onSettingsChange: (settings: ScoreSettings) => void
  /** 入力がロックされているか */
  isLocked: boolean
}

/** Vo/Da/Vi パラメータボーナス入力 */
export function ParameterBonusInputs({ settings, onSettingsChange, isLocked }: ParameterBonusInputsProps) {
  const { t } = useTranslation()

  // パラメータ属性ごとの Vo/Da/Vi 入力欄を描画する
  return (
    <div className="grid grid-cols-3 gap-2">
      {data.ParameterInputList.map((p) => (
        <div key={p.key}>
          {/* 属性ラベル（Vo/Da/Vi） */}
          <span className={`text-[10px] font-bold ${data.getParameterTextColor(p.key)} mb-0.5 block`}>{t(p.label)}</span>
          {/* 数値入力欄（スケジュール有効時はロック） */}
          <input
            type="number"
            value={settings.parameterBonusBase[p.key]}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                parameterBonusBase: { ...settings.parameterBonusBase, [p.key]: parseInt(e.target.value) || 0 },
              })
            }
            disabled={isLocked}
            className={`w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 ${
              isLocked ? constant.INPUT_LOCKED : 'focus:ring-slate-300 border-slate-200'
            }`}
          />
        </div>
      ))}
    </div>
  )
}

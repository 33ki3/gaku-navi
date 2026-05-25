/**
 * カスタムパラメータボーナス行入力コンポーネント
 *
 * カスタムモードで使用する、パラメータ上昇機会ごとの Vo/Da/Vi 入力欄。
 * 行の追加・削除ができ、各行が1回のパラメータ上昇に対応する。
 * 行ごとに切り捨て計算されるため、スケジュール週選択の代わりに正確な計算が可能。
 */
import { useTranslation } from 'react-i18next'
import type { ScoreSettings, ParameterValues } from '../../types/card'
import * as data from '../../data'
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import { HelpTooltip } from '../ui/HelpTooltip'
import { CloseIcon, PlusIcon } from '../ui/icons'
import { sumCustomParamBonusRows } from '../../utils/scoreSettings'
import { ParameterValueInputs } from './ParameterValueInputs'

/** CustomParamBonusRows コンポーネントに渡すプロパティ */
interface CustomParamBonusRowsProps {
  /** 現在の設定値 */
  settings: ScoreSettings
  /** 設定値が変わったときに呼ばれる関数 */
  onSettingsChange: (settings: ScoreSettings) => void
}

/** 行を更新したときに parameterBonusBase も合計値で同期する */
function updateRows(settings: ScoreSettings, newRows: ParameterValues[], onChange: (s: ScoreSettings) => void): void {
  const newBase = sumCustomParamBonusRows(newRows)
  onChange({ ...settings, customParamBonusRows: newRows, parameterBonusBase: newBase })
}

/** カスタムパラメータボーナス行入力 */
export function CustomParamBonusRows({ settings, onSettingsChange }: CustomParamBonusRowsProps) {
  const { t } = useTranslation()
  const rows = settings.customParamBonusRows

  // 指定行の Vo/Da/Vi 値を更新する
  const updateRow = (idx: number, key: enums.ParameterType, raw: string) => {
    const value = parseInt(raw) || 0
    const newRows = rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r))
    updateRows(settings, newRows, onSettingsChange)
  }

  // 末尾に新しい行を追加する（初期値はすべて0）
  const addRow = () => {
    updateRows(settings, [...rows, { vocal: 0, dance: 0, visual: 0 }], onSettingsChange)
  }

  // 指定行を削除する（最低1行は残す・確認ダイアログ表示）
  const removeRow = (idx: number) => {
    if (rows.length <= 1) return
    if (!window.confirm(t('ui.settings.custom_param_row_remove_confirm', { index: idx + 1 }))) return
    const newRows = rows.filter((_, i) => i !== idx)
    updateRows(settings, newRows, onSettingsChange)
  }

  // パラボ対象外の上昇値を更新する
  const updateNonBonusValue = (field: enums.CustomNonBonusFieldType, key: enums.ParameterType, raw: string) => {
    const value = parseInt(raw) || 0
    onSettingsChange({
      ...settings,
      [field]: { ...settings[field], [key]: value },
    })
  }

  const nonBonusTotal = {
    vocal: settings.customClassBonus.vocal + settings.customNonBonusGain.vocal,
    dance: settings.customClassBonus.dance + settings.customNonBonusGain.dance,
    visual: settings.customClassBonus.visual + settings.customNonBonusGain.visual,
  }

  return (
    <div className="mt-2 space-y-2">
      {/* セクション見出しとツールチップ */}
      <div className="flex items-center gap-1">
        <span className={constant.FILTER_SECTION_LABEL}>{t('ui.settings.custom_param_rows_label')}</span>
        <HelpTooltip text={t('ui.settings.custom_param_rows_tip')} />
      </div>

      {/* Vo/Da/Vi 列ヘッダー */}
      <div className="grid grid-cols-[28px_1fr] gap-1">
        <div />
        <div className="grid grid-cols-3 gap-1">
          {data.ParameterInputList.map((p) => (
            <span key={p.id} className={`text-[10px] font-bold ${data.getParameterTextColor(p.id)} text-center`}>
              {t(p.label)}
            </span>
          ))}
        </div>
      </div>

      {/* 入力行 */}
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[28px_1fr] gap-1 items-center">
          {/* 削除ボタン（1行のみの場合は無効化） */}
          <div className="flex justify-end">
            <button
              onClick={() => removeRow(idx)}
              disabled={rows.length <= 1}
              className={`p-0.5 rounded transition-colors ${
                rows.length <= 1
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
              }`}
              aria-label={t('ui.settings.custom_param_row_remove_aria', { index: idx + 1 })}
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Vo/Da/Vi 入力欄 */}
          <ParameterValueInputs values={row} onChange={(key, raw) => updateRow(idx, key, raw)} />
        </div>
      ))}

      {/* 行追加ボタン */}
      <button
        onClick={addRow}
        className="w-full text-[11px] py-1 rounded border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-1"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        {t('ui.settings.custom_param_row_add')}
      </button>

      {/* 合計値サマリー */}
      {rows.length > 1 && (
        <div className="rounded bg-slate-50 px-2 py-2 space-y-1">
          <div className="grid grid-cols-4 gap-1 items-center">
            <div />
            {data.ParameterInputList.map((p) => (
              <span key={p.id} className={`text-[10px] font-bold ${data.getParameterTextColor(p.id)} text-center`}>
                {t(p.label)}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1 items-center">
            <div className="text-[10px] text-slate-500 font-black text-center">{t('ui.settings.total')}</div>
            {data.ParameterInputList.map((p) => (
              <span key={p.id} className={`text-[10px] font-bold ${data.getParameterTextColor(p.id)} text-center`}>
                {settings.parameterBonusBase[p.id]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* パラボ対象外上昇値 */}
      <div className="pt-1 space-y-2 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <span className={constant.FILTER_SECTION_LABEL}>{t('ui.settings.custom_non_bonus_label')}</span>
          <HelpTooltip text={t('ui.settings.custom_non_bonus_tip')} />
        </div>

        <div className="grid grid-cols-[64px_1fr] gap-1">
          <div />
          <div className="grid grid-cols-3 gap-1">
            {data.ParameterInputList.map((p) => (
              <span key={p.id} className={`text-[10px] font-bold ${data.getParameterTextColor(p.id)} text-center`}>
                {t(p.label)}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[64px_1fr] gap-1 items-center">
          <div className="text-[10px] font-bold text-slate-500 text-right pr-1">
            {t('ui.settings.custom_non_bonus_class')}
          </div>
          <ParameterValueInputs
            values={settings[enums.CustomNonBonusFieldType.ClassBonus]}
            onChange={(key, raw) => updateNonBonusValue(enums.CustomNonBonusFieldType.ClassBonus, key, raw)}
          />
        </div>

        <div className="grid grid-cols-[64px_1fr] gap-1 items-center">
          <div className="text-[10px] font-bold text-slate-500 text-right pr-1">
            {t('ui.settings.custom_non_bonus_other')}
          </div>
          <ParameterValueInputs
            values={settings[enums.CustomNonBonusFieldType.OtherGain]}
            onChange={(key, raw) => updateNonBonusValue(enums.CustomNonBonusFieldType.OtherGain, key, raw)}
          />
        </div>

        <div className="rounded bg-slate-50 px-2 py-2 space-y-1">
          <div className="grid grid-cols-4 gap-1 items-center">
            <div />
            {data.ParameterInputList.map((p) => (
              <span key={p.id} className={`text-[10px] font-bold ${data.getParameterTextColor(p.id)} text-center`}>
                {t(p.label)}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1 items-center">
            <div className="text-[10px] text-slate-500 font-black text-center">{t('ui.settings.total')}</div>
            {data.ParameterInputList.map((p) => (
              <span key={p.id} className={`text-[10px] font-bold ${data.getParameterTextColor(p.id)} text-center`}>
                {nonBonusTotal[p.id]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

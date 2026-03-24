/**
 * プリセットセクションコンポーネント
 *
 * 点数設定のプリセットを保存・読み込み・上書き・削除する UI。
 * ドロップダウンでプリセットを選択し、名前を入力して保存できる。
 */
import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScoreSettings } from '../../types/card'
import { loadPresets, savePreset, deletePreset } from '../../utils/presetHelpers'
import type { ScorePreset } from '../../utils/presetHelpers'

/** PresetSection コンポーネントに渡すプロパティ */
interface PresetSectionProps {
  /** 現在の設定値 */
  settings: ScoreSettings
  /** 設定値が変わったときに呼ばれる関数 */
  onSettingsChange: (settings: ScoreSettings) => void
}

/**
 * プリセット管理セクション
 *
 * プリセットの選択・保存・上書き保存・削除を行う。
 */
export function PresetSection({ settings, onSettingsChange }: PresetSectionProps) {
  const { t } = useTranslation()
  const [presets, setPresets] = useState<ScorePreset[]>(loadPresets)
  const [presetName, setPresetName] = useState('')
  const [selectedPresetName, setSelectedPresetName] = useState('')

  // プリセットを新規保存する
  const handleSave = useCallback(() => {
    const name = presetName.trim()
    if (!name) return
    const updated = savePreset(name, settings)
    setPresets(updated)
    setSelectedPresetName(name)
    setPresetName('')
  }, [presetName, settings])

  // 選択中のプリセットを上書き保存する
  const handleOverwrite = useCallback(() => {
    if (!selectedPresetName) return
    const updated = savePreset(selectedPresetName, settings)
    setPresets(updated)
  }, [selectedPresetName, settings])

  // 選択中のプリセットを削除する
  const handleDelete = useCallback(() => {
    if (!selectedPresetName) return
    const updated = deletePreset(selectedPresetName)
    setPresets(updated)
    setSelectedPresetName('')
    setPresetName('')
  }, [selectedPresetName])

  // ドロップダウンでプリセットを選択する（設定値は読み込まない）
  const handleSelect = useCallback((name: string) => {
    setSelectedPresetName(name)
  }, [])

  // 選択中のプリセットの設定値を読み込む
  const handleLoad = useCallback(() => {
    const preset = presets.find((p) => p.name === selectedPresetName)
    if (preset) onSettingsChange(preset.settings)
  }, [presets, selectedPresetName, onSettingsChange])

  // 入力名が既存プリセットと重複しているかどうか
  const isDuplicateName = presets.some((p) => p.name === presetName.trim())

  return (
    <div className="space-y-2">
      {/* プリセット選択ドロップダウン + 読込・上書き・削除ボタン */}
      <div className="flex items-center gap-1.5">
        <select
          className="flex-1 px-2 py-1 rounded-lg text-xs border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={selectedPresetName}
          onChange={(e) => handleSelect(e.target.value)}
        >
          <option value="">{t('ui.settings.preset_select')}</option>
          {presets.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        {/* 読込ボタン */}
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleLoad}
          disabled={!selectedPresetName}
        >
          {t('ui.settings.preset_load')}
        </button>
        {/* 上書き保存ボタン */}
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleOverwrite}
          disabled={!selectedPresetName}
        >
          {t('ui.settings.preset_overwrite')}
        </button>
        {/* 削除ボタン */}
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleDelete}
          disabled={!selectedPresetName}
        >
          {t('ui.settings.preset_delete')}
        </button>
      </div>

      {/* 名前入力 + 保存ボタン */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          className="flex-1 px-2 py-1 rounded-lg text-xs border border-slate-200 bg-white text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder={t('ui.settings.preset_name')}
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
        />
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-700 text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleSave}
          disabled={!presetName.trim() || isDuplicateName}
        >
          {t('ui.settings.preset_save')}
        </button>
      </div>
    </div>
  )
}

/** 画面の各domain状態を保存command用のportへ接続する */
import { useCallback, useMemo } from 'react'
import {
  createCalculationCommand,
  createFilterCommand,
  createImportCommand,
  createPreferencesCommand,
  createPresetCommand,
  createUserSupportCommand,
} from '../application/command'
import type { CommandStateFromFactory } from '../application/command/ports'
import * as constant from '../constant'
import { ApplicationDomain } from '../types/application'
import { createDomainDigest } from '../utils/domainRevision'
import type { ScorePreset } from '../utils/presetHelpers'
import { loadPresets } from '../utils/presetHelpers'
import type { useAppOptions } from './useAppOptions'
import type { useAppState } from './useAppState'
import { useCommandStatePort } from './useCommandStatePort'
import { useStorageEvent } from './useStorageEvent'

type AppState = ReturnType<typeof useAppState>
type AppOptionsState = ReturnType<typeof useAppOptions>
type ImportState = Record<string, string | null>

export interface UseApplicationCommandPortsOptions {
  /** 画面側で保持している各domainの状態 */
  state: AppState
  /** 表示設定と最適編成設定の状態 */
  options: AppOptionsState
  /** プリセット一覧 */
  presets: ScorePreset[]
  /** プリセット一覧を画面へ反映する */
  setPresets: (presets: ScorePreset[]) => void
  /** インポート対象の保存値 */
  importState: ImportState
  /** インポート対象の保存値を画面へ反映する */
  setImportState: (state: ImportState) => void
}

/** 各command factoryへ渡すstate port */
export interface ApplicationCommandPorts {
  calculationStatePort: CommandStateFromFactory<typeof createCalculationCommand>
  filterStatePort: CommandStateFromFactory<typeof createFilterCommand>
  preferencesStatePort: CommandStateFromFactory<typeof createPreferencesCommand>
  presetStatePort: CommandStateFromFactory<typeof createPresetCommand>
  importStatePort: CommandStateFromFactory<typeof createImportCommand>
  userSupportStatePort: CommandStateFromFactory<typeof createUserSupportCommand>
  getCurrentApplicationDigest: () => string
}

/** 画面stateの形式変換と反映処理をcommand state portへ接続する */
export function useApplicationCommandPorts({
  state,
  options,
  presets,
  setPresets,
  importState,
  setImportState,
}: UseApplicationCommandPortsOptions): ApplicationCommandPorts {
  // 別タブで変更されたプリセットを保存領域から読み直す
  useStorageEvent(constant.SCORE_PRESETS_STORAGE_KEY, () => setPresets(loadPresets()))

  // 点数設定、最適編成設定、凸数、回数調整を一つの計算command値へまとめる
  const calculationCommandValue = useMemo(
    () => ({
      scoreSettings: state.scores.persistedScoreSettings,
      unitSimulatorSettings: state.unitSettings.settings,
      cardUncaps: state.scores.cardUncaps,
      cardCountCustom: state.scores.countCustom.cardCountCustom,
    }),
    [
      state.scores.cardUncaps,
      state.scores.countCustom.cardCountCustom,
      state.scores.persistedScoreSettings,
      state.unitSettings.settings,
    ],
  )
  // commandのcommit後に計算関連の値を各UI stateへ反映する
  const publishCalculationCommandValue = useCallback(
    (nextValue: typeof calculationCommandValue) => {
      if (!state.scores.applyScoreSettings(nextValue.scoreSettings)) {
        throw new Error('Score settings could not be applied')
      }
      if (!state.unitSettings.applySettings(nextValue.unitSimulatorSettings)) {
        throw new Error('Unit settings could not be applied')
      }
      if (!state.scores.applyCardUncaps(nextValue.cardUncaps)) {
        throw new Error('Card uncaps could not be applied')
      }
      state.scores.countCustom.applyCardCountCustom(nextValue.cardCountCustom)
    },
    [state.scores, state.unitSettings],
  )
  const calculationStatePort = useCommandStatePort(
    ApplicationDomain.Calculation,
    calculationCommandValue,
    publishCalculationCommandValue,
  )

  // フィルターのSetを保存・比較できる配列へ変換する
  const filterCommandValue = useMemo(
    () => ({
      searchTerm: state.filters.searchTerm,
      rarities: [...state.filters.selectedRarities],
      types: [...state.filters.selectedTypes],
      plans: [...state.filters.selectedPlans],
      spOnly: state.filters.spOnly,
      abilityKeywords: [...state.filters.selectedAbilityKeywords],
      eventFilters: [...state.filters.selectedEventFilters],
      sources: [...state.filters.selectedSources],
      uncaps: [...state.filters.selectedUncaps],
      countCustom: [...state.filters.selectedCountCustom],
      cardExclusionFilters: [...state.filters.selectedCardExclusionFilters],
      sortMode: state.filters.sortMode,
      sortReverse: state.filters.sortReverse,
    }),
    [state.filters],
  )
  // フィルターの保存値と画面のSet値を同じcommand stateとして接続する
  const filterStatePort = useCommandStatePort(
    ApplicationDomain.Filters,
    filterCommandValue,
    state.filters.applyFilterState,
  )
  // 表示設定とプリセット一覧をcommand stateへ接続する
  const preferencesStatePort = useCommandStatePort(
    ApplicationDomain.Preferences,
    options.preferences,
    options.applyPreferences,
  )
  const presetStatePort = useCommandStatePort(ApplicationDomain.Presets, presets, setPresets)

  // 一括インポート後に画面状態を更新し、全ストレージ購読へ変更を通知する
  const publishImportState = useCallback(
    (nextValue: ImportState) => {
      setImportState(nextValue)
      window.dispatchEvent(new StorageEvent(constant.STORAGE_EVENT_NAME, { key: null }))
    },
    [setImportState],
  )
  const importStatePort = useCommandStatePort(ApplicationDomain.Import, importState, publishImportState)
  const userSupportStatePort = useCommandStatePort(
    ApplicationDomain.UserSupports,
    state.userCards.userCards,
    state.userCards.applyUserCards,
  )

  // importの確認tokenが他domainや設定pinの変更を見逃さないよう、現在値をまとめてdigest化する
  const getCurrentApplicationDigest = useCallback(
    () =>
      createDomainDigest({
        calculation: calculationStatePort.getSnapshot().digest,
        filters: filterStatePort.getSnapshot().digest,
        preferences: preferencesStatePort.getSnapshot().digest,
        presets: presetStatePort.getSnapshot().digest,
        userSupports: userSupportStatePort.getSnapshot().digest,
        settingsPinned: state.ui.settingsPinned,
      }),
    [
      calculationStatePort,
      filterStatePort,
      preferencesStatePort,
      presetStatePort,
      state.ui.settingsPinned,
      userSupportStatePort,
    ],
  )

  return useMemo(
    () => ({
      calculationStatePort,
      filterStatePort,
      preferencesStatePort,
      presetStatePort,
      importStatePort,
      userSupportStatePort,
      getCurrentApplicationDigest,
    }),
    [
      calculationStatePort,
      filterStatePort,
      preferencesStatePort,
      presetStatePort,
      importStatePort,
      userSupportStatePort,
      getCurrentApplicationDigest,
    ],
  )
}

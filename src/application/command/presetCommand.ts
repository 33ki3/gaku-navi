/**
 * 点数プリセットの保存・削除を扱う処理
 *
 * プリセット名の重複・存在確認と保存形式への変換をここへ集約し、画面と
 * WebMCPが同じ競合確認・保存結果を受け取れるようにする
 */
import * as constant from '../../constant'
import type { CommandResult, DomainStateSnapshot, Result } from '../../types/application'
import { DomainIssueCode } from '../../types/application'
import type { ScoreSettings } from '../../types/card'
import type { ScorePreset } from '../../utils/presetHelpers'
import { getScoreSettingsForStorage, normalizeScoreSettingsDerived } from '../../utils/scoreSettings'
import { isScorePresetArray, isScoreSettings } from '../../utils/scoreSettingsValidation'
import { DomainIssuePath, createCommandError, createDomainIssue, createResult } from '../result'
import { runPersistedCommand } from './persistedCommand'
import type { CommandOptions, CommandStatePort, CommandStoragePort } from './ports'
import { serializeStorageEntry } from './serialization'

/** プリセット保存時だけ利用する上書き指定 */
interface PresetSaveOptions extends CommandOptions {
  /** falseの場合、同名プリセットを上書きせず重複エラーを返す */
  overwrite?: boolean
}

/** プリセット保存処理を作るための設定 */
interface PresetCommandOptions {
  /** プリセットの現在値を管理する共通窓口 */
  state: CommandStatePort<ScorePreset[]>
  /** 保存先の差し替え先 */
  storage?: CommandStoragePort
}

/** プリセット更新処理 */
export interface PresetCommand {
  /** 現在の一覧と状態番号を読む */
  getSnapshot: () => DomainStateSnapshot<ScorePreset[]>
  /** 名前で1件取得する */
  get: (name: string) => Result<ScorePreset>
  /** 一覧を完全に置き換える */
  replace: (presets: readonly ScorePreset[], options?: CommandOptions) => Promise<CommandResult<ScorePreset[]>>
  /** 名前付き設定を保存する */
  save: (name: string, settings: ScoreSettings, options?: PresetSaveOptions) => Promise<CommandResult<ScorePreset[]>>
  /** 名前で1件削除する */
  remove: (name: string, options?: CommandOptions) => Promise<CommandResult<ScorePreset[]>>
}

/**
 * プリセット名を検証する
 *
 * @param name - 検証するプリセット名
 * @returns 空白でない名前の場合はtrue
 */
function isValidName(name: string): boolean {
  return typeof name === 'string' && name.trim() !== ''
}

/**
 * 一覧全体を検証する
 *
 * @param presets - 検証するプリセット一覧
 * @returns 重複のない有効な一覧の場合はtrue
 */
function isValidPresetList(presets: readonly ScorePreset[]): boolean {
  if (!isScorePresetArray(presets)) return false
  const names = presets.map((preset) => preset.name)
  return names.every(isValidName) && new Set(names).size === names.length
}

/**
 * 不正なプリセット入力を返す
 *
 * @returns 不正入力を表す更新結果
 */
function invalidPresetResult(): CommandResult<ScorePreset[]> {
  return createCommandError(
    createDomainIssue(DomainIssueCode.InvalidInput, { path: { field: DomainIssuePath.Preset } }),
  )
}

/**
 * プリセットを既存の保存形式へ変換する
 *
 * @param presets - 変換するプリセット一覧
 * @returns 保存形式へ変換したプリセット一覧
 */
function getPersistedPresets(presets: readonly ScorePreset[]) {
  return presets.map(({ name, settings }) => ({ name, settings: getScoreSettingsForStorage({ ...settings, name }) }))
}

/**
 * プリセット更新処理を作る
 *
 * @param options - 現在値と保存先
 * @returns プリセット更新処理
 */
export function createPresetCommand(options: PresetCommandOptions): PresetCommand {
  const { state, storage } = options

  /**
   * プリセット一覧を検証して保存する
   *
   * @param presets - 保存するプリセット一覧
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const runReplace = (presets: ScorePreset[], commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      if (!isValidPresetList(presets)) return invalidPresetResult()
      const persisted = presets.map(({ name, settings }) => ({
        name,
        settings: normalizeScoreSettingsDerived(settings),
      }))
      const serialized = serializeStorageEntry(constant.SCORE_PRESETS_STORAGE_KEY, getPersistedPresets(persisted))
      if (!serialized.ok) return createCommandError(serialized.error)
      return runPersistedCommand<ScorePreset[]>({
        state,
        storage,
        nextValue: persisted,
        entries: [serialized.value],
        options: commandOptions,
      })
    })

  /**
   * プリセット一覧を完全に置き換える
   *
   * @param presets - 保存するプリセット一覧
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const replace = (presets: readonly ScorePreset[], commandOptions: CommandOptions = {}) =>
    runReplace([...presets], commandOptions)

  /**
   * 名前付きプリセットを検証して保存する
   *
   * @param name - 保存するプリセット名
   * @param settings - 保存する点数設定
   * @param commandOptions - 上書き・競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const save = (name: string, settings: ScoreSettings, commandOptions: PresetSaveOptions = {}) =>
    state.runSerialized(async () => {
      if (!isValidName(name) || !isScoreSettings(settings)) return invalidPresetResult()
      const current = state.getSnapshot().value
      const existingIndex = current.findIndex((preset) => preset.name === name)
      if (existingIndex >= 0 && commandOptions.overwrite === false) {
        return createCommandError(
          createDomainIssue(DomainIssueCode.Conflict, {
            path: { field: DomainIssuePath.Name },
            params: { name },
            retryable: false,
          }),
        )
      }
      const savedPreset: ScorePreset = {
        name,
        settings: normalizeScoreSettingsDerived({ ...settings, name }),
      }
      const nextValue = [...current]
      if (existingIndex >= 0) nextValue[existingIndex] = savedPreset
      else nextValue.push(savedPreset)
      if (!isValidPresetList(nextValue)) return invalidPresetResult()
      const serialized = serializeStorageEntry(constant.SCORE_PRESETS_STORAGE_KEY, getPersistedPresets(nextValue))
      if (!serialized.ok) return createCommandError(serialized.error)
      return runPersistedCommand<ScorePreset[]>({
        state,
        storage,
        nextValue,
        entries: [serialized.value],
        options: commandOptions,
      })
    })

  /**
   * 名前付きプリセットを削除する
   *
   * @param name - 削除するプリセット名
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const remove = (name: string, commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      if (!isValidName(name)) {
        return createCommandError(
          createDomainIssue(DomainIssueCode.InvalidInput, { path: { field: DomainIssuePath.Name } }),
        )
      }
      const current = state.getSnapshot().value
      const index = current.findIndex((preset) => preset.name === name)
      if (index < 0) {
        return createCommandError(
          createDomainIssue(DomainIssueCode.NotFound, {
            path: { field: DomainIssuePath.Name },
            params: { name },
            retryable: false,
          }),
        )
      }
      const nextValue = current.filter((_, itemIndex) => itemIndex !== index)
      const serialized = serializeStorageEntry(constant.SCORE_PRESETS_STORAGE_KEY, getPersistedPresets(nextValue))
      if (!serialized.ok) return createCommandError(serialized.error)
      return runPersistedCommand<ScorePreset[]>({
        state,
        storage,
        nextValue,
        entries: [serialized.value],
        options: commandOptions,
      })
    })

  /**
   * 名前付きプリセットを取得する
   *
   * @param name - 取得するプリセット名
   * @returns プリセットまたは入力・未検出エラー
   */
  const get = (name: string): Result<ScorePreset> => {
    if (!isValidName(name))
      return {
        ok: false,
        error: createDomainIssue(DomainIssueCode.InvalidInput, { path: { field: DomainIssuePath.Name } }),
      }
    const preset = state.getSnapshot().value.find((item) => item.name === name)
    return preset
      ? createResult(preset)
      : {
          ok: false,
          error: createDomainIssue(DomainIssueCode.NotFound, {
            path: { field: DomainIssuePath.Name },
            params: { name },
            retryable: false,
          }),
        }
  }

  return { getSnapshot: state.getSnapshot, get, replace, save, remove }
}

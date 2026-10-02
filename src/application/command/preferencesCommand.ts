/**
 * アプリ表示設定を保存する処理
 *
 * 画面の状態更新や表示文言に依存せず、設定値の検証・一部更新・保存結果を
 * 画面操作とWebMCPで同じ表示設定の保存処理を使う
 */
import * as constant from '../../constant'
import type { AppPreferences } from '../../types/app'
import type { CommandResult, DomainStateSnapshot } from '../../types/application'
import { DomainIssueCode } from '../../types/application'
import { isAppPreferences } from '../../utils/settingsValidation'
import { DomainIssuePath, createCommandError, createDomainIssue } from '../result'
import { runPersistedCommand } from './persistedCommand'
import type { CommandOptions, CommandStatePort, CommandStoragePort } from './ports'
import { serializeStorageEntry } from './serialization'

/** 表示設定の保存処理を作るための設定 */
interface PreferencesCommandOptions {
  /** 表示設定の現在値を管理する共通窓口 */
  state: CommandStatePort<AppPreferences>
  /** 保存先の差し替え先 */
  storage?: CommandStoragePort
}

/** 表示設定更新処理 */
export interface PreferencesCommand {
  /** 現在の値と状態番号を読む */
  getSnapshot: () => DomainStateSnapshot<AppPreferences>
  /** 設定を完全に置き換える */
  update: (value: AppPreferences, options?: CommandOptions) => Promise<CommandResult<AppPreferences>>
  /** 指定した設定項目だけを更新する */
  patch: (value: Partial<AppPreferences>, options?: CommandOptions) => Promise<CommandResult<AppPreferences>>
}

/**
 * 不正な表示設定を返す
 *
 * @returns 不正入力を表す更新結果
 */
function invalidPreferencesResult(): CommandResult<AppPreferences> {
  return createCommandError(
    createDomainIssue(DomainIssueCode.InvalidInput, { path: { field: DomainIssuePath.Preferences } }),
  )
}

/**
 * 表示設定の更新処理を作る
 *
 * @param options - 現在値と保存先
 * @returns 表示設定の更新処理
 */
export function createPreferencesCommand(options: PreferencesCommandOptions): PreferencesCommand {
  const { state, storage } = options

  /**
   * 表示設定全体を検証して保存する
   *
   * @param value - 保存する表示設定
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const runUpdate = (value: AppPreferences, commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      if (!isAppPreferences(value)) return invalidPreferencesResult()
      const serialized = serializeStorageEntry(constant.APP_PREFERENCES_STORAGE_KEY, value)
      if (!serialized.ok) return createCommandError(serialized.error)
      return runPersistedCommand<AppPreferences>({
        state,
        storage,
        nextValue: value,
        entries: [serialized.value],
        options: commandOptions,
      })
    })

  /**
   * 表示設定の指定項目だけを置き換える
   *
   * @param value - 上書きする表示設定項目
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const patch = (value: Partial<AppPreferences>, commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      const nextValue = { ...state.getSnapshot().value, ...value }
      if (!isAppPreferences(nextValue)) return invalidPreferencesResult()
      const serialized = serializeStorageEntry(constant.APP_PREFERENCES_STORAGE_KEY, nextValue)
      if (!serialized.ok) return createCommandError(serialized.error)
      return runPersistedCommand<AppPreferences>({
        state,
        storage,
        nextValue,
        entries: [serialized.value],
        options: commandOptions,
      })
    })

  return { getSnapshot: state.getSnapshot, update: runUpdate, patch }
}

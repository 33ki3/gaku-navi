/**
 * 検索・絞り込み状態を保存する処理
 *
 * 入力の変換や表示文言は呼び出し側へ残し、ここでは保存形式の検証、
 * 一部更新・初期化、競合確認、保存と画面反映だけを扱う
 */
import * as constant from '../../constant'
import type { PersistedFilterState } from '../../types/app'
import type { CommandResult, DomainStateSnapshot } from '../../types/application'
import { DomainIssueCode } from '../../types/application'
import { isPersistedFilterState } from '../../utils/storageCollectionValidation'
import { DomainIssuePath, createCommandError, createDomainIssue } from '../result'
import { runPersistedCommand } from './persistedCommand'
import type { CommandOptions, CommandStatePort, CommandStoragePort } from './ports'
import { serializeStorageEntry } from './serialization'

/** フィルター保存処理を作るための現在値・保存先 */
interface FilterCommandOptions {
  /** フィルターの現在値を管理する共通窓口 */
  state: CommandStatePort<PersistedFilterState>
  /** 保存先の差し替え先 */
  storage?: CommandStoragePort
}

/** フィルター更新処理 */
export interface FilterCommand {
  /** 現在の値と状態番号を読む */
  getSnapshot: () => DomainStateSnapshot<PersistedFilterState>
  /** 完全な保存型を置き換える */
  update: (value: PersistedFilterState, options?: CommandOptions) => Promise<CommandResult<PersistedFilterState>>
  /** 指定したフィールドだけを更新する */
  patch: (
    value: Partial<PersistedFilterState>,
    options?: CommandOptions,
  ) => Promise<CommandResult<PersistedFilterState>>
  /** 既定のフィルターへ戻す */
  clear: (options?: CommandOptions) => Promise<CommandResult<PersistedFilterState>>
}

/**
 * 不正な保存型を返す
 *
 * @returns 不正入力を表す更新結果
 */
function invalidFilterResult(): CommandResult<PersistedFilterState> {
  return createCommandError(
    createDomainIssue(DomainIssueCode.InvalidInput, { path: { field: DomainIssuePath.Filter } }),
  )
}

/**
 * 既定値を画面の状態と共有しない形で複製する
 *
 * @returns 複製した既定フィルター状態
 */
function createDefaultFilterState(): PersistedFilterState {
  return {
    ...constant.DEFAULT_FILTER_STATE,
    rarities: [...constant.DEFAULT_FILTER_STATE.rarities],
    types: [...constant.DEFAULT_FILTER_STATE.types],
    plans: [...constant.DEFAULT_FILTER_STATE.plans],
    abilityKeywords: [...constant.DEFAULT_FILTER_STATE.abilityKeywords],
    eventFilters: [...constant.DEFAULT_FILTER_STATE.eventFilters],
    sources: [...constant.DEFAULT_FILTER_STATE.sources],
    uncaps: [...constant.DEFAULT_FILTER_STATE.uncaps],
    countCustom: [...constant.DEFAULT_FILTER_STATE.countCustom],
    cardExclusionFilters: [...constant.DEFAULT_FILTER_STATE.cardExclusionFilters],
  }
}

/**
 * フィルター更新処理を作る
 *
 * @param options - 現在値と保存先
 * @returns フィルター更新処理
 */
export function createFilterCommand(options: FilterCommandOptions): FilterCommand {
  const { state, storage } = options

  /**
   * フィルター状態全体を検証して保存する
   *
   * @param value - 保存するフィルター状態
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const runUpdate = (value: PersistedFilterState, commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      if (!isPersistedFilterState(value)) return invalidFilterResult()
      const serialized = serializeStorageEntry(constant.FILTER_STORAGE_KEY, value)
      if (!serialized.ok) return createCommandError(serialized.error)
      return runPersistedCommand<PersistedFilterState>({
        state,
        storage,
        nextValue: value,
        entries: [serialized.value],
        options: commandOptions,
      })
    })

  /**
   * フィルター状態全体を置き換える
   *
   * @param value - 保存するフィルター状態
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const update = (value: PersistedFilterState, commandOptions: CommandOptions = {}) => runUpdate(value, commandOptions)

  /**
   * フィルター状態の指定項目だけを置き換える
   *
   * @param value - 上書きするフィルター項目
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const patch = (value: Partial<PersistedFilterState>, commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      const nextValue = { ...state.getSnapshot().value, ...value }
      if (!isPersistedFilterState(nextValue)) return invalidFilterResult()
      const serialized = serializeStorageEntry(constant.FILTER_STORAGE_KEY, nextValue)
      if (!serialized.ok) return createCommandError(serialized.error)
      return runPersistedCommand<PersistedFilterState>({
        state,
        storage,
        nextValue,
        entries: [serialized.value],
        options: commandOptions,
      })
    })

  /**
   * フィルター状態を既定値へ戻す
   *
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const clear = (commandOptions: CommandOptions = {}) => runUpdate(createDefaultFilterState(), commandOptions)

  return { getSnapshot: state.getSnapshot, update, patch, clear }
}

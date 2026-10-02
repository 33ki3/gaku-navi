/**
 * ユーザー定義サポートの追加・編集・削除を扱う処理
 *
 * 入力途中のフォーム値の変換や表示文言は呼び出し側へ置く
 * ここでは完成したカードの検証、名前の重複・存在確認、保存と画面反映を扱う
 */
import * as constant from '../../constant'
import type { CommandResult, DomainStateSnapshot, Result } from '../../types/application'
import { DomainIssueCode } from '../../types/application'
import type { SupportCard } from '../../types/card'
import { isSupportCard } from '../../utils/supportCardValidation'
import { isUserSupportCardFormValue } from '../../utils/userSupportCardValidation'
import { DomainIssuePath, createCommandError, createDomainIssue, createResult } from '../result'
import { runPersistedCommand } from './persistedCommand'
import type { CommandOptions, CommandStatePort, CommandStoragePort } from './ports'
import { serializeStorageEntry } from './serialization'

/** ユーザー定義サポート保存処理を作るための設定 */
interface UserSupportCommandOptions {
  /** ユーザー定義サポートの現在値を管理する共通窓口 */
  state: CommandStatePort<SupportCard[]>
  /** 保存先の差し替え先 */
  storage?: CommandStoragePort
}

/** ユーザー定義サポート更新処理 */
export interface UserSupportCommand {
  /** 現在の一覧と状態番号を読む */
  getSnapshot: () => DomainStateSnapshot<SupportCard[]>
  /** 名前で1件取得する */
  get: (name: string) => Result<SupportCard>
  /** 新規カードを追加する。同名があれば重複エラーを返す */
  add: (card: SupportCard, options?: CommandOptions) => Promise<CommandResult<SupportCard[]>>
  /** 既存カードを置き換える。名前変更も一つの保存処理で扱う */
  update: (oldName: string, card: SupportCard, options?: CommandOptions) => Promise<CommandResult<SupportCard[]>>
  /** 新規追加または同名カードを置き換える */
  upsert: (card: SupportCard, options?: CommandOptions) => Promise<CommandResult<SupportCard[]>>
  /** 一覧を完全に置き換える */
  replace: (cards: readonly SupportCard[], options?: CommandOptions) => Promise<CommandResult<SupportCard[]>>
  /** 既存カードの名前だけを一度に変更する */
  rename: (oldName: string, newName: string, options?: CommandOptions) => Promise<CommandResult<SupportCard[]>>
  /** 名前で1件削除する */
  remove: (name: string, options?: CommandOptions) => Promise<CommandResult<SupportCard[]>>
}

/**
 * 不正なユーザー定義サポート入力を返す
 *
 * @returns 不正入力を表す更新結果
 */
function invalidCardResult(): CommandResult<SupportCard[]> {
  return createCommandError(createDomainIssue(DomainIssueCode.InvalidInput, { path: { field: DomainIssuePath.Card } }))
}

/**
 * 名前が不正な場合の結果を返す
 *
 * @returns 不正な名前を表す更新結果
 */
function invalidNameResult(): CommandResult<SupportCard[]> {
  return createCommandError(createDomainIssue(DomainIssueCode.InvalidInput, { path: { field: DomainIssuePath.Name } }))
}

/**
 * 同名要素の衝突を返す
 *
 * @param name - 衝突したカード名
 * @returns 重複を表す更新結果
 */
function duplicateNameResult(name: string): CommandResult<SupportCard[]> {
  return createCommandError(
    createDomainIssue(DomainIssueCode.Conflict, {
      path: { field: DomainIssuePath.Name },
      params: { name },
      retryable: false,
    }),
  )
}

/**
 * 一覧全体を検証する
 *
 * @param cards - 検証するユーザーサポート一覧
 * @returns 重複のない有効な一覧の場合はtrue
 */
function isValidCardList(cards: readonly SupportCard[]): boolean {
  if (!cards.every(isSupportCard)) return false
  const names = cards.map((card) => card.name)
  return new Set(names).size === names.length
}

/**
 * ユーザー定義サポート更新処理を作る
 *
 * @param options - 現在値と保存先
 * @returns ユーザー定義サポート更新処理
 */
export function createUserSupportCommand(options: UserSupportCommandOptions): UserSupportCommand {
  const { state, storage } = options

  /**
   * ユーザーサポート一覧を検証して保存する
   *
   * @param cards - 保存するユーザーサポート一覧
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const persist = (cards: SupportCard[], commandOptions: CommandOptions = {}) => {
    if (!isValidCardList(cards)) return Promise.resolve(invalidCardResult())
    return state.runSerialized(async () => {
      const serialized = serializeStorageEntry(constant.USER_SUPPORTS_STORAGE_KEY, cards)
      if (!serialized.ok) return createCommandError(serialized.error)
      return runPersistedCommand<SupportCard[]>({
        state,
        storage,
        nextValue: cards,
        entries: [serialized.value],
        options: commandOptions,
      })
    })
  }

  /**
   * ユーザーサポートを追加または置き換える
   *
   * @param card - 保存するサポート
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const upsert = (card: SupportCard, commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      if (!isUserSupportCardFormValue(card)) return invalidCardResult()
      const current = state.getSnapshot().value
      const indexes = current.reduce<number[]>((result, item, index) => {
        if (item.name === card.name) result.push(index)
        return result
      }, [])
      if (indexes.length > 1) return duplicateNameResult(card.name)

      const nextValue = [...current]
      if (indexes.length === 1) nextValue[indexes[0]] = card
      else nextValue.push(card)
      if (!isValidCardList(nextValue)) return invalidCardResult()
      const serialized = serializeStorageEntry(constant.USER_SUPPORTS_STORAGE_KEY, nextValue)
      if (!serialized.ok) return createCommandError(serialized.error)
      return runPersistedCommand<SupportCard[]>({
        state,
        storage,
        nextValue,
        entries: [serialized.value],
        options: commandOptions,
      })
    })

  /**
   * ユーザーサポートを新規追加する
   *
   * @param card - 追加するサポート
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const add = (card: SupportCard, commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      if (!isUserSupportCardFormValue(card)) return invalidCardResult()
      const current = state.getSnapshot().value
      if (current.some((item) => item.name === card.name)) return duplicateNameResult(card.name)
      const nextValue = [...current, card]
      if (!isValidCardList(nextValue)) return invalidCardResult()
      const serialized = serializeStorageEntry(constant.USER_SUPPORTS_STORAGE_KEY, nextValue)
      if (!serialized.ok) return createCommandError(serialized.error)
      return runPersistedCommand<SupportCard[]>({
        state,
        storage,
        nextValue,
        entries: [serialized.value],
        options: commandOptions,
      })
    })

  /**
   * 既存のユーザーサポートを置き換える
   *
   * @param oldName - 置き換え前のカード名
   * @param card - 置き換え後のサポート
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const update = (oldName: string, card: SupportCard, commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      if (typeof oldName !== 'string' || oldName.trim() === '') return invalidNameResult()
      if (!isUserSupportCardFormValue(card)) return invalidCardResult()
      const current = state.getSnapshot().value
      const oldIndexes = current.reduce<number[]>((result, item, index) => {
        if (item.name === oldName) result.push(index)
        return result
      }, [])
      if (oldIndexes.length === 0) {
        return createCommandError(
          createDomainIssue(DomainIssueCode.NotFound, {
            path: { field: DomainIssuePath.OldName },
            params: { name: oldName },
            retryable: false,
          }),
        )
      }
      if (oldIndexes.length > 1) return duplicateNameResult(oldName)
      if (card.name !== oldName && current.some((item) => item.name === card.name))
        return duplicateNameResult(card.name)
      const nextValue = current.map((item, index) => (index === oldIndexes[0] ? card : item))
      if (!isValidCardList(nextValue)) return invalidCardResult()
      const serialized = serializeStorageEntry(constant.USER_SUPPORTS_STORAGE_KEY, nextValue)
      if (!serialized.ok) return createCommandError(serialized.error)
      return runPersistedCommand<SupportCard[]>({
        state,
        storage,
        nextValue,
        entries: [serialized.value],
        options: commandOptions,
      })
    })

  /**
   * ユーザーサポート一覧を完全に置き換える
   *
   * @param cards - 保存するユーザーサポート一覧
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const replace = (cards: readonly SupportCard[], commandOptions: CommandOptions = {}) =>
    persist([...cards], commandOptions)

  /**
   * ユーザーサポートの名前を変更する
   *
   * @param oldName - 変更前のカード名
   * @param newName - 変更後のカード名
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const rename = (oldName: string, newName: string, commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      if (
        typeof oldName !== 'string' ||
        oldName.trim() === '' ||
        typeof newName !== 'string' ||
        newName.trim() === ''
      ) {
        return invalidNameResult()
      }
      const current = state.getSnapshot().value
      const oldIndexes = current.reduce<number[]>((result, item, index) => {
        if (item.name === oldName) result.push(index)
        return result
      }, [])
      if (oldIndexes.length === 0) {
        return createCommandError(
          createDomainIssue(DomainIssueCode.NotFound, {
            path: { field: DomainIssuePath.OldName },
            params: { name: oldName },
            retryable: false,
          }),
        )
      }
      if (oldIndexes.length > 1) return duplicateNameResult(oldName)
      if (newName !== oldName && current.some((item) => item.name === newName)) return duplicateNameResult(newName)

      const nextValue = current.map((card, index) => (index === oldIndexes[0] ? { ...card, name: newName } : card))
      if (!isValidCardList(nextValue)) return invalidCardResult()
      const serialized = serializeStorageEntry(constant.USER_SUPPORTS_STORAGE_KEY, nextValue)
      if (!serialized.ok) return createCommandError(serialized.error)
      return runPersistedCommand<SupportCard[]>({
        state,
        storage,
        nextValue,
        entries: [serialized.value],
        options: commandOptions,
      })
    })

  /**
   * 名前付きユーザーサポートを削除する
   *
   * @param name - 削除するカード名
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const remove = (name: string, commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      if (typeof name !== 'string' || name.trim() === '') return invalidNameResult()
      const current = state.getSnapshot().value
      const indexes = current.reduce<number[]>((result, item, index) => {
        if (item.name === name) result.push(index)
        return result
      }, [])
      if (indexes.length === 0) {
        return createCommandError(
          createDomainIssue(DomainIssueCode.NotFound, {
            path: { field: DomainIssuePath.Name },
            params: { name },
            retryable: false,
          }),
        )
      }
      if (indexes.length > 1) return duplicateNameResult(name)
      const nextValue = current.filter((_, index) => index !== indexes[0])
      const serialized = serializeStorageEntry(constant.USER_SUPPORTS_STORAGE_KEY, nextValue)
      if (!serialized.ok) return createCommandError(serialized.error)
      return runPersistedCommand<SupportCard[]>({
        state,
        storage,
        nextValue,
        entries: [serialized.value],
        options: commandOptions,
      })
    })

  /**
   * 名前付きユーザーサポートを取得する
   *
   * @param name - 取得するカード名
   * @returns サポートまたは入力・未検出エラー
   */
  const get = (name: string): Result<SupportCard> => {
    if (typeof name !== 'string' || name.trim() === '') {
      return {
        ok: false,
        error: createDomainIssue(DomainIssueCode.InvalidInput, { path: { field: DomainIssuePath.Name } }),
      }
    }
    const card = state.getSnapshot().value.find((item) => item.name === name)
    return card
      ? createResult(card)
      : {
          ok: false,
          error: createDomainIssue(DomainIssueCode.NotFound, {
            path: { field: DomainIssuePath.Name },
            params: { name },
            retryable: false,
          }),
        }
  }

  return { getSnapshot: state.getSnapshot, get, add, update, upsert, replace, rename, remove }
}

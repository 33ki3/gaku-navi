/**
 * 更新処理が返す成功・失敗の形を作る小さな補助関数
 *
 * ここでは結果の形だけを作り、保存や画面の更新は行わない
 */
import type {
  CommandResult,
  CommandSuccess,
  CommandSuccessOptions,
  DomainIssue,
  DomainIssueCodeType,
  DomainIssueOptions,
  Result,
} from '../types/application'

export { DomainIssuePath } from '../types/application'

/**
 * 共通の更新エラーを作る
 *
 * @param code - 更新処理で定義したエラーコード
 * @param options - エラーの補足情報
 * @returns エラーの種類と補足情報をまとめた値
 */
export function createDomainIssue(code: DomainIssueCodeType, options: DomainIssueOptions = {}): DomainIssue {
  return { code, ...options }
}

/**
 * 成功結果を作る
 *
 * @param value - 成功時に返す値
 * @returns 成功結果
 */
export function createResult<T>(value: T): Result<T> {
  return { ok: true, value }
}

/**
 * 失敗結果を作る
 *
 * @param error - 失敗理由
 * @returns 失敗結果
 */
export function createErrorResult<T>(error: DomainIssue): Result<T> {
  return { ok: false, error }
}

/**
 * 設定更新の成功結果を作る
 *
 * @param value - 成功時に返す値
 * @param result - 変更の有無と更新後の識別情報
 * @returns 設定更新の成功結果
 */
export function createCommandSuccess<T>(value: T, options: CommandSuccessOptions<T>): CommandSuccess<T> {
  return { ok: true, value, ...options }
}

/**
 * 設定更新の失敗結果を作る
 *
 * @param error - 失敗理由
 * @returns 設定更新の失敗結果
 */
export function createCommandError<T = never>(error: DomainIssue): CommandResult<T> {
  return { ok: false, error }
}

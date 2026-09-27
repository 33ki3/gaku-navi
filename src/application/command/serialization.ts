/** 更新処理が保存するJSON文字列を作る補助処理 */
import type { Result } from '../../types/application'
import { DomainIssueCode } from '../../types/application'
import type { StorageEntry } from '../../types/storage'
import { createDomainIssue, createErrorResult } from '../result'

/**
 * 保存値をJSON文字列へ変換し、undefinedや循環参照を成功扱いしない
 *
 * @param key - 保存先キー
 * @param value - JSON化する値
 * @returns 保存キーとJSON文字列の結果
 */
export function serializeStorageEntry<T>(key: string, value: T): Result<StorageEntry> {
  try {
    const serialized = JSON.stringify(value)
    if (serialized === undefined) {
      return createErrorResult(
        createDomainIssue(DomainIssueCode.SerializationError, {
          params: { key },
          retryable: false,
        }),
      )
    }
    return { ok: true, value: [key, serialized] }
  } catch {
    return createErrorResult(
      createDomainIssue(DomainIssueCode.SerializationError, {
        params: { key },
        retryable: false,
      }),
    )
  }
}

/**
 * 保存処理の結果分類を検証する
 *
 * 保存途中の失敗を単なるfalseへ変換せず、rollback成功・rollback失敗・結果不明を
 * 呼び出し元が区別できることを確認する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StorageTransactionOutcome } from '../../types/storage'
import { applyStorageEntries, createStorageSnapshot, createStorageSnapshotResult } from '../../utils/storageTransaction'

describe('storageTransaction', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('変更がない場合は書き込まず、committedのno-opを返す', () => {
    localStorage.setItem('first', 'same')
    const entries = [['first', 'same']] as const
    const snapshot = createStorageSnapshot(entries)
    expect(snapshot).not.toBeNull()
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    const result = applyStorageEntries(entries, snapshot!)

    expect(result).toMatchObject({ outcome: StorageTransactionOutcome.Committed, changed: false, writtenKeys: [] })
    expect(setItemSpy).not.toHaveBeenCalled()
  })

  it('途中の保存失敗を元へ戻せた場合はrolled_backを返す', () => {
    localStorage.setItem('first', 'old-first')
    localStorage.setItem('second', 'old-second')
    const entries = [
      ['first', 'new-first'],
      ['second', 'new-second'],
    ] as const
    const snapshot = createStorageSnapshot(entries)
    expect(snapshot).not.toBeNull()
    const nativeSetItem = Storage.prototype.setItem
    let writeCount = 0
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      writeCount += 1
      if (writeCount === 2) throw new Error('quota exceeded')
      nativeSetItem.call(localStorage, key, value)
    })

    const result = applyStorageEntries(entries, snapshot!)

    expect(result.outcome).toBe(StorageTransactionOutcome.RolledBack)
    expect(localStorage.getItem('first')).toBe('old-first')
    expect(localStorage.getItem('second')).toBe('old-second')
  })

  it('復元自体に失敗して値が残った場合はrollback_failedを返す', () => {
    localStorage.setItem('first', 'old-first')
    localStorage.setItem('second', 'old-second')
    const entries = [
      ['first', 'new-first'],
      ['second', 'new-second'],
    ] as const
    const snapshot = createStorageSnapshot(entries)
    expect(snapshot).not.toBeNull()
    const nativeSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      // secondの新値保存で失敗し、firstの復元だけを失敗させて途中値を残す
      if (key === 'second' && value === 'new-second') throw new Error('quota exceeded')
      if (key === 'first' && value === 'old-first') throw new Error('storage locked')
      nativeSetItem.call(localStorage, key, value)
    })

    const result = applyStorageEntries(entries, snapshot!)

    expect(result.outcome).toBe(StorageTransactionOutcome.RollbackFailed)
    expect(localStorage.getItem('first')).toBe('new-first')
  })

  it('保存後の再読込ができない場合はunknown_outcomeを返す', () => {
    localStorage.setItem('first', 'old-first')
    const entries = [['first', 'new-first']] as const
    const snapshot = createStorageSnapshot(entries)
    expect(snapshot).not.toBeNull()
    const nativeGetItem = Storage.prototype.getItem
    let readCount = 0
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      readCount += 1
      if (readCount >= 2) throw new Error('storage became unavailable')
      return nativeGetItem.call(localStorage, key)
    })

    const result = applyStorageEntries(entries, snapshot!)

    expect(result.outcome).toBe(StorageTransactionOutcome.UnknownOutcome)
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ phase: 'verify', key: 'first' })]))
  })

  it('保存後に別の値へ変わった場合はrollbackせずunknown_outcomeを返す', () => {
    localStorage.setItem('first', 'old-first')
    const entries = [['first', 'new-first']] as const
    const snapshot = createStorageSnapshot(entries)
    expect(snapshot).not.toBeNull()
    const nativeSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      nativeSetItem.call(localStorage, key, value === 'new-first' ? 'changed-in-another-tab' : value)
    })

    const result = applyStorageEntries(entries, snapshot!)

    expect(result.outcome).toBe(StorageTransactionOutcome.UnknownOutcome)
    expect(localStorage.getItem('first')).toBe('changed-in-another-tab')
  })

  it('snapshot取得失敗を詳細な結果として返す', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    const result = createStorageSnapshotResult([['first', 'value']])

    expect(result).toMatchObject({ ok: false, outcome: StorageTransactionOutcome.SnapshotFailed })
  })
})

/**
 * 設定更新で共有する結果・変更順序・データ変換を検証する
 *
 * 画面や外部操作をつながず、更新処理が同じルールで結果を返すことを確認する
 */
import { describe, expect, it } from 'vitest'
import { DomainStateStore } from '../../application/domainStateStore'
import { createErrorResult, createResult } from '../../application/result'
import { SerializedCommandQueue } from '../../application/serializedCommandQueue'
import { ApplicationDomain, DomainIssueCode } from '../../types/application'
import { createDomainDigest, createDomainRevision, serializeDomainValue } from '../../utils/domainRevision'

describe('application foundation', () => {
  it('Result helperは成功と失敗の形を揃える', () => {
    expect(createResult('value')).toEqual({ ok: true, value: 'value' })
    expect(createErrorResult({ code: DomainIssueCode.InvalidInput })).toEqual({
      ok: false,
      error: { code: DomainIssueCode.InvalidInput },
    })
  })

  it('objectのキー順に依存せずdigestを作る', () => {
    expect(createDomainDigest({ first: 1, second: 2 })).toBe(createDomainDigest({ second: 2, first: 1 }))
    expect(createDomainDigest({ first: 1, second: 2 })).not.toBe(createDomainDigest({ first: 2, second: 1 }))
    expect(serializeDomainValue({ second: 2, first: 1 })).toContain('"first"')
    expect(createDomainRevision(ApplicationDomain.Filters, createDomainDigest({ first: 1 }))).toMatch(/^filters-/)
  })

  it('no-opではrevisionを維持し、変更時だけsubscriptionへ通知する', () => {
    const store = new DomainStateStore({ domain: ApplicationDomain.Preferences, initialValue: { pinned: false } })
    const initial = store.getSnapshot()
    const changes: { before: boolean; after: boolean }[] = []
    store.subscribe(({ before, after }) => {
      changes.push({ before: before.value.pinned, after: after.value.pinned })
    })

    const noOp = store.commit({ pinned: false }, { expectedRevision: initial.revision })
    const changed = store.commit({ pinned: true }, { expectedRevision: initial.revision })

    expect(noOp).toMatchObject({ ok: true, changed: false, revision: initial.revision })
    expect(changed).toMatchObject({ ok: true, changed: true })
    expect(changed.ok && changed.revision).not.toBe(initial.revision)
    expect(changes).toEqual([{ before: false, after: true }])
  })

  it('古いexpectedRevisionでは保存せずstale_revisionを返す', () => {
    const store = new DomainStateStore({ domain: ApplicationDomain.Filters, initialValue: { search: '' } })
    const initial = store.getSnapshot()
    const first = store.commit({ search: 'first' }, { expectedRevision: initial.revision })
    if (!first.ok) throw new Error('first command should succeed')

    const stale = store.commit({ search: 'stale' }, { expectedRevision: initial.revision })

    expect(stale).toEqual({
      ok: false,
      error: {
        code: DomainIssueCode.StaleRevision,
        params: {
          expectedRevision: initial.revision,
          currentRevision: first.revision,
        },
        retryable: true,
      },
    })
    expect(store.getSnapshot().value).toEqual({ search: 'first' })
  })

  it('unsubscribe後は変更通知を受け取らない', () => {
    const store = new DomainStateStore({ domain: ApplicationDomain.Filters, initialValue: 0 })
    let count = 0
    const unsubscribe = store.subscribe(() => {
      count += 1
    })
    unsubscribe()

    store.commit(1)

    expect(count).toBe(0)
  })

  it('同時に登録したtaskを登録順に直列実行する', async () => {
    const queue = new SerializedCommandQueue()
    const order: string[] = []
    let releaseFirst: (() => void) | undefined
    const firstReleased = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })

    const first = queue.run(async () => {
      order.push('first:start')
      await firstReleased
      order.push('first:end')
      return 'first'
    })
    const second = queue.run(async () => {
      order.push('second:start')
      return 'second'
    })

    await Promise.resolve()
    expect(order).toEqual(['first:start'])
    expect(queue.pendingCount).toBe(2)
    releaseFirst?.()
    await expect(first).resolves.toBe('first')
    await expect(second).resolves.toBe('second')
    expect(order).toEqual(['first:start', 'first:end', 'second:start'])
    expect(queue.pendingCount).toBe(0)
  })

  it('serialized commitは先行変更後にexpectedRevisionを再確認する', async () => {
    const store = new DomainStateStore({ domain: ApplicationDomain.Preferences, initialValue: { pinned: false } })
    const initial = store.getSnapshot()

    const first = store.commitSerialized({ pinned: true }, { expectedRevision: initial.revision })
    const second = store.commitSerialized({ pinned: false }, { expectedRevision: initial.revision })

    await expect(first).resolves.toMatchObject({ ok: true, changed: true })
    await expect(second).resolves.toMatchObject({ ok: false, error: { code: DomainIssueCode.StaleRevision } })
    expect(store.getSnapshot().value).toEqual({ pinned: true })
  })
})

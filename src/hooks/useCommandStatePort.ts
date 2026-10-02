/**
 * 画面の現在値を、状態番号付きの共通保存処理へ接続する
 *
 * 保存後に画面表示が更新されるまで待てるようにし、
 * 画面操作とWebMCPで同じ保存結果を扱う
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

import type { CommandCommit, CommandStatePort, CommandWaitForRevision } from '../application/command/ports'
import { DomainStateStore } from '../application/domainStateStore'
import { createCommandError, createDomainIssue } from '../application/result'
import * as constant from '../constant'
import type { ApplicationDomainType, DomainRevision } from '../types/application'
import { ApplicationStatePhase, DomainIssueCode } from '../types/application'
import { createDomainDigest } from '../utils/domainRevision'

/** 画面への状態反映が完了するまで待つ処理の情報 */
interface RevisionWaiter {
  // 画面反映を待っている対象の状態番号
  revision: DomainRevision
  // 画面反映完了時または待機失敗時に呼び出す関数
  resolve: (synchronized: boolean) => void
  // 待機を打ち切るタイマー
  timer: ReturnType<typeof setTimeout>
}

/** Reactから更新前の値が遅れて届いた場合に、新しいcommand stateを守る情報 */
interface PendingPublication {
  // 新しい値を保存したcommandの状態番号
  revision: DomainRevision
  // commandが保存した新しい値のdigest
  digest: ReturnType<typeof createDomainDigest>
  // publish前に画面が持っていた値のdigest
  beforeDigest: ReturnType<typeof createDomainDigest>
}

/**
 * 保存処理による値の更新と、画面に新しい値が表示されたことを橋渡しする
 *
 * @param domain - 状態番号を分ける設定の名前
 * @param value - 画面に現在表示している値
 * @param publish - 保存せず画面へ値を反映する関数
 * @returns 共通保存処理へ渡す現在値の窓口
 */
export function useCommandStatePort<T>(
  domain: ApplicationDomainType,
  value: T,
  publish: (nextValue: T) => void,
): CommandStatePort<T> {
  const [store] = useState(() => new DomainStateStore({ domain, initialValue: value }))
  const publishRef = useRef(publish)
  const renderedRevisionRef = useRef(store.getSnapshot().revision)
  const waitersRef = useRef(new Set<RevisionWaiter>())
  const pendingPublicationRef = useRef<PendingPublication | null>(null)

  // 最新のpublish関数を保持し、描画済みの値をstate storeへ同期する
  useLayoutEffect(() => {
    publishRef.current = publish
    const current = store.getSnapshot()
    const renderedDigest = createDomainDigest(value)
    const pendingPublication = pendingPublicationRef.current
    if (
      pendingPublication !== null &&
      current.revision === pendingPublication.revision &&
      current.digest === pendingPublication.digest &&
      renderedDigest === pendingPublication.beforeDigest
    ) {
      // Reactが公開前の描画を完了しても、commandの新しい値を古い値で置き換えない
      return
    }
    pendingPublicationRef.current = null
    // 画面操作や別タブ同期も現在値の更新として記録し、競合検出に使う
    if (current.digest !== renderedDigest) store.commit(value)
    renderedRevisionRef.current = store.getSnapshot().revision
    for (const waiter of [...waitersRef.current]) {
      if (waiter.revision !== renderedRevisionRef.current) continue
      clearTimeout(waiter.timer)
      waitersRef.current.delete(waiter)
      waiter.resolve(true)
    }
  }, [publish, store, value])

  // hook破棄時に画面反映待ちをすべて終了する
  useLayoutEffect(
    () => () => {
      for (const waiter of waitersRef.current) {
        clearTimeout(waiter.timer)
        waiter.resolve(false)
      }
      waitersRef.current.clear()
    },
    [],
  )

  // 共通commandの更新を画面へ反映し、失敗時はstate storeを元へ戻す
  const commit = useCallback<CommandCommit<T>>(
    (nextValue, options) => {
      const before = store.getSnapshot()
      const result = store.commit(nextValue, options)
      if (!result.ok || !result.changed) return result
      pendingPublicationRef.current = {
        revision: result.revision,
        digest: result.digest,
        beforeDigest: before.digest,
      }
      try {
        // 先に現在値を記録し、保存処理と画面更新の順序をそろえる
        publishRef.current(nextValue)
        // 記録した値を画面へ反映し、表示を更新する
        return result
      } catch {
        // 画面更新に失敗したら記録した値も元へ戻し、結果不明として返す
        pendingPublicationRef.current = null
        store.commit(before.value, { expectedRevision: result.revision })
        return createCommandError(
          createDomainIssue(DomainIssueCode.UnknownOutcome, {
            params: { phase: ApplicationStatePhase.Publish },
            retryable: false,
          }),
        )
      }
    },
    [store],
  )

  // 指定したrevisionが画面へ反映されるまで待つ
  const waitForRevision = useCallback<CommandWaitForRevision>(
    (revision, timeoutMs = constant.STATE_SYNC_TIMEOUT_MS) => {
      if (renderedRevisionRef.current === revision) return Promise.resolve(true)
      return new Promise<boolean>((resolve) => {
        const waiter: RevisionWaiter = {
          revision,
          resolve,
          timer: setTimeout(() => {
            waitersRef.current.delete(waiter)
            resolve(false)
          }, timeoutMs),
        }
        waitersRef.current.add(waiter)
      })
    },
    [],
  )

  // commandが現在値を読み書きできるportを安定したオブジェクトで返す
  return useMemo(
    () => ({
      getSnapshot: () => store.getSnapshot(),
      runSerialized: (task) => store.runSerialized(task),
      commit,
      waitForRevision,
    }),
    [commit, store, waitForRevision],
  )
}

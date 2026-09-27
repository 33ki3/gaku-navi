import type { CommandStatePort } from '../../application/command/ports'
import { DomainStateStore } from '../../application/domainStateStore'

/** commandテスト用に状態保管庫をportへ接続する */
export function createTestCommandStatePort<T>(store: DomainStateStore<T>): CommandStatePort<T> {
  return {
    getSnapshot: () => store.getSnapshot(),
    runSerialized: (task) => store.runSerialized(task),
    commit: (value, options) => store.commit(value, options),
    waitForRevision: (revision, timeoutMs) => store.waitForRevision(revision, timeoutMs),
  }
}

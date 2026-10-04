import { createAchievementCalculatorCommand } from '../../application/command/achievementCalculatorCommand'
import type { CommandStatePort } from '../../application/command/ports'
import { DomainStateStore } from '../../application/domainStateStore'
import { createAchievementCalculatorQuery } from '../../application/query/achievementCalculatorQuery'
import * as application from '../../types/application'
import * as enums from '../../types/enums'
import { createAchievementCalculatorProgress } from '../../utils/achievementCalculatorProgress'

/**
 * commandテスト用に状態保管庫をportへ接続する
 * @param store 検証対象の状態・revisionと直列化を管理する保管庫
 * @returns 本番commandと同じ契約で読み取り・保存・同期確認を行う接続先
 */
export function createTestCommandStatePort<T>(store: DomainStateStore<T>): CommandStatePort<T> {
  return {
    getSnapshot: () => store.getSnapshot(),
    runSerialized: (task) => store.runSerialized(task),
    commit: (value, options) => store.commit(value, options),
    waitForRevision: (revision, timeoutMs) => store.waitForRevision(revision, timeoutMs),
  }
}

/**
 * WebMCPの登録fixtureにも、本番と同じ達成記録の接続先を渡す
 * @returns 初期記録のcommandと、アプリ全体のruntimeへ展開する読み取り関数
 */
export function createTestAchievementBindings() {
  const store = new DomainStateStore({
    domain: application.ApplicationDomain.Achievement,
    initialValue: createAchievementCalculatorProgress(),
  })
  const state = createTestCommandStatePort(store)
  const achievementCommand = createAchievementCalculatorCommand(state)
  const query = createAchievementCalculatorQuery(state)
  return {
    achievementCommand,
    getAchievementSnapshot: state.getSnapshot,
    getAchievementSummary: query.getSummary,
    getSelectedAchievementIdolId: () => enums.IdolId.Saki,
  }
}

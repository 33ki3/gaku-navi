/** UIとWebMCPが共有する達成記録の更新command、検証・直列化・保存・revision確認を同じ入口に集約する */
import * as constant from '../../constant'
import * as data from '../../data'
import type { AchievementCalculatorProgress } from '../../types/achievementCalculator'
import { DomainIssueCode, DomainIssuePath } from '../../types/application'
import type { IdolAchievementMetric, PIdolCardAchievementId, ProductionRunRewardAdjustmentId } from '../../types/enums'
import { getIdolAchievementMilestones } from '../../utils/achievementCalculator'
import {
  compactAchievementCalculatorProgress,
  createAchievementCalculatorProgress,
  isAchievementCalculatorProgress,
} from '../../utils/achievementCalculatorProgress'
import { normalizeInteger, normalizeNonNegativeInteger } from '../../utils/valueValidation'
import { createCommandError, createDomainIssue } from '../result'
import { runPersistedCommand } from './persistedCommand'
import type { CommandOptions, CommandStatePort, CommandStoragePort } from './ports'
import { serializeStorageEntry } from './serialization'

/**
 * 達成記録の保存と表示同期を、既存commandと同じ契約で提供する
 * @param state Reactまたは外部アダプターが提供する現在値とrevisionの管理先
 * @param storage 差し替え可能な保存先、省略時はlocalStorage
 * @returns 独立した項目更新・一括更新・スナップショット取得のcommand
 */
export function createAchievementCalculatorCommand(
  state: CommandStatePort<AchievementCalculatorProgress>,
  storage?: CommandStoragePort,
) {
  // 更新ごとに最新状態を読み、短い間隔のUI操作と外部操作で同じ保存値を上書きし合わないようにする
  const runUpdate = (
    transform: (current: AchievementCalculatorProgress) => AchievementCalculatorProgress | undefined,
    options: CommandOptions = {},
  ) =>
    state.runSerialized(async () => {
      const nextValue = transform(state.getSnapshot().value)
      if (!nextValue)
        return createCommandError(
          createDomainIssue(DomainIssueCode.InvalidInput, { path: { field: DomainIssuePath.Achievement } }),
        )
      const entry = serializeStorageEntry(
        constant.ACHIEVEMENT_CALCULATOR_STORAGE_KEY,
        compactAchievementCalculatorProgress(nextValue),
      )
      if (!entry.ok) return createCommandError(entry.error)
      return runPersistedCommand({ state, storage, nextValue, entries: [entry.value], options })
    })

  /**
   * 全体置換にも同じ検証と保存を適用し、WebMCPが画面入力を迂回して不正値を記録できないようにする
   * @param value 実行時スナップショットなど、全項目を含む達成記録
   * @param options 中断・revision確認・画面反映待ちの設定。省略時は表示同期を待つ
   * @returns 保存後の記録・revision、または検証・保存・同期の失敗を返すPromise
   */
  const replace = (value: unknown, options?: CommandOptions) =>
    runUpdate(() => {
      return isAchievementCalculatorProgress(value) ? createAchievementCalculatorProgress(value) : undefined
    }, options)

  /**
   * プロデュース項目の現在値だけを更新し、最終条件を超えないようにする
   * @param trackerId プロデュースの累計項目ID
   * @param value 更新後の非負整数。最終条件を超える分は上限に収める
   * @param options 中断・revision確認・画面反映待ちの設定。省略時は表示同期を待つ
   * @returns 保存後の記録・revision、または検証・保存・同期の失敗を返すPromise
   */
  const setProductionValue = (trackerId: string, value: number, options: CommandOptions = {}) =>
    runUpdate((current) => {
      if (normalizeNonNegativeInteger(value) === undefined) return

      const tracker = data.PRODUCTION_ACHIEVEMENTS.find((entry) => entry.id === trackerId)
      if (!tracker) return
      const maxValue = tracker.milestones.at(-1)?.threshold
      const normalized = normalizeNonNegativeInteger(value, maxValue) ?? 0
      return {
        ...current,
        production: { ...current.production, [trackerId]: normalized },
      }
    }, options)

  /**
   * アイドル固有の条件を使い、ランクや特訓を連動させず指定項目だけ更新する
   * @param idolId 収録アイドルのID
   * @param metric 他の条件と独立して記録する達成条件
   * @param value 更新後の非負整数。条件ごとの上限に収める
   * @param options 中断・revision確認・画面反映待ちの設定。省略時は表示同期を待つ
   * @returns 保存後の記録・revision、または検証・保存・同期の失敗を返すPromise
   */
  const setIdolValue = (idolId: string, metric: IdolAchievementMetric, value: number, options: CommandOptions = {}) =>
    runUpdate((current) => {
      if (normalizeNonNegativeInteger(value) === undefined) return

      const idol = data.IDOL_ACHIEVEMENTS.find((entry) => entry.id === idolId)
      const tracker = idol?.trackers.find((entry) => entry.metric === metric)
      if (!tracker) return
      const maxValue = getIdolAchievementMilestones(tracker).at(-1)?.threshold
      const normalized = normalizeNonNegativeInteger(value, maxValue) ?? 0
      return {
        ...current,
        idols: {
          ...current.idols,
          [idolId]: { ...current.idols[idolId], [metric]: normalized },
        },
      }
    }, options)

  /**
   * 課題やパネルの達成数を更新し、各マスタの上限へ収める
   * @param trackerId 課題・パネルの項目ID
   * @param value 更新後の累計達成数。課題数の上限に収める
   * @param options 中断・revision確認・画面反映待ちの設定。省略時は表示同期を待つ
   * @returns 保存後の記録・revision、または検証・保存・同期の失敗を返すPromise
   */
  const setOtherTaskValue = (trackerId: string, value: number, options: CommandOptions = {}) =>
    runUpdate((current) => {
      if (normalizeNonNegativeInteger(value) === undefined) return

      const tracker = data.OTHER_EXPERIENCE_TRACKERS.find((entry) => entry.id === trackerId)
      if (!tracker) return
      const maxValue = tracker.milestones.at(-1)?.threshold
      const normalized = normalizeNonNegativeInteger(value, maxValue) ?? 0
      return {
        ...current,
        otherTasks: { ...current.otherTasks, [trackerId]: normalized },
      }
    }, options)

  /**
   * 試験結果の回数を独立して記録し、総回数の超過はqueryと画面で検出する
   * @param adjustmentId 基準EXPと異なる試験結果のID
   * @param value その結果になったプロデュース回数
   * @param options 中断・revision確認・画面反映待ちの設定。省略時は表示同期を待つ
   * @returns 保存後の記録・revision、または検証・保存・同期の失敗を返すPromise
   */
  const setProductionRewardAdjustment = (
    adjustmentId: ProductionRunRewardAdjustmentId,
    value: number,
    options: CommandOptions = {},
  ) =>
    runUpdate((current) => {
      if (normalizeNonNegativeInteger(value) === undefined) return

      if (!data.PRODUCTION_RUN_REWARD_ADJUSTMENTS.some(({ id }) => id === adjustmentId)) return
      return {
        ...current,
        productionRewardAdjustments: {
          ...current.productionRewardAdjustments,
          [adjustmentId]: normalizeNonNegativeInteger(value) ?? 0,
        },
      }
    }, options)

  /**
   * 存在するステージの星数だけを0〜3の範囲で更新する
   * @param idolId 対象アイドルのID
   * @param stageIndex 0始まりの収録ステージ番号
   * @param value 先頭から達成にする星数。0から規定数の範囲へ収める
   * @param options 中断・revision確認・画面反映待ちの設定。省略時は表示同期を待つ
   * @returns 保存後の記録・revision、または検証・保存・同期の失敗を返すPromise
   */
  const setIdolRoadStageStars = (idolId: string, stageIndex: number, value: number, options: CommandOptions = {}) =>
    runUpdate((current) => {
      if (normalizeNonNegativeInteger(value) === undefined) return

      if (!data.IDOL_ACHIEVEMENTS.some((idol) => idol.id === idolId)) return
      if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= constant.ROAD_STAGE_COUNT_PER_IDOL) return
      const normalized = normalizeNonNegativeInteger(value, constant.ROAD_STARS_PER_STAGE) ?? 0
      return {
        ...current,
        idolRoad: {
          ...current.idolRoad,
          [idolId]: {
            ...current.idolRoad[idolId],
            [stageIndex]: Array.from(
              { length: constant.ROAD_STARS_PER_STAGE },
              (_, starIndex) => starIndex < normalized,
            ),
          },
        },
      }
    }, options)

  /**
   * ステージ内の指定した星だけを切り替え、他の星の達成状態を保持する
   * @param idolId 対象アイドルのID
   * @param stageIndex 0始まりの収録ステージ番号
   * @param starIndex ステージ内の0始まりの星番号
   * @param completed 指定した星を達成にする場合はtrue
   * @param options 中断・revision確認・画面反映待ちの設定。省略時は表示同期を待つ
   * @returns 保存後の記録・revision、または検証・保存・同期の失敗を返すPromise
   */
  const setIdolRoadStageStar = (
    idolId: string,
    stageIndex: number,
    starIndex: number,
    completed: boolean,
    options: CommandOptions = {},
  ) =>
    runUpdate((current) => {
      if (typeof completed !== 'boolean') return
      if (!data.IDOL_ACHIEVEMENTS.some((idol) => idol.id === idolId)) return
      if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= constant.ROAD_STAGE_COUNT_PER_IDOL) return
      if (!Number.isInteger(starIndex) || starIndex < 0 || starIndex >= constant.ROAD_STARS_PER_STAGE) return
      return {
        ...current,
        idolRoad: {
          ...current.idolRoad,
          [idolId]: {
            ...current.idolRoad[idolId],
            [stageIndex]: current.idolRoad[idolId][stageIndex].map((value, index) =>
              index === starIndex ? completed : value,
            ),
          },
        },
      }
    }, options)

  /**
   * 対象アイドルの全ステージだけを全達成または未達成へ変更する
   * @param idolId 全ステージをまとめて更新するアイドルのID
   * @param completed 全達成はtrue、全未達成はfalse
   * @param options 中断・revision確認・画面反映待ちの設定。省略時は表示同期を待つ
   * @returns 保存後の記録・revision、または検証・保存・同期の失敗を返すPromise
   */
  const setIdolRoadStars = (idolId: string, completed: boolean, options: CommandOptions = {}) =>
    runUpdate((current) => {
      if (typeof completed !== 'boolean') return

      if (!data.IDOL_ACHIEVEMENTS.some((idol) => idol.id === idolId)) return
      return {
        ...current,
        idolRoad: {
          ...current.idolRoad,
          [idolId]: Object.fromEntries(
            Array.from({ length: constant.ROAD_STAGE_COUNT_PER_IDOL }, (_, index) => [
              String(index),
              Array.from({ length: constant.ROAD_STARS_PER_STAGE }, () => completed),
            ]),
          ),
        },
      }
    }, options)

  /**
   * Pアイドルの特訓や評価を連動させず、指定条件だけ更新する
   * @param cardId 収録PアイドルのカードID
   * @param achievementId カード内で独立して記録する達成条件
   * @param completed 指定した条件を達成にする場合はtrue
   * @param options 中断・revision確認・画面反映待ちの設定。省略時は表示同期を待つ
   * @returns 保存後の記録・revision、または検証・保存・同期の失敗を返すPromise
   */
  const setPIdolCardAchievement = (
    cardId: string,
    achievementId: PIdolCardAchievementId,
    completed: boolean,
    options: CommandOptions = {},
  ) =>
    runUpdate((current) => {
      if (typeof completed !== 'boolean') return

      if (!data.P_IDOLS.some((card) => card.id === cardId)) return
      if (!data.P_IDOL_CARD_ACHIEVEMENTS.some((achievement) => achievement.id === achievementId)) return
      return {
        ...current,
        pIdolCards: {
          ...current.pIdolCards,
          [cardId]: { ...current.pIdolCards[cardId], [achievementId]: completed },
        },
      }
    }, options)

  /**
   * 目標PLvを設定可能な範囲へ収め、現在PLvは変更しない
   * @param value 目標PLv。1から設定可能な上限へ収める
   * @param options 中断・revision確認・画面反映待ちの設定。省略時は表示同期を待つ
   * @returns 保存後の記録・revision、または検証・保存・同期の失敗を返すPromise
   */
  const setTargetProducerLevel = (value: number, options: CommandOptions = {}) =>
    runUpdate((current) => {
      if (normalizeNonNegativeInteger(value) === undefined) return

      const targetLevel = Math.max(
        1,
        normalizeNonNegativeInteger(value, constant.PRODUCER_LEVEL_TARGET_MAX) ??
          constant.PRODUCER_LEVEL_DEFAULT_TARGET,
      )
      return {
        ...current,
        producerLevel: targetLevel,
      }
    }, options)

  /**
   * マスタ以外のEXPを補正値として独立して保存する
   * @param value 登録報酬以外の補正EXP。負数は累計から差し引く
   * @param options 中断・revision確認・画面反映待ちの設定。省略時は表示同期を待つ
   * @returns 保存後の記録・revision、または検証・保存・同期の失敗を返すPromise
   */
  const setOtherExp = (value: number, options: CommandOptions = {}) =>
    runUpdate((current) => {
      if (normalizeInteger(value) === undefined) return

      return { ...current, otherExp: normalizeInteger(value) ?? 0 }
    }, options)

  /**
   * アチーブメントの+/-ボタンの増減幅を保存する
   * @param value 1ずつ増減する場合はtrue
   * @param options 中断・revision確認・画面反映待ちの設定。省略時は表示同期を待つ
   * @returns 保存後の記録・revision、または検証・保存・同期の失敗を返すPromise
   */
  const setOneStepSpinner = (value: boolean, options: CommandOptions = {}) =>
    runUpdate((current) => {
      if (typeof value !== 'boolean') return
      return { ...current, oneStepSpinner: value }
    }, options)

  /**
   * 指定したPアイドル1枚の6項目だけを一括で更新する
   * @param cardId 全条件をまとめて更新するPアイドルのカードID
   * @param completed 全達成はtrue、全未達成はfalse
   * @param options 中断・revision確認・画面反映待ちの設定。省略時は表示同期を待つ
   * @returns 保存後の記録・revision、または検証・保存・同期の失敗を返すPromise
   */
  const setPIdolCardAchievements = (cardId: string, completed: boolean, options: CommandOptions = {}) =>
    runUpdate((current) => {
      if (typeof completed !== 'boolean') return

      if (!data.P_IDOLS.some((card) => card.id === cardId)) return
      const achievements = { ...current.pIdolCards[cardId] }
      for (const { id } of data.P_IDOL_CARD_ACHIEVEMENTS) achievements[id] = completed
      return { ...current, pIdolCards: { ...current.pIdolCards, [cardId]: achievements } }
    }, options)

  return {
    getSnapshot: state.getSnapshot,
    replace,
    setProductionValue,
    setIdolValue,
    setOtherTaskValue,
    setProductionRewardAdjustment,
    setIdolRoadStageStars,
    setIdolRoadStageStar,
    setIdolRoadStars,
    setPIdolCardAchievement,
    setTargetProducerLevel,
    setOtherExp,
    setOneStepSpinner,
    setPIdolCardAchievements,
  }
}

/** 達成記録の保存・更新・スナップショット取得を公開するcommand */
export type AchievementCalculatorCommand = ReturnType<typeof createAchievementCalculatorCommand>

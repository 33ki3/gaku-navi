/** 表示ページに依存せず公開するアチーブ計算機ツール。UIと同じcommand・queryだけを経由する */
import type { AchievementCalculatorCommand } from '../../application/command/achievementCalculatorCommand'
import type { CommandOptions } from '../../application/command/ports'
import { calculateAchievementSummary } from '../../application/query/achievementCalculatorQuery'
import * as constant from '../../constant'
import * as data from '../../data'
import i18n from '../../i18n'
import type { AchievementCalculatorProgress } from '../../types/achievementCalculator'
import { getIdolAchievementMilestones } from '../../utils/achievementCalculator'
import type { WebMcpToolFactoryContext } from '../context'
import { createCommandToolError } from '../context'
import * as webMcp from '../enums'
import { parseAchievementCommand, parseAchievementReadOptions } from '../input'
import { achievementReadSchema, achievementUpdateSchema, readOnlyAnnotations, updateAnnotations } from '../schemas'
import type { WebMcpAchievementCommand, WebMcpRuntime, WebMcpToolDefinition } from '../types'

/**
 * 検証済みの更新値をUIと同じcommandへ接続する
 * @param commands アプリ全体のcommand群に接続された達成記録の更新操作
 * @param input 操作種別ごとの検証済み入力
 * @param options 中断通知と、更新前に一致を求めるrevision
 * @returns 保存と表示同期の結果を返すPromise
 */
function executeUpdate(
  commands: AchievementCalculatorCommand,
  input: WebMcpAchievementCommand,
  options: CommandOptions,
) {
  switch (input.action) {
    case webMcp.AchievementUpdateAction.Production:
      return commands.setProductionValue(input.trackerId, input.value, options)
    case webMcp.AchievementUpdateAction.Idol:
      return commands.setIdolValue(input.idolId, input.metric, input.value, options)
    case webMcp.AchievementUpdateAction.PIdol:
      return commands.setPIdolCardAchievement(input.cardId, input.achievementId, input.completed, options)
    case webMcp.AchievementUpdateAction.PIdolAll:
      return commands.setPIdolCardAchievements(input.cardId, input.completed, options)
    case webMcp.AchievementUpdateAction.RoadStar:
      return commands.setIdolRoadStageStar(input.idolId, input.stageIndex, input.starIndex, input.completed, options)
    case webMcp.AchievementUpdateAction.RoadAll:
      return commands.setIdolRoadStars(input.idolId, input.completed, options)
    case webMcp.AchievementUpdateAction.OtherTask:
      return commands.setOtherTaskValue(input.trackerId, input.value, options)
    case webMcp.AchievementUpdateAction.ProductionReward:
      return commands.setProductionRewardAdjustment(input.adjustmentId, input.value, options)
    case webMcp.AchievementUpdateAction.TargetLevel:
      return commands.setTargetProducerLevel(input.value, options)
    case webMcp.AchievementUpdateAction.OtherExp:
      return commands.setOtherExp(input.value, options)
  }
}

/**
 * commandの入力値と保存後の値が異なる場合に備え、応答を実際の記録に合わせる
 * @param command 検証済みの更新操作
 * @param progress 更新後に保存される正規化済みの達成記録
 * @returns 保存値を反映した更新操作
 */
function getAppliedAchievementCommand(
  command: WebMcpAchievementCommand,
  progress: AchievementCalculatorProgress,
): WebMcpAchievementCommand {
  switch (command.action) {
    case webMcp.AchievementUpdateAction.Production:
      return { ...command, value: progress.production[command.trackerId] }
    case webMcp.AchievementUpdateAction.Idol:
      return { ...command, value: progress.idols[command.idolId][command.metric] }
    case webMcp.AchievementUpdateAction.OtherTask:
      return { ...command, value: progress.otherTasks[command.trackerId] }
    case webMcp.AchievementUpdateAction.ProductionReward:
      return { ...command, value: progress.productionRewardAdjustments[command.adjustmentId] }
    case webMcp.AchievementUpdateAction.TargetLevel:
      return { ...command, value: progress.producerLevel }
    case webMcp.AchievementUpdateAction.OtherExp:
      return { ...command, value: progress.otherExp }
    default:
      // boolean操作は入力値をそのまま保存するため、command全体を維持する
      return command
  }
}

/**
 * 読み取りだけの対象指定も、未定義の項目や存在しないIDを拒否する
 * @param runtime 読み取り対象の省略時に使う選択アイドルを持つ接続先
 * @param input 外部から受け取った読み取りオプション
 * @returns 収録されている対象ID。不正な入力や対象の場合はnull
 */
function getReadId(runtime: WebMcpRuntime, input: unknown) {
  const options = parseAchievementReadOptions(input)
  if (!options) return null
  const id = options.idolId ?? runtime.getSelectedAchievementIdolId()
  return data.IDOL_ACHIEVEMENTS.some((idol) => idol.id === id) ? id : null
}

/**
 * 共通の実行contextから達成記録の読み取り・更新ツールを組み立てる
 * @param context 最新runtime・エラー・Undoを共有するアプリ全体の窓口
 * @returns 達成記録の読み取り・更新ツール定義
 */
export function createAchievementTools(context: WebMcpToolFactoryContext): WebMcpToolDefinition[] {
  // 実行時点の最新の達成記録接続を取得する
  const getRuntime = context.getRuntime
  // 不正な公開入力を、他のWebMCPツールと同じエラー形式で返す
  const invalidInput = () =>
    context.createToolError(webMcp.WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.achievement_invalid'))
  return [
    {
      name: webMcp.WebMcpToolName.GetAchievementCatalog,
      title: i18n.t('webmcp.tools.get_achievement_catalog.title'),
      description: i18n.t('webmcp.tools.get_achievement_catalog.description'),
      inputSchema: achievementReadSchema,
      annotations: readOnlyAnnotations,
      execute: (input) => {
        const id = getReadId(getRuntime(), input)
        if (!id) return invalidInput()
        const idol = data.IDOL_ACHIEVEMENTS.find((entry) => entry.id === id)
        return {
          [webMcp.WebMcpSchemaField.IdolId]: id,
          idols: data.IDOL_ACHIEVEMENTS.map((entry) => ({ id: entry.id, name: i18n.t(entry.nameKey) })),
          production: data.PRODUCTION_ACHIEVEMENTS.map((entry) => ({
            id: entry.id,
            title: i18n.t(entry.titleKey),
            milestones: entry.milestones,
          })),
          idol: idol?.trackers.map((entry) => ({
            metric: entry.metric,
            title: i18n.t(entry.titleKey),
            milestones: getIdolAchievementMilestones(entry),
          })),
          p_idol_cards: data.P_IDOLS.filter((entry) => entry.idolId === id),
          p_idol_conditions: data.P_IDOL_CARD_ACHIEVEMENTS.map((entry) => ({
            id: entry.id,
            title: i18n.t(entry.titleKey),
            exp: entry.exp,
          })),
          road: {
            stage_count: constant.ROAD_STAGE_COUNT_PER_IDOL,
            stars_per_stage: constant.ROAD_STARS_PER_STAGE,
            milestones: data.IDOL_ROAD_REWARD_MILESTONES,
          },
          other_tasks: data.OTHER_EXPERIENCE_TRACKERS.map((entry) => ({
            id: entry.id,
            title: i18n.t(entry.titleKey),
            milestones: entry.milestones,
          })),
          production_rewards: data.PRODUCTION_RUN_REWARD_ADJUSTMENTS,
        }
      },
    },
    {
      name: webMcp.WebMcpToolName.GetAchievementState,
      title: i18n.t('webmcp.tools.get_achievement_state.title'),
      description: i18n.t('webmcp.tools.get_achievement_state.description'),
      inputSchema: achievementReadSchema,
      annotations: readOnlyAnnotations,
      execute: (input) => {
        const runtime = getRuntime()
        const id = getReadId(runtime, input)
        if (!id) return invalidInput()

        const snapshot = runtime.getAchievementSnapshot()
        const summary = runtime.getAchievementSummary(id).value
        const cardIds = new Set(data.P_IDOLS.filter((card) => card.idolId === id).map(({ id: cardId }) => cardId))
        const idolAchievementEarnedExp = summary.idolProgress.reduce((total, item) => total + item.earnedExp, 0)
        const idolAchievementTotalExp = summary.idolProgress.reduce((total, item) => total + item.totalExp, 0)
        // 共通入力は残し、アイドル別の入力値と詳細集計は要求対象だけに絞る
        return {
          ...snapshot,
          value: {
            ...snapshot.value,
            idols: { [id]: snapshot.value.idols[id] },
            idolRoad: { [id]: snapshot.value.idolRoad[id] },
            pIdolCards: Object.fromEntries(
              Object.entries(snapshot.value.pIdolCards).filter(([cardId]) => cardIds.has(cardId)),
            ),
          },
          summary: {
            totalEarnedExp: summary.totalEarnedExp,
            totalAvailableExp: summary.totalAvailableExp,
            targetLevel: snapshot.value.producerLevel,
            currentProducerLevel: summary.currentProducerLevel,
            levelProgress: summary.levelProgress,
            production: {
              achievements: {
                earnedExp: summary.productionSummary.earnedExp,
                totalExp: summary.productionSummary.totalExp,
              },
              runs: {
                count: summary.productionRunCount,
                baseExp: summary.productionRunBaseExp,
                deductionExp: summary.productionRunExpDeduction,
                earnedExp: summary.productionRunEarnedExp,
                adjustmentCount: summary.productionRewardAdjustmentCount,
                isAdjustmentValid: summary.productionRewardAdjustmentIsValid,
              },
            },
            idols: {
              earnedExp: idolAchievementEarnedExp + summary.pIdolCardEarnedExp,
              totalExp: idolAchievementTotalExp + data.P_IDOLS.length * summary.pIdolCardTotalExp,
              selected: {
                idolId: id,
                trueEnd: {
                  earnedExp: summary.selectedTrueEndProgress.earnedExp,
                  totalExp: summary.selectedTrueEndProgress.totalExp,
                },
                basic: {
                  earnedExp: summary.selectedBasicEarnedExp,
                  totalExp: summary.selectedBasicTotalExp,
                },
                pIdol: {
                  earnedExp: summary.selectedPIdolEarnedExp,
                  totalExp: summary.selectedPIdolTotalExp,
                },
              },
            },
            idolRoad: {
              totalStars: summary.totalStars,
              earnedExp: summary.roadProgress.earnedExp,
              totalExp: summary.roadProgress.totalExp,
            },
            otherTasks: {
              earnedExp: summary.otherExperienceSummary.earnedExp,
              totalExp: summary.otherExperienceSummary.totalExp,
            },
          },
        }
      },
    },
    {
      name: webMcp.WebMcpToolName.UpdateAchievementProgress,
      title: i18n.t('webmcp.tools.update_achievement_progress.title'),
      description: i18n.t('webmcp.tools.update_achievement_progress.description'),
      inputSchema: achievementUpdateSchema,
      annotations: updateAnnotations,
      execute: async (input, executionOptions) => {
        const command = parseAchievementCommand(input)
        const runtime = getRuntime()
        if (!command) return invalidInput()
        const commands = runtime.applicationCommands?.achievement
        if (!commands)
          return context.createToolError(
            webMcp.WebMcpErrorCode.Unsupported,
            i18n.t('webmcp.messages.achievement_update_failed'),
          )
        const before = runtime.getAchievementSnapshot()
        const pending = executeUpdate(commands, command, {
          signal: executionOptions?.signal,
          expectedRevision: command.expectedRevision,
        })
        const result = await pending
        if (!result.ok) return createCommandToolError(result, i18n.t('webmcp.messages.achievement_update_failed'))
        // 他の保存ツールと同じUndo窓口へ接続し、更新後に別操作が入った記録は巻き戻さない
        context.setUndoOperation({
          description: i18n.t('webmcp.tools.update_achievement_progress.title'),
          canUndo: () => runtime.getAchievementSnapshot().revision === result.revision,
          undo: async () => (await commands.replace(before.value, { expectedRevision: result.revision })).ok,
          isRestored: () => runtime.getAchievementSnapshot().digest === before.digest,
        })
        // 保存結果には全達成記録が含まれるため、WebMCPには変更差分と小さなPLv集計だけを返す
        const summary = calculateAchievementSummary(result.value, runtime.getSelectedAchievementIdolId())
        return {
          applied: true,
          changed: result.changed,
          updated: getAppliedAchievementCommand(command, result.value),
          revision: result.revision,
          digest: result.digest,
          summary: {
            totalEarnedExp: summary.totalEarnedExp,
            totalAvailableExp: summary.totalAvailableExp,
            producerLevel: summary.currentProducerLevel.currentLevel,
            expToNextLevel: summary.currentProducerLevel.remainingExpToNextLevel,
            targetLevel: result.value.producerLevel,
            expToTargetLevel: summary.levelProgress.expToTargetLevel,
          },
        }
      },
    },
  ]
}

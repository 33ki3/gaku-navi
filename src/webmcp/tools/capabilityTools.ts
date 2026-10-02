/** 計算条件の動的な選択肢を取得するWebMCPツール */
import * as constant from '../../constant'
import * as data from '../../data'
import i18n from '../../i18n'
import * as enums from '../../types/enums'
import { isActionId } from '../../utils/domainValueValidation'
import { getProvidedActions } from '../../utils/supportSynergy'
import { isEnumValue } from '../../utils/valueValidation'
import type { WebMcpToolFactoryContext } from '../context'
import { asInputRecord } from '../context'
import { readOnlyAnnotations } from '../schemas'
import type { WebMcpToolDefinition } from '../types'
import { WebMcpCapabilitySection, WebMcpErrorCode, WebMcpSchemaField, WebMcpToolName } from '../types'

/** capability取得APIで選択できる計算条件の区分 */
const capabilitySections = Object.values(WebMcpCapabilitySection)
// capabilityで公開するシナリオを明示し、未対応の選択肢を外部へ出さない
const supportedScenarios: ReadonlySet<enums.ScenarioType> = new Set([
  enums.ScenarioType.Hajime,
  enums.ScenarioType.Hif,
  enums.ScenarioType.Custom,
])

/**
 * 計算画面が対応するシナリオ・難易度の組み合わせか判定する
 *
 * @param scenario - 判定対象のシナリオ
 * @param difficulty - 判定対象の難易度
 * @returns 計算画面で扱える組み合わせの場合はtrue
 */
function isSupportedScheduleConfiguration(scenario: enums.ScenarioType, difficulty: enums.DifficultyType): boolean {
  return (
    (scenario === enums.ScenarioType.Hajime && difficulty === enums.DifficultyType.Legend) ||
    ((scenario === enums.ScenarioType.Hif || scenario === enums.ScenarioType.Custom) &&
      difficulty === enums.DifficultyType.None)
  )
}

/**
 * 指定または現在のシナリオで各週に指定できる活動だけを返す
 *
 * @param context - 現在の計算状態とエラー生成を含む共通の操作情報
 * @param input - 対応機能の取得条件
 * @returns schedule capabilityまたは入力エラー
 */
function createScheduleCapabilities(context: WebMcpToolFactoryContext, input: Record<string, unknown>) {
  const current = context.getRuntime().getCalculationSnapshot().scoreSettings
  const scenarioValue = input.scenario ?? current.scenario
  const difficultyValue = input.difficulty ?? current.difficulty
  const hifLessonSplitSubValue = input.hifLessonSplitSub ?? current.hifLessonSplitSub
  const scenario = isEnumValue(scenarioValue, enums.ScenarioType) ? scenarioValue : null
  const difficulty = isEnumValue(difficultyValue, enums.DifficultyType) ? difficultyValue : null
  const hifLessonSplitSub = typeof hifLessonSplitSubValue === 'boolean' ? hifLessonSplitSubValue : null
  if (
    scenario === null ||
    difficulty === null ||
    !supportedScenarios.has(scenario) ||
    hifLessonSplitSub === null ||
    !isSupportedScheduleConfiguration(scenario, difficulty)
  ) {
    return context.createToolError(
      WebMcpErrorCode.InvalidInput,
      i18n.t('webmcp.messages.invalid_schedule_configuration'),
    )
  }

  const activityIds = Object.values(enums.ActivityIdType)
  const weeks = data.getScheduleData(scenario, difficulty).map((week) => ({
    week: week.week,
    fixed: week.fixed,
    activityIds: activityIds.filter((activityId) =>
      data.isScheduleActivityAllowed(week, activityId, scenario, hifLessonSplitSub),
    ),
  }))

  return {
    section: WebMcpCapabilitySection.Schedule,
    scenario,
    difficulty,
    hifLessonSplitSub,
    useScheduleLimits: current.useScheduleLimits,
    weeks,
  }
}

/**
 * 指定カードの回数調整フォームに実際に現れるIDだけを返す
 *
 * @param context - 現在の計算状態とエラー生成を含む共通の操作情報
 * @param cardName - capabilityを取得するカード名
 * @returns 回数調整 capabilityまたはカード未検出エラー
 */
function createCardCountCapabilities(context: WebMcpToolFactoryContext, cardName: string) {
  const snapshot = context.getRuntime().getCalculationSnapshot()
  const card = snapshot.cardByName.get(cardName)
  if (!card) {
    return context.createToolError(WebMcpErrorCode.NotFound, i18n.t('webmcp.messages.card_not_found', { cardName }))
  }

  const visibleScoreActionIds = new Set(data.ActionCategoryList.map(({ id }) => id))
  const selfTriggerActionIds = Object.keys(getProvidedActions(card)).filter(
    (actionId) => isActionId(actionId) && visibleScoreActionIds.has(actionId),
  )
  const pItemActionId = card.p_item?.boost ? data.TriggerActionMap[card.p_item.boost.trigger_key] : undefined

  return {
    section: WebMcpCapabilitySection.CardCountCustom,
    cardName,
    selfTriggerActionIds,
    pItemCount:
      pItemActionId === undefined
        ? null
        : {
            actionId: pItemActionId,
            max: card.p_item?.boost?.max_count ?? constant.ACTION_COUNT_MAX,
          },
    // 自動カウントとPアイテム回数に共通する入力範囲
    // 特定の能力やアクションだけの回数ではない
    countRange: { min: 0, max: constant.ACTION_COUNT_MAX, integer: true },
  }
}

/**
 * 軽量な定義から省いた計算パラメータ一覧を必要時だけ取得するツールを返す
 *
 * @param context - 現在の計算状態とエラー生成を含む共通の操作情報
 * @returns 計算条件の選択肢を取得するWebMCPツール定義
 */
export function createCapabilityTools(context: WebMcpToolFactoryContext): WebMcpToolDefinition[] {
  return [
    {
      name: WebMcpToolName.GetCalculationCapabilities,
      title: i18n.t('webmcp.tools.get_calculation_capabilities.title'),
      description: i18n.t('webmcp.tools.get_calculation_capabilities.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.Section]: { type: 'string', enum: capabilitySections },
          [WebMcpSchemaField.CardName]: { type: 'string', description: i18n.t('webmcp.schema.capability_card_name') },
          [WebMcpSchemaField.Scenario]: { type: 'string', enum: [...supportedScenarios] },
          [WebMcpSchemaField.Difficulty]: { type: 'string', enum: Object.values(enums.DifficultyType) },
          [WebMcpSchemaField.HifLessonSplitSub]: { type: 'boolean' },
        },
        required: [WebMcpSchemaField.Section],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (rawInput) => {
        const input = asInputRecord(rawInput)
        if (input === null) {
          return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.invalid_section'))
        }
        const section = isEnumValue(input.section, WebMcpCapabilitySection) ? input.section : null
        if (section === null) {
          return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.invalid_section'))
        }

        if (section === WebMcpCapabilitySection.Score) {
          return {
            section,
            actionIds: data.ActionCategoryList.map(({ id }) => id),
            scheduleControlledActionIds: [...data.ScheduleControlledIds],
            scenarios: {
              [enums.ScenarioType.Hajime]: [enums.DifficultyType.Legend],
              [enums.ScenarioType.Hif]: [enums.DifficultyType.None],
              [enums.ScenarioType.Custom]: [enums.DifficultyType.None],
            },
            uncapValues: Object.values(enums.UncapType),
            actionCount: { min: 0, max: constant.ACTION_COUNT_MAX, integer: true },
            hifExamRatioRows: 3,
          }
        }
        if (section === WebMcpCapabilitySection.Unit) {
          return {
            section,
            plans: Object.values(enums.PlanType),
            cardTypes: Object.values(enums.CardType),
            parameterTypes: Object.values(enums.ParameterType),
            limits: {
              unitSize: constant.UNIT_SIZE,
              spTotalMax: constant.SP_TOTAL_MAX,
              initialParameter: { min: 0, max: constant.INITIAL_PARAMETER_MAX, integer: true },
              parameterBonusPercent: {
                min: 0,
                max: constant.PARAMETER_BONUS_PERCENT_MAX,
                step: constant.PARAMETER_BONUS_PERCENT_STEP,
              },
              parameterCap: { min: constant.PARAM_CAP_MIN, max: constant.INITIAL_PARAMETER_MAX, integer: true },
              candidateLimit: { min: constant.CANDIDATE_LIMIT_MIN, max: constant.CANDIDATE_LIMIT_MAX, integer: true },
            },
          }
        }
        if (section === WebMcpCapabilitySection.Schedule) {
          return createScheduleCapabilities(context, input)
        }

        if (typeof input.cardName !== 'string' || input.cardName.trim() === '') {
          return context.createToolError(
            WebMcpErrorCode.InvalidInput,
            i18n.t('webmcp.messages.card_count_custom_card_name_required'),
          )
        }
        return createCardCountCapabilities(context, input.cardName)
      },
    },
  ]
}

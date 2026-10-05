/**
 * WebMCP入力の検証と計算用データへの変換
 *
 * 外部入力を計算・保存処理の型へ変換する前に、選択肢・範囲・構造を検証する
 */
import * as constant from '../constant'
import * as data from '../data'
import type { ExportKey } from '../data/ui'
import type { AppPreferences, PersistedFilterState } from '../types/app'
import type { CalculationVariantPatch, ScoreSettingsVariantPatch, UnitSettingsVariantPatch } from '../types/calculation'
import type { CardCountCustom, CardCustomData, ParameterValues, SupportCard } from '../types/card'
import * as enums from '../types/enums'
import { isActionId } from '../utils/domainValueValidation'
import { isUserSupportCardFormValue } from '../utils/userSupportCardValidation'
import { isEnumValue, isFiniteNumber, isRecord } from '../utils/valueValidation'
import * as webMcpConstant from './constants'
import { asInputRecord } from './context'
import { achievementActionProperties } from './schemas'
import type {
  WebMcpAchievementCommand,
  WebMcpCardDetailSectionType,
  WebMcpCurrentAppStateOptions,
  WebMcpCurrentAppStateSectionType,
  WebMcpPageOptions,
} from './types'
import * as webMcp from './types'

/**
 * オブジェクトに未定義の項目が含まれないことを確認する
 *
 * @param input - 検証対象の入力オブジェクト
 * @param allowedKeys - 受け付けるキー
 * @returns すべてのキーが定義済みならtrue
 */
function hasOnlyKeys(input: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  const allowed = new Set(allowedKeys)
  return Object.keys(input).every((key) => allowed.has(key))
}

/**
 * 定義済みの選択肢を検証して型付きで返す
 *
 * @param value - 検証対象の値
 * @param enumValues - 受け付ける選択肢の一覧
 * @returns 型付きの選択肢、不正な場合はnull
 */
function parseEnumValue<T extends Readonly<Record<string, string | number>>>(
  value: unknown,
  enumValues: T,
): T[keyof T] | null {
  // 実行時の選択肢も確認し、型情報だけでは防げない外部入力を拒否する
  return isEnumValue(value, enumValues) ? value : null
}

/**
 * 定義済みの選択肢の配列を検証して型付きで返す
 *
 * @param value - 検証対象の配列
 * @param enumValues - 受け付ける選択肢の一覧
 * @returns 型付きの選択肢配列、不正な場合はnull
 */
function parseEnumArray<T extends Readonly<Record<string, string | number>>>(
  value: unknown,
  enumValues: T,
): T[keyof T][] | null {
  if (!Array.isArray(value)) return null
  // 配列は新しく作り、呼び出し元が後から配列を変更してもツールへ渡す値が変わらないようにする
  const result: T[keyof T][] = []
  for (const item of value) {
    const parsed = parseEnumValue(item, enumValues)
    if (parsed === null) return null
    result.push(parsed)
  }
  return result
}

/**
 * Vo・Da・Viの数値オブジェクトを検証してコピーする
 *
 * @param value - 検証対象の値
 * @returns コピーしたパラメータ値、不正な場合はnull
 */
function parseParameterValues(value: unknown): ParameterValues | null {
  if (!isRecord(value)) return null
  // 設定schemaと同じくVo/Da/Vi以外のキーも拒否し、誤記を部分的に無視しない
  if (!hasOnlyKeys(value, Object.values(enums.ParameterType))) return null
  if (!isFiniteNumber(value.vocal) || !isFiniteNumber(value.dance) || !isFiniteNumber(value.visual)) return null
  return { vocal: value.vocal, dance: value.dance, visual: value.visual }
}

/**
 * 点数設定のフォームと同じ非負整数のVo・Da・Vi入力を検証する
 *
 * @param value - 検証対象の値
 * @returns 非負整数のパラメータ値、不正な場合はnull
 */
function parseScoreParameterValues(value: unknown): ParameterValues | null {
  // 点数設定のフォームと同じく、負数・小数・Infinityを受け付けない
  const parsed = parseParameterValues(value)
  return parsed !== null && Object.values(parsed).every((item) => Number.isSafeInteger(item) && item >= 0)
    ? parsed
    : null
}

/**
 * 最適編成の数値フォームと同じ範囲・入力刻みのVo・Da・Vi入力を検証する
 *
 * @param value - 検証対象の値
 * @param min - 許可する最小値
 * @param max - 許可する最大値
 * @param step - 許可する入力刻み
 * @returns 範囲内のパラメータ値、不正な場合はnull
 */
function parseUnitParameterValues(value: unknown, min: number, max: number, step = 1): ParameterValues | null {
  // 最適編成フォームは項目ごとに上限と入力刻みが異なるため、呼び出し元から範囲を渡す
  const parsed = parseParameterValues(value)
  if (parsed === null) return null
  // Vo・Da・Viの各値が指定範囲内で、入力刻みの倍数か確認する
  const isValid = Object.values(parsed).every((item) => {
    const scaled = item / step
    return item >= min && item <= max && Math.abs(scaled - Math.round(scaled)) < 1e-9
  })
  return isValid ? parsed : null
}

/**
 * 文字列配列を検証してコピーする
 *
 * @param value - 検証対象の値
 * @returns 文字列配列のコピー。不正な場合はnull
 */
export function parseStringArray(value: unknown): string[] | null {
  // カード名配列などの参照値は、要素をすべて文字列として確認してからコピーする
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) return null
  return [...value]
}

/**
 * カード詳細の追加sectionを検証してコピーする
 *
 * @param value - カード詳細ツールの入力
 * @returns 検証済みsection配列。不正な場合はnull
 */
export function parseCardDetailSections(value: unknown): WebMcpCardDetailSectionType[] | null {
  const input = asInputRecord(value)
  if (input === null) return null
  const sectionsValue = input.sections
  if (sectionsValue === undefined) return []
  if (!Array.isArray(sectionsValue) || sectionsValue.length > Object.values(webMcp.WebMcpCardDetailSection).length)
    return null

  const sections: WebMcpCardDetailSectionType[] = []
  for (const section of sectionsValue) {
    const parsedSection = isEnumValue(section, webMcp.WebMcpCardDetailSection) ? section : null
    if (parsedSection === null || sections.includes(parsedSection)) return null
    sections.push(parsedSection)
  }
  return sections
}

/**
 * 保存可能なフィルター状態の差分を検証してコピーする
 *
 * @param value - フィルター差分の入力
 * @returns 検証済み差分。不正な場合はnull
 */
export function parseFilterStatePatch(value: unknown): Partial<PersistedFilterState> | null {
  const input = asInputRecord(value)
  if (input === null) return null
  // 保存項目と全解除の操作項目だけを受け付け、誤記による部分更新を防ぐ
  if (!hasOnlyKeys(input, [...Object.keys(constant.DEFAULT_FILTER_STATE), webMcp.WebMcpSchemaField.ClearFilters]))
    return null
  const patch: Partial<PersistedFilterState> = {}

  // 省略された項目は現在値を維持し、指定された項目だけを差分として組み立てる
  if (input.searchTerm !== undefined) {
    if (typeof input.searchTerm !== 'string') return null
    patch.searchTerm = input.searchTerm
  }
  if (input.rarities !== undefined) {
    // 配列は画面が持つ選択肢だけを許可する
    const rarities = parseEnumArray(input.rarities, enums.RarityType)
    if (rarities === null) return null
    patch.rarities = rarities
  }
  if (input.types !== undefined) {
    const types = parseEnumArray(input.types, enums.CardType)
    if (types === null) return null
    patch.types = types
  }
  if (input.plans !== undefined) {
    const plans = parseEnumArray(input.plans, enums.PlanType)
    if (plans === null) return null
    patch.plans = plans
  }
  if (input.spOnly !== undefined) {
    if (typeof input.spOnly !== 'boolean') return null
    patch.spOnly = input.spOnly
  }
  if (input.abilityKeywords !== undefined) {
    const abilityKeywords = parseEnumArray(input.abilityKeywords, enums.AbilityKeywordType)
    if (abilityKeywords === null) return null
    patch.abilityKeywords = abilityKeywords
  }
  if (input.eventFilters !== undefined) {
    const eventFilters = parseEnumArray(input.eventFilters, enums.EventFilterType)
    if (eventFilters === null) return null
    patch.eventFilters = eventFilters
  }
  if (input.sources !== undefined) {
    const sources = parseEnumArray(input.sources, enums.SourceType)
    if (sources === null) return null
    patch.sources = sources
  }
  if (input.uncaps !== undefined) {
    const uncaps = parseEnumArray(input.uncaps, enums.UncapType)
    if (uncaps === null) return null
    patch.uncaps = uncaps
  }
  if (input.countCustom !== undefined) {
    const countCustom = parseEnumArray(input.countCustom, enums.CountCustomFilter)
    if (countCustom === null) return null
    patch.countCustom = countCustom
  }
  if (input.cardExclusionFilters !== undefined) {
    const cardExclusionFilters = parseEnumArray(input.cardExclusionFilters, enums.CardExclusionFilterType)
    if (cardExclusionFilters === null) return null
    patch.cardExclusionFilters = cardExclusionFilters
  }
  if (input.sortMode !== undefined) {
    const sortMode = parseEnumValue(input.sortMode, enums.SortModeType)
    if (sortMode === null) return null
    patch.sortMode = sortMode
  }
  if (input.sortReverse !== undefined) {
    if (typeof input.sortReverse !== 'boolean') return null
    patch.sortReverse = input.sortReverse
  }

  return patch
}

/**
 * アプリ表示設定の差分を検証してコピーする
 *
 * @param value - 表示設定差分の入力
 * @returns 検証済み差分。不正な場合はnull
 */
export function parseAppPreferencesPatch(value: unknown): Partial<AppPreferences> | null {
  const input = asInputRecord(value)
  if (input === null) return null
  // 表示設定も既定値に定義されたキーだけを許可し、更新前に入力全体を検証する
  if (!hasOnlyKeys(input, Object.keys(constant.DEFAULT_APP_PREFERENCES))) return null
  const patch: Partial<AppPreferences> = {}
  if (input.showMobileBottomNav !== undefined) {
    if (typeof input.showMobileBottomNav !== 'boolean') return null
    patch.showMobileBottomNav = input.showMobileBottomNav
  }
  if (input.keepMobileBottomNavFixed !== undefined) {
    if (typeof input.keepMobileBottomNavFixed !== 'boolean') return null
    patch.keepMobileBottomNavFixed = input.keepMobileBottomNavFixed
  }
  return patch
}

/**
 * エクスポート対象キーを検証してコピーする
 *
 * @param value - エクスポート対象キーの入力
 * @returns 検証済みキーのコピー。不正な場合はnull
 */
export function parseExportKeys(value: unknown): ExportKey[] | null {
  // キーを自由入力にせず、アプリが実際に管理するエクスポート対象だけに限定する
  if (value === undefined) return [...data.EXPORT_KEYS]
  if (!Array.isArray(value)) return null
  const allowed = new Set<string>(data.EXPORT_KEYS)
  if (!value.every((key): key is ExportKey => typeof key === 'string' && allowed.has(key))) return null
  return [...value]
}

/**
 * ユーザー定義サポートを検証し、空の名前や範囲外の入力を拒否する
 *
 * @param value - ユーザー定義サポートの入力
 * @returns 検証済みサポート。不正な場合はnull
 */
export function parseUserSupportCard(value: unknown): SupportCard | null {
  // 公開入力の簡易定義だけでは確認しきれない項目も、画面のフォームと同じ規則で検証する
  return isUserSupportCardFormValue(value) ? value : null
}

/**
 * 文字列またはnullの配列を検証してコピーする
 *
 * @param value - 検証対象の値
 * @returns コピーした配列、不正な場合はnull
 */
function parseNullableStringArray(value: unknown): (string | null)[] | null {
  // 手動編成の空き枠(null)を保持しつつ、カード名部分だけを文字列に限定する
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' || item === null)) return null
  return [...value]
}

/**
 * アクション識別子をキーにした回数オブジェクトを検証してコピーする
 *
 * @param value - 検証対象の値
 * @returns 検証済み回数、不正な場合はnull
 */
function parseActionCounts(value: unknown): Partial<Record<enums.ActionIdType, number>> | null {
  if (!isRecord(value)) return null
  const result: Partial<Record<enums.ActionIdType, number>> = {}
  for (const [actionId, count] of Object.entries(value)) {
    // キーと回数を同時に検証し、未知のアクションや過大な回数を計算へ渡さない
    const parsedActionId = parseEnumValue(actionId, enums.ActionIdType)
    if (
      parsedActionId === null ||
      !isFiniteNumber(count) ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      count > constant.ACTION_COUNT_MAX
    ) {
      return null
    }
    result[parsedActionId] = count
  }
  return result
}

/**
 * 点数設定フォームに表示されるアクション回数だけを検証してコピーする
 *
 * @param value - 検証対象の値
 * @returns 検証済み回数、不正な場合はnull
 */
function parseScoreActionCounts(value: unknown): Partial<Record<enums.ActionIdType, number>> | null {
  const parsed = parseActionCounts(value)
  if (parsed === null) return null

  const visibleActionIds = new Set(data.ActionCategoryList.map(({ id }) => id))
  // 点数設定フォームに表示されないアクションは、外部入力でも指定できないようにする
  return Object.keys(parsed).every((actionId) => isActionId(actionId) && visibleActionIds.has(actionId)) ? parsed : null
}

/**
 * 週番号をキーにした活動選択を検証してコピーする
 *
 * @param value - 検証対象の値
 * @returns 検証済みスケジュール選択、不正な場合はnull
 */
function parseScheduleSelections(value: unknown): Record<number, enums.ActivityIdType> | null {
  if (!isRecord(value)) return null
  const result: Record<number, enums.ActivityIdType> = {}
  for (const [week, activityId] of Object.entries(value)) {
    // ここでは週番号と活動IDの型だけを確認し、シナリオ別の候補判定は設定全体の検証で行う
    const weekNumber = Number(week)
    const parsedActivityId = parseEnumValue(activityId, enums.ActivityIdType)
    if (!Number.isSafeInteger(weekNumber) || weekNumber <= 0 || parsedActivityId === null) return null
    result[weekNumber] = parsedActivityId
  }
  return result
}

/**
 * サポート名をキーにした凸数差分を検証してコピーする
 *
 * @param value - 検証対象の値
 * @returns 検証済み凸数差分、不正な場合はnull
 */
function parseCardUncaps(value: unknown): Partial<Record<string, enums.UncapType>> | null {
  if (!isRecord(value)) return null
  const result: Partial<Record<string, enums.UncapType>> = {}
  for (const [cardName, uncap] of Object.entries(value)) {
    // カード名の存在確認は計算条件を参照できる段階で行い、ここでは凸数の選択肢だけを検証する
    const parsedUncap = parseEnumValue(uncap, enums.UncapType)
    if (parsedUncap === null) return null
    result[cardName] = parsedUncap
  }
  return result
}

/**
 * カード別回数調整を検証してコピーする
 *
 * @param value - 検証対象の値
 * @returns 検証済み回数調整、不正な場合はnull
 */
function parseCardCountCustom(value: unknown): CardCountCustom | null {
  if (!isRecord(value)) return null
  const result: CardCountCustom = {}
  for (const [cardName, rawCustom] of Object.entries(value)) {
    // カードごとの2種類の回数調整を独立して検証し、指定されていない方は保持しない
    if (
      !isRecord(rawCustom) ||
      !hasOnlyKeys(rawCustom, [webMcp.WebMcpSchemaField.SelfTrigger, webMcp.WebMcpSchemaField.PItemCount])
    )
      return null
    const custom: CardCustomData = {}
    if (rawCustom.selfTrigger !== undefined) {
      const selfTrigger = parseActionCounts(rawCustom.selfTrigger)
      if (selfTrigger === null) return null
      custom.selfTrigger = selfTrigger
    }
    if (rawCustom.pItemCount !== undefined) {
      const pItemCount = parseActionCounts(rawCustom.pItemCount)
      if (pItemCount === null) return null
      custom.pItemCount = pItemCount
    }
    result[cardName] = custom
  }
  return result
}

/**
 * 点数設定の一時変更を検証して計算用の型へ変換する
 *
 * @param value - 検証対象の一時変更
 * @returns 検証済み点数設定の差分、不正な場合はnull
 */
function parseScoreSettingsPatch(value: unknown): ScoreSettingsVariantPatch | null {
  const input = asInputRecord(value)
  if (
    input === null ||
    !hasOnlyKeys(input, [
      webMcp.WebMcpSchemaField.Scenario,
      webMcp.WebMcpSchemaField.Difficulty,
      webMcp.WebMcpSchemaField.ParameterBonusBase,
      webMcp.WebMcpSchemaField.ActionCounts,
      webMcp.WebMcpSchemaField.ScheduleSelections,
      webMcp.WebMcpSchemaField.UseScheduleLimits,
      webMcp.WebMcpSchemaField.IncludeSelfTrigger,
      webMcp.WebMcpSchemaField.IncludePItem,
      webMcp.WebMcpSchemaField.UseFixedUncap,
      webMcp.WebMcpSchemaField.UseCustomMode,
      webMcp.WebMcpSchemaField.CustomParamBonusRows,
      webMcp.WebMcpSchemaField.CustomClassBonus,
      webMcp.WebMcpSchemaField.CustomNonBonusGain,
      webMcp.WebMcpSchemaField.HifExamRatios,
      webMcp.WebMcpSchemaField.HifLessonSplitSub,
    ])
  )
    return null
  const patch: ScoreSettingsVariantPatch = {}

  // 画面の点数設定フォームに対応する項目だけを、一時変更の差分として取り出す
  if (input.scenario !== undefined) {
    const scenario = parseEnumValue(input.scenario, enums.ScenarioType)
    if (scenario === null) return null
    patch.scenario = scenario
  }
  if (input.difficulty !== undefined) {
    const difficulty = parseEnumValue(input.difficulty, enums.DifficultyType)
    if (difficulty === null) return null
    patch.difficulty = difficulty
  }
  if (input.parameterBonusBase !== undefined) {
    const parameterBonusBase = parseScoreParameterValues(input.parameterBonusBase)
    if (parameterBonusBase === null) return null
    patch.parameterBonusBase = parameterBonusBase
  }
  if (input.actionCounts !== undefined) {
    const actionCounts = parseScoreActionCounts(input.actionCounts)
    if (actionCounts === null) return null
    patch.actionCounts = actionCounts
  }
  if (input.scheduleSelections !== undefined) {
    const scheduleSelections = parseScheduleSelections(input.scheduleSelections)
    if (scheduleSelections === null) return null
    patch.scheduleSelections = scheduleSelections
  }

  if (input.useScheduleLimits !== undefined) {
    if (typeof input.useScheduleLimits !== 'boolean') return null
    patch.useScheduleLimits = input.useScheduleLimits
  }
  if (input.includeSelfTrigger !== undefined) {
    if (typeof input.includeSelfTrigger !== 'boolean') return null
    patch.includeSelfTrigger = input.includeSelfTrigger
  }
  if (input.includePItem !== undefined) {
    if (typeof input.includePItem !== 'boolean') return null
    patch.includePItem = input.includePItem
  }
  if (input.useFixedUncap !== undefined) {
    if (typeof input.useFixedUncap !== 'boolean') return null
    patch.useFixedUncap = input.useFixedUncap
  }
  if (input.useCustomMode !== undefined) {
    if (typeof input.useCustomMode !== 'boolean') return null
    patch.useCustomMode = input.useCustomMode
  }
  if (input.hifLessonSplitSub !== undefined) {
    if (typeof input.hifLessonSplitSub !== 'boolean') return null
    patch.hifLessonSplitSub = input.hifLessonSplitSub
  }

  if (input.customParamBonusRows !== undefined) {
    // カスタム行は行単位でコピーし、後から入力オブジェクトを変更されても影響しないようにする
    if (!Array.isArray(input.customParamBonusRows)) return null
    const rows: ParameterValues[] = []
    for (const row of input.customParamBonusRows) {
      const parsedRow = parseScoreParameterValues(row)
      if (parsedRow === null) return null
      rows.push(parsedRow)
    }
    patch.customParamBonusRows = rows
  }
  if (input.customClassBonus !== undefined) {
    const customClassBonus = parseScoreParameterValues(input.customClassBonus)
    if (customClassBonus === null) return null
    patch.customClassBonus = customClassBonus
  }
  if (input.customNonBonusGain !== undefined) {
    const customNonBonusGain = parseScoreParameterValues(input.customNonBonusGain)
    if (customNonBonusGain === null) return null
    patch.customNonBonusGain = customNonBonusGain
  }
  if (input.hifExamRatios !== undefined) {
    // HIF試験比率は後段で3行固定も確認するが、ここでは配列要素の型を先に検証する
    if (!Array.isArray(input.hifExamRatios)) return null
    const ratios: ParameterValues[] = []
    for (const ratio of input.hifExamRatios) {
      const parsedRatio = parseScoreParameterValues(ratio)
      if (parsedRatio === null) return null
      ratios.push(parsedRatio)
    }
    patch.hifExamRatios = ratios
  }

  // 省略された項目は現在の設定を使うため、入力に含まれた項目だけを返す
  return patch
}

/**
 * 最適編成設定の一時変更を検証して計算用の型へ変換する
 *
 * @param value - 検証対象の一時変更
 * @returns 検証済み最適編成設定の差分、不正な場合はnull
 */
function parseUnitSettingsPatch(value: unknown): UnitSettingsVariantPatch | null {
  const input = asInputRecord(value)
  if (
    input === null ||
    !hasOnlyKeys(input, [
      webMcp.WebMcpSchemaField.Plan,
      webMcp.WebMcpSchemaField.AllowedTypes,
      webMcp.WebMcpSchemaField.SpConstraint,
      webMcp.WebMcpSchemaField.TypeCountMin,
      webMcp.WebMcpSchemaField.TypeCountMax,
      webMcp.WebMcpSchemaField.ParamBonusPercent,
      webMcp.WebMcpSchemaField.RentalCardName,
      webMcp.WebMcpSchemaField.LockedCards,
      webMcp.WebMcpSchemaField.SelectedCards,
      webMcp.WebMcpSchemaField.ExcludedCardNames,
      webMcp.WebMcpSchemaField.InitialParams,
      webMcp.WebMcpSchemaField.ParamCapOverride,
      webMcp.WebMcpSchemaField.UnifyRentalLock,
      webMcp.WebMcpSchemaField.ExcludeContestSkillCards,
      webMcp.WebMcpSchemaField.ExcludeContestPItems,
      webMcp.WebMcpSchemaField.IgnoreCardExclusions,
      webMcp.WebMcpSchemaField.ExhaustiveCandidateLimit,
    ])
  )
    return null
  const patch: UnitSettingsVariantPatch = {}

  // 最適編成フォームの選択肢・数値・カード名を、一時変更として読み取る
  if (input.plan !== undefined) {
    const plan = parseEnumValue(input.plan, enums.PlanType)
    if (plan === null) return null
    patch.plan = plan
  }
  if (input.allowedTypes !== undefined) {
    const allowedTypes = parseEnumArray(input.allowedTypes, enums.CardType)
    if (allowedTypes === null) return null
    patch.allowedTypes = allowedTypes
  }

  if (input.spConstraint !== undefined) {
    const spConstraint = parseUnitParameterValues(input.spConstraint, 0, constant.SP_TOTAL_MAX)
    if (spConstraint === null) return null
    patch.spConstraint = spConstraint
  }
  if (input.typeCountMin !== undefined) {
    const typeCountMin = parseUnitParameterValues(input.typeCountMin, 0, constant.UNIT_SIZE)
    if (typeCountMin === null) return null
    patch.typeCountMin = typeCountMin
  }
  if (input.typeCountMax !== undefined) {
    const typeCountMax = parseUnitParameterValues(input.typeCountMax, 0, constant.UNIT_SIZE)
    if (typeCountMax === null) return null
    patch.typeCountMax = typeCountMax
  }
  if (input.paramBonusPercent !== undefined) {
    const paramBonusPercent = parseUnitParameterValues(
      input.paramBonusPercent,
      0,
      constant.PARAMETER_BONUS_PERCENT_MAX,
      constant.PARAMETER_BONUS_PERCENT_STEP,
    )
    if (paramBonusPercent === null) return null
    patch.paramBonusPercent = paramBonusPercent
  }
  if (input.initialParams !== undefined) {
    const initialParams = parseUnitParameterValues(input.initialParams, 0, constant.INITIAL_PARAMETER_MAX)
    if (initialParams === null) return null
    patch.initialParams = initialParams
  }

  if (input.unifyRentalLock !== undefined) {
    if (typeof input.unifyRentalLock !== 'boolean') return null
    patch.unifyRentalLock = input.unifyRentalLock
  }
  if (input.excludeContestSkillCards !== undefined) {
    if (typeof input.excludeContestSkillCards !== 'boolean') return null
    patch.excludeContestSkillCards = input.excludeContestSkillCards
  }
  if (input.excludeContestPItems !== undefined) {
    if (typeof input.excludeContestPItems !== 'boolean') return null
    patch.excludeContestPItems = input.excludeContestPItems
  }
  if (input.ignoreCardExclusions !== undefined) {
    if (typeof input.ignoreCardExclusions !== 'boolean') return null
    patch.ignoreCardExclusions = input.ignoreCardExclusions
  }

  if (input.rentalCardName !== undefined) {
    if (typeof input.rentalCardName !== 'string' && input.rentalCardName !== null) return null
    patch.rentalCardName = input.rentalCardName
  }
  if (input.lockedCards !== undefined) {
    const lockedCards = parseStringArray(input.lockedCards)
    if (lockedCards === null) return null
    patch.lockedCards = lockedCards
  }
  if (input.selectedCards !== undefined) {
    const selectedCards = parseNullableStringArray(input.selectedCards)
    if (selectedCards === null) return null
    patch.selectedCards = selectedCards
  }
  if (input.excludedCardNames !== undefined) {
    const excludedCardNames = parseStringArray(input.excludedCardNames)
    if (excludedCardNames === null) return null
    patch.excludedCardNames = excludedCardNames
  }
  if (input.paramCapOverride !== undefined) {
    if (
      input.paramCapOverride !== null &&
      (!isFiniteNumber(input.paramCapOverride) ||
        !Number.isSafeInteger(input.paramCapOverride) ||
        input.paramCapOverride < constant.PARAM_CAP_MIN ||
        input.paramCapOverride > constant.INITIAL_PARAMETER_MAX)
    ) {
      return null
    }
    patch.paramCapOverride = input.paramCapOverride
  }
  if (input.exhaustiveCandidateLimit !== undefined) {
    const exhaustiveCandidateLimit = input.exhaustiveCandidateLimit
    if (
      !isFiniteNumber(exhaustiveCandidateLimit) ||
      !Number.isSafeInteger(exhaustiveCandidateLimit) ||
      exhaustiveCandidateLimit < constant.CANDIDATE_LIMIT_MIN ||
      exhaustiveCandidateLimit > constant.CANDIDATE_LIMIT_MAX
    ) {
      return null
    }
    patch.exhaustiveCandidateLimit = exhaustiveCandidateLimit
  }

  // 省略された項目は現在の設定を使うため、入力に含まれた項目だけを返す
  return patch
}

/**
 * 計算条件の一時変更を検証して計算用の型へ変換する
 *
 * @param value - 計算条件の一時変更
 * @returns 検証済み計算条件差分。不正な場合はnull
 */
export function parseCalculationVariantPatch(value: unknown): CalculationVariantPatch | null {
  const input = asInputRecord(value)
  if (
    input === null ||
    !hasOnlyKeys(input, [
      webMcp.WebMcpSchemaField.ScoreSettings,
      webMcp.WebMcpSchemaField.UnitSettings,
      webMcp.WebMcpSchemaField.CardUncapAll,
      webMcp.WebMcpSchemaField.CardUncaps,
      webMcp.WebMcpSchemaField.CardCountCustom,
    ])
  )
    return null
  const patch: CalculationVariantPatch = {}

  // 点数設定・最適編成・凸数・回数調整を一つの計算条件へまとめる
  if (input.scoreSettings !== undefined) {
    const scoreSettings = parseScoreSettingsPatch(input.scoreSettings)
    if (scoreSettings === null) return null
    patch.scoreSettings = scoreSettings
  }
  if (input.unitSettings !== undefined) {
    const unitSettings = parseUnitSettingsPatch(input.unitSettings)
    if (unitSettings === null) return null
    patch.unitSettings = unitSettings
  }
  if (input.cardUncapAll !== undefined) {
    const cardUncapAll = parseEnumValue(input.cardUncapAll, enums.UncapType)
    if (cardUncapAll === null) return null
    patch.cardUncapAll = cardUncapAll
  }
  if (input.cardUncaps !== undefined) {
    const cardUncaps = parseCardUncaps(input.cardUncaps)
    if (cardUncaps === null) return null
    patch.cardUncaps = cardUncaps
  }
  if (input.cardCountCustom !== undefined) {
    const cardCountCustom = parseCardCountCustom(input.cardCountCustom)
    if (cardCountCustom === null) return null
    patch.cardCountCustom = cardCountCustom
  }

  // 指定されたカテゴリだけを返し、指定されていないカテゴリは現在値を維持する
  return patch
}

/**
 * 単体カード点数比較では点数へ影響しない最適編成設定を受け付けない
 *
 * @param value - カード点数比較条件の入力
 * @returns 検証済み計算条件差分。不正または最適編成設定を含む場合はnull
 */
export function parseSupportCardComparisonPatch(value: unknown): CalculationVariantPatch | null {
  const input = asInputRecord(value)
  if (input === null || input.unitSettings !== undefined) return null
  return parseCalculationVariantPatch(input)
}

/**
 * 検索結果の件数を検証する
 *
 * @param value - 件数の入力
 * @returns 検証済み件数。不正な場合はnull
 */
export function parseSearchLimit(value: unknown): number | null {
  // 結果が過大にならないよう、省略時の既定値と最大50件をここで固定する
  if (value === undefined) return webMcpConstant.WEB_MCP_DEFAULT_SEARCH_LIMIT
  if (
    !isFiniteNumber(value) ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > webMcpConstant.WEB_MCP_MAX_SEARCH_LIMIT
  )
    return null
  return value
}

/**
 * 検索結果の開始位置を検証する
 *
 * @param value - 開始位置の入力
 * @returns 検証済み開始位置。不正な場合はnull
 */
export function parseSearchOffset(value: unknown): number | null {
  // ページ移動は全件を一度に返さず、大きすぎる開始位置だけを拒否する
  if (value === undefined) return 0
  if (
    !isFiniteNumber(value) ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > webMcpConstant.WEB_MCP_MAX_PAGE_OFFSET
  )
    return null
  return value
}

/**
 * 状態取得のページ指定を検証して正規化する
 *
 * @param value - ページ指定の入力
 * @returns 正規化したページ指定、不正な場合はnull
 */
function parsePageOptions(value: unknown): WebMcpPageOptions | null {
  if (value === undefined) {
    // 指定がない場合は先頭から既定件数を返す
    return { offset: 0, limit: webMcpConstant.WEB_MCP_DEFAULT_PAGE_LIMIT }
  }
  if (!isRecord(value)) return null
  // 開始位置と取得件数を同じページ指定として確認し、負数や上限超過を拒否する
  const offset = parseSearchOffset(value.offset)
  const limit = value.limit === undefined ? webMcpConstant.WEB_MCP_DEFAULT_PAGE_LIMIT : value.limit
  if (
    offset === null ||
    !isFiniteNumber(limit) ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > webMcpConstant.WEB_MCP_MAX_PAGE_LIMIT
  )
    return null
  return { offset, limit }
}

/**
 * 現在状態ツールのセクションとページ指定を検証する
 *
 * @param value - 現在状態オプションの入力
 * @returns 検証済み現在状態オプション。不正な場合はnull
 */
export function parseCurrentAppStateOptions(value: unknown): WebMcpCurrentAppStateOptions | null {
  const input = asInputRecord(value)
  if (input === null) return null
  const sectionsValue = input.sections
  const sections: WebMcpCurrentAppStateSectionType[] = []
  if (sectionsValue !== undefined) {
    // 詳細セクションは重複を除き、上限を超える要求を拒否する
    if (!Array.isArray(sectionsValue) || sectionsValue.length > webMcpConstant.WEB_MCP_MAX_STATE_SECTIONS) return null
    for (const section of sectionsValue) {
      const parsedSection = isEnumValue(section, webMcp.WebMcpCurrentAppStateSection) ? section : null
      if (parsedSection === null) return null
      if (!sections.includes(parsedSection)) sections.push(parsedSection)
    }
  }
  // カード一覧とユーザー追加サポートのページ指定も同じ範囲で検証する
  const cardMap = parsePageOptions(input.cardMap)
  const userSupports = parsePageOptions(input.userSupports)
  if (cardMap === null || userSupports === null) return null
  return { sections, cardMap, userSupports }
}

/**
 * 読み取り対象の省略は許可し、指定されたIDと未知キーは検証する
 * @param value 外部から受け取った対象指定。未定義の項目は許可しない
 * @returns 検証済みのアイドル指定。不正な入力の場合はnull
 */
export function parseAchievementReadOptions(value: unknown): { idolId?: string } | null {
  const input = asInputRecord(value)
  if (!input || !hasOnlyKeys(input, [webMcp.WebMcpSchemaField.IdolId])) return null
  const idolId = input[webMcp.WebMcpSchemaField.IdolId]
  return idolId === undefined ? {} : isEnumValue(idolId, enums.IdolId) ? { idolId } : null
}

/**
 * schemaと同じ許可項目・型・範囲を確認し、公開キーをcommandの入力へ変換する
 * @param value 外部から受け取った操作種別・対象ID・更新値・任意のrevision
 * @returns 操作種別に対応した更新入力。不正なキー・型・範囲の場合はnull
 */
export function parseAchievementCommand(value: unknown): WebMcpAchievementCommand | null {
  const input = asInputRecord(value)
  if (!input) return null
  const action = input[webMcp.WebMcpSchemaField.Action]
  if (!isEnumValue(action, webMcp.AchievementUpdateAction)) return null
  const properties = achievementActionProperties[action]
  if (
    !hasOnlyKeys(input, [
      webMcp.WebMcpSchemaField.Action,
      webMcp.WebMcpSchemaField.ExpectedRevision,
      ...Object.keys(properties),
    ]) ||
    Object.keys(properties).some((key) => !Object.prototype.hasOwnProperty.call(input, key))
  )
    return null
  const expectedRevision = input[webMcp.WebMcpSchemaField.ExpectedRevision]
  if (expectedRevision !== undefined && (typeof expectedRevision !== 'string' || expectedRevision.length === 0))
    return null
  const revision = expectedRevision === undefined ? {} : { expectedRevision }
  const count = input[webMcp.WebMcpSchemaField.Value]
  const completed = input[webMcp.WebMcpSchemaField.Completed]
  const idolId = input[webMcp.WebMcpSchemaField.IdolId]
  const cardId = input[webMcp.WebMcpSchemaField.CardId]
  const trackerId = input[webMcp.WebMcpSchemaField.TrackerId]
  const metric = input[webMcp.WebMcpSchemaField.Metric]
  const achievementId = input[webMcp.WebMcpSchemaField.AchievementId]
  const adjustmentId = input[webMcp.WebMcpSchemaField.AdjustmentId]
  const stageIndex = input[webMcp.WebMcpSchemaField.StageIndex]
  const starIndex = input[webMcp.WebMcpSchemaField.StarIndex]
  switch (action) {
    case webMcp.AchievementUpdateAction.Production:
    case webMcp.AchievementUpdateAction.OtherTask:
      return typeof trackerId === 'string' &&
        trackerId.length > 0 &&
        typeof count === 'number' &&
        Number.isSafeInteger(count) &&
        count >= 0
        ? { action, trackerId, value: count, ...revision }
        : null
    case webMcp.AchievementUpdateAction.Idol:
      return isEnumValue(idolId, enums.IdolId) &&
        isEnumValue(metric, enums.IdolAchievementMetric) &&
        typeof count === 'number' &&
        Number.isSafeInteger(count) &&
        count >= 0
        ? { action, idolId, metric, value: count, ...revision }
        : null
    case webMcp.AchievementUpdateAction.PIdol:
      return typeof cardId === 'string' &&
        cardId.length > 0 &&
        isEnumValue(achievementId, enums.PIdolCardAchievementId) &&
        typeof completed === 'boolean'
        ? { action, cardId, achievementId, completed, ...revision }
        : null
    case webMcp.AchievementUpdateAction.PIdolAll:
      return typeof cardId === 'string' && cardId.length > 0 && typeof completed === 'boolean'
        ? { action, cardId, completed, ...revision }
        : null
    case webMcp.AchievementUpdateAction.RoadStar:
      return isEnumValue(idolId, enums.IdolId) &&
        typeof stageIndex === 'number' &&
        Number.isInteger(stageIndex) &&
        stageIndex >= 0 &&
        stageIndex < constant.ROAD_STAGE_COUNT_PER_IDOL &&
        typeof starIndex === 'number' &&
        Number.isInteger(starIndex) &&
        starIndex >= 0 &&
        starIndex < constant.ROAD_STARS_PER_STAGE &&
        typeof completed === 'boolean'
        ? { action, idolId, stageIndex, starIndex, completed, ...revision }
        : null
    case webMcp.AchievementUpdateAction.RoadAll:
      return isEnumValue(idolId, enums.IdolId) && typeof completed === 'boolean'
        ? { action, idolId, completed, ...revision }
        : null
    case webMcp.AchievementUpdateAction.ProductionReward:
      return isEnumValue(adjustmentId, enums.ProductionRunRewardAdjustmentId) &&
        typeof count === 'number' &&
        Number.isSafeInteger(count) &&
        count >= 0
        ? { action, adjustmentId, value: count, ...revision }
        : null
    case webMcp.AchievementUpdateAction.TargetLevel:
      return typeof count === 'number' &&
        Number.isSafeInteger(count) &&
        count >= 1 &&
        count <= constant.PRODUCER_LEVEL_TARGET_MAX
        ? { action, value: count, ...revision }
        : null
    case webMcp.AchievementUpdateAction.OtherExp:
      return typeof count === 'number' && Number.isSafeInteger(count) ? { action, value: count, ...revision } : null
  }
}

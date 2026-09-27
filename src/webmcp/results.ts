/**
 * WebMCPの検索結果・計算結果・現在状態を公開形式へ変換する
 *
 * アプリのカード・計算モデルから必要な項目だけを取り出し、
 * ページ情報を付ける
 */
import * as constant from '../constant'
import type { CalculationSnapshot } from '../types/calculation'
import type {
  CardAbilityBoost,
  CardCalculationResult,
  CardCountCustom,
  ScoreSettings,
  SupportCard,
} from '../types/card'
import * as enums from '../types/enums'
import type { UnitResult, UnitSimulatorSettings } from '../types/unit'
import { calculateCardWithSettings } from '../utils/calculator/calculateCardScores'
import { isRecord } from '../utils/valueValidation'
import * as webMcpConstant from './constants'
import type {
  WebMcpAbilityDetail,
  WebMcpCalculationState,
  WebMcpCardCountCustom,
  WebMcpCardDetail,
  WebMcpCardSummary,
  WebMcpCurrentAppState,
  WebMcpCurrentAppStateOptions,
  WebMcpCurrentAppStateSections,
  WebMcpFilterState,
  WebMcpJsonObject,
  WebMcpJsonValue,
  WebMcpPageInfo,
  WebMcpPageOptions,
  WebMcpRuntime,
  WebMcpScoreBreakdown,
  WebMcpScoreBreakdownItem,
  WebMcpScoreResult,
  WebMcpScoreSettings,
  WebMcpUnitResultSummary,
  WebMcpUnitSettings,
} from './types'
import * as webMcp from './types'

/**
 * 一覧・比較結果へ返すカード概要を作る
 *
 * @param card - 変換対象のサポートカード
 * @returns 詳細を省いたカード概要
 */
export function createCardSummary(card: SupportCard): WebMcpCardSummary {
  // 一覧・比較結果では計算に不要な巨大な詳細を省き、識別と絞り込みに必要な項目だけ返す
  return {
    name: card.name,
    rarity: card.rarity,
    plan: card.plan,
    type: card.type,
    parameter_type: card.parameter_type,
    source: card.source,
    source_detail: card.source_detail ?? null,
    release_date: card.release_date,
  }
}

/**
 * JSONへ変換できる値を新しいオブジェクトへコピーする
 *
 * @param value - コピー対象の値
 * @returns WebMCPへ公開できるJSON値
 */
function cloneJsonValue(value: unknown): WebMcpJsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (Array.isArray(value)) return value.map(cloneJsonValue)
  if (isRecord(value)) {
    const result: WebMcpJsonObject = {}
    for (const [key, child] of Object.entries(value)) {
      if (child !== undefined) result[key] = cloneJsonValue(child)
    }
    return result
  }
  // WebMCPのwire結果へ渡す外部データはJSON互換値だけを残し、関数やclassなどは公開しない
  return null
}

/**
 * JSONオブジェクトとして公開できる値か判定する
 *
 * @param value - 判定対象のJSON値
 * @returns JSONオブジェクトの場合はtrue
 */
function isJsonObject(value: WebMcpJsonValue): value is WebMcpJsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 詳細項目をJSONオブジェクトへ変換する
 *
 * @param value - 変換対象の値
 * @returns JSONオブジェクト、不正な値の場合は空オブジェクト
 */
function cloneJsonObject(value: unknown): WebMcpJsonObject {
  const cloned = cloneJsonValue(value)
  return isJsonObject(cloned) ? cloned : {}
}

/**
 * サポートカードの詳細をWebMCPへ返す公開形式へ変換する
 *
 * @param card - 変換対象のサポートカード
 * @returns WebMCPへ公開するカード詳細
 */
export function createCardDetail(
  card: SupportCard,
  sections: readonly webMcp.WebMcpCardDetailSectionType[] = [],
): WebMcpCardDetail {
  const abilities: WebMcpAbilityDetail[] = card.abilities.map((ability) => ({
    name_key: ability.name_key,
    values: { ...ability.values },
    trigger_key: ability.trigger_key,
    ...(ability.parameter_type === undefined ? {} : { parameter_type: ability.parameter_type }),
    ...(ability.max_count === undefined ? {} : { max_count: ability.max_count }),
    ...(ability.is_percentage === undefined ? {} : { is_percentage: ability.is_percentage }),
    ...(ability.is_event_boost === undefined ? {} : { is_event_boost: ability.is_event_boost }),
    ...(ability.is_parameter_bonus === undefined ? {} : { is_parameter_bonus: ability.is_parameter_bonus }),
    ...(ability.is_initial_stat === undefined ? {} : { is_initial_stat: ability.is_initial_stat }),
    ...(ability.skip_calculation === undefined ? {} : { skip_calculation: ability.skip_calculation }),
  }))

  const detail: WebMcpCardDetail = {
    ...createCardSummary(card),
  }
  if (sections.includes(webMcp.WebMcpCardDetailSection.Abilities)) {
    detail.is_event_source = card.is_event_source ?? null
    detail.abilities = abilities
  }
  if (sections.includes(webMcp.WebMcpCardDetailSection.Events)) {
    detail.is_event_source = card.is_event_source ?? null
    detail.events = card.events.map((event) => ({
      release: event.release,
      effect_type: event.effect_type,
      ...(event.param_type === undefined ? {} : { param_type: event.param_type }),
      ...(event.param_value === undefined ? {} : { param_value: event.param_value }),
      title: event.title,
    }))
  }
  if (sections.includes(webMcp.WebMcpCardDetailSection.PItem)) {
    detail.p_item = card.p_item === null ? null : cloneJsonObject(card.p_item)
  }
  if (sections.includes(webMcp.WebMcpCardDetailSection.SkillCard)) {
    detail.skill_card = card.skill_card === null ? null : cloneJsonObject(card.skill_card)
  }
  return detail
}

/**
 * カード検索へ使う正規化済みテキストを作る
 *
 * @param card - 検索対象のサポートカード
 * @returns 検索対象項目を連結した小文字文字列
 */
export function createCardSearchText(card: SupportCard): string {
  // 検索対象をカード名だけにせず、
  // フォーム上で確認できる属性・能力・イベント名まで含める
  return (
    [
      card.name,
      card.rarity,
      card.plan,
      card.type,
      card.parameter_type,
      card.source,
      card.source_detail ?? '',
      ...card.abilities.flatMap((ability) => [ability.name_key, ability.trigger_key]),
      ...card.events.flatMap((event) => [event.title, event.effect_type]),
      card.p_item?.name ?? '',
      card.skill_card?.name ?? '',
    ]
      .join(' ')
      // カードデータを日本語ロケールで小文字化し、検索語と英字の大文字小文字を区別しない
      .toLocaleLowerCase('ja-JP')
  )
}

/**
 * 現在条件で1枚のカードを計算する
 *
 * @param snapshot - 点数計算に使う条件
 * @param card - 計算対象のカード
 * @returns 凸数とカード計算結果
 */
function calculateCardForSnapshot(
  snapshot: CalculationSnapshot,
  card: SupportCard,
): { uncap: enums.UncapType; result: CardCalculationResult | undefined } {
  // 固定凸設定が有効な場合は全カードを既定凸で計算し、通常時はカード別の保存凸数を使う
  const uncap = snapshot.scoreSettings.useFixedUncap
    ? constant.DEFAULT_UNCAP
    : (snapshot.cardUncaps[card.name] ?? constant.DEFAULT_UNCAP)
  if (!snapshot.scoreSettings.useFixedUncap && uncap === enums.UncapType.NotOwned) {
    // 未所持カードは画面の点数計算対象外なので、未計算として返す
    return { uncap, result: undefined }
  }

  // カード別回数調整も固定した条件から渡し、現在画面と同じ計算を行う
  return {
    uncap,
    result: calculateCardWithSettings(card, uncap, snapshot.scoreSettings, snapshot.cardCountCustom[card.name]),
  }
}

/**
 * 計算結果内訳の公開項目へ変換する
 *
 * @param result - 変換対象のカード計算結果
 * @returns WebMCP公開用の計算内訳
 */
function createScoreBreakdown(result: CardCalculationResult): WebMcpScoreBreakdown {
  const mapItem = (item: CardAbilityBoost): WebMcpScoreBreakdownItem => ({
    ...(item.nameKey === undefined ? {} : { nameKey: item.nameKey }),
    ...(item.parameterType === undefined ? {} : { parameterType: item.parameterType }),
    ...(item.maxCount === undefined ? {} : { maxCount: item.maxCount }),
    ...(item.displayName === undefined ? {} : { displayName: item.displayName }),
    trigger: item.trigger,
    count: item.count,
    valuePerTrigger: item.valuePerTrigger,
    total: item.total,
  })

  return {
    cardName: result.cardName,
    parameterType: result.parameterType,
    eventBoost: result.eventBoost,
    // カードが保持する詳細はそのまま公開せず、実際に点数へ寄与した行だけを返す
    abilityBoosts: result.abilityBoosts.map(mapItem),
    parameterBonus: result.parameterBonus,
    paramBonusPercent: result.paramBonusPercent,
    paramBonusBase: result.paramBonusBase,
    eventBoostBase: result.eventBoostBase,
    eventBoostPercent: result.eventBoostPercent,
    totalIncrease: result.totalIncrease,
    autoCounts: { ...result.autoCounts },
  }
}

/**
 * 点数設定をWebMCPへ返す公開形式へ変換する
 *
 * @param settings - 変換対象の点数設定
 * @returns WebMCP公開用の点数設定
 */
export function createScoreSettings(settings: ScoreSettings): WebMcpScoreSettings {
  return {
    name: settings.name,
    scenario: settings.scenario,
    difficulty: settings.difficulty,
    parameterBonusBase: { ...settings.parameterBonusBase },
    actionCounts: { ...settings.actionCounts },
    scheduleSelections: { ...settings.scheduleSelections },
    useScheduleLimits: settings.useScheduleLimits,
    includeSelfTrigger: settings.includeSelfTrigger,
    includePItem: settings.includePItem,
    useFixedUncap: settings.useFixedUncap,
    useCustomMode: settings.useCustomMode,
    customParamBonusRows: settings.customParamBonusRows.map((row) => ({ ...row })),
    customClassBonus: { ...settings.customClassBonus },
    customNonBonusGain: { ...settings.customNonBonusGain },
    hifExamRatios: settings.hifExamRatios.map((row) => ({ ...row })),
    hifLessonSplitSub: settings.hifLessonSplitSub,
  }
}

/**
 * 最適編成設定をWebMCPへ返す公開形式へ変換する
 *
 * @param settings - 変換対象の最適編成設定
 * @returns WebMCP公開用の最適編成設定
 */
function createUnitSettings(settings: UnitSimulatorSettings): WebMcpUnitSettings {
  return {
    plan: settings.plan,
    allowedTypes: [...settings.allowedTypes],
    spConstraint: { ...settings.spConstraint },
    typeCountMin: { ...settings.typeCountMin },
    typeCountMax: { ...settings.typeCountMax },
    paramBonusPercent: { ...settings.paramBonusPercent },
    manualRental: settings.manualRental,
    rentalCardName: settings.rentalCardName,
    lockedCards: [...settings.lockedCards],
    manualCards: [...settings.manualCards],
    excludedCardNames: [...settings.excludedCardNames],
    initialParams: { ...settings.initialParams },
    ...(settings.paramCapOverride === undefined ? {} : { paramCapOverride: settings.paramCapOverride }),
    ...(settings.unifyRentalLock === undefined ? {} : { unifyRentalLock: settings.unifyRentalLock }),
    ...(settings.excludeContestSkillCards === undefined
      ? {}
      : { excludeContestSkillCards: settings.excludeContestSkillCards }),
    ...(settings.excludeContestPItems === undefined ? {} : { excludeContestPItems: settings.excludeContestPItems }),
    ...(settings.ignoreCardExclusions === undefined ? {} : { ignoreCardExclusions: settings.ignoreCardExclusions }),
    ...(settings.exhaustiveCandidateLimit === undefined
      ? {}
      : { exhaustiveCandidateLimit: settings.exhaustiveCandidateLimit }),
  }
}

/**
 * カード別回数調整をWebMCPへ返す公開形式へ変換する
 *
 * @param custom - 変換対象のカード別回数調整
 * @returns WebMCP公開用のカード別回数調整
 */
function createCardCountCustom(custom: CardCountCustom): Record<string, WebMcpCardCountCustom> {
  return Object.fromEntries(
    Object.entries(custom).map(([cardName, values]) => [
      cardName,
      {
        ...(values.selfTrigger === undefined ? {} : { selfTrigger: { ...values.selfTrigger } }),
        ...(values.pItemCount === undefined ? {} : { pItemCount: { ...values.pItemCount } }),
      },
    ]),
  )
}

/**
 * ページ指定したキー・値を公開ページへ変換する
 *
 * @param entries - ページング対象のキー・値一覧
 * @param options - 開始位置と取得件数
 * @returns ページング済みの公開値とページ情報
 */
function createPage<T>(entries: ReadonlyArray<readonly [string, T]>, options: WebMcpPageOptions) {
  const values: Record<string, T> = {}
  for (const [key, value] of entries.slice(options.offset, options.offset + options.limit)) values[key] = value
  return {
    values,
    pagination: createPageInfo(options.offset, options.limit, entries.length),
  }
}

/**
 * 計算条件をWebMCPへ返す公開形式へ変換する
 *
 * @param snapshot - 変換対象の計算条件
 * @param options - カード別データのページ指定
 * @returns WebMCPへ公開する計算状態
 */
export function createCalculationState(
  snapshot: CalculationSnapshot,
  options: WebMcpPageOptions = { offset: 0, limit: webMcpConstant.WEB_MCP_DEFAULT_PAGE_LIMIT },
): WebMcpCalculationState {
  return {
    scoreSettings: createScoreSettings(snapshot.scoreSettings),
    unitSettings: createUnitSettings(snapshot.unitSettings),
    cardUncaps: createPage(Object.entries(snapshot.cardUncaps), options),
    cardCountCustom: createPage(Object.entries(createCardCountCustom(snapshot.cardCountCustom)), options),
  }
}

/**
 * 現在または一時変更後の点数結果を公開形式へ変換する
 *
 * @param snapshot - 点数計算に使う計算条件
 * @param card - 計算対象のサポートカード
 * @returns WebMCPへ公開する点数結果
 */
export function createScoreResult(snapshot: CalculationSnapshot, card: SupportCard): WebMcpScoreResult {
  // 未所持カードはcalculated=falseでもカードの凸状態を返し、呼び出し側が理由を判別できるようにする
  const calculation = calculateCardForSnapshot(snapshot, card)
  return {
    uncap: calculation.uncap,
    score: calculation.result?.totalIncrease ?? 0,
    calculated: calculation.result !== undefined,
    breakdown: calculation.result === undefined ? null : createScoreBreakdown(calculation.result),
  }
}

/**
 * 最適編成結果からカード名と点数を取り出す
 *
 * @param result - 変換対象の最適編成結果
 * @returns WebMCPへ公開する最適編成概要。結果がない場合はnull
 */
export function createUnitResultSummary(result: UnitResult | null): WebMcpUnitResultSummary | null {
  // 複雑なカード情報を、比較結果に必要なメンバー情報だけへ絞る
  if (result === null) return null
  return {
    totalScore: result.totalScore,
    totalParamBonusPercent: { ...result.totalParamBonusPercent },
    parameterBonus: { ...result.parameterBonus },
    parameterBonusBase: { ...result.parameterBonusBase },
    outsideParamBonusPercent: { ...result.outsideParamBonusPercent },
    members: result.members.map((member) => ({
      name: member.card.name,
      uncap: member.uncap,
      isRental: member.isRental,
      score: member.result.totalIncrease,
      supportSynergy: member.supportSynergy,
      paramBonusPercent: { ...member.paramBonusPercent },
    })),
  }
}

/**
 * 現在のフィルター状態をJSONで扱える形へ変換する
 *
 * @param runtime - 現在のフィルター状態を取得する処理
 * @returns WebMCPへ公開するフィルター状態
 */
export function createFilterState(runtime: WebMcpRuntime): WebMcpFilterState {
  // 画面側の集合を配列へコピーし、比較や取り消しでも同じ形式を使う
  const state = runtime.getFilterState()
  return {
    searchTerm: state.searchTerm,
    rarities: [...state.rarities],
    types: [...state.types],
    plans: [...state.plans],
    spOnly: state.spOnly,
    abilityKeywords: [...state.abilityKeywords],
    eventFilters: [...state.eventFilters],
    sources: [...state.sources],
    uncaps: [...state.uncaps],
    countCustom: [...state.countCustom],
    cardExclusionFilters: [...state.cardExclusionFilters],
    sortMode: state.sortMode,
    sortReverse: state.sortReverse,
  }
}

/**
 * 現在の主要状態を一度に確認できる読み取り結果を作る
 *
 * @param runtime - 現在のアプリ状態を取得する処理
 * @param options - 追加取得する状態セクションとページ指定
 * @returns WebMCPへ公開する現在状態
 */
export function createCurrentAppState(
  runtime: WebMcpRuntime,
  options: WebMcpCurrentAppStateOptions = {
    sections: [],
    cardMap: { offset: 0, limit: webMcpConstant.WEB_MCP_DEFAULT_PAGE_LIMIT },
    userSupports: { offset: 0, limit: webMcpConstant.WEB_MCP_DEFAULT_PAGE_LIMIT },
  },
): WebMcpCurrentAppState {
  // 既定応答は概要だけに絞り、詳細は明示的に指定されたときだけ返す
  const snapshot = runtime.getCalculationSnapshot()
  const filters = createFilterState(runtime)
  const preferences = { ...runtime.getPreferences() }
  const ui = { ...runtime.getUiState() }
  const userSupports = runtime.getUserSupports()
  const activeFilterCount = [
    filters.searchTerm,
    filters.rarities,
    filters.types,
    filters.plans,
    filters.spOnly,
    filters.abilityKeywords,
    filters.eventFilters,
    filters.sources,
    filters.uncaps,
    filters.countCustom,
    filters.cardExclusionFilters,
    filters.sortReverse,
  ].filter((value) => (Array.isArray(value) ? value.length > 0 : Boolean(value))).length
  const sections: WebMcpCurrentAppStateSections = {}
  // 要求されたセクションだけを追加し、不要なカード情報を返さない
  for (const section of options.sections) {
    switch (section) {
      case webMcp.WebMcpCurrentAppStateSection.Calculation:
        sections.calculation = createCalculationState(snapshot, options.cardMap)
        break
      case webMcp.WebMcpCurrentAppStateSection.Filters:
        sections.filters = filters
        break
      case webMcp.WebMcpCurrentAppStateSection.Preferences:
        sections.preferences = preferences
        break
      case webMcp.WebMcpCurrentAppStateSection.Ui:
        sections.ui = ui
        break
      case webMcp.WebMcpCurrentAppStateSection.UserSupports:
        sections.user_supports = {
          count: userSupports.length,
          names: userSupports
            .slice(options.userSupports.offset, options.userSupports.offset + options.userSupports.limit)
            .map((card) => card.name),
          pagination: createPageInfo(options.userSupports.offset, options.userSupports.limit, userSupports.length),
        }
        break
    }
  }
  return {
    summary: {
      cardCount: runtime.getCards().length,
      userSupportCount: userSupports.length,
      ...(runtime.applicationCommands?.calculation === undefined
        ? {}
        : {
            calculationRevision: runtime.applicationCommands.calculation.getSnapshot().revision,
            calculationDigest: runtime.applicationCommands.calculation.getSnapshot().digest,
          }),
      calculation: {
        scenario: snapshot.scoreSettings.scenario,
        difficulty: snapshot.scoreSettings.difficulty,
        plan: snapshot.unitSettings.plan,
        useFixedUncap: snapshot.scoreSettings.useFixedUncap,
        cardUncapOverrideCount: Object.keys(snapshot.cardUncaps).length,
        cardCountCustomCount: Object.keys(snapshot.cardCountCustom).length,
      },
      filters: {
        searchTerm: filters.searchTerm,
        activeFilterCount,
        sortMode: filters.sortMode,
        sortReverse: filters.sortReverse,
      },
      preferences,
      ui: {
        selectedCardName: ui.selectedCardName,
        scoreSettingsOpen: ui.scoreSettingsOpen,
        simulatorOpen: ui.simulatorOpen,
        filterSortOpen: ui.filterSortOpen,
        scoreBreakdownCardName: ui.scoreBreakdownCardName,
        userSupportFormOpen: ui.userSupportFormOpen,
      },
    },
    sections,
  }
}

/**
 * ページ情報を作る
 *
 * @param offset - ページの開始位置
 * @param limit - 1ページの件数
 * @param total - 全件数
 * @returns 次ページの有無を含むページ情報
 */
export function createPageInfo(offset: number, limit: number, total: number): WebMcpPageInfo {
  const hasMore = offset + limit < total
  return {
    offset,
    limit,
    total,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  }
}

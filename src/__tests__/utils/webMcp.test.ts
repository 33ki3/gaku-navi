/**
 * ページツールの入力境界と読み取り専用の計算経路を検証する
 *
 * 比較ツールは画面の設定や保存値を変更せず、
 * 更新ツールだけが設定変更の入口を呼び出すことを確認する
 */
import { describe, expect, it, vi } from 'vitest'
import { type ImportCommandState, createCalculationCommand } from '../../application/command'
import { DomainStateStore } from '../../application/domainStateStore'
import * as constant from '../../constant'
import * as data from '../../data'
import type { AppPreferences, PersistedFilterState } from '../../types/app'
import type {
  ApplicationDomainType,
  CommandResult,
  DomainStateSnapshot,
  ExpectedRevisionOptions,
} from '../../types/application'
import { ApplicationDomain, DomainIssueCode } from '../../types/application'
import type { CardCountCustom, ScoreSettings, SupportCard } from '../../types/card'
import * as enums from '../../types/enums'
import type { StorageEntry } from '../../types/storage'
import type { UnitSimulatorSettings } from '../../types/unit'
import { createCalculationSnapshot } from '../../utils/calculationSnapshot'
import { calculateCardWithSettings } from '../../utils/calculator/calculateCardScores'
import { createDomainDigest, createDomainStateSnapshot } from '../../utils/domainRevision'
import type { ScorePreset } from '../../utils/presetHelpers'
import {
  createDefaultSettings,
  loadScoreSettings,
  mergeScheduleCounts,
  normalizeScoreSettingsDerived,
} from '../../utils/scoreSettings'
import { isPersistedFilterState } from '../../utils/storageCollectionValidation'
import { createWebMcpTools, registerWebMcpTools } from '../../webmcp'
import * as webMcpConstant from '../../webmcp/constants'
import { WEB_MCP_TOOL_MANIFEST_NAMES, createWebMcpManifest } from '../../webmcp/manifest'
import type { WebMcpUiState } from '../../webmcp/types'
import {
  WebMcpCapabilitySection,
  WebMcpCardDetailSection,
  WebMcpCurrentAppStateSection,
  WebMcpErrorCode,
  WebMcpMutationOperation,
  type WebMcpRuntime,
  WebMcpSchemaField,
  type WebMcpToolDefinition,
  WebMcpToolName,
  type WebMcpToolNameType,
  type WebMcpUiCommand,
} from '../../webmcp/types'
import { createTestAchievementBindings, createTestCommandStatePort } from '../fixtures/application'

const WEB_MCP_MANIFEST_BUDGET_BYTES = 32 * 1024
const WEB_MCP_STRING_SCHEMA_MANIFEST_BUDGET_BYTES = 36 * 1024
const WEB_MCP_TOOL_BUDGET_BYTES = 8 * 1024

/** setterでテスト用snapshotを更新し、WebMCPの実行結果を検証するruntime */
interface TestWebMcpRuntime extends WebMcpRuntime {
  setScoreSettings: (settings: ScoreSettings) => boolean
  setUnitSettings: (settings: UnitSimulatorSettings) => boolean
  setCardUncaps: (uncaps: Record<string, enums.UncapType>) => boolean
  setCardCountCustom: (custom: CardCountCustom) => boolean
  setFilterState: (state: PersistedFilterState) => boolean
  setPreferences: (preferences: AppPreferences) => boolean
  addUserSupport: (card: SupportCard) => boolean
  updateUserSupport: (oldName: string, card: SupportCard) => boolean
  deleteUserSupport: (cardName: string) => boolean
  replaceUserSupports: (cards: readonly SupportCard[]) => boolean
}

/** revision付き更新と、成功後のruntime状態反映を再現する */
function createTestStateCommand<T>(domain: ApplicationDomainType, initialValue: T, publish: (nextValue: T) => void) {
  const store = new DomainStateStore({ domain, initialValue })
  const update = vi.fn(async (nextValue: T, options?: ExpectedRevisionOptions): Promise<CommandResult<T>> => {
    const result = store.commit(nextValue, options)
    if (result.ok && result.changed) publish(nextValue)
    return result
  })
  return {
    getSnapshot: (): DomainStateSnapshot<T> => store.getSnapshot(),
    update,
  }
}

/** JSON化した公開情報のサイズをUTF-8バイト数で測る */
function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

/** manifest全体をJSON化したサイズを測る */
function getWebMcpManifestUtf8Bytes(tools: readonly WebMcpToolDefinition[]): number {
  return getUtf8ByteLength(JSON.stringify(createWebMcpManifest(tools)))
}

/** manifest上の単一toolのサイズを測る */
function getWebMcpToolUtf8Bytes(tool: WebMcpToolDefinition): number {
  return getUtf8ByteLength(JSON.stringify(createWebMcpManifest([tool])[0]))
}

/** inputSchemaを文字列として渡す場合のmanifestサイズを測る */
function getStringSchemaManifestUtf8Bytes(tools: readonly WebMcpToolDefinition[]): number {
  const manifest = createWebMcpManifest(tools).map((tool) => ({
    ...tool,
    inputSchema: JSON.stringify(tool.inputSchema),
  }))
  return getUtf8ByteLength(JSON.stringify(manifest))
}

/** 初期状態、保存command、UI操作を持つWebMCP runtimeを組み立てる */
function createRuntime(cards = data.AllCards): TestWebMcpRuntime {
  // 比較結果を固定しやすい既定設定と、検索用カードMapを含む計算snapshotを作る。
  const scoreSettings = createDefaultSettings()
  scoreSettings.parameterBonusBase = { vocal: 100, dance: 100, visual: 100 }
  const snapshot = createCalculationSnapshot({
    scoreSettings,
    unitSettings: constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
    cardUncaps: {},
    cardCountCustom: {},
    allCards: cards,
    cardByName: new Map(cards.map((card) => [card.name, card])),
  })

  // command更新後にruntimeから読み戻せるよう、状態はメモリ上に保持する。
  let filterState: PersistedFilterState = {
    ...constant.DEFAULT_FILTER_STATE,
    rarities: [...constant.DEFAULT_FILTER_STATE.rarities],
    types: [...constant.DEFAULT_FILTER_STATE.types],
    plans: [...constant.DEFAULT_FILTER_STATE.plans],
    abilityKeywords: [...constant.DEFAULT_FILTER_STATE.abilityKeywords],
    eventFilters: [...constant.DEFAULT_FILTER_STATE.eventFilters],
    sources: [...constant.DEFAULT_FILTER_STATE.sources],
    uncaps: [...constant.DEFAULT_FILTER_STATE.uncaps],
    countCustom: [...constant.DEFAULT_FILTER_STATE.countCustom],
    cardExclusionFilters: [...constant.DEFAULT_FILTER_STATE.cardExclusionFilters],
  }
  let preferences: AppPreferences = { ...constant.DEFAULT_APP_PREFERENCES }
  const setFilterState = vi.fn((next: PersistedFilterState) => {
    filterState = next
    return true
  })
  const setPreferences = vi.fn((next: AppPreferences) => {
    preferences = next
    return true
  })
  let currentSnapshot = snapshot
  // UI状態は固定値から始め、画面操作toolの前提を一定にする。
  const uiState: WebMcpUiState = {
    selectedCardName: null,
    scoreSettingsOpen: false,
    settingsPinned: false,
    simulatorOpen: false,
    simulatorPinned: false,
    filterSortOpen: false,
    filterSortTab: enums.FilterSortTab.Sort,
    cardListMode: enums.CardListInteractionModeType.None,
    uncapEditMode: false,
    scoreBreakdownCardName: null,
    userSupportFormOpen: false,
    editingUserSupportName: null,
    dataManagementOpen: false,
    optionsOpen: false,
  }
  let userSupports: SupportCard[] = []
  const addUserSupport = vi.fn((card: SupportCard) => {
    userSupports = [...userSupports, card]
    return true
  })
  const updateUserSupport = vi.fn((oldName: string, card: SupportCard) => {
    userSupports = userSupports.map((candidate) => (candidate.name === oldName ? card : candidate))
    return true
  })
  const deleteUserSupport = vi.fn((cardName: string) => {
    userSupports = userSupports.filter((candidate) => candidate.name !== cardName)
    return true
  })
  const replaceUserSupports = vi.fn((nextCards: readonly SupportCard[]) => {
    userSupports = [...nextCards]
    return true
  })
  const refreshFromStorage = vi.fn(() => Promise.resolve())

  // setter呼び出しでテスト用snapshotを更新し、変更後の状態を確認できるようにする。
  const updateSnapshot = (next: Partial<typeof snapshot>) => {
    currentSnapshot = createCalculationSnapshot({
      ...currentSnapshot,
      ...next,
      allCards: currentSnapshot.allCards,
      cardByName: currentSnapshot.cardByName,
    })
  }

  const setScoreSettings = vi.fn((next: typeof scoreSettings) => {
    updateSnapshot({ scoreSettings: next })
    return true
  })
  const setUnitSettings = vi.fn((next: typeof constant.DEFAULT_UNIT_SIMULATOR_SETTINGS) => {
    updateSnapshot({ unitSettings: next })
    return true
  })
  const setCardUncaps = vi.fn((next: Record<string, enums.UncapType>) => {
    updateSnapshot({ cardUncaps: next })
    return true
  })
  const setCardCountCustom = vi.fn((next: typeof snapshot.cardCountCustom) => {
    updateSnapshot({ cardCountCustom: next })
    return true
  })
  // 計算条件は一つのdomainとしてrevisionを管理する。
  const getCalculationCommandState = () => ({
    scoreSettings: currentSnapshot.scoreSettings,
    unitSimulatorSettings: currentSnapshot.unitSettings,
    cardUncaps: currentSnapshot.cardUncaps,
    cardCountCustom: currentSnapshot.cardCountCustom,
  })
  let calculationCommandSnapshot = createDomainStateSnapshot(
    ApplicationDomain.Calculation,
    getCalculationCommandState(),
  )
  const updateCalculationCommand = async (
    next: ReturnType<typeof getCalculationCommandState>,
    expectedRevision?: string,
  ) => {
    if (expectedRevision !== undefined && expectedRevision !== calculationCommandSnapshot.revision) {
      return { ok: false as const, error: { code: DomainIssueCode.StaleRevision } }
    }
    const before = calculationCommandSnapshot
    const current = getCalculationCommandState()
    if (createDomainDigest(next.scoreSettings) !== createDomainDigest(current.scoreSettings)) {
      setScoreSettings(next.scoreSettings)
    }
    if (createDomainDigest(next.unitSimulatorSettings) !== createDomainDigest(current.unitSimulatorSettings)) {
      setUnitSettings(next.unitSimulatorSettings)
    }
    if (createDomainDigest(next.cardUncaps) !== createDomainDigest(current.cardUncaps)) setCardUncaps(next.cardUncaps)
    if (createDomainDigest(next.cardCountCustom) !== createDomainDigest(current.cardCountCustom)) {
      setCardCountCustom(next.cardCountCustom)
    }
    calculationCommandSnapshot = createDomainStateSnapshot(ApplicationDomain.Calculation, next, before)
    return {
      ok: true as const,
      value: next,
      changed: true,
      revision: calculationCommandSnapshot.revision,
      digest: calculationCommandSnapshot.digest,
      before: before.value,
    }
  }
  const calculationCommand = {
    getSnapshot: () => calculationCommandSnapshot,
    update: vi.fn((next: ReturnType<typeof getCalculationCommandState>, options?: { expectedRevision?: string }) =>
      updateCalculationCommand(next, options?.expectedRevision),
    ),
    patch: vi.fn(
      (patch: Partial<ReturnType<typeof getCalculationCommandState>>, options?: { expectedRevision?: string }) =>
        updateCalculationCommand({ ...getCalculationCommandState(), ...patch }, options?.expectedRevision),
    ),
  }
  // 表示設定commandも期待revisionを確認し、成功後のsnapshotを保持する。
  let preferencesCommandSnapshot = createDomainStateSnapshot(ApplicationDomain.Preferences, preferences)
  const updatePreferencesCommand = async (next: AppPreferences, expectedRevision?: string) => {
    if (expectedRevision !== undefined && expectedRevision !== preferencesCommandSnapshot.revision) {
      return { ok: false as const, error: { code: DomainIssueCode.StaleRevision } }
    }
    const before = preferencesCommandSnapshot
    preferences = next
    preferencesCommandSnapshot = createDomainStateSnapshot(ApplicationDomain.Preferences, next, before)
    return {
      ok: true as const,
      value: next,
      changed: true,
      revision: preferencesCommandSnapshot.revision,
      digest: preferencesCommandSnapshot.digest,
      before: before.value,
    }
  }
  const preferencesCommand = {
    getSnapshot: () => preferencesCommandSnapshot,
    update: vi.fn((next: AppPreferences, options?: { expectedRevision?: string }) =>
      updatePreferencesCommand(next, options?.expectedRevision),
    ),
    patch: vi.fn((patch: Partial<AppPreferences>, options?: { expectedRevision?: string }) =>
      updatePreferencesCommand({ ...preferences, ...patch }, options?.expectedRevision),
    ),
  }

  // フィルター、プリセット、サポート一覧は共通のin-memory commandで更新する。
  const filterCommandState = createTestStateCommand(ApplicationDomain.Filters, filterState, setFilterState)
  const filterCommand = {
    ...filterCommandState,
    patch: vi.fn((patch: Partial<PersistedFilterState>, options?: ExpectedRevisionOptions) =>
      filterCommandState.update({ ...filterCommandState.getSnapshot().value, ...patch }, options),
    ),
    clear: vi.fn((options?: ExpectedRevisionOptions) =>
      filterCommandState.update({ ...constant.DEFAULT_FILTER_STATE }, options),
    ),
  }
  const presetCommandState = createTestStateCommand<ScorePreset[]>(ApplicationDomain.Presets, [], () => undefined)
  const presetCommand = {
    ...presetCommandState,
    save: vi.fn(
      (name: string, settings: ScoreSettings, options?: { overwrite?: boolean } & ExpectedRevisionOptions) => {
        const current = presetCommandState.getSnapshot().value
        const existing = current.find((preset) => preset.name === name)
        if (existing && options?.overwrite !== true) {
          return Promise.resolve({ ok: false as const, error: { code: DomainIssueCode.Conflict } })
        }
        const next = [...current.filter((preset) => preset.name !== name), { name, settings }]
        return presetCommandState.update(next, options)
      },
    ),
    remove: vi.fn((name: string, options?: ExpectedRevisionOptions) =>
      presetCommandState.update(
        presetCommandState.getSnapshot().value.filter((preset) => preset.name !== name),
        options,
      ),
    ),
    replace: vi.fn((next: readonly ScorePreset[], options?: ExpectedRevisionOptions) =>
      presetCommandState.update([...next], options),
    ),
    get: vi.fn((name: string) => {
      const preset = presetCommandState.getSnapshot().value.find((candidate) => candidate.name === name)
      return preset
        ? { ok: true as const, value: preset }
        : { ok: false as const, error: { code: DomainIssueCode.NotFound } }
    }),
  }
  const userSupportCommandState = createTestStateCommand(ApplicationDomain.UserSupports, userSupports, (next) => {
    userSupports = [...next]
  })
  const userSupportCommand = {
    ...userSupportCommandState,
    add: vi.fn((card: SupportCard, options?: ExpectedRevisionOptions) =>
      userSupportCommandState.update([...userSupportCommandState.getSnapshot().value, card], options),
    ),
    update: vi.fn((oldName: string, card: SupportCard, options?: ExpectedRevisionOptions) =>
      userSupportCommandState.update(
        userSupportCommandState.getSnapshot().value.map((candidate) => (candidate.name === oldName ? card : candidate)),
        options,
      ),
    ),
    remove: vi.fn((name: string, options?: ExpectedRevisionOptions) =>
      userSupportCommandState.update(
        userSupportCommandState.getSnapshot().value.filter((candidate) => candidate.name !== name),
        options,
      ),
    ),
    replace: vi.fn((next: readonly SupportCard[], options?: ExpectedRevisionOptions) =>
      userSupportCommandState.update([...next], options),
    ),
    get: vi.fn((name: string) => {
      const card = userSupportCommandState.getSnapshot().value.find((candidate) => candidate.name === name)
      return card
        ? { ok: true as const, value: card }
        : { ok: false as const, error: { code: DomainIssueCode.NotFound } }
    }),
  }
  // import commandはstorage値とrevisionを保持し、適用・復元をテストできるようにする。
  const importInitialState: ImportCommandState = Object.fromEntries(
    data.EXPORT_KEYS.map((key) => [key, localStorage.getItem(key)]),
  )
  const importCommandState = createTestStateCommand(ApplicationDomain.Import, importInitialState, () => undefined)
  const importCommand = {
    getSnapshot: importCommandState.getSnapshot,
    preview: vi.fn((entries: readonly StorageEntry[]) => ({
      ok: true as const,
      value: {
        entries,
        baseRevision: importCommandState.getSnapshot().revision,
        baseDigest: importCommandState.getSnapshot().digest,
      },
    })),
    apply: vi.fn(
      async (
        previewOrEntries: { entries: readonly StorageEntry[] } | readonly StorageEntry[],
        options?: ExpectedRevisionOptions,
      ) => {
        const entries: readonly StorageEntry[] = Array.isArray(previewOrEntries)
          ? (previewOrEntries as readonly StorageEntry[])
          : (previewOrEntries as { entries: readonly StorageEntry[] }).entries
        for (const [key, value] of entries) localStorage.setItem(key, value)
        const next = { ...importCommandState.getSnapshot().value }
        for (const [key, value] of entries) next[key] = value
        return importCommandState.update(next, options)
      },
    ),
    restoreState: vi.fn(async (next: ImportCommandState, options?: ExpectedRevisionOptions) => {
      return importCommandState.update(next, options)
    }),
  }

  const achievementBindings = createTestAchievementBindings()
  return {
    ...achievementBindings,
    getCards: () => snapshot.allCards,
    getCardByName: () => new Map([...cards, ...userSupports].map((card) => [card.name, card])),
    getCalculationSnapshot: () => currentSnapshot,
    setScoreSettings,
    setUnitSettings,
    setCardUncaps,
    setCardCountCustom,
    getFilterState: () => filterState,
    getPreferences: () => preferences,
    setFilterState,
    setPreferences,
    getUserSupports: () => userSupports,
    addUserSupport,
    updateUserSupport,
    deleteUserSupport,
    replaceUserSupports,
    refreshFromStorage,
    getUiState: () => uiState,
    controlUi: vi.fn(),
    applicationCommands: {
      achievement: achievementBindings.achievementCommand,
      calculation: calculationCommand,
      preferences: preferencesCommand,
      filters: filterCommand,
      presets: presetCommand,
      importData: importCommand,
      userSupports: userSupportCommand,
    } as unknown as NonNullable<WebMcpRuntime['applicationCommands']>,
  }
}

/** 実際の保存commandを接続し、再読込を含むツール更新を検証する */
function createPersistedRuntime(scoreSettings: ScoreSettings): TestWebMcpRuntime {
  const runtime = createRuntime()
  const snapshot = runtime.getCalculationSnapshot()
  const store = new DomainStateStore({
    domain: ApplicationDomain.Calculation,
    initialValue: {
      scoreSettings,
      unitSimulatorSettings: snapshot.unitSettings,
      cardUncaps: snapshot.cardUncaps,
      cardCountCustom: snapshot.cardCountCustom,
    },
  })
  const commands = runtime.applicationCommands
  if (!commands) throw new Error('保存commandがありません')
  commands.calculation = createCalculationCommand({ state: createTestCommandStatePort(store), storage: localStorage })
  runtime.getCalculationSnapshot = () => {
    const current = store.getSnapshot().value
    return createCalculationSnapshot({
      ...snapshot,
      ...current,
      unitSettings: current.unitSimulatorSettings,
    })
  }
  return runtime
}

/** 公開tool名から定義を取得し、未登録ならテストを失敗させる */
function getTool(tools: WebMcpToolDefinition[], name: WebMcpToolNameType): WebMcpToolDefinition {
  const tool = tools.find((candidate) => candidate.name === name)
  if (!tool) throw new Error(`Tool not found: ${name}`)
  return tool
}

/** React stateの反映待ちを再現するため、UI状態を次tickで更新する */
function createDelayedRuntime(): TestWebMcpRuntime {
  const runtime = createRuntime()
  let uiState = runtime.getUiState()

  return {
    ...runtime,
    getUiState: () => uiState,
    controlUi: vi.fn((command: WebMcpUiCommand) => {
      setTimeout(() => {
        if (command.action === enums.ApplicationUiAction.OpenScoreSettings)
          uiState = { ...uiState, scoreSettingsOpen: true }
        if (command.action === enums.ApplicationUiAction.CloseScoreSettings) {
          uiState = { ...uiState, scoreSettingsOpen: false, settingsPinned: false }
        }
        if (command.action === enums.ApplicationUiAction.OpenFilterSort) uiState = { ...uiState, filterSortOpen: true }
        if (command.action === enums.ApplicationUiAction.CloseFilterSort)
          uiState = { ...uiState, filterSortOpen: false }
      }, 0)
    }),
  }
}

const executionOptions = { signal: new AbortController().signal }

/** フォームで作成できる範囲の有効なユーザーサポートfixture */
function createFormUserSupportCard(name = 'AIで追加したカード'): SupportCard {
  return {
    name,
    rarity: enums.RarityType.SSR,
    plan: enums.PlanType.Free,
    type: enums.CardType.Vocal,
    parameter_type: enums.ParameterType.Vocal,
    source: enums.SourceType.User,
    release_date: '2026/09/06',
    abilities: [
      {
        name_key: enums.AbilityNameKeyType.InitialStat,
        trigger_key: enums.TriggerKeyType.VoInitialStat,
        values: {},
        parameter_type: enums.ParameterType.Vocal,
        is_initial_stat: true,
      },
      {
        name_key: enums.AbilityNameKeyType.LessonEnd,
        trigger_key: enums.TriggerKeyType.VoLessonEnd,
        values: {},
        parameter_type: enums.ParameterType.Vocal,
      },
      {
        name_key: enums.AbilityNameKeyType.SupportRate,
        trigger_key: enums.TriggerKeyType.SupportRate,
        values: {},
        is_percentage: true,
        skip_calculation: true,
      },
      {
        name_key: enums.AbilityNameKeyType.LessonEnd,
        trigger_key: enums.TriggerKeyType.VoLessonEnd,
        values: {},
        parameter_type: enums.ParameterType.Vocal,
      },
      {
        name_key: enums.AbilityNameKeyType.LessonEnd,
        trigger_key: enums.TriggerKeyType.VoLessonEnd,
        values: {},
        parameter_type: enums.ParameterType.Vocal,
      },
      {
        name_key: enums.AbilityNameKeyType.EventBoost,
        trigger_key: enums.TriggerKeyType.EventBoost,
        values: {},
        is_percentage: true,
        is_event_boost: true,
      },
    ],
    events: [
      { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.PItem, title: '初回イベント' },
      {
        release: enums.ReleaseConditionType.Lv20,
        effect_type: enums.EventEffectType.ParamBoost,
        param_type: enums.ParameterType.Vocal,
        param_value: 20,
        title: '2回目イベント',
      },
      {
        release: enums.ReleaseConditionType.Lv40,
        effect_type: enums.EventEffectType.CardEnhance,
        title: '3回目イベント',
      },
    ],
    p_item: {
      name: 'AIで追加したカードPアイテム',
      rarity: enums.PItemRarityType.SSR,
      memory: enums.PItemMemoryType.NonMemorizable,
    },
    skill_card: null,
  }
}

describe('webMcp tools', () => {
  // 公開toolの入出力、読み取り専用計算、更新commandの境界を確認する。
  it('画面操作ツールの文言を日本語localeから取得し、低価値操作を公開しない', async () => {
    const tool = getTool(createWebMcpTools(createRuntime), WebMcpToolName.ControlAppUi)

    expect(tool.title).toBe('画面を操作')
    expect(tool.description).toBe('モーダル・カード・パネル・編集モードを操作する')
    expect(tool.inputSchema).toMatchObject({
      properties: {
        action: {
          enum: expect.arrayContaining([
            enums.ApplicationUiAction.OpenUserSupportForm,
            enums.ApplicationUiAction.EditUserSupportForm,
          ]),
        },
      },
    })
    // ApplicationUiActionにない操作名は、WebMCPにも公開しない。
    for (const action of ['open_user_card_form', 'edit_user_card_form'] as const) {
      expect(tool.inputSchema).not.toMatchObject({
        properties: { action: { enum: expect.arrayContaining([action]) } },
      })
    }
    for (const action of [enums.ApplicationUiAction.SetScoreSettingsPinned, enums.ApplicationUiAction.OpenOptions]) {
      expect(tool.inputSchema).not.toMatchObject({
        properties: { action: { enum: expect.arrayContaining([action]) } },
      })
    }
    expect(await tool.execute({ action: enums.ApplicationUiAction.OpenOptions })).toMatchObject({
      error: { code: WebMcpErrorCode.InvalidInput },
    })
  })

  it('検索と詳細取得で現在のカードデータを返す', async () => {
    const tools = createWebMcpTools(createRuntime)
    const searchResult = await getTool(tools, WebMcpToolName.SearchSupportCards).execute(
      { query: 'いめーじとれーにんぐ', limit: 5 },
      executionOptions,
    )
    expect(searchResult).toMatchObject({
      query: 'いめーじとれーにんぐ',
      total: expect.any(Number),
      pagination: { offset: 0, limit: 5, hasMore: false, nextOffset: null },
    })
    expect(searchResult).toHaveProperty('cards[0].name', 'いめーじとれーにんぐ')
    expect(searchResult).not.toHaveProperty('cards[0].abilities')

    const defaultSearchResult = await getTool(tools, WebMcpToolName.SearchSupportCards).execute({}, executionOptions)
    expect(defaultSearchResult).toHaveProperty('pagination.limit', webMcpConstant.WEB_MCP_DEFAULT_SEARCH_LIMIT)

    const detailResult = await getTool(tools, WebMcpToolName.GetSupportCard).execute(
      { name: 'いめーじとれーにんぐ' },
      executionOptions,
    )
    expect(detailResult).toMatchObject({
      card: { name: 'いめーじとれーにんぐ' },
    })
    expect(detailResult).not.toHaveProperty('card.abilities')
    expect(detailResult).not.toHaveProperty('card.events')

    // 詳細sectionを指定した場合だけ、カードの追加情報を返す。
    const detailedCardResult = await getTool(tools, WebMcpToolName.GetSupportCard).execute(
      {
        name: 'いめーじとれーにんぐ',
        sections: [
          WebMcpCardDetailSection.Abilities,
          WebMcpCardDetailSection.Events,
          WebMcpCardDetailSection.PItem,
          WebMcpCardDetailSection.SkillCard,
        ],
      },
      executionOptions,
    )
    expect(detailedCardResult).toHaveProperty('card.abilities')
    expect(detailedCardResult).toHaveProperty('card.events')
    expect(detailedCardResult).toHaveProperty('card.p_item')
    expect(detailedCardResult).toHaveProperty('card.skill_card')
    expect((detailResult as { card: unknown }).card).not.toBe(data.AllCards[0])

    const pagedSearch = await getTool(tools, WebMcpToolName.SearchSupportCards).execute(
      { limit: 2, offset: 2 },
      executionOptions,
    )
    expect(pagedSearch).toMatchObject({
      pagination: { offset: 2, limit: 2, total: expect.any(Number), nextOffset: expect.anything() },
    })
  })

  it('現在設定の点数とvariant比較結果を返す', async () => {
    const runtime = createRuntime()
    const tools = createWebMcpTools(() => runtime)
    const cardName = data.AllCards.find((card) =>
      card.events.some((event) => event.effect_type === enums.EventEffectType.PItem),
    )!.name

    // stateは要約を既定にし、必要なsectionを指定した場合だけ詳細を含める。
    const currentSettings = await getTool(tools, WebMcpToolName.GetCurrentAppState).execute({}, executionOptions)
    expect(currentSettings).toHaveProperty('summary.calculation.scenario')
    expect(currentSettings).toHaveProperty('sections', {})
    const detailedSettings = await getTool(tools, WebMcpToolName.GetCurrentAppState).execute(
      { sections: [WebMcpCurrentAppStateSection.Calculation] },
      executionOptions,
    )
    expect(detailedSettings).toHaveProperty('sections.calculation.scoreSettings.parameterBonusBase.vocal', 100)
    expect(detailedSettings).toHaveProperty('sections.calculation.unitSettings.plan')

    const currentScore = await getTool(tools, WebMcpToolName.GetSupportCardScore).execute(
      { name: cardName },
      executionOptions,
    )
    expect(currentScore).toHaveProperty('card.name', cardName)
    expect(currentScore).toHaveProperty('breakdown')

    // 複数の計算条件を比較しても、読み取り専用toolはstorageを書き換えない。
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const scheduleWeek = data
      .getScheduleData(constant.DEFAULT_SCENARIO, constant.DEFAULT_DIFFICULTY)
      .find((week) => week.activities.length > 0)
    if (!scheduleWeek) throw new Error('テスト用スケジュールが見つかりません')
    const comparison = await getTool(tools, WebMcpToolName.CompareSupportCardScores).execute(
      {
        cardName,
        variants: [
          {
            label: 'ボーナス200',
            patch: {
              scoreSettings: {
                useScheduleLimits: false,
                parameterBonusBase: { vocal: 200, dance: 200, visual: 200 },
              },
            },
          },
          {
            label: 'Vo7Da1・SSR2',
            patch: {
              scoreSettings: {
                useScheduleLimits: false,
                actionCounts: {
                  [enums.ActionIdType.NormalLessonVo]: 7,
                  [enums.ActionIdType.NormalLessonDa]: 1,
                  [enums.ActionIdType.SsrCardAcquire]: 2,
                },
              },
            },
          },
          {
            label: 'Da7Vo1・SSR2',
            patch: {
              scoreSettings: {
                useScheduleLimits: false,
                actionCounts: {
                  [enums.ActionIdType.NormalLessonVo]: 1,
                  [enums.ActionIdType.NormalLessonDa]: 7,
                  [enums.ActionIdType.SsrCardAcquire]: 2,
                },
              },
            },
          },
          {
            label: 'スケジュール変更',
            patch: {
              scoreSettings: {
                scheduleSelections: { [scheduleWeek.week]: scheduleWeek.activities[0].id },
              },
            },
          },
          {
            label: '自動計算を無効化',
            patch: { scoreSettings: { useScheduleLimits: false } },
          },
          {
            label: 'このカードだけ0凸',
            patch: { cardUncaps: { [cardName]: enums.UncapType.Zero } },
          },
          {
            label: '全カード2凸',
            patch: { cardUncapAll: enums.UncapType.Two },
          },
          {
            label: 'このカードだけ回数調整',
            patch: {
              cardCountCustom: {
                [cardName]: { selfTrigger: { [enums.ActionIdType.PItemAcquire]: 2 } },
              },
            },
          },
        ],
      },
      executionOptions,
    )
    expect(comparison).toHaveProperty('variants.length', 8)
    expect(comparison).toHaveProperty('variants[0].label', 'ボーナス200')
    expect(comparison).toHaveProperty('variants[1].label', 'Vo7Da1・SSR2')
    expect(comparison).toHaveProperty('variants[1].valid', true)
    expect(comparison).toHaveProperty('variants[2].label', 'Da7Vo1・SSR2')
    expect(comparison).toHaveProperty('variants[2].valid', true)
    expect(comparison).toHaveProperty('variants[3].label', 'スケジュール変更')
    expect(comparison).toHaveProperty('variants[3].valid', true)
    expect(comparison).toHaveProperty('variants[5].label', 'このカードだけ0凸')
    expect(comparison).toHaveProperty('variants[5].valid', true)
    expect(comparison).toHaveProperty('variants[6].label', '全カード2凸')
    expect(comparison).toHaveProperty('variants[6].valid', true)
    expect(comparison).toHaveProperty('variants[7].label', 'このカードだけ回数調整')
    expect(comparison).toHaveProperty('variants[7].valid', true)
    expect(setItemSpy).not.toHaveBeenCalled()
    setItemSpy.mockRestore()
  })

  it('省略した計算パラメータを区分ごとにオンデマンド取得する', async () => {
    const runtime = createRuntime()
    const tools = createWebMcpTools(() => runtime)
    const capabilityTool = getTool(tools, WebMcpToolName.GetCalculationCapabilities)

    // score・unit・schedule・card_count_customを個別に取得し、必要条件の不足も拒否する。
    const score = await capabilityTool.execute({ section: WebMcpCapabilitySection.Score }, executionOptions)
    expect(score).toMatchObject({
      section: WebMcpCapabilitySection.Score,
      actionIds: expect.arrayContaining([enums.ActionIdType.NormalLessonVo]),
      actionCount: { min: 0, max: constant.ACTION_COUNT_MAX, integer: true },
    })

    const unit = await capabilityTool.execute({ section: WebMcpCapabilitySection.Unit }, executionOptions)
    expect(unit).toMatchObject({
      section: WebMcpCapabilitySection.Unit,
      plans: expect.arrayContaining([enums.PlanType.Anomaly]),
      limits: { unitSize: constant.UNIT_SIZE },
    })

    const schedule = await capabilityTool.execute({ section: WebMcpCapabilitySection.Schedule }, executionOptions)
    expect(schedule).toMatchObject({
      section: WebMcpCapabilitySection.Schedule,
      scenario: runtime.getCalculationSnapshot().scoreSettings.scenario,
      weeks: expect.any(Array),
    })
    const hifSchedule = await capabilityTool.execute(
      {
        section: WebMcpCapabilitySection.Schedule,
        scenario: enums.ScenarioType.Hif,
        difficulty: enums.DifficultyType.None,
        hifLessonSplitSub: false,
      },
      executionOptions,
    )
    expect(hifSchedule).toMatchObject({
      section: WebMcpCapabilitySection.Schedule,
      scenario: enums.ScenarioType.Hif,
      difficulty: enums.DifficultyType.None,
      hifLessonSplitSub: false,
      weeks: expect.any(Array),
    })
    expect(
      await capabilityTool.execute(
        {
          section: WebMcpCapabilitySection.Schedule,
          scenario: enums.ScenarioType.Hajime,
          difficulty: enums.DifficultyType.None,
        },
        executionOptions,
      ),
    ).toMatchObject({ error: { code: WebMcpErrorCode.InvalidInput } })

    const cardName = data.AllCards.find((card) => Object.keys(card.abilities).length > 0)!.name
    const cardCustom = await capabilityTool.execute(
      { section: WebMcpCapabilitySection.CardCountCustom, cardName },
      executionOptions,
    )
    expect(cardCustom).toMatchObject({
      section: WebMcpCapabilitySection.CardCountCustom,
      cardName,
      selfTriggerActionIds: expect.any(Array),
      countRange: { min: 0, max: constant.ACTION_COUNT_MAX, integer: true },
    })

    expect(
      await capabilityTool.execute({ section: WebMcpCapabilitySection.CardCountCustom }, executionOptions),
    ).toMatchObject({
      error: { code: WebMcpErrorCode.InvalidInput },
    })
    expect(await capabilityTool.execute({ section: 'unknown' }, executionOptions)).toMatchObject({
      error: { code: WebMcpErrorCode.InvalidInput },
    })
  })

  it('週に存在しない活動や表示モードにないHIF活動を計算へ渡さない', async () => {
    const runtime = createRuntime()
    const tools = createWebMcpTools(() => runtime)
    const normalWeek = data
      .getScheduleData(enums.ScenarioType.Hajime, enums.DifficultyType.Legend)
      .find((week) => week.week === 1)
    if (!normalWeek) throw new Error('テスト用の通常週が見つかりません')

    // 通常週に存在しない活動は比較と明示更新の両方で拒否する。
    const invalidPatch = {
      scoreSettings: {
        scheduleSelections: { [normalWeek.week]: enums.ActivityIdType.ViLesson },
      },
    }
    const comparison = await getTool(tools, WebMcpToolName.CompareSupportCardScores).execute(
      { cardName: data.AllCards[0].name, variants: [{ label: '無効なVi授業', patch: invalidPatch }] },
      executionOptions,
    )
    expect(comparison).toMatchObject({
      variants: [
        {
          label: '無効なVi授業',
          valid: false,
          error: { error: { code: WebMcpErrorCode.InvalidVariant } },
        },
      ],
    })

    const update = await getTool(tools, WebMcpToolName.UpdateCalculationSettings).execute(
      invalidPatch,
      executionOptions,
    )
    expect(update).toEqual({
      error: { code: WebMcpErrorCode.InvalidVariant, message: '計算条件として適用できません' },
    })
    expect(runtime.setScoreSettings).not.toHaveBeenCalled()

    // HIFも現在の表示モードに含まれない活動を拒否する。
    const hifWeek = data
      .getScheduleData(enums.ScenarioType.Hif, enums.DifficultyType.None)
      .find((week) => week.week === 2)
    if (!hifWeek) throw new Error('テスト用のHIFレッスン週が見つかりません')
    const hifPair = hifWeek.activities[0]?.id
    if (!hifPair) throw new Error('テスト用のHIFレッスン活動が見つかりません')
    const hifComparison = await getTool(tools, WebMcpToolName.CompareSupportCardScores).execute(
      {
        cardName: data.AllCards[0].name,
        variants: [
          {
            label: '表示されないHIF複合レッスン',
            patch: {
              scoreSettings: {
                scenario: enums.ScenarioType.Hif,
                scheduleSelections: { [hifWeek.week]: hifPair },
                hifLessonSplitSub: true,
              },
            },
          },
        ],
      },
      executionOptions,
    )
    expect(hifComparison).toMatchObject({
      variants: [{ label: '表示されないHIF複合レッスン', valid: false }],
    })
  })

  it('自動計算中の手動項目と非整数のフォーム値を拒否する', async () => {
    const tools = createWebMcpTools(createRuntime)
    const cardName = data.AllCards.find((card) =>
      card.events.some((event) => event.effect_type === enums.EventEffectType.PItem),
    )!.name

    // 自動管理項目、整数範囲外、UIにないaction IDを含むvariantを拒否する。
    const controlledAction = await getTool(tools, WebMcpToolName.CompareSupportCardScores).execute(
      {
        cardName,
        variants: [
          {
            label: '自動項目の上書き',
            patch: { scoreSettings: { actionCounts: { [enums.ActionIdType.SpLessonVo]: 2 } } },
          },
        ],
      },
      executionOptions,
    )
    expect(controlledAction).toMatchObject({ variants: [{ valid: false }] })

    const fractionalAction = await getTool(tools, WebMcpToolName.CompareSupportCardScores).execute(
      {
        cardName,
        variants: [
          {
            label: '小数回数',
            patch: { scoreSettings: { useScheduleLimits: false, actionCounts: { lesson: 1.5 } } },
          },
        ],
      },
      executionOptions,
    )
    expect(fractionalAction).toMatchObject({
      variants: [{ valid: false, error: { error: { code: WebMcpErrorCode.InvalidInput } } }],
    })

    const extremeAction = await getTool(tools, WebMcpToolName.CompareSupportCardScores).execute(
      {
        cardName,
        variants: [
          {
            label: '極端な回数',
            patch: {
              scoreSettings: {
                useScheduleLimits: false,
                actionCounts: { [enums.ActionIdType.NormalLessonVo]: constant.ACTION_COUNT_MAX + 1 },
              },
            },
          },
        ],
      },
      executionOptions,
    )
    expect(extremeAction).toMatchObject({
      variants: [{ valid: false, error: { error: { code: WebMcpErrorCode.InvalidInput } } }],
    })

    const hiddenAggregateAction = await getTool(tools, WebMcpToolName.CompareSupportCardScores).execute(
      {
        cardName,
        variants: [
          {
            label: '画面にない合算回数',
            patch: { scoreSettings: { useScheduleLimits: false, actionCounts: { lesson: 1 } } },
          },
        ],
      },
      executionOptions,
    )
    expect(hiddenAggregateAction).toMatchObject({
      variants: [{ valid: false, error: { error: { code: WebMcpErrorCode.InvalidInput } } }],
    })

    const hiddenCardAction = await getTool(tools, WebMcpToolName.CompareSupportCardScores).execute(
      {
        cardName,
        variants: [
          {
            label: 'カード画面にない回数調整',
            patch: {
              cardCountCustom: {
                [cardName]: { selfTrigger: { [enums.ActionIdType.Lesson]: 1 } },
              },
            },
          },
        ],
      },
      executionOptions,
    )
    expect(hiddenCardAction).toMatchObject({
      variants: [{ valid: false, error: { error: { code: WebMcpErrorCode.InvalidVariant } } }],
    })

    const fractionalUnit = await getTool(tools, WebMcpToolName.CompareUnitOptimizations).execute(
      {
        variants: [
          {
            label: '小数の初期値',
            patch: { unitSettings: { initialParams: { vocal: 1.5, dance: 0, visual: 0 } } },
          },
        ],
      },
      executionOptions,
    )
    expect(fractionalUnit).toMatchObject({
      variants: [{ valid: false, error: { error: { code: WebMcpErrorCode.InvalidInput } } }],
    })
  })

  it('単体カード比較では点数に影響しない編成設定を拒否する', async () => {
    const tools = createWebMcpTools(createRuntime)
    const cardName = data.AllCards[0].name
    const comparison = await getTool(tools, WebMcpToolName.CompareSupportCardScores).execute(
      {
        cardName,
        variants: [{ patch: { unitSettings: { plan: enums.PlanType.Sense } } }],
      },
      executionOptions,
    )

    expect(comparison).toMatchObject({
      variants: [{ valid: false, error: { error: { code: WebMcpErrorCode.InvalidInput } } }],
    })
  })

  it('不正な入力と存在しないカードを安全に拒否する', async () => {
    const tools = createWebMcpTools(createRuntime)
    const invalidSearch = await getTool(tools, WebMcpToolName.SearchSupportCards).execute(
      { limit: 0 },
      executionOptions,
    )
    expect(invalidSearch).toEqual({
      error: { code: WebMcpErrorCode.InvalidInput, message: 'limitは1から50までの整数で指定してください' },
    })

    const missingCard = await getTool(tools, WebMcpToolName.GetSupportCard).execute(
      { name: '存在しないカード' },
      executionOptions,
    )
    expect(missingCard).toEqual({
      error: { code: WebMcpErrorCode.NotFound, message: 'カードが見つかりません: 存在しないカード' },
    })

    const invalidDetailSections = await getTool(tools, WebMcpToolName.GetSupportCard).execute(
      { name: data.AllCards[0].name, sections: ['unknown'] },
      executionOptions,
    )
    expect(invalidDetailSections).toMatchObject({ error: { code: WebMcpErrorCode.InvalidInput } })
  })

  it('明示的な更新で計算条件を保存用の更新関数へ渡す', async () => {
    const runtime = createRuntime()
    const tools = createWebMcpTools(() => runtime)
    const cardName = data.AllCards.find((card) =>
      card.events.some((event) => event.effect_type === enums.EventEffectType.PItem),
    )!.name
    const excludedCardName = data.AllCards[1].name

    const result = await getTool(tools, WebMcpToolName.UpdateCalculationSettings).execute(
      {
        unitSettings: {
          plan: enums.PlanType.Logic,
          spConstraint: { vocal: 2, dance: 0, visual: 0 },
          lockedCards: [cardName],
          excludedCardNames: [excludedCardName],
        },
        cardUncaps: {
          [cardName]: enums.UncapType.Zero,
          [excludedCardName]: enums.UncapType.Two,
        },
        cardCountCustom: {
          [cardName]: { selfTrigger: { [enums.ActionIdType.PItemAcquire]: 2 } },
        },
      },
      executionOptions,
    )

    expect(result).toMatchObject({
      applied: true,
      changed: {
        unitSettings: true,
        cardUncaps: [cardName, excludedCardName],
        cardCountCustom: [cardName],
      },
      settings: {
        unitSettings: {
          plan: enums.PlanType.Logic,
          spConstraint: { vocal: 2, dance: 0, visual: 0 },
          lockedCards: [cardName],
          excludedCardNames: [excludedCardName],
        },
        cardUncaps: {
          values: {
            [cardName]: enums.UncapType.Zero,
            [excludedCardName]: enums.UncapType.Two,
          },
        },
        cardCountCustom: {
          values: {
            [cardName]: { selfTrigger: { [enums.ActionIdType.PItemAcquire]: 2 } },
          },
        },
      },
    })
    // 指定されていないscore settingsは触らず、更新対象だけをsetterへ渡す。
    expect(runtime.setScoreSettings).not.toHaveBeenCalled()
    expect(runtime.setUnitSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: enums.PlanType.Logic,
        spConstraint: { vocal: 2, dance: 0, visual: 0 },
        lockedCards: [cardName],
        excludedCardNames: [excludedCardName],
      }),
    )
    expect(runtime.setCardUncaps).toHaveBeenCalledWith({
      [cardName]: enums.UncapType.Zero,
      [excludedCardName]: enums.UncapType.Two,
    })
    expect(runtime.setCardCountCustom).toHaveBeenCalledWith({
      [cardName]: { selfTrigger: { [enums.ActionIdType.PItemAcquire]: 2 } },
    })
  })

  it('手動編成の空き枠を複数nullで指定できる', async () => {
    const runtime = createRuntime()
    const selectedCards = [data.AllCards[0].name, null, null, null, null, null]
    const result = await getTool(
      createWebMcpTools(() => runtime),
      WebMcpToolName.UpdateCalculationSettings,
    ).execute({ unitSettings: { selectedCards } }, executionOptions)

    expect(result).toMatchObject({ applied: true })
    expect(runtime.setUnitSettings).toHaveBeenCalledWith(expect.objectContaining({ selectedCards }))
  })

  it('計算条件patchを厳格化しても回数調整の明示削除を受け付ける', async () => {
    const runtime = createRuntime()
    const tool = getTool(
      createWebMcpTools(() => runtime),
      WebMcpToolName.UpdateCalculationSettings,
    )
    const cardName = data.AllCards.find((card) =>
      card.events.some((event) => event.effect_type === enums.EventEffectType.PItem),
    )!.name
    const added = await tool.execute(
      { cardCountCustom: { [cardName]: { selfTrigger: { [enums.ActionIdType.PItemAcquire]: 2 } } } },
      executionOptions,
    )

    expect(added).toMatchObject({ applied: true })
    const cleared = await tool.execute({ clearCardCountCustom: [cardName] }, executionOptions)

    expect(cleared).toMatchObject({ applied: true })
    expect(runtime.setCardCountCustom).toHaveBeenLastCalledWith({})
  })

  it('計算設定の未知キーをWebMCP入力で拒否し、部分更新しない', async () => {
    const runtime = createRuntime()
    const tool = getTool(
      createWebMcpTools(() => runtime),
      WebMcpToolName.UpdateCalculationSettings,
    )
    const invalidInputs: Record<string, unknown>[] = [
      { scoreSettings: { includeSelfTrigger: false, includePitem: false } },
      {
        scoreSettings: {
          parameterBonusBase: { vocal: 1, dance: 2, visual: 3, vocals: 4 },
        },
      },
      { unitSettings: { spConstraint: { vocal: 1, dance: 0, visual: 0, vocals: 2 } } },
      { cardCountCustom: { [data.AllCards[0].name]: { selfTriger: {} } } },
      { scoreSettings: { includeSelfTrigger: false }, unknownSetting: true },
    ]

    // 既知項目と誤記が同時に届いても、既知項目だけを保存しない。
    for (const input of invalidInputs) {
      const result = await tool.execute(input, executionOptions)
      expect(result).toMatchObject({ error: { code: WebMcpErrorCode.InvalidInput } })
    }

    expect(runtime.setScoreSettings).not.toHaveBeenCalled()
    expect(runtime.setUnitSettings).not.toHaveBeenCalled()
    expect(runtime.setCardUncaps).not.toHaveBeenCalled()
    expect(runtime.setCardCountCustom).not.toHaveBeenCalled()
  })

  it('HIFのペア選択をツール更新・保存・再読込後の切り戻しでも保持する', async () => {
    localStorage.clear()
    const original = normalizeScoreSettingsDerived({
      ...createDefaultSettings(enums.ScenarioType.Hif),
      hifLessonSplitSub: false,
      scheduleSelections: { 2: enums.ActivityIdType.VoLessonVi },
    })
    let runtime = createPersistedRuntime(original)
    const tools = createWebMcpTools(() => runtime)
    const update = getTool(tools, WebMcpToolName.UpdateCalculationSettings)
    const result = await update.execute({ scoreSettings: { hifLessonSplitSub: true } }, executionOptions)
    expect(result).toMatchObject({
      applied: true,
      settings: {
        scoreSettings: {
          scheduleSelections: { 2: enums.ActivityIdType.VoLesson },
        },
      },
    })
    const loaded = loadScoreSettings()
    expect(loaded.scheduleSelections).toEqual(original.scheduleSelections)
    expect(loaded.parameterBonusBase).toEqual(
      normalizeScoreSettingsDerived({ ...original, hifLessonSplitSub: true }).parameterBonusBase,
    )
    expect(loaded.parameterBonusBase).not.toEqual(original.parameterBonusBase)
    const schedule = data.getScheduleData(enums.ScenarioType.Hif, enums.DifficultyType.None)
    const mainOnly = { ...loaded, scheduleSelections: { 2: enums.ActivityIdType.VoLesson } }
    expect(mergeScheduleCounts(loaded, schedule)).toEqual(mergeScheduleCounts(mainOnly, schedule))
    expect(
      data.getSpLessonTotal(enums.ScenarioType.Hif, enums.DifficultyType.None, loaded.scheduleSelections, true),
    ).toEqual(
      data.getSpLessonTotal(enums.ScenarioType.Hif, enums.DifficultyType.None, mainOnly.scheduleSelections, true),
    )
    runtime = createPersistedRuntime(loaded)
    const current = await getTool(tools, WebMcpToolName.GetCurrentAppState).execute(
      { sections: [WebMcpCurrentAppStateSection.Calculation] },
      executionOptions,
    )
    expect(current).toHaveProperty(
      'sections.calculation.scoreSettings.scheduleSelections.2',
      enums.ActivityIdType.VoLesson,
    )
    const restored = await update.execute({ scoreSettings: { hifLessonSplitSub: false } }, executionOptions)
    expect(restored).toMatchObject({
      applied: true,
      settings: {
        scoreSettings: {
          scheduleSelections: original.scheduleSelections,
          parameterBonusBase: original.parameterBonusBase,
        },
      },
    })
    expect(loadScoreSettings().scheduleSelections).toEqual(original.scheduleSelections)
    localStorage.clear()
  })

  it('カスタム行の合計をツール応答・保存・再読込後のカード計算へ反映する', async () => {
    localStorage.clear()
    const manual = { vocal: 12, dance: 34, visual: 56 }
    const runtime = createPersistedRuntime({
      ...createDefaultSettings(enums.ScenarioType.Custom),
      manualParameterBonusBase: manual,
    })
    const tools = createWebMcpTools(() => runtime)
    const rows = [
      { vocal: 1000, dance: 2000, visual: 3000 },
      { vocal: 4000, dance: 5000, visual: 6000 },
    ]
    const base = { vocal: 5000, dance: 7000, visual: 9000 }
    const result = await getTool(tools, WebMcpToolName.UpdateCalculationSettings).execute(
      { scoreSettings: { customParamBonusRows: rows } },
      executionOptions,
    )
    expect(result).toMatchObject({ applied: true, settings: { scoreSettings: { parameterBonusBase: base } } })
    expect(JSON.parse(localStorage.getItem(constant.SCORE_SETTINGS_STORAGE_KEY)!)).toMatchObject({
      parameterBonusBase: base,
      manualParameterBonusBase: manual,
    })
    const loaded = loadScoreSettings()
    expect(loaded.parameterBonusBase).toEqual(base)
    expect(loaded.manualParameterBonusBase).toEqual(manual)
    const card = data.AllCards.find((card) => card.abilities.some((ability) => ability.is_parameter_bonus))
    if (!card) throw new Error('パラメータボーナスのカードがありません')
    const expected = calculateCardWithSettings(card, enums.UncapType.Four, { ...loaded, parameterBonusBase: base })
    if (!expected) throw new Error('カスタム行のカード計算がありません')
    expect(expected.totalIncrease).toBeGreaterThan(0)
    expect(
      calculateCardWithSettings(card, enums.UncapType.Four, runtime.getCalculationSnapshot().scoreSettings),
    ).toEqual(expected)
    expect(calculateCardWithSettings(card, enums.UncapType.Four, loaded)).toEqual(expected)
    const toolScore = await getTool(tools, WebMcpToolName.GetSupportCardScore).execute(
      { name: card.name, uncap: enums.UncapType.Four },
      executionOptions,
    )
    expect(toolScore).toMatchObject({
      breakdown: { parameterBonus: expected.parameterBonus, totalIncrease: expected.totalIncrease },
    })
    expect(
      calculateCardWithSettings(card, enums.UncapType.Four, {
        ...loaded,
        parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
      }),
    ).toEqual(expected)
    localStorage.clear()
  })

  it('全カードの凸数を更新し、個別指定を優先する', async () => {
    const runtime = createRuntime()
    const tools = createWebMcpTools(() => runtime)
    const overrideCardName = data.AllCards[0].name
    const expectedUncaps = Object.fromEntries(
      data.AllCards.map((card) => [
        card.name,
        card.name === overrideCardName ? enums.UncapType.Four : enums.UncapType.Two,
      ]),
    )

    const result = await getTool(tools, WebMcpToolName.UpdateCalculationSettings).execute(
      {
        cardUncapAll: enums.UncapType.Two,
        cardUncaps: { [overrideCardName]: enums.UncapType.Four },
      },
      executionOptions,
    )

    expect(result).toMatchObject({
      applied: true,
      changed: { cardUncaps: data.AllCards.map((card) => card.name) },
    })
    expect(runtime.setCardUncaps).toHaveBeenCalledWith(expectedUncaps)
  })

  it('最適編成の条件variantを保存せず比較する', async () => {
    const cards = data.AllCards.slice(0, 7)
    const tools = createWebMcpTools(() => createRuntime(cards))
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')

    // 有効条件を比較し、候補上限と実行不能なSP制約をエラーにする。
    try {
      const comparison = await getTool(tools, WebMcpToolName.CompareUnitOptimizations).execute(
        {
          variants: [
            {
              label: 'フリー・固定・除外',
              patch: {
                unitSettings: {
                  plan: enums.PlanType.Free,
                  exhaustiveCandidateLimit: constant.CANDIDATE_LIMIT_MIN,
                  spConstraint: { vocal: 0, dance: 0, visual: 0 },
                  lockedCards: [cards[0].name],
                  excludedCardNames: [cards[6].name],
                },
              },
            },
          ],
        },
        executionOptions,
      )

      expect(comparison).toMatchObject({
        variants: [{ label: 'フリー・固定・除外', valid: true, result: expect.anything() }],
      })
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(removeItemSpy).not.toHaveBeenCalled()

      const invalidCandidateLimit = await getTool(tools, WebMcpToolName.CompareUnitOptimizations).execute(
        { variants: [{ patch: { unitSettings: { exhaustiveCandidateLimit: constant.CANDIDATE_LIMIT_MIN - 1 } } }] },
        executionOptions,
      )
      expect(invalidCandidateLimit).toMatchObject({
        variants: [{ valid: false, error: { error: { code: WebMcpErrorCode.InvalidInput } } }],
      })

      const infeasibleConstraints = await getTool(tools, WebMcpToolName.CompareUnitOptimizations).execute(
        {
          variants: [
            {
              label: 'SP必要枚数が過大',
              patch: { unitSettings: { spConstraint: { vocal: 6, dance: 6, visual: 6 } } },
            },
          ],
        },
        executionOptions,
      )
      expect(infeasibleConstraints).toMatchObject({
        variants: [
          {
            label: 'SP必要枚数が過大',
            valid: false,
            error: { error: { code: WebMcpErrorCode.NoFeasibleUnit } },
          },
        ],
      })
    } finally {
      setItemSpy.mockRestore()
      removeItemSpy.mockRestore()
    }
  })

  it('実行signalが渡されない比較呼び出しでも計算する', async () => {
    const cards = data.AllCards.slice(0, 7)
    const tools = createWebMcpTools(() => createRuntime(cards))
    const cardName = cards[0].name

    const scoreComparison = await getTool(tools, WebMcpToolName.CompareSupportCardScores).execute({
      cardName,
      variants: [{ label: '現在値', patch: {} }],
    })
    expect(scoreComparison).toMatchObject({ variants: [{ label: '現在値', valid: true }] })

    const unitComparison = await getTool(tools, WebMcpToolName.CompareUnitOptimizations).execute({
      variants: [
        {
          label: 'signalなし',
          patch: {
            unitSettings: {
              plan: enums.PlanType.Free,
              spConstraint: { vocal: 0, dance: 0, visual: 0 },
              lockedCards: [cardName],
              excludedCardNames: [cards[6].name],
            },
          },
        },
      ],
    })
    expect(unitComparison).toMatchObject({
      variants: [{ label: 'signalなし', valid: true, result: expect.anything() }],
    })
  })

  it('渡されたsignalのキャンセルは比較を中止する', async () => {
    const cards = data.AllCards.slice(0, 7)
    const tools = createWebMcpTools(() => createRuntime(cards))
    const controller = new AbortController()
    controller.abort()

    const result = await getTool(tools, WebMcpToolName.CompareUnitOptimizations).execute(
      {
        variants: [{ patch: { unitSettings: { plan: enums.PlanType.Free } } }],
      },
      { signal: controller.signal },
    )

    expect(result).toEqual({
      error: { code: WebMcpErrorCode.Aborted, message: '最適編成比較がキャンセルされました' },
    })
  })

  it('比較中に計算snapshotのdigestが変わったら結果を破棄する', async () => {
    const runtime = createRuntime()
    const initialSnapshot = runtime.getCalculationSnapshot()
    const changedSnapshot = createCalculationSnapshot({
      ...initialSnapshot,
      scoreSettings: {
        ...initialSnapshot.scoreSettings,
        useScheduleLimits: !initialSnapshot.scoreSettings.useScheduleLimits,
      },
    })
    // 実行開始後に別snapshotを返し、古い条件での比較結果を破棄する。
    let snapshotCalls = 0
    vi.spyOn(runtime, 'getCalculationSnapshot').mockImplementation(() => {
      snapshotCalls += 1
      return snapshotCalls === 1 ? initialSnapshot : changedSnapshot
    })
    const tools = createWebMcpTools(() => runtime)

    const result = await getTool(tools, WebMcpToolName.CompareSupportCardScores).execute(
      { cardName: initialSnapshot.allCards[0].name, variants: [{ patch: {} }] },
      executionOptions,
    )

    expect(result).toEqual({
      error: {
        code: WebMcpErrorCode.Stale,
        message: '計算条件が変更されたため、比較結果を破棄しました。もう一度実行してください',
      },
    })
  })

  it('探索中のabortでは途中結果を成功として返さない', async () => {
    const cards = data.AllCards.slice(0, 7)
    const runtime = createRuntime(cards)
    const tools = createWebMcpTools(() => runtime)
    // Workerをstubして探索中にsignalを中断し、workerの停止まで確認する。
    const worker = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as (() => void) | null,
      terminate: vi.fn(),
      postMessage: vi.fn(),
    }
    const originalWorker = globalThis.Worker
    vi.stubGlobal('Worker', function WorkerConstructor() {
      return worker
    })
    const controller = new AbortController()

    try {
      const resultPromise = getTool(tools, WebMcpToolName.CompareUnitOptimizations).execute(
        { variants: [{ patch: { unitSettings: { plan: enums.PlanType.Free } } }] },
        { signal: controller.signal },
      )
      await Promise.resolve()
      controller.abort()

      await expect(resultPromise).resolves.toEqual({
        error: { code: WebMcpErrorCode.Aborted, message: '最適編成比較がキャンセルされました' },
      })
      expect(worker.terminate).toHaveBeenCalledTimes(1)
    } finally {
      if (originalWorker) vi.stubGlobal('Worker', originalWorker)
      else Reflect.deleteProperty(globalThis, 'Worker')
    }
  })

  it('signalのない実行オプションでもキャンセル対応ツールを入力検証まで実行する', async () => {
    const tools = createWebMcpTools(createRuntime)
    const invalidInputs: Array<[WebMcpToolNameType, Record<string, unknown>]> = [
      [WebMcpToolName.UpdateCardFilters, {}],
      [WebMcpToolName.UpdateAppPreferences, {}],
      [WebMcpToolName.UpsertScorePreset, {}],
      [WebMcpToolName.LoadScorePreset, {}],
      [WebMcpToolName.DeleteScorePreset, {}],
      [WebMcpToolName.CompareSupportCardScores, {}],
      [WebMcpToolName.CompareUnitOptimizations, {}],
      [WebMcpToolName.UpsertUserSupportCard, {}],
      [WebMcpToolName.DeleteUserSupportCard, {}],
      [WebMcpToolName.ApplyUserDataImport, {}],
      [WebMcpToolName.UpdateCalculationSettings, {}],
    ]

    // signalがなくてもtoolを実行し、各入力がvalidation errorになることを確認する。
    for (const [name, input] of invalidInputs) {
      const result = await getTool(tools, name).execute(input, {})
      expect(result).toHaveProperty('error')
    }
  })

  it('Reactの状態反映を待ってUndoとUI操作の結果を返す', async () => {
    const runtime = createDelayedRuntime()
    const tools = createWebMcpTools(() => runtime)

    // 遅延反映後にフィルター・表示設定をUndoし、UI開閉の確定状態も取得する。
    await getTool(tools, WebMcpToolName.UpdateCardFilters).execute({ searchTerm: '__delayed_filter__' })
    const filterUndo = await getTool(tools, WebMcpToolName.UndoLastChange).execute({ confirmation: true })
    expect(filterUndo).toEqual({
      applied: true,
      undone: 'カード一覧フィルターの変更',
    })

    await getTool(tools, WebMcpToolName.UpdateAppPreferences).execute({ showMobileBottomNav: false })
    const preferenceUndo = await getTool(tools, WebMcpToolName.UndoLastChange).execute({ confirmation: true })
    expect(preferenceUndo).toEqual({
      applied: true,
      undone: 'アプリ表示設定の変更',
    })

    const uiResult = await getTool(tools, WebMcpToolName.ControlAppUi).execute({
      action: enums.ApplicationUiAction.OpenFilterSort,
    })
    expect(uiResult).toMatchObject({ applied: true, ui: { filterSortOpen: true } })

    const closeFilterResult = await getTool(tools, WebMcpToolName.ControlAppUi).execute({
      action: enums.ApplicationUiAction.CloseFilterSort,
    })
    expect(closeFilterResult).toMatchObject({ applied: true, ui: { filterSortOpen: false } })

    await getTool(tools, WebMcpToolName.ControlAppUi).execute({
      action: enums.ApplicationUiAction.OpenScoreSettings,
    })
    const closeScoreSettingsResult = await getTool(tools, WebMcpToolName.ControlAppUi).execute({
      action: enums.ApplicationUiAction.CloseScoreSettings,
    })
    expect(closeScoreSettingsResult).toMatchObject({
      applied: true,
      changed: true,
      ui: { scoreSettingsOpen: false, settingsPinned: false },
    })
  })

  it('UIが目的状態なら再操作せず、反映されなければ成功扱いにしない', async () => {
    // 既に開いている場合はno-opを返し、状態が動かない場合は同期timeoutを返す。
    const alreadyOpen = createDelayedRuntime()
    await getTool(
      createWebMcpTools(() => alreadyOpen),
      WebMcpToolName.ControlAppUi,
    ).execute({ action: enums.ApplicationUiAction.OpenFilterSort })
    const noChange = await getTool(
      createWebMcpTools(() => alreadyOpen),
      WebMcpToolName.ControlAppUi,
    ).execute({
      action: enums.ApplicationUiAction.OpenFilterSort,
    })
    expect(noChange).toMatchObject({ applied: true, changed: false, ui: { filterSortOpen: true } })

    const ignoredRuntime = createRuntime()
    vi.useFakeTimers()
    try {
      const resultPromise = getTool(
        createWebMcpTools(() => ignoredRuntime),
        WebMcpToolName.ControlAppUi,
      ).execute({
        action: enums.ApplicationUiAction.OpenFilterSort,
      })
      await vi.runAllTimersAsync()
      await expect(resultPromise).resolves.toEqual({
        error: { code: WebMcpErrorCode.StateSyncTimeout, message: '画面操作の反映を確認できませんでした' },
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('application command未接続時は保存操作を中止する', async () => {
    const runtime = createRuntime()
    runtime.applicationCommands = undefined
    const result = await getTool(
      createWebMcpTools(() => runtime),
      WebMcpToolName.UpdateCalculationSettings,
    ).execute({
      unitSettings: { plan: enums.PlanType.Logic },
    })
    expect(result).toEqual({
      error: { code: WebMcpErrorCode.Unsupported, message: '計算設定を保存できなかったため、更新を中止しました' },
    })
    expect(runtime.setUnitSettings).not.toHaveBeenCalled()
  })

  it('フィルターと表示設定の未知キーを拒否し、既知項目も更新しない', async () => {
    const runtime = createRuntime()
    const tools = createWebMcpTools(() => runtime)
    const filterSnapshot = runtime.applicationCommands!.filters.getSnapshot()
    const preferenceSnapshot = runtime.applicationCommands!.preferences.getSnapshot()

    const cases = [
      { name: WebMcpToolName.UpdateCardFilters, input: { searchTerm: 'x', sortRevers: true } },
      { name: WebMcpToolName.UpdateCardFilters, input: { sortRevers: true } },
      {
        name: WebMcpToolName.UpdateAppPreferences,
        input: { showMobileBottomNav: false, keepMobileBottomNavFixd: true },
      },
      { name: WebMcpToolName.UpdateAppPreferences, input: { keepMobileBottomNavFixd: true } },
    ]
    for (const { name, input } of cases) {
      const result = await getTool(tools, name).execute(input, executionOptions)
      expect(result).toMatchObject({ error: { code: WebMcpErrorCode.InvalidInput } })
    }

    expect(runtime.setFilterState).not.toHaveBeenCalled()
    expect(runtime.setPreferences).not.toHaveBeenCalled()
    expect(runtime.applicationCommands!.filters.getSnapshot()).toEqual(filterSnapshot)
    expect(runtime.applicationCommands!.preferences.getSnapshot()).toEqual(preferenceSnapshot)
  })

  it('フィルター全解除を保存し、Undoで解除前の状態へ戻せる', async () => {
    const runtime = createRuntime()
    const tools = createWebMcpTools(() => runtime)
    const tool = getTool(tools, WebMcpToolName.UpdateCardFilters)
    await tool.execute({ searchTerm: 'SSR', rarities: [enums.RarityType.SSR], sortReverse: true }, executionOptions)
    const before = runtime.applicationCommands!.filters.getSnapshot().value

    const cleared = await tool.execute({ clearFilters: true }, executionOptions)
    expect(cleared).toMatchObject({ applied: true, before, after: constant.DEFAULT_FILTER_STATE })
    expect(runtime.applicationCommands!.filters.getSnapshot().value).toEqual(constant.DEFAULT_FILTER_STATE)
    expect(runtime.setFilterState).toHaveBeenLastCalledWith(constant.DEFAULT_FILTER_STATE)
    expect(runtime.applicationCommands!.filters.getSnapshot().value).not.toHaveProperty('clearFilters')

    const undone = await getTool(tools, WebMcpToolName.UndoLastChange).execute({ confirmation: true }, executionOptions)
    expect(undone).toMatchObject({ applied: true })
    expect(runtime.applicationCommands!.filters.getSnapshot().value).toEqual(before)
  })

  it.each([false, true])('clearFilters=%sと更新項目を組み合わせて指定できる', async (clearFilters) => {
    const runtime = createRuntime()
    const tool = getTool(
      createWebMcpTools(() => runtime),
      WebMcpToolName.UpdateCardFilters,
    )
    await tool.execute({ rarities: [enums.RarityType.SSR], sortReverse: true }, executionOptions)
    const updated = await tool.execute({ clearFilters, searchTerm: 'x' }, executionOptions)
    expect(updated).toMatchObject({
      applied: true,
      after: { searchTerm: 'x', rarities: clearFilters ? [] : [enums.RarityType.SSR], sortReverse: !clearFilters },
    })
  })

  it('全解除と誤記・不正な操作値を含む入力は状態を変更しない', async () => {
    const runtime = createRuntime()
    const tool = getTool(
      createWebMcpTools(() => runtime),
      WebMcpToolName.UpdateCardFilters,
    )
    const before = runtime.applicationCommands!.filters.getSnapshot()
    for (const input of [
      { clearFilters: true, searchTerm: 'x', sortRevers: true },
      { clearFilters: 'true', searchTerm: 'x' },
    ]) {
      expect(await tool.execute(input, executionOptions)).toMatchObject({
        error: { code: WebMcpErrorCode.InvalidInput },
      })
    }
    expect(runtime.applicationCommands!.filters.getSnapshot()).toEqual(before)
    expect(runtime.setFilterState).not.toHaveBeenCalled()
  })

  it('フィルターと表示設定を更新し、直前の変更を取り消せる', async () => {
    const runtime = createRuntime()
    const tools = createWebMcpTools(() => runtime)
    const filterResult = await getTool(tools, WebMcpToolName.UpdateCardFilters).execute(
      { searchTerm: 'SSR', rarities: [enums.RarityType.SSR], sortReverse: true },
      executionOptions,
    )
    expect(filterResult).toMatchObject({ applied: true, after: { searchTerm: 'SSR', sortReverse: true } })
    expect(runtime.setFilterState).toHaveBeenCalledWith(
      expect.objectContaining({ searchTerm: 'SSR', rarities: [enums.RarityType.SSR], sortReverse: true }),
    )

    const preferenceResult = await getTool(tools, WebMcpToolName.UpdateAppPreferences).execute(
      { showMobileBottomNav: false },
      executionOptions,
    )
    expect(preferenceResult).toMatchObject({ applied: true, after: { showMobileBottomNav: false } })

    const undoResult = await getTool(tools, WebMcpToolName.UndoLastChange).execute(
      { confirmation: true },
      executionOptions,
    )
    expect(undoResult).toEqual({
      applied: true,
      undone: 'アプリ表示設定の変更',
    })
  })

  it('ユーザー定義サポート削除はプレビューと確認を要求する', async () => {
    const runtime = createRuntime()
    const card = createFormUserSupportCard()
    const tools = createWebMcpTools(() => runtime)
    const addResult = await getTool(tools, WebMcpToolName.UpsertUserSupportCard).execute({ card }, executionOptions)
    expect(addResult).toMatchObject({
      applied: true,
      operation: WebMcpMutationOperation.Created,
      cardName: card.name,
      userSupportNames: [card.name],
    })
    expect(addResult).not.toHaveProperty('userCardNames')

    const currentState = await getTool(tools, WebMcpToolName.GetCurrentAppState).execute({}, executionOptions)
    expect(currentState).toMatchObject({ summary: { userSupportCount: 1 } })
    const detailedState = await getTool(tools, WebMcpToolName.GetCurrentAppState).execute(
      { sections: [WebMcpCurrentAppStateSection.UserSupports] },
      executionOptions,
    )
    expect(detailedState).toMatchObject({
      sections: { user_supports: { count: 1, names: [card.name] } },
    })
    expect(currentState).not.toHaveProperty('userCards')

    // preview tokenは最新の確認だけを有効にし、古いtokenや不一致tokenでの削除を防ぐ。
    const preview = await getTool(tools, WebMcpToolName.PreviewDeleteUserSupportCard).execute(
      { cardName: card.name },
      executionOptions,
    )
    expect(preview).toMatchObject({ confirmationRequired: true, card: { name: card.name } })
    const previewToken = (preview as { previewToken: string }).previewToken

    const latestPreview = await getTool(tools, WebMcpToolName.PreviewDeleteUserSupportCard).execute(
      { cardName: card.name },
      executionOptions,
    )
    const latestPreviewToken = (latestPreview as { previewToken: string }).previewToken
    const superseded = await getTool(tools, WebMcpToolName.DeleteUserSupportCard).execute(
      { cardName: card.name, previewToken, confirmation: true },
      executionOptions,
    )
    expect(superseded).toMatchObject({ error: { code: WebMcpErrorCode.InvalidConfirmation } })

    const rejected = await getTool(tools, WebMcpToolName.DeleteUserSupportCard).execute(
      { cardName: card.name, previewToken: 'wrong', confirmation: true },
      executionOptions,
    )
    expect(rejected).toMatchObject({ error: { code: WebMcpErrorCode.InvalidConfirmation } })

    const deleted = await getTool(tools, WebMcpToolName.DeleteUserSupportCard).execute(
      { cardName: card.name, previewToken: latestPreviewToken, confirmation: true },
      executionOptions,
    )
    expect(deleted).toMatchObject({ applied: true, deletedCardName: card.name })
    expect(runtime.getUserSupports()).toHaveLength(0)
  })

  it('ユーザー追加サポートでフォームにない種別や内部項目を保存しない', async () => {
    const runtime = createRuntime()
    const tools = createWebMcpTools(() => runtime)
    // UIで選べないAssist型と、ユーザー入力に公開しない削除actionを拒否する。
    const invalidType = {
      ...createFormUserSupportCard('UIにないAssist'),
      type: enums.CardType.Assist,
    }
    const invalidTypeResult = await getTool(tools, WebMcpToolName.UpsertUserSupportCard).execute(
      { card: invalidType },
      executionOptions,
    )
    expect(invalidTypeResult).toMatchObject({ error: { code: WebMcpErrorCode.InvalidInput } })

    const invalidInternalField = {
      ...createFormUserSupportCard('UIにないPアイテム内部値'),
      p_item: {
        ...createFormUserSupportCard().p_item!,
        actions: [enums.PItemActionType.Delete],
      },
    }
    const invalidInternalFieldResult = await getTool(tools, WebMcpToolName.UpsertUserSupportCard).execute(
      { card: invalidInternalField },
      executionOptions,
    )
    expect(invalidInternalFieldResult).toMatchObject({ error: { code: WebMcpErrorCode.InvalidInput } })
    expect(runtime.addUserSupport).not.toHaveBeenCalled()
  })

  it('データインポートはプレビュー後の明示確認が必要で、直前の保存を戻せる', async () => {
    const runtime = createRuntime()
    const storageKey = constant.FILTER_STORAGE_KEY
    runtime.refreshFromStorage = vi.fn(async () => {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (isPersistedFilterState(parsed)) runtime.setFilterState(parsed)
      }
    })
    const tools = createWebMcpTools(() => runtime)
    const original = localStorage.getItem(storageKey)
    localStorage.setItem(storageKey, JSON.stringify({ ...constant.DEFAULT_FILTER_STATE, searchTerm: 'before-import' }))

    // export内容を編集してpreviewし、確認tokenで適用した後、Undoで元の保存値へ戻す。
    try {
      const exportResult = await getTool(tools, WebMcpToolName.GetUserDataExport).execute(
        { selectedKeys: [storageKey] },
        executionOptions,
      )
      const exported = JSON.parse((exportResult as { json: string }).json)
      exported.data[storageKey].searchTerm = 'after-import'
      const preview = await getTool(tools, WebMcpToolName.PreviewUserDataImport).execute(
        { json: JSON.stringify(exported), selectedKeys: [storageKey] },
        executionOptions,
      )
      expect(preview).toMatchObject({ confirmationRequired: true, importedKeys: 1 })
      const previewToken = (preview as { previewToken: string }).previewToken

      const applied = await getTool(tools, WebMcpToolName.ApplyUserDataImport).execute(
        { previewToken, confirmation: true },
        executionOptions,
      )
      expect(applied).toMatchObject({
        applied: true,
        reloadRequired: false,
        stateSynchronized: true,
        undoAvailable: true,
      })
      expect(runtime.refreshFromStorage).toHaveBeenCalledTimes(1)
      expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}').searchTerm).toBe('after-import')
      expect(runtime.getFilterState().searchTerm).toBe('after-import')

      await getTool(tools, WebMcpToolName.UndoLastChange).execute({ confirmation: true }, executionOptions)
      expect(runtime.refreshFromStorage).toHaveBeenCalledTimes(2)
      expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}').searchTerm).toBe('before-import')
      expect(runtime.getFilterState().searchTerm).toBe('before-import')
    } finally {
      if (original === null) localStorage.removeItem(storageKey)
      else localStorage.setItem(storageKey, original)
    }
  })

  it('ModelContextがある環境だけにmanifestのツールを登録する', () => {
    const registerTool = vi.fn((tool: unknown, options?: { signal?: AbortSignal }) => {
      void tool
      void options
      return Promise.resolve()
    })
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: { registerTool },
    })
    const controller = new AbortController()

    // 接続signalを渡して全manifestを登録し、不要なschema descriptionを含めない。
    try {
      registerWebMcpTools(createRuntime, controller.signal)
      expect(registerTool).toHaveBeenCalledTimes(WEB_MCP_TOOL_MANIFEST_NAMES.length)
      expect(registerTool.mock.calls[0]?.[0]).toMatchObject({ name: WebMcpToolName.SearchSupportCards })
      expect(registerTool.mock.calls[0]?.[1]).toMatchObject({ signal: expect.any(AbortSignal) })
      const registeredTool = registerTool.mock.calls[0]?.[0] as WebMcpToolDefinition
      expect(registeredTool.description).not.toBe('')
      expect(JSON.stringify(registeredTool.inputSchema)).not.toContain('"description"')
    } finally {
      controller.abort()
      Reflect.deleteProperty(document, 'modelContext')
    }
  })

  it('公開ツール定義を実際の登録形式で合計32KiB・1ツール8KiB未満に保つ', () => {
    const tools = createWebMcpTools(createRuntime)
    const sizes = tools.map(getWebMcpToolUtf8Bytes)
    // 実ブラウザの登録形式はschema objectなので32KiB、JSON文字列へ包む形式は変換分を見込み36KiBに収める。
    expect(getUtf8ByteLength('学マス')).toBeGreaterThan('学マス'.length)
    expect(getWebMcpManifestUtf8Bytes(tools)).toBeLessThan(WEB_MCP_MANIFEST_BUDGET_BYTES)
    expect(getStringSchemaManifestUtf8Bytes(tools)).toBeLessThan(WEB_MCP_STRING_SCHEMA_MANIFEST_BUDGET_BYTES)
    expect(Math.max(...sizes)).toBeLessThan(WEB_MCP_TOOL_BUDGET_BYTES)
  })

  it('公開tool名とmanifest形状をスナップショットとして固定する', () => {
    const tools = createWebMcpTools(createRuntime)
    const manifest = createWebMcpManifest(tools)
    const filterTool = getTool(tools, WebMcpToolName.UpdateCardFilters)
    const calculationManifest = manifest.find(({ name }) => name === WebMcpToolName.UpdateCalculationSettings)
    if (!calculationManifest) throw new Error('計算設定更新toolがmanifestに見つかりません')

    expect(manifest.map(({ name }) => name)).toEqual(WEB_MCP_TOOL_MANIFEST_NAMES)
    expect(filterTool.inputSchema).toMatchObject({
      properties: {
        [WebMcpSchemaField.CardExclusionFilters]: {
          type: 'array',
          items: { type: 'string', enum: Object.values(enums.CardExclusionFilterType) },
        },
      },
    })
    expect(calculationManifest.inputSchema).toMatchObject({
      properties: {
        [WebMcpSchemaField.ScoreSettings]: {
          additionalProperties: false,
        },
        [WebMcpSchemaField.UnitSettings]: {
          additionalProperties: false,
        },
      },
    })
    const calculationProperties = calculationManifest.inputSchema.properties as Record<
      string,
      { properties: Record<string, Record<string, unknown>> }
    >
    const unitSettingsProperties = calculationProperties[WebMcpSchemaField.UnitSettings]!.properties
    expect(unitSettingsProperties[WebMcpSchemaField.SelectedCards]).not.toHaveProperty('uniqueItems')
    expect(manifest).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: WebMcpToolName.SearchSupportCards, inputSchema: expect.any(Object) }),
        expect.objectContaining({ name: WebMcpToolName.GetCurrentAppState, inputSchema: expect.any(Object) }),
        expect.objectContaining({ name: WebMcpToolName.ControlAppUi, inputSchema: expect.any(Object) }),
      ]),
    )
  })

  it('登録名と公開メタデータが一意でJSONへ変換できる', () => {
    const tools = createWebMcpTools(createRuntime)
    expect(new Set(tools.map(({ name }) => name)).size).toBe(tools.length)
    // 各toolの名前形式、表示文言、JSON schema、公開annotationをまとめて検査する。
    for (const tool of tools) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/)
      expect(tool.title.trim()).not.toBe('')
      expect(tool.description.trim()).not.toBe('')
      expect(() => JSON.stringify(tool.inputSchema)).not.toThrow()
      expect(tool.annotations).toEqual({
        readOnlyHint: expect.any(Boolean),
        untrustedContentHint: expect.any(Boolean),
        consequentialHint: expect.any(Boolean),
      })
    }
  })
})

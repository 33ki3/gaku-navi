import * as constant from '../../constant'
import { EXPORT_KEYS } from '../../data/ui'
import type { ExportKey } from '../../data/ui'
import * as enums from '../../types/enums'
import { createDefaultSettings } from '../../utils/scoreSettings'

/** v1/v2の全保存項目を通す互換テスト用データを作る */
export function createCompleteExportValues(includeV2Settings: boolean): Record<ExportKey, unknown> {
  const scoreSettings = {
    ...createDefaultSettings(enums.ScenarioType.Hif),
    name: '互換テスト設定',
    parameterBonusBase: { vocal: 100, dance: 200, visual: 300 },
    actionCounts: Object.fromEntries(Object.values(enums.ActionIdType).map((actionId, index) => [actionId, index])),
    scheduleSelections: {
      1: enums.ActivityIdType.ClassVo,
      2: enums.ActivityIdType.DaLesson,
      3: enums.ActivityIdType.Consult,
    },
    useScheduleLimits: false,
    includeSelfTrigger: false,
    includePItem: false,
    useFixedUncap: true,
    useCustomMode: true,
    customParamBonusRows: [{ vocal: 10, dance: 20, visual: 30 }],
    customClassBonus: { vocal: 40, dance: 50, visual: 60 },
    customNonBonusGain: { vocal: 70, dance: 80, visual: 90 },
    hifExamRatios: [
      { vocal: 1, dance: 2, visual: 3 },
      { vocal: 4, dance: 5, visual: 6 },
      { vocal: 7, dance: 8, visual: 9 },
    ],
    hifLessonSplitSub: false,
  }
  const filterState = {
    searchTerm: '互換テスト',
    rarities: Object.values(enums.RarityType),
    types: Object.values(enums.CardType),
    plans: Object.values(enums.PlanType),
    spOnly: true,
    abilityKeywords: Object.values(enums.AbilityKeywordType),
    eventFilters: Object.values(enums.EventFilterType),
    sources: Object.values(enums.SourceType),
    uncaps: Object.values(enums.UncapType),
    countCustom: Object.values(enums.CountCustomFilter),
    cardExclusionFilters: includeV2Settings ? Object.values(enums.CardExclusionFilterType) : undefined,
    sortMode: enums.SortModeType.Uncap,
    sortReverse: true,
  }
  const unitSettings = {
    ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
    plan: enums.PlanType.Anomaly,
    allowedTypes: Object.values(enums.CardType),
    spConstraint: { vocal: 1, dance: 2, visual: 3 },
    typeCountMin: { vocal: 1, dance: 1, visual: 1 },
    typeCountMax: { vocal: 3, dance: 4, visual: 5 },
    paramBonusPercent: { vocal: 10, dance: 20, visual: 30 },
    manualRental: true,
    rentalCardName: '互換テストレンタル',
    lockedCards: ['互換テスト固定'],
    manualCards: ['手動1', null, '手動3'],
    excludedCardNames: includeV2Settings ? ['互換テスト除外'] : undefined,
    initialParams: { vocal: 100, dance: 200, visual: 300 },
    paramCapOverride: 1800,
    unifyRentalLock: true,
    excludeContestSkillCards: true,
    excludeContestPItems: true,
    ignoreCardExclusions: includeV2Settings ? true : undefined,
    exhaustiveCandidateLimit: 40,
  }
  const userSupport = {
    name: '互換テスト追加サポート',
    rarity: enums.RarityType.SSR,
    type: enums.CardType.Vocal,
    plan: enums.PlanType.Sense,
    parameter_type: enums.ParameterType.Vocal,
    source: enums.SourceType.User,
    is_event_source: true,
    source_detail: '互換テスト入手先',
    release_date: '2026/09/03',
    abilities: [
      {
        name_key: enums.AbilityNameKeyType.ParameterBonus,
        trigger_key: enums.TriggerKeyType.VoParameterBonus,
        values: {},
        parameter_type: enums.ParameterType.Vocal,
        is_percentage: true,
        is_parameter_bonus: true,
      },
      {
        name_key: enums.AbilityNameKeyType.DeleteCount,
        trigger_key: enums.TriggerKeyType.DeleteCount,
        values: {},
        parameter_type: enums.ParameterType.Vocal,
        max_count: 4,
      },
      {
        name_key: enums.AbilityNameKeyType.SupportRate,
        trigger_key: enums.TriggerKeyType.SupportRate,
        values: {},
        is_percentage: true,
        skip_calculation: true,
      },
      {
        name_key: enums.AbilityNameKeyType.InitialStat,
        trigger_key: enums.TriggerKeyType.VoInitialStat,
        values: {},
        parameter_type: enums.ParameterType.Vocal,
        is_initial_stat: true,
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
      {
        release: enums.ReleaseConditionType.Initial,
        effect_type: enums.EventEffectType.PItem,
        title: '初回イベント',
      },
      {
        release: enums.ReleaseConditionType.Lv20,
        effect_type: enums.EventEffectType.ParamBoost,
        title: '2回目イベント',
        param_type: enums.ParameterType.Vocal,
        param_value: 20,
      },
      {
        release: enums.ReleaseConditionType.Lv40,
        effect_type: enums.EventEffectType.CardEnhance,
        title: '3回目イベント',
      },
    ],
    p_item: {
      name: '互換テストPアイテム',
      rarity: enums.PItemRarityType.SSR,
      memory: enums.PItemMemoryType.NonMemorizable,
      trigger_key: enums.TriggerKeyType.ConcentrationCardAcquire,
      provided_action_ids: {
        [enums.ActionIdType.Delete]: 1,
        [enums.ActionIdType.SkillAcquire]: 1,
      },
    },
    skill_card: null,
  }

  const values: Record<ExportKey, unknown> = {
    [constant.UNCAP_STORAGE_KEY]: {
      未所持サポート: enums.UncapType.NotOwned,
      無凸サポート: enums.UncapType.Zero,
      一凸サポート: enums.UncapType.One,
      二凸サポート: enums.UncapType.Two,
      三凸サポート: enums.UncapType.Three,
      四凸サポート: enums.UncapType.Four,
    },
    [constant.SETTINGS_PINNED_KEY]: true,
    [constant.SCORE_SETTINGS_STORAGE_KEY]: scoreSettings,
    [constant.SCHEDULE_SELECTIONS_STORAGE_KEY]: {
      [enums.ScenarioType.Hif]: {
        1: enums.ActivityIdType.SupplyGift,
        2: enums.ActivityIdType.VoLesson,
        3: enums.ActivityIdType.ClassVi,
      },
    },
    [constant.SCORE_PRESETS_STORAGE_KEY]: [{ name: '互換テストプリセット', settings: scoreSettings }],
    [constant.FILTER_STORAGE_KEY]: filterState,
    [constant.CARD_COUNT_CUSTOM_KEY]: {
      互換テストサポート: {
        selfTrigger: Object.fromEntries(Object.values(enums.ActionIdType).map((actionId, index) => [actionId, index])),
        pItemCount: Object.fromEntries(Object.values(enums.ActionIdType).map((actionId, index) => [actionId, index])),
      },
    },
    [constant.UNIT_SIMULATOR_STORAGE_KEY]: unitSettings,
    [constant.USER_SUPPORTS_STORAGE_KEY]: [userSupport],
    [constant.APP_PREFERENCES_STORAGE_KEY]: {
      showMobileBottomNav: false,
      keepMobileBottomNavFixed: includeV2Settings ? true : undefined,
    },
  }

  // 保存キーを追加したときにfixtureの更新漏れが分かるよう、定義順の全キーを必ず持たせる
  if (Object.keys(values).length !== EXPORT_KEYS.length)
    throw new Error('Complete export fixture is missing a storage key')
  return values
}

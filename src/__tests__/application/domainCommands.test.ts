/**
 * 設定ごとの更新処理が共通のルールで動くことを検証する
 *
 * 画面や外部操作を通さず、変更順序・保存結果・画面反映を
 * 同じように扱えることを確認する
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  type ImportCommandState,
  createCalculationCommand,
  createFilterCommand,
  createImportCommand,
  createPreferencesCommand,
  createPresetCommand,
  createUserSupportCommand,
} from '../../application/command'
import { DomainStateStore } from '../../application/domainStateStore'
import * as constant from '../../constant'
import { ApplicationDomain, DomainIssueCode } from '../../types/application'
import type { ScoreSettings, SupportCard } from '../../types/card'
import * as enums from '../../types/enums'
import { createDefaultSettings } from '../../utils/scoreSettings'
import { createTestCommandStatePort } from '../fixtures/application'

interface MemoryStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  setFailOnWrite: (writeNumber: number | undefined) => void
  getWrites: () => number
}

function createMemoryStorage(initial: Record<string, string | null> = {}): MemoryStorage {
  const values = new Map(Object.entries(initial))
  let failOnWrite: number | undefined
  let writes = 0
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      writes += 1
      if (failOnWrite !== undefined && writes === failOnWrite) throw new Error('storage unavailable')
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
    setFailOnWrite: (writeNumber) => {
      failOnWrite = writeNumber
    },
    getWrites: () => writes,
  }
}

function createFilterState() {
  return {
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
}

function createFormUserSupportCard(name = 'command test card'): SupportCard {
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
      name: `${name} Pアイテム`,
      rarity: enums.PItemRarityType.SSR,
      memory: enums.PItemMemoryType.NonMemorizable,
    },
    skill_card: null,
  }
}

describe('domain application commands', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('FilterCommandはpatch/no-op/staleを同じCommandResultで返す', async () => {
    const initialState = createFilterState()
    const store = new DomainStateStore({ domain: ApplicationDomain.Filters, initialValue: initialState })
    const storage = createMemoryStorage()
    const command = createFilterCommand({ state: createTestCommandStatePort(store), storage })
    const initialRevision = command.getSnapshot().revision

    const changed = await command.patch({ searchTerm: 'command' })
    expect(changed).toMatchObject({ ok: true, changed: true, before: initialState, after: { searchTerm: 'command' } })
    if (!changed.ok) throw new Error('filter patch should succeed')
    expect(changed.revision).not.toBe(initialRevision)
    expect(JSON.parse(storage.getItem(constant.FILTER_STORAGE_KEY) ?? '{}')).toMatchObject({ searchTerm: 'command' })

    const noOp = await command.patch({ searchTerm: 'command' })
    expect(noOp).toMatchObject({ ok: true, changed: false, revision: changed.revision })

    const stale = await command.patch({ searchTerm: 'stale' }, { expectedRevision: initialRevision })
    expect(stale).toMatchObject({ ok: false, error: { code: DomainIssueCode.StaleRevision } })
    expect(command.getSnapshot().value.searchTerm).toBe('command')
  })

  it('PreferencesCommandはAbortSignalをwrite前に確認する', async () => {
    const store = new DomainStateStore({
      domain: ApplicationDomain.Preferences,
      initialValue: { ...constant.DEFAULT_APP_PREFERENCES },
    })
    const storage = createMemoryStorage()
    const command = createPreferencesCommand({ state: createTestCommandStatePort(store), storage })
    const controller = new AbortController()
    controller.abort()

    const result = await command.patch({ showMobileBottomNav: false }, { signal: controller.signal })

    expect(result).toEqual({ ok: false, error: { code: DomainIssueCode.Aborted, retryable: true } })
    expect(storage.getWrites()).toBe(0)
    expect(store.getSnapshot().value).toEqual(constant.DEFAULT_APP_PREFERENCES)
  })

  it('CalculationCommandはscore/schedule/unit/uncap/countを5キーtransactionへまとめる', async () => {
    const initial = {
      scoreSettings: createDefaultSettings(enums.ScenarioType.Hif),
      unitSimulatorSettings: { ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS },
      cardUncaps: {},
      cardCountCustom: {},
    }
    const store = new DomainStateStore({ domain: ApplicationDomain.Calculation, initialValue: initial })
    const storage = createMemoryStorage()
    const command = createCalculationCommand({ state: createTestCommandStatePort(store), storage })

    const result = await command.patch({ scoreSettings: { ...initial.scoreSettings, name: 'changed' } })

    expect(result).toMatchObject({ ok: true, changed: true })
    expect(storage.getItem(constant.SCORE_SETTINGS_STORAGE_KEY)).not.toBeNull()
    expect(storage.getItem(constant.SCHEDULE_SELECTIONS_STORAGE_KEY)).not.toBeNull()
    expect(storage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY)).not.toBeNull()
    expect(storage.getItem(constant.UNCAP_STORAGE_KEY)).not.toBeNull()
    expect(storage.getItem(constant.CARD_COUNT_CUSTOM_KEY)).not.toBeNull()
  })

  it('CalculationCommandはHIF保存時にHajimeの週選択を共有キーへ残し、シナリオ別キーへ移行しない', async () => {
    const hajimeSettings: ScoreSettings = {
      ...createDefaultSettings(enums.ScenarioType.Hajime),
      scheduleSelections: { 4: enums.ActivityIdType.VoLesson },
    }
    const hifSettings: ScoreSettings = {
      ...createDefaultSettings(enums.ScenarioType.Hif),
      scheduleSelections: { 20: enums.ActivityIdType.FinalExam },
    }
    const initial = {
      scoreSettings: hifSettings,
      unitSimulatorSettings: { ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS },
      cardUncaps: {},
      cardCountCustom: {},
    }
    const storage = createMemoryStorage({
      [constant.SCORE_SETTINGS_STORAGE_KEY]: JSON.stringify(hajimeSettings),
      [constant.SCHEDULE_SELECTIONS_STORAGE_KEY]: JSON.stringify({
        [enums.ScenarioType.Hif]: { 7: enums.ActivityIdType.MidExam },
      }),
    })
    const store = new DomainStateStore({ domain: ApplicationDomain.Calculation, initialValue: initial })
    const command = createCalculationCommand({ state: createTestCommandStatePort(store), storage })

    const result = await command.patch({ scoreSettings: { ...hifSettings, name: 'updated' } })

    expect(result).toMatchObject({ ok: true, changed: true })
    const sharedSettings = JSON.parse(storage.getItem(constant.SCORE_SETTINGS_STORAGE_KEY) ?? '{}')
    const scheduleSelections = JSON.parse(storage.getItem(constant.SCHEDULE_SELECTIONS_STORAGE_KEY) ?? '{}')
    expect(sharedSettings.scheduleSelections).toEqual(hajimeSettings.scheduleSelections)
    expect(scheduleSelections[enums.ScenarioType.Hif]).toEqual(hifSettings.scheduleSelections)
    expect(scheduleSelections).not.toHaveProperty(enums.ScenarioType.Hajime)
  })

  it('保存途中の失敗はstateを変更せずrollback outcomeを返す', async () => {
    const initial = {
      scoreSettings: createDefaultSettings(),
      unitSimulatorSettings: { ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS },
      cardUncaps: {},
      cardCountCustom: {},
    }
    const store = new DomainStateStore({ domain: ApplicationDomain.Calculation, initialValue: initial })
    const storage = createMemoryStorage()
    storage.setFailOnWrite(2)
    const command = createCalculationCommand({ state: createTestCommandStatePort(store), storage })

    const result = await command.patch({ cardUncaps: { card: enums.UncapType.Four } })

    expect(result).toMatchObject({
      ok: false,
      error: { code: DomainIssueCode.StorageError, params: { outcome: 'rolled_back' } },
    })
    expect(store.getSnapshot().value).toEqual(initial)
    expect(storage.getItem(constant.SCORE_SETTINGS_STORAGE_KEY)).toBeNull()
  })

  it('state同期timeoutはstorageとstateを戻して成功扱いしない', async () => {
    const initial = createFilterState()
    const store = new DomainStateStore({ domain: ApplicationDomain.Filters, initialValue: initial })
    const state = createTestCommandStatePort(store)
    const storage = createMemoryStorage()
    const command = createFilterCommand({
      storage,
      state: { ...state, waitForRevision: () => false },
    })

    const result = await command.patch({ searchTerm: 'timeout' })

    expect(result).toMatchObject({ ok: false, error: { code: DomainIssueCode.StateSyncTimeout } })
    expect(store.getSnapshot().value).toEqual(initial)
    expect(storage.getItem(constant.FILTER_STORAGE_KEY)).toBeNull()
  })

  it('UserSupportCommandは追加・rename・重複・削除を共通化する', async () => {
    const initialValue: SupportCard[] = []
    const store = new DomainStateStore({ domain: ApplicationDomain.UserSupports, initialValue })
    const storage = createMemoryStorage()
    const command = createUserSupportCommand({ state: createTestCommandStatePort(store), storage })
    const card = createFormUserSupportCard()

    const added = await command.upsert(card)
    expect(added).toMatchObject({ ok: true, changed: true, after: [card] })
    expect(command.get(card.name)).toMatchObject({ ok: true, value: card })

    const renamed = await command.rename(card.name, 'renamed card')
    expect(renamed).toMatchObject({ ok: true, after: [{ name: 'renamed card' }] })
    const updated = await command.update('renamed card', { ...card, name: 'updated card' })
    expect(updated).toMatchObject({ ok: true, changed: true, after: [{ name: 'updated card' }] })
    const duplicate = await command.add({ ...card, name: 'updated card' })
    expect(duplicate).toMatchObject({ ok: false, error: { code: DomainIssueCode.Conflict } })
    const missing = await command.remove('not found')
    expect(missing).toMatchObject({ ok: false, error: { code: DomainIssueCode.NotFound } })
    const removed = await command.remove('updated card')
    expect(removed).toMatchObject({ ok: true, after: [] })
  })

  it('PresetCommandは上書き拒否と削除を返す', async () => {
    const store = new DomainStateStore({
      domain: ApplicationDomain.Presets,
      initialValue: [] as { name: string; settings: ReturnType<typeof createDefaultSettings> }[],
    })
    const storage = createMemoryStorage()
    const command = createPresetCommand({ state: createTestCommandStatePort(store), storage })
    const settings = createDefaultSettings()

    const saved = await command.save('preset', settings)
    expect(saved).toMatchObject({ ok: true, after: [{ name: 'preset' }] })
    const conflict = await command.save('preset', settings, { overwrite: false })
    expect(conflict).toMatchObject({ ok: false, error: { code: DomainIssueCode.Conflict } })
    const removed = await command.remove('preset')
    expect(removed).toMatchObject({ ok: true, after: [] })
  })

  it('ImportCommandはvalidated entryだけをpreview/applyし、preview revisionを固定する', async () => {
    const initial: ImportCommandState = { [constant.FILTER_STORAGE_KEY]: 'old' }
    const store = new DomainStateStore({ domain: ApplicationDomain.Import, initialValue: initial })
    const storage = createMemoryStorage({ [constant.FILTER_STORAGE_KEY]: 'old' })
    const command = createImportCommand({ state: createTestCommandStatePort(store), storage })
    const entries = [[constant.FILTER_STORAGE_KEY, 'new']] as const
    const preview = command.preview(entries)

    expect(preview).toMatchObject({ ok: true, value: { baseRevision: store.getSnapshot().revision } })
    if (!preview.ok) throw new Error('preview should succeed')
    const applied = await command.apply(preview.value)
    expect(applied).toMatchObject({ ok: true, changed: true, after: { [constant.FILTER_STORAGE_KEY]: 'new' } })
    expect(storage.getItem(constant.FILTER_STORAGE_KEY)).toBe('new')

    const beforeRestore = command.getSnapshot()
    const restored = await command.restoreState(
      { [constant.FILTER_STORAGE_KEY]: 'old' },
      {
        expectedRevision: applied.ok ? applied.revision : undefined,
      },
    )
    expect(restored).toMatchObject({ ok: true, changed: true, after: { [constant.FILTER_STORAGE_KEY]: 'old' } })
    expect(restored.ok && restored.revision).not.toBe(beforeRestore.revision)

    const stalePreview = command.preview(entries)
    if (!stalePreview.ok) throw new Error('preview should succeed')
    store.commit({ [constant.FILTER_STORAGE_KEY]: 'changed elsewhere' })
    const stale = await command.apply(stalePreview.value)
    expect(stale).toMatchObject({ ok: false, error: { code: DomainIssueCode.StaleRevision } })
  })
})

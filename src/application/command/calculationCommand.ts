/**
 * 点数・編成・凸数・回数調整を一つの保存処理で更新する
 *
 * 計算そのものは扱わず、計算へ渡す条件の検証、複数設定の保存、競合確認、
 * 保存後の画面反映だけを担当する
 */
import * as constant from '../../constant'
import type { CommandResult, DomainStateSnapshot } from '../../types/application'
import { DomainIssueCode } from '../../types/application'
import type { ScenarioScheduleSelections } from '../../types/calculation'
import type { CardCountCustom, ScoreSettings } from '../../types/card'
import * as enums from '../../types/enums'
import type { StorageEntry } from '../../types/storage'
import type { UnitSimulatorSettings } from '../../types/unit'
import { getScoreSettingsForStorage, normalizeScoreSettings } from '../../utils/scoreSettings'
import { isScoreSettings } from '../../utils/scoreSettingsValidation'
import { isUnitSimulatorSettings } from '../../utils/settingsValidation'
import { isCardCountCustom, isScenarioScheduleSelections, isUncapRecord } from '../../utils/storageCollectionValidation'
import { isRecord } from '../../utils/valueValidation'
import { DomainIssuePath, createCommandError, createDomainIssue } from '../result'
import { runPersistedCommand } from './persistedCommand'
import type { CommandOptions, CommandStatePort, CommandStoragePort } from './ports'
import { serializeStorageEntry } from './serialization'

/** 保存対象となる計算条件 */
interface CalculationCommandState {
  /** 点数設定 */
  scoreSettings: ScoreSettings
  /** 最適編成設定 */
  unitSimulatorSettings: UnitSimulatorSettings
  /** サポート名別の凸数 */
  cardUncaps: Record<string, enums.UncapType>
  /** サポート名別の回数調整 */
  cardCountCustom: CardCountCustom
}

/** 計算条件の部分更新 */
interface CalculationCommandPatch {
  /** 更新する点数設定 */
  scoreSettings?: ScoreSettings
  /** 更新する最適編成設定 */
  unitSimulatorSettings?: UnitSimulatorSettings
  /** 更新する凸数 */
  cardUncaps?: Record<string, enums.UncapType>
  /** 更新する回数調整 */
  cardCountCustom?: CardCountCustom
}

/** 計算条件を既存の複数キーへ保存する形式へ変換する処理 */
type CalculationStorageSerializer = (
  value: CalculationCommandState,
  storage?: CommandStoragePort,
) => readonly StorageEntry[]

/** 計算条件の保存処理を作るための設定 */
interface CalculationCommandOptions {
  /** 計算条件の現在値を管理する共通窓口 */
  state: CommandStatePort<CalculationCommandState>
  /** 保存先の差し替え先 */
  storage?: CommandStoragePort
  /** 既存保存形式へ変換する処理。省略時は5つのJSONキーへ保存する */
  serialize?: CalculationStorageSerializer
}

/** 計算条件全体を更新する関数と、その戻り値を参照するための名前付き型 */
export type CalculationCommandUpdate = (
  value: CalculationCommandState,
  options?: CommandOptions,
) => Promise<CommandResult<CalculationCommandState>>

/** 計算条件の更新処理 */
export interface CalculationCommand {
  /** 現在の条件と状態番号を読む */
  getSnapshot: () => DomainStateSnapshot<CalculationCommandState>
  /** 条件を完全に置き換えて保存する */
  update: CalculationCommandUpdate
  /** 条件の一部を置き換えて保存する */
  patch: (value: CalculationCommandPatch, options?: CommandOptions) => Promise<CommandResult<CalculationCommandState>>
}

/**
 * 計算条件全体を検証する
 *
 * @param value - 検証対象の値
 * @returns 計算条件として扱える場合はtrue
 */
function isCalculationState(value: unknown): value is CalculationCommandState {
  if (!isRecord(value)) return false
  return (
    isScoreSettings(value.scoreSettings) &&
    isUnitSimulatorSettings(value.unitSimulatorSettings) &&
    isUncapRecord(value.cardUncaps) &&
    isCardCountCustom(value.cardCountCustom)
  )
}

/**
 * 不正な計算条件を返す
 *
 * @returns 不正入力を表す更新結果
 */
function invalidCalculationResult(): CommandResult<CalculationCommandState> {
  return createCommandError(
    createDomainIssue(DomainIssueCode.InvalidInput, { path: { field: DomainIssuePath.Calculation } }),
  )
}

/**
 * シナリオ別の週選択保存値を作る
 *
 * Hajimeの週選択は点数設定キーに保存し、Customは週選択がないため既存値を維持する。その他は既存の選択を残して現在分を差し替える。
 * @param value - 保存する計算条件
 * @param storage - 既存の週選択を読む保存先
 * @returns シナリオ別キーへ保存する週選択一覧
 */
function createScheduleStorageValue(
  value: CalculationCommandState,
  storage?: CommandStoragePort,
): ScenarioScheduleSelections {
  let existing: ScenarioScheduleSelections = {}
  try {
    // 他シナリオの週選択を残し、現在のシナリオだけを後から差し替える
    const raw = (storage ?? localStorage).getItem(constant.SCHEDULE_SELECTIONS_STORAGE_KEY)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (isScenarioScheduleSelections(parsed)) existing = parsed
    }
  } catch {
    existing = {}
  }
  // Hajimeは点数設定キーに保存し、Customは週選択がないため既存値を変えない
  if (
    value.scoreSettings.scenario === enums.ScenarioType.Hajime ||
    value.scoreSettings.scenario === enums.ScenarioType.Custom
  ) {
    return existing
  }
  return {
    ...existing,
    [value.scoreSettings.scenario]: { ...value.scoreSettings.scheduleSelections },
  }
}

/**
 * 計算条件の保存値を作り、現在シナリオ以外の週選択を共通設定から残す
 *
 * @param value - 保存する計算条件
 * @param storage - 保存済みの共通設定を読む保存先
 * @returns 週選択の配置を保ったスコア設定の保存値
 */
function createScoreSettingsStorageValue(value: CalculationCommandState, storage?: CommandStoragePort): object {
  const persistedSettings = getScoreSettingsForStorage(value.scoreSettings)
  if (persistedSettings.scenario === enums.ScenarioType.Hajime) return persistedSettings

  let previousSettings: ScoreSettings | null = null
  try {
    const raw = (storage ?? localStorage).getItem(constant.SCORE_SETTINGS_STORAGE_KEY)
    if (raw !== null) previousSettings = normalizeScoreSettings(JSON.parse(raw))
  } catch {
    previousSettings = null
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { scheduleSelections: _omitScheduleSelections, ...settingsWithoutSchedule } = persistedSettings
  return previousSettings === null
    ? settingsWithoutSchedule
    : { ...settingsWithoutSchedule, scheduleSelections: previousSettings.scheduleSelections }
}

/**
 * 計算条件を既存の保存キーへ変換する既定の処理
 *
 * @param value - 保存する計算条件
 * @param storage - スケジュールの既存値を読む保存先
 * @returns 保存対象のキーと文字列
 */
function createDefaultStorageEntries(
  value: CalculationCommandState,
  storage?: CommandStoragePort,
): readonly StorageEntry[] {
  const scoreEntry = serializeStorageEntry(
    constant.SCORE_SETTINGS_STORAGE_KEY,
    createScoreSettingsStorageValue(value, storage),
  )
  const unitEntry = serializeStorageEntry(constant.UNIT_SIMULATOR_STORAGE_KEY, value.unitSimulatorSettings)
  const uncapEntry = serializeStorageEntry(constant.UNCAP_STORAGE_KEY, value.cardUncaps)
  const countEntry = serializeStorageEntry(constant.CARD_COUNT_CUSTOM_KEY, value.cardCountCustom)
  if (!scoreEntry.ok || !unitEntry.ok || !uncapEntry.ok || !countEntry.ok) {
    throw new Error('calculation serialization failed')
  }

  const entries: StorageEntry[] = [scoreEntry.value]
  // Hajimeの週選択は点数設定の保存値に含め、シナリオ別の週選択キーには書かない
  if (
    value.scoreSettings.scenario !== enums.ScenarioType.Hajime &&
    value.scoreSettings.scenario !== enums.ScenarioType.Custom
  ) {
    const scheduleEntry = serializeStorageEntry(
      constant.SCHEDULE_SELECTIONS_STORAGE_KEY,
      createScheduleStorageValue(value, storage),
    )
    if (!scheduleEntry.ok) throw new Error('calculation serialization failed')
    entries.push(scheduleEntry.value)
  }
  entries.push(unitEntry.value, uncapEntry.value, countEntry.value)
  return entries
}

/**
 * 計算条件の保存処理を作る
 *
 * @param options - 現在値、保存先、保存形式の設定
 * @returns 計算条件の保存処理
 */
export function createCalculationCommand(options: CalculationCommandOptions): CalculationCommand {
  const { state, storage, serialize = createDefaultStorageEntries } = options

  /**
   * 計算条件全体を検証して保存する
   *
   * @param value - 保存する計算条件
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const runUpdate = (value: CalculationCommandState, commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      if (!isCalculationState(value)) return invalidCalculationResult()
      let entries: readonly StorageEntry[]
      try {
        entries = serialize(value, storage)
      } catch {
        return createCommandError(
          createDomainIssue(DomainIssueCode.SerializationError, {
            path: { field: DomainIssuePath.Calculation },
            retryable: false,
          }),
        )
      }
      return runPersistedCommand<CalculationCommandState>({
        state,
        storage,
        nextValue: value,
        entries,
        options: commandOptions,
      })
    })

  /**
   * 計算条件の一部を検証して保存する
   *
   * @param value - 上書きする計算条件
   * @param commandOptions - 競合確認・中断通知などの実行条件
   * @returns 保存と画面反映の結果
   */
  const patch = (value: CalculationCommandPatch, commandOptions: CommandOptions = {}) =>
    state.runSerialized(async () => {
      const nextValue: CalculationCommandState = { ...state.getSnapshot().value, ...value }
      if (!isCalculationState(nextValue)) return invalidCalculationResult()
      let entries: readonly StorageEntry[]
      try {
        entries = serialize(nextValue, storage)
      } catch {
        return createCommandError(
          createDomainIssue(DomainIssueCode.SerializationError, {
            path: { field: DomainIssuePath.Calculation },
            retryable: false,
          }),
        )
      }
      return runPersistedCommand<CalculationCommandState>({
        state,
        storage,
        nextValue,
        entries,
        options: commandOptions,
      })
    })

  return { getSnapshot: state.getSnapshot, update: runUpdate, patch }
}

/**
 * インポート対象キーとキーごとの保存形式を定義する。
 *
 * インポート処理本体は手順の制御だけを担当し、データ形式の知識は
 * このファイルへ集約する
 */
import * as constant from '../constant'
import { EXPORT_KEYS } from '../data/ui'
import type { ExportKey } from '../data/ui'
import {
  FILTER_ARRAY_FIELD_METADATA,
  IMPORT_VALUE_METADATA,
  SCORE_SETTINGS_ARRAY_FIELD_METADATA,
  UNIT_SETTINGS_ARRAY_FIELD_METADATA,
} from '../data/ui/importData'
import type { ImportArrayFieldMetadata, ImportValueMetadata } from '../data/ui/importData'
import type { TranslationKey } from '../i18n'
import i18n from '../i18n'
import * as enums from '../types/enums'
import { isParameterValues } from './domainValueValidation'
import { isScorePreset, isScorePresetArray, isScoreSettings } from './scoreSettingsValidation'
import { isAppPreferences, isUnitSimulatorSettings } from './settingsValidation'
import {
  isCardCountCustom,
  isPersistedFilterState,
  isScenarioScheduleSelections,
  isUncapRecord,
} from './storageCollectionValidation'
import { isSupportCard, isSupportCardArray } from './supportCardValidation'
import { fillScoreSettingsDefaults } from './scoreSettings'
import { isEnumValue, isRecord } from './valueValidation'

/** 既存のutility利用者へ公開するエクスポート対象キーの型 */
export type { ExportKey }

/** 検証済みの localStorage キーとJSON文字列 */
export type ValidatedStorageEntry = readonly [ExportKey, string]

/** エクスポートJSON全体の構造 */
export interface ExportData {
  /** データ形式のバージョン番号 */
  version: number
  /** エクスポートした日時 */
  exportedAt: string
  /** 保存キーとJSON値 */
  data: Record<string, unknown>
}

/** 配列の一部を救出できなかった要素の情報 */
export interface ImportArrayItemIssue {
  /** 元の配列内での0始まりの位置 */
  index: number
  /** 要素が持っていた名前（取得できる場合） */
  itemName?: string
  /** 不正理由の翻訳キー */
  reasonKey: TranslationKey
}

/** 配列要素単位の部分インポート結果 */
export interface ImportSalvageResult {
  /** 救出して保存する値 */
  value: unknown
  /** 除外した要素の一覧 */
  issues: ImportArrayItemIssue[]
  /** 救出できる要素が1件以上あるか */
  hasUsableValue: boolean
}

/** 配列要素の名前を安全に取り出す */
function getArrayItemName(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.name !== 'string' || value.name.trim() === '') return undefined
  return value.name
}

/** 配列を要素単位で検証し、正常な要素だけを救出する */
function salvageArrayItems(
  value: unknown,
  validateItem: (item: unknown) => boolean,
  fallbackItemName?: string,
): ImportSalvageResult | null {
  if (!Array.isArray(value)) return null

  const validItems: unknown[] = []
  const issues: ImportArrayItemIssue[] = []
  value.forEach((item, index) => {
    let isValid = false
    try {
      isValid = validateItem(item)
    } catch {
      isValid = false
    }

    if (isValid) {
      validItems.push(item)
      return
    }

    issues.push({
      index,
      itemName: getArrayItemName(item) ?? fallbackItemName,
      reasonKey: 'ui.message.import_reason_invalid_array_item',
    })
  })

  if (issues.length === 0) return null

  return {
    value: validItems,
    issues,
    hasUsableValue: validItems.length > 0,
  }
}

/** オブジェクト内の配列フィールドを要素単位で救出する定義 */
type ImportArrayFieldDefinition = ImportArrayFieldMetadata & {
  /** 配列要素の検証関数 */
  validateItem: (item: unknown) => boolean
}

/** オブジェクト内の配列フィールドから、正常な要素だけを救出する */
export function salvageObjectArrayFields(
  value: unknown,
  fields: readonly ImportArrayFieldDefinition[],
  validateValue: (candidate: unknown) => boolean,
): ImportSalvageResult | null {
  if (!isRecord(value)) return null

  const salvagedValue: Record<string, unknown> = { ...value }
  const issues: ImportArrayItemIssue[] = []
  let hasChanged = false
  let hasUsableRequiredArray = true

  for (const field of fields) {
    if (!(field.key in value)) continue
    const fieldValue = value[field.key]
    if (!Array.isArray(fieldValue)) return null

    const result = salvageArrayItems(fieldValue, field.validateItem, i18n.t(field.labelKey))
    if (!result) continue

    salvagedValue[field.key] = result.value
    issues.push(...result.issues)
    hasChanged = true
    if (field.allowEmpty === false && !result.hasUsableValue) {
      hasUsableRequiredArray = false
    }
  }

  if (!hasChanged || !hasUsableRequiredArray || !validateValue(salvagedValue)) return null

  return {
    value: salvagedValue,
    issues,
    hasUsableValue: true,
  }
}

/** 静的メタデータへ検証関数を合成する */
function withValidators(
  metadata: readonly ImportArrayFieldMetadata[],
  validators: Readonly<Partial<Record<enums.ImportArrayFieldKeyType, (item: unknown) => boolean>>>,
): ImportArrayFieldDefinition[] {
  return metadata.map((field) => {
    const validateItem = validators[field.key]
    if (!validateItem) throw new Error(`Missing import validator for ${field.key}`)
    return { ...field, validateItem }
  })
}

/** 点数設定の配列フィールドへ、共通のパラメータ値検証を割り当てる */
const SCORE_SETTINGS_ARRAY_FIELDS = withValidators(SCORE_SETTINGS_ARRAY_FIELD_METADATA, {
  [enums.ImportArrayFieldKeyType.CustomParamBonusRows]: isParameterValues,
  [enums.ImportArrayFieldKeyType.HifExamRatios]: isParameterValues,
})

/** 一覧フィルターの配列フィールドへ、項目ごとのenum検証を割り当てる */
const FILTER_ARRAY_FIELDS = withValidators(FILTER_ARRAY_FIELD_METADATA, {
  [enums.ImportArrayFieldKeyType.Rarities]: (item) => isEnumValue(item, enums.RarityType),
  [enums.ImportArrayFieldKeyType.Types]: (item) => isEnumValue(item, enums.CardType),
  [enums.ImportArrayFieldKeyType.Plans]: (item) => isEnumValue(item, enums.PlanType),
  [enums.ImportArrayFieldKeyType.AbilityKeywords]: (item) => isEnumValue(item, enums.AbilityKeywordType),
  [enums.ImportArrayFieldKeyType.EventFilters]: (item) => isEnumValue(item, enums.EventFilterType),
  [enums.ImportArrayFieldKeyType.Sources]: (item) => isEnumValue(item, enums.SourceType),
  [enums.ImportArrayFieldKeyType.Uncaps]: (item) => isEnumValue(item, enums.UncapType),
  [enums.ImportArrayFieldKeyType.CountCustom]: (item) => isEnumValue(item, enums.CountCustomFilter),
  [enums.ImportArrayFieldKeyType.CardExclusionFilters]: (item) => isEnumValue(item, enums.CardExclusionFilterType),
})

/** 最適編成設定の配列フィールドへ、項目ごとの型検証を割り当てる */
const UNIT_SETTINGS_ARRAY_FIELDS = withValidators(UNIT_SETTINGS_ARRAY_FIELD_METADATA, {
  [enums.ImportArrayFieldKeyType.AllowedTypes]: (item) => isEnumValue(item, enums.CardType),
  [enums.ImportArrayFieldKeyType.LockedCards]: (item) => typeof item === 'string',
  [enums.ImportArrayFieldKeyType.ManualCards]: (item) => typeof item === 'string' || item === null,
  [enums.ImportArrayFieldKeyType.ExcludedCardNames]: (item) => typeof item === 'string' && item.trim() !== '',
})

/** キーごとの検証方法とエラー表示情報 */
interface ImportValueDefinition extends ImportValueMetadata {
  /** 保存値を検証する関数 */
  validate: (value: unknown) => boolean
  /** 保存値で欠けた設定項目へ現在の既定値を補完する処理 */
  fillDefaults: (value: unknown) => unknown
  /** 配列要素単位で救出できる場合の検証処理 */
  salvage?: (value: unknown) => ImportSalvageResult | null
}

/** キー判定を型ガードとして利用するための集合 */
const EXPORT_KEY_SET = new Set<string>(EXPORT_KEYS)

/** 固定項目を持たない保存値は変更せず返す */
const keepStoredValue = (value: unknown): unknown => value

/** 保存オブジェクトへ、値に応じた既定値を先に入れてから保存値を重ねる */
function fillObjectDefaults(
  value: unknown,
  defaults: object | ((storedValue: Record<string, unknown>) => object),
): unknown {
  if (!isRecord(value)) return value
  const resolvedDefaults = typeof defaults === 'function' ? defaults(value) : defaults
  return { ...resolvedDefaults, ...value }
}

/** 点数設定プリセット内の各設定へ、点数設定と同じ既定値を補完する */
function fillScorePresetDefaults(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  return value.map((preset) =>
    isRecord(preset) ? { ...preset, settings: fillScoreSettingsDefaults(preset.settings) } : preset,
  )
}

/** localStorageキーごとの検証ルールと表示情報 */
const IMPORT_VALUE_DEFINITIONS: Record<ExportKey, ImportValueDefinition> = {
  // 各保存キーを個別に検証し、壊れた項目だけを読み飛ばせるようにする
  [constant.UNCAP_STORAGE_KEY]: {
    ...IMPORT_VALUE_METADATA[constant.UNCAP_STORAGE_KEY],
    validate: isUncapRecord,
    fillDefaults: keepStoredValue,
  },
  [constant.SETTINGS_PINNED_KEY]: {
    ...IMPORT_VALUE_METADATA[constant.SETTINGS_PINNED_KEY],
    validate: (value) => typeof value === 'boolean',
    fillDefaults: keepStoredValue,
  },
  [constant.SCORE_SETTINGS_STORAGE_KEY]: {
    ...IMPORT_VALUE_METADATA[constant.SCORE_SETTINGS_STORAGE_KEY],
    validate: isScoreSettings,
    fillDefaults: fillScoreSettingsDefaults,
    salvage: (value) => salvageObjectArrayFields(value, SCORE_SETTINGS_ARRAY_FIELDS, isScoreSettings),
  },
  [constant.SCHEDULE_SELECTIONS_STORAGE_KEY]: {
    ...IMPORT_VALUE_METADATA[constant.SCHEDULE_SELECTIONS_STORAGE_KEY],
    validate: isScenarioScheduleSelections,
    fillDefaults: keepStoredValue,
  },
  [constant.SCORE_PRESETS_STORAGE_KEY]: {
    ...IMPORT_VALUE_METADATA[constant.SCORE_PRESETS_STORAGE_KEY],
    validate: isScorePresetArray,
    fillDefaults: fillScorePresetDefaults,
    salvage: (value) => salvageArrayItems(value, isScorePreset),
  },
  [constant.FILTER_STORAGE_KEY]: {
    ...IMPORT_VALUE_METADATA[constant.FILTER_STORAGE_KEY],
    validate: isPersistedFilterState,
    fillDefaults: (value) => fillObjectDefaults(value, constant.DEFAULT_FILTER_STATE),
    salvage: (value) => salvageObjectArrayFields(value, FILTER_ARRAY_FIELDS, isPersistedFilterState),
  },
  [constant.CARD_COUNT_CUSTOM_KEY]: {
    ...IMPORT_VALUE_METADATA[constant.CARD_COUNT_CUSTOM_KEY],
    validate: isCardCountCustom,
    fillDefaults: keepStoredValue,
  },
  [constant.UNIT_SIMULATOR_STORAGE_KEY]: {
    ...IMPORT_VALUE_METADATA[constant.UNIT_SIMULATOR_STORAGE_KEY],
    validate: isUnitSimulatorSettings,
    fillDefaults: (value) => fillObjectDefaults(value, constant.DEFAULT_UNIT_SIMULATOR_SETTINGS),
    salvage: (value) => salvageObjectArrayFields(value, UNIT_SETTINGS_ARRAY_FIELDS, isUnitSimulatorSettings),
  },
  [constant.USER_SUPPORTS_STORAGE_KEY]: {
    ...IMPORT_VALUE_METADATA[constant.USER_SUPPORTS_STORAGE_KEY],
    validate: isSupportCardArray,
    fillDefaults: keepStoredValue,
    salvage: (value) => salvageArrayItems(value, isSupportCard),
  },
  [constant.APP_PREFERENCES_STORAGE_KEY]: {
    ...IMPORT_VALUE_METADATA[constant.APP_PREFERENCES_STORAGE_KEY],
    validate: isAppPreferences,
    fillDefaults: (value) => fillObjectDefaults(value, constant.DEFAULT_APP_PREFERENCES),
  },
}

/**
 * 文字列がインポート対象キーか判定する
 *
 * @param key - 判定する localStorage キー
 * @returns 対象キーなら true
 */
export function isExportKey(key: string): key is ExportKey {
  return EXPORT_KEY_SET.has(key)
}

/**
 * JSON全体が現在のエクスポート形式か判定する
 *
 * @param value - JSON.parse 後の値
 * @returns バージョン、日時、data が正しければ true
 */
export function isExportData(value: unknown): value is ExportData {
  return (
    isRecord(value) &&
    typeof value.version === 'number' &&
    Number.isInteger(value.version) &&
    value.version >= constant.MIN_SUPPORTED_EXPORT_VERSION &&
    value.version <= constant.EXPORT_VERSION &&
    typeof value.exportedAt === 'string' &&
    isRecord(value.data)
  )
}

/**
 * キーに対応する検証定義を返す
 *
 * @param key - 検証する保存キー
 * @returns 項目名、検証関数、エラー理由
 */
export function getImportValueDefinition(key: ExportKey): ImportValueDefinition {
  return IMPORT_VALUE_DEFINITIONS[key]
}

/** 選択された保存カテゴリの不足項目へ、カテゴリごとの現在の既定値を補完する */
export function fillImportValueDefaults(key: ExportKey, value: unknown): unknown {
  return getImportValueDefinition(key).fillDefaults(value)
}

/**
 * インポート画面で使う静的な保存形式メタデータ。
 *
 * 翻訳キー・配列フィールド名・エラー分類は表示と定義に関するデータとして管理し、
 * 値の検証や部分救出の処理はsrc/utilsへ置く。
 */
import type { TranslationKey } from '../../i18n'
import * as enums from '../../types/enums'
import {
  APP_PREFERENCES_STORAGE_KEY,
  CARD_COUNT_CUSTOM_KEY,
  FILTER_STORAGE_KEY,
  SCHEDULE_SELECTIONS_STORAGE_KEY,
  SCORE_PRESETS_STORAGE_KEY,
  SCORE_SETTINGS_STORAGE_KEY,
  SETTINGS_PINNED_KEY,
  UNCAP_STORAGE_KEY,
  UNIT_SIMULATOR_STORAGE_KEY,
  USER_SUPPORTS_STORAGE_KEY,
} from '../../constant/common'
import type { ExportKey } from './exportImport'

/** オブジェクト内の配列フィールドに対応する静的メタデータ */
export interface ImportArrayFieldMetadata {
  /** 配列を持つプロパティ名 */
  key: enums.ImportArrayFieldKeyType
  /** 警告に表示する配列の意味の翻訳キー */
  labelKey: TranslationKey
  /** 配列が空になった場合もオブジェクトを利用可能とみなすか */
  allowEmpty?: boolean
}

/** 点数設定の配列フィールドメタデータ */
export const SCORE_SETTINGS_ARRAY_FIELD_METADATA: readonly ImportArrayFieldMetadata[] = [
  {
    key: enums.ImportArrayFieldKeyType.CustomParamBonusRows,
    labelKey: 'ui.message.import_field_custom_param',
  },
  {
    key: enums.ImportArrayFieldKeyType.HifExamRatios,
    labelKey: 'ui.message.import_field_hif_ratio',
  },
]

/** 一覧フィルターの配列フィールドメタデータ */
export const FILTER_ARRAY_FIELD_METADATA: readonly ImportArrayFieldMetadata[] = [
  {
    key: enums.ImportArrayFieldKeyType.Rarities,
    labelKey: 'ui.message.import_field_rarity',
  },
  {
    key: enums.ImportArrayFieldKeyType.Types,
    labelKey: 'ui.message.import_field_type',
  },
  {
    key: enums.ImportArrayFieldKeyType.Plans,
    labelKey: 'ui.message.import_field_plan',
  },
  {
    key: enums.ImportArrayFieldKeyType.AbilityKeywords,
    labelKey: 'ui.message.import_field_ability',
  },
  {
    key: enums.ImportArrayFieldKeyType.EventFilters,
    labelKey: 'ui.message.import_field_event',
  },
  {
    key: enums.ImportArrayFieldKeyType.Sources,
    labelKey: 'ui.message.import_field_source',
  },
  {
    key: enums.ImportArrayFieldKeyType.Uncaps,
    labelKey: 'ui.message.import_field_uncap',
  },
  {
    key: enums.ImportArrayFieldKeyType.CountCustom,
    labelKey: 'ui.message.import_field_count',
  },
]

/** 最適編成設定の配列フィールドメタデータ */
export const UNIT_SETTINGS_ARRAY_FIELD_METADATA: readonly ImportArrayFieldMetadata[] = [
  {
    key: enums.ImportArrayFieldKeyType.AllowedTypes,
    labelKey: 'ui.message.import_field_allowed_type',
  },
  {
    key: enums.ImportArrayFieldKeyType.LockedCards,
    labelKey: 'ui.message.import_field_locked_card',
  },
  {
    key: enums.ImportArrayFieldKeyType.ManualCards,
    labelKey: 'ui.message.import_field_manual_card',
  },
]

/** 保存キーごとの表示ラベルと不正理由に関する静的メタデータ */
export interface ImportValueMetadata {
  /** 画面に表示する項目名の翻訳キー */
  labelKey: TranslationKey
  /** 不正時に表示する理由の翻訳キー */
  invalidReasonKey: TranslationKey
}

/** localStorageキーごとのインポート表示メタデータ */
export const IMPORT_VALUE_METADATA: Record<ExportKey, ImportValueMetadata> = {
  [UNCAP_STORAGE_KEY]: {
    labelKey: 'ui.message.import_item_uncap',
    invalidReasonKey: 'ui.message.import_reason_invalid_map',
  },
  [SETTINGS_PINNED_KEY]: {
    labelKey: 'ui.message.import_item_panel_fixed',
    invalidReasonKey: 'ui.message.import_reason_boolean',
  },
  [SCORE_SETTINGS_STORAGE_KEY]: {
    labelKey: 'ui.message.import_item_score_settings',
    invalidReasonKey: 'ui.message.import_reason_invalid_structure',
  },
  [SCHEDULE_SELECTIONS_STORAGE_KEY]: {
    labelKey: 'ui.message.import_item_schedule',
    invalidReasonKey: 'ui.message.import_reason_invalid_map',
  },
  [SCORE_PRESETS_STORAGE_KEY]: {
    labelKey: 'ui.message.import_item_score_presets',
    invalidReasonKey: 'ui.message.import_reason_invalid_array',
  },
  [FILTER_STORAGE_KEY]: {
    labelKey: 'ui.message.import_item_filter',
    invalidReasonKey: 'ui.message.import_reason_invalid_structure',
  },
  [CARD_COUNT_CUSTOM_KEY]: {
    labelKey: 'ui.message.import_item_count_custom',
    invalidReasonKey: 'ui.message.import_reason_invalid_map',
  },
  [UNIT_SIMULATOR_STORAGE_KEY]: {
    labelKey: 'ui.message.import_item_unit_settings',
    invalidReasonKey: 'ui.message.import_reason_invalid_structure',
  },
  [USER_SUPPORTS_STORAGE_KEY]: {
    labelKey: 'ui.message.import_item_user_supports',
    invalidReasonKey: 'ui.message.import_reason_invalid_array',
  },
  [APP_PREFERENCES_STORAGE_KEY]: {
    labelKey: 'ui.message.import_item_app_preferences',
    invalidReasonKey: 'ui.message.import_reason_invalid_structure',
  },
}

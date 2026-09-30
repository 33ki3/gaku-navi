/**
 * localStorage に残っているアプリデータの健全性を確認する。
 *
 * インポート時の検証をすり抜けた値や、過去のアプリ版から残った値で
 * 画面描画が失敗した場合に、エラー画面から破棄対象を特定するために使う
 */
import * as constant from '../constant'
import { EXPORT_KEYS } from '../data/ui'
import type { TranslationKey } from '../i18n'
import i18n from '../i18n'
import * as enums from '../types/enums'
import type { ImportSalvageResult } from './importDataValidation'
import { fillImportValueDefaults, getImportValueDefinition, salvageObjectArrayFields } from './importDataValidation'
import { isStoredUnitMember, isStoredUnitResult } from './unitResultStorageValidation'

/** エラー画面から確認・破棄できる保存データの定義 */
interface StorageHealthDefinition {
  /** localStorageキー */
  key: string
  /** 画面表示用の項目名 */
  labelKey: TranslationKey
  /** パース後の値を検証する関数 */
  validate: (value: unknown) => boolean
  /** 検証に失敗したときの理由の翻訳キー */
  invalidReasonKey: TranslationKey
  /** 旧保存データの不足項目を検証前に補完する処理 */
  fillDefaults?: (value: unknown) => unknown
  /** 配列要素単位で救出できる場合の検証処理 */
  salvage?: (value: unknown) => ImportSalvageResult | null
}

/** 保存データ内の個別不正要素 */
export interface StorageHealthIssueDetail {
  /** 元データ内での1始まりの位置 */
  index: number
  /** 要素名（取得できる場合） */
  item?: string
  /** 不正理由 */
  reason: string
}

/** 保存データの健全性に関する問題 */
export interface StorageHealthIssue {
  /** 破棄対象のlocalStorageキー */
  key: string
  /** 画面表示用の項目名 */
  item: string
  /** 不正と判定した理由 */
  reason: string
  /** 配列内で検出した不正要素 */
  details: StorageHealthIssueDetail[]
  /** 検出データを除外・破棄して復旧できるか */
  canRepair: boolean
}

/**
 * エクスポート対象データに、最適編成結果キャッシュを加えた検証一覧。
 * 結果キャッシュはエクスポート対象外だが、壊れていても再計算で復旧できるため
 * エラー画面から個別に破棄できるようにする
 */
const STORAGE_HEALTH_DEFINITIONS: StorageHealthDefinition[] = [
  ...EXPORT_KEYS.map((key): StorageHealthDefinition => {
    const definition = getImportValueDefinition(key)
    return {
      key,
      labelKey: definition.labelKey,
      validate: definition.validate,
      invalidReasonKey: definition.invalidReasonKey,
      fillDefaults: (value) => fillImportValueDefaults(key, value),
      salvage: definition.salvage,
    }
  }),
  {
    key: constant.UNIT_RESULT_STORAGE_KEY,
    labelKey: 'ui.message.import_item_unit_result',
    validate: isStoredUnitResult,
    invalidReasonKey: 'ui.message.import_reason_invalid_structure',
    salvage: (value) =>
      salvageObjectArrayFields(
        value,
        [
          {
            key: enums.ImportArrayFieldKeyType.Members,
            labelKey: 'ui.message.import_item_unit_members',
            validateItem: isStoredUnitMember,
            allowEmpty: false,
          },
        ],
        isStoredUnitResult,
      ),
  },
]

/**
 * localStorage内の保存データを検査する
 *
 * @returns 壊れている可能性がある保存データ一覧
 */
export function inspectStoredData(): StorageHealthIssue[] {
  const issues: StorageHealthIssue[] = []

  for (const definition of STORAGE_HEALTH_DEFINITIONS) {
    let raw: string | null
    try {
      raw = localStorage.getItem(definition.key)
    } catch {
      issues.push({
        key: definition.key,
        item: i18n.t(definition.labelKey),
        reason: i18n.t('ui.message.data_read_failed'),
        details: [],
        canRepair: false,
      })
      continue
    }

    if (raw === null) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      issues.push({
        key: definition.key,
        item: i18n.t(definition.labelKey),
        reason: i18n.t('ui.message.import_reason_json_syntax', { location: '' }),
        details: [],
        canRepair: true,
      })
      continue
    }

    const value = definition.fillDefaults?.(parsed) ?? parsed
    let isValid = false
    try {
      isValid = definition.validate(value)
    } catch {
      isValid = false
    }

    if (!isValid) {
      let salvageResult: ImportSalvageResult | null = null
      try {
        salvageResult = definition.salvage?.(value) ?? null
      } catch {
        salvageResult = null
      }

      issues.push({
        key: definition.key,
        item: i18n.t(definition.labelKey),
        reason: salvageResult?.issues.length
          ? i18n.t('ui.message.import_reason_partial_array')
          : i18n.t(definition.invalidReasonKey),
        details:
          salvageResult?.issues.map((detail) => ({
            index: detail.index + 1,
            item: detail.itemName,
            reason: i18n.t(detail.reasonKey),
          })) ?? [],
        canRepair: true,
      })
    }
  }

  return issues
}

/**
 * 指定した保存データを破棄する
 *
 * @param key - 破棄するlocalStorageキー
 * @returns 破棄できた場合に true
 */
export function discardStoredData(key: string): boolean {
  if (!STORAGE_HEALTH_DEFINITIONS.some((definition) => definition.key === key)) return false

  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/**
 * 検出済みの保存データをまとめて破棄する
 *
 * @param keys - 破棄対象のキー一覧
 * @returns すべて破棄できた場合に true
 */
export function discardStoredDataBatch(keys: string[]): boolean {
  const results = keys.map(discardStoredData)
  return results.every(Boolean)
}

/** 壊れた保存データを可能な範囲で修復し、復旧できない場合は削除する */
export function repairStoredData(key: string): boolean {
  const definition = STORAGE_HEALTH_DEFINITIONS.find((candidate) => candidate.key === key)
  if (!definition) return false

  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return true

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      localStorage.removeItem(key)
      return true
    }

    const value = definition.fillDefaults?.(parsed) ?? parsed
    try {
      if (definition.validate(value)) return true
    } catch {
      /** 検証例外も通常の破損値として修復処理へ進める */
    }

    let salvageResult: ImportSalvageResult | null = null
    try {
      salvageResult = definition.salvage?.(value) ?? null
    } catch {
      salvageResult = null
    }

    if (salvageResult?.hasUsableValue) {
      localStorage.setItem(key, JSON.stringify(salvageResult.value))
    } else {
      localStorage.removeItem(key)
    }
    return true
  } catch {
    return false
  }
}

/** 壊れた保存データを可能な範囲でまとめて修復する */
export function repairStoredDataBatch(keys: string[]): boolean {
  const results = keys.map(repairStoredData)
  return results.every(Boolean)
}

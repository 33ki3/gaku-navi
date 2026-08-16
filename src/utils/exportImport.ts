/**
 * ユーザーデータのエクスポート／インポート窓口。
 *
 * JSONの詳細検証とストレージ更新は専用モジュールへ委譲し、
 * このファイルでは処理の順序と公開APIだけを管理する。
 */
import * as constant from '../constant'
import { EXPORT_KEYS } from '../data/ui'
import type { ExportKey } from '../data/ui'
import i18n from '../i18n'
import { formatExportFileTimestamp, formatExportedAt } from './exportTimestamp'
import type { ExportData, ValidatedStorageEntry } from './importDataValidation'
import { getImportValueDefinition, isExportKey } from './importDataValidation'
import { parseImportText } from './importTextParser'
import { applyStorageEntries, createStorageSnapshot } from './storageTransaction'
import { isRecord } from './valueValidation'

type SelectedKeysSource = readonly ExportKey[] | (() => readonly ExportKey[])

/** インポート処理の結果 */
interface ImportResult {
  /** 成功したかどうか */
  success: boolean
  /** ユーザーに表示するメッセージ */
  message: string
  /** 復元したキーの数 */
  importedKeys?: number
  /** 補完・スキップした項目の警告 */
  warnings?: string[]
}

/** 保存前に検証だけ行ったインポートデータ */
export interface ImportPreview {
  /** 検証を通過した保存エントリ。全件不正・構文エラー時は null */
  entries: ValidatedStorageEntry[] | null
  /** 確認画面とデータ管理欄に表示するメッセージ */
  message: string
  /** 選択状態による案内 */
  selectionWarnings: string[]
  /** データ形式や値の検証による警告 */
  validationWarnings: string[]
  /** 選択状態・検証結果をまとめた警告 */
  warnings: string[]
  /** 保存可能なエントリ数 */
  importedKeys: number
  /** 1件以上保存可能なデータがあるか */
  canImport: boolean
  /** 保存可能な項目の表示名 */
  importedItems: string[]
  /** JSONには存在するが、画面で選択されていない保存キー */
  excludedKeys: ExportKey[]
  /** 画面では選択されているが、JSONに存在しない保存キー */
  missingKeys: ExportKey[]
}

/**
 * 現在のユーザーデータを整形済みJSON文字列にする。
 *
 * @param date JSONへ記録する日時。省略時は現在時刻
 * @param selectedKeys 入出力対象にする保存キー。省略時は全対象
 * @returns バージョンと保存日時を含むJSON文字列
 */
export function getUserDataJson(date = new Date(), selectedKeys: readonly ExportKey[] = EXPORT_KEYS): string {
  // 保存対象を定義順に走査し、存在するキーだけを一時データへ集める
  const selectedKeySet = new Set(selectedKeys)
  const rawData: Record<string, unknown> = {}
  for (const key of EXPORT_KEYS) {
    if (!selectedKeySet.has(key)) continue
    const value = localStorage.getItem(key)
    if (value !== null) {
      rawData[key] = value
    }
  }

  // インポート時と同じ検証を通し、壊れたキーをバックアップへ持ち出さない
  const exportedAt = formatExportedAt(date)
  const validated = parseImportText(
    JSON.stringify({ version: constant.EXPORT_VERSION, exportedAt, data: rawData }),
    selectedKeys,
  )
  const data: Record<string, unknown> = {}
  for (const [key, value] of validated.entries ?? []) {
    data[key] = JSON.parse(value)
  }

  const exportData: ExportData = {
    version: constant.EXPORT_VERSION,
    exportedAt,
    data,
  }
  return JSON.stringify(exportData, null, 2)
}

/**
 * ユーザーデータをJSONファイルとしてダウンロードする。
 *
 * @param selectedKeys 入出力対象にする保存キー。省略時は全対象
 * @returns 戻り値なし
 */
export function exportUserData(selectedKeys: readonly ExportKey[] = EXPORT_KEYS): void {
  const date = new Date()
  const blob = new Blob([getUserDataJson(date, selectedKeys)], { type: constant.EXPORT_MIME_TYPE })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${constant.EXPORT_FILE_PREFIX}${formatExportFileTimestamp(date)}${constant.EXPORT_FILE_EXT}`

  try {
    document.body.appendChild(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    URL.revokeObjectURL(url)
  }
}

/** 解析結果の選択差分を確認画面用の警告文へ変換する */
function createSelectionMessages(parsed: ReturnType<typeof parseImportText>): string[] {
  const messages: string[] = []
  if (parsed.excludedKeys.length > 0) {
    messages.push(
      i18n.t('ui.message.import_selection_excluded', {
        items: parsed.excludedKeys.map((key) => i18n.t(getImportValueDefinition(key).labelKey)).join('、'),
      }),
    )
  }
  if (parsed.missingKeys.length > 0) {
    messages.push(
      i18n.t('ui.message.import_selection_missing', {
        items: parsed.missingKeys.map((key) => i18n.t(getImportValueDefinition(key).labelKey)).join('、'),
      }),
    )
  }
  return messages
}

/** 解析結果から確認画面用のインポートプレビューを作る */
function createImportPreview(parsed: ReturnType<typeof parseImportText>): ImportPreview {
  const selectionMessages = createSelectionMessages(parsed)
  const validationWarnings = parsed.warnings
  const warnings = [...selectionMessages, ...validationWarnings]
  if (parsed.entries === null) {
    const message = createImportMessage(parsed.error ?? i18n.t('ui.message.import_invalid_format'), warnings)
    return {
      entries: null,
      message,
      selectionWarnings: selectionMessages,
      validationWarnings,
      warnings,
      importedKeys: 0,
      canImport: false,
      importedItems: [],
      excludedKeys: parsed.excludedKeys,
      missingKeys: parsed.missingKeys,
    }
  }
  const readyMessage = i18n.t('ui.message.import_ready', { count: parsed.entries.length })
  const message = createImportMessage(readyMessage, warnings)
  return {
    entries: parsed.entries,
    message,
    selectionWarnings: selectionMessages,
    validationWarnings,
    warnings,
    importedKeys: parsed.entries.length,
    canImport: parsed.entries.length > 0,
    importedItems: parsed.entries.map(([key]) => i18n.t(getImportValueDefinition(key).labelKey)),
    excludedKeys: parsed.excludedKeys,
    missingKeys: parsed.missingKeys,
  }
}

/** インポート結果の主文と警告を翻訳テンプレートで結合する */
function createImportMessage(message: string, warnings: string[]): string {
  if (warnings.length === 0) return message
  return i18n.t('ui.message.import_message_with_warnings', {
    message,
    warnings: warnings.join('\n'),
  })
}

/** JSON文字列を検証し、保存前のプレビューを作る */
export function prepareImportText(text: string, selectedKeys: readonly ExportKey[] = EXPORT_KEYS): ImportPreview {
  return createImportPreview(parseImportText(text, selectedKeys))
}

/** JSONファイルを読み込み、保存前のプレビューを作る */
export async function prepareImportFile(
  file: File,
  selectedKeys: SelectedKeysSource = EXPORT_KEYS,
): Promise<ImportPreview> {
  try {
    const text = await file.text()
    const resolvedKeys = typeof selectedKeys === 'function' ? selectedKeys() : selectedKeys
    return prepareImportText(text, resolvedKeys)
  } catch {
    return {
      entries: null,
      message: i18n.t('ui.message.import_read_error'),
      selectionWarnings: [],
      validationWarnings: [],
      warnings: [],
      importedKeys: 0,
      canImport: false,
      importedItems: [],
      excludedKeys: [],
      missingKeys: [],
    }
  }
}

/** JSON文字列の外側を選択中の保存キーだけに絞り込む */
export function filterImportJsonText(text: string, selectedKeys: readonly ExportKey[]): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return text
  }
  if (!isRecord(parsed) || !isRecord(parsed.data)) return text

  const selectedKeySet = new Set(selectedKeys)
  const normalizedData = normalizeExportDataValues(parsed.data)
  const data: Record<string, unknown> = {}
  for (const key of EXPORT_KEYS) {
    if (selectedKeySet.has(key) && Object.prototype.hasOwnProperty.call(parsed.data, key)) {
      data[key] = normalizedData[key]
    }
  }
  return JSON.stringify({ ...parsed, data }, null, 2)
}

/** エクスポートJSON内の旧形式のJSON文字列をJSON値へ戻す */
function normalizeExportDataValues(data: Record<string, unknown>): Record<string, unknown> {
  const normalizedData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'string' || !isExportKey(key)) {
      normalizedData[key] = value
      continue
    }

    try {
      normalizedData[key] = JSON.parse(value)
    } catch {
      // 壊れた値は表示用JSONでも文字列として残し、インポート時の警告で知らせる
      normalizedData[key] = value
    }
  }
  return normalizedData
}

/** 選択中の編集内容を全選択分のJSONへ戻し、選択状態を変更しても編集内容を保持する */
export function mergeImportJsonText(
  sourceText: string,
  editedText: string,
  selectedKeys: readonly ExportKey[],
): string | null {
  let source: unknown
  let edited: unknown
  try {
    source = JSON.parse(sourceText)
    edited = JSON.parse(editedText)
  } catch {
    return null
  }
  if (!isRecord(source) || !isRecord(source.data) || !isRecord(edited) || !isRecord(edited.data)) return null

  const sourceData = normalizeExportDataValues(source.data)
  const editedData = normalizeExportDataValues(edited.data)
  const mergedData: Record<string, unknown> = { ...sourceData }
  for (const key of selectedKeys) {
    if (Object.prototype.hasOwnProperty.call(editedData, key)) {
      mergedData[key] = editedData[key]
    } else {
      delete mergedData[key]
    }
  }

  return JSON.stringify({ ...source, ...edited, data: mergedData }, null, 2)
}

/** 検証済みのプレビューをlocalStorageへ反映する */
export function applyImportPreview(preview: ImportPreview): ImportResult {
  if (!preview.canImport || preview.entries === null) {
    return {
      success: false,
      message: preview.message,
      importedKeys: 0,
      warnings: preview.warnings,
    }
  }

  const snapshot = createStorageSnapshot(preview.entries)
  if (snapshot === null) {
    return { success: false, message: i18n.t('ui.message.import_snapshot_error'), warnings: preview.warnings }
  }

  if (!applyStorageEntries(preview.entries, snapshot)) {
    return { success: false, message: i18n.t('ui.message.import_write_error'), warnings: preview.warnings }
  }

  return {
    success: true,
    message:
      preview.warnings.length > 0
        ? `${i18n.t('ui.message.import_success', { count: preview.entries.length })}\n${preview.warnings.join('\n')}`
        : i18n.t('ui.message.import_success', { count: preview.entries.length }),
    importedKeys: preview.entries.length,
    warnings: preview.warnings,
  }
}

/** JSON文字列を検証・反映する既存の一括API */
export function importUserDataText(text: string, selectedKeys: readonly ExportKey[] = EXPORT_KEYS): ImportResult {
  return applyImportPreview(prepareImportText(text, selectedKeys))
}

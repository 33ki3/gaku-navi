/**
 * ユーザーデータのエクスポート／インポート窓口
 *
 * JSONの詳細検証と保存領域の更新は専用モジュールで行い、
 * このファイルでは処理の順序と公開APIだけを管理する
 */
import * as constant from '../constant'
import * as data from '../data'
import type { ExportKey } from '../data/ui'
import i18n from '../i18n'
import {
  type StorageOperationIssue,
  StorageTransactionOutcome,
  type StorageTransactionOutcomeType,
} from '../types/storage'
import { formatExportFileTimestamp, formatExportedAt } from './exportTimestamp'
import type { ExportData, ValidatedStorageEntry } from './importDataValidation'
import { getImportValueDefinition, isExportKey } from './importDataValidation'
import { parseImportText } from './importTextParser'
import { applyStorageEntries, createStorageSnapshotResult } from './storageTransaction'
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
  /** 保存処理を行った場合の詳細な結果 */
  transactionOutcome?: StorageTransactionOutcomeType
  /** 保存処理が失敗した段階。値そのものは含めない */
  transactionIssues?: readonly StorageOperationIssue[]
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
 * 現在のユーザーデータを整形済みJSON文字列にする
 *
 * @param date JSONへ記録する日時。省略時は現在時刻
 * @param selectedKeys 入出力対象にする保存キー。省略時は全対象
 * @returns バージョンと保存日時を含むJSON文字列
 */
export function getUserDataJson(date = new Date(), selectedKeys: readonly ExportKey[] = data.EXPORT_KEYS): string {
  return JSON.stringify(getUserData(date, selectedKeys), null, 2)
}

/** 編集欄とダウンロードで同じ検証済みデータを使い、整形方法だけを各出力先で選ぶ */
function getUserData(date: Date, selectedKeys: readonly ExportKey[]): ExportData {
  // 保存対象を定義順に走査し、存在するキーだけを一時データへ集める
  const selectedKeySet = new Set(selectedKeys)
  const rawData: Record<string, unknown> = {}
  for (const key of data.EXPORT_KEYS) {
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
  const exportedData: Record<string, unknown> = {}
  for (const [key, value] of validated.entries ?? []) {
    exportedData[key] = JSON.parse(value)
  }

  const exportData: ExportData = {
    version: constant.EXPORT_VERSION,
    exportedAt,
    data: exportedData,
  }
  return exportData
}

/**
 * ユーザーデータをJSONファイルとしてダウンロードする
 *
 * @param selectedKeys 入出力対象にする保存キー。省略時は全対象
 * @returns 戻り値なし
 */
export function exportUserData(selectedKeys: readonly ExportKey[] = data.EXPORT_KEYS): void {
  const date = new Date()
  // ファイルは整形用の改行・字下げを付けず、項目名と値を保持したまま容量を抑える
  const blob = new Blob([JSON.stringify(getUserData(date, selectedKeys))], { type: constant.EXPORT_MIME_TYPE })
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

/**
 * 解析結果の選択差分を確認画面用の警告文へ変換する
 *
 * @param parsed - import本文の解析結果
 * @returns 選択差分を表す警告文
 */
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

/**
 * 解析結果から確認画面用のインポートプレビューを作る
 *
 * @param parsed - import本文の解析結果
 * @returns 確認画面へ渡すインポートプレビュー
 */
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

/**
 * インポート結果の主文と警告を翻訳テンプレートで結合する
 *
 * @param message - インポート結果の主文
 * @param warnings - 表示する警告一覧
 * @returns 警告を含めた表示文
 */
function createImportMessage(message: string, warnings: string[]): string {
  if (warnings.length === 0) return message
  return i18n.t('ui.message.import_message_with_warnings', {
    message,
    warnings: warnings.join('\n'),
  })
}

/**
 * JSON文字列を検証し、保存前のプレビューを作る
 *
 * @param text - 検証するJSON文字列
 * @param selectedKeys - インポート対象の保存キー
 * @returns 保存前のインポートプレビュー
 */
export function prepareImportText(text: string, selectedKeys: readonly ExportKey[] = data.EXPORT_KEYS): ImportPreview {
  return createImportPreview(parseImportText(text, selectedKeys))
}

/**
 * JSONファイルを読み込み、保存前のプレビューを作る
 *
 * @param file - 読み込むJSONファイル
 * @param selectedKeys - インポート対象の保存キーまたは選択キーを返す関数
 * @returns 保存前のインポートプレビュー
 */
export async function prepareImportFile(
  file: File,
  selectedKeys: SelectedKeysSource = data.EXPORT_KEYS,
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

/**
 * JSON文字列の外側を選択中の保存キーだけに絞り込む
 *
 * @param text - 絞り込むエクスポートJSON文字列
 * @param selectedKeys - 残す保存キー
 * @returns 選択キーだけを含むJSON文字列
 */
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
  const filteredData: Record<string, unknown> = {}
  for (const key of data.EXPORT_KEYS) {
    if (selectedKeySet.has(key) && Object.prototype.hasOwnProperty.call(parsed.data, key)) {
      filteredData[key] = normalizedData[key]
    }
  }
  return JSON.stringify({ ...parsed, data: filteredData }, null, 2)
}

/**
 * v1形式で保存されたJSON文字列をJSON値へ戻す
 *
 * @param data - 正規化するエクスポートデータ
 * @returns JSON値へ戻したエクスポートデータ
 */
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

/**
 * 選択中の編集内容を全選択分のJSONへ戻し、選択状態を変更しても編集内容を保持する
 *
 * @param sourceText - 元の全保存項目を含むJSON文字列
 * @param editedText - 編集中のJSON文字列
 * @param selectedKeys - 編集内容を反映する保存キー
 * @returns 編集内容を反映したJSON文字列。不正なJSONならnull
 */
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

/**
 * 検証済みのプレビューをブラウザの保存領域へ反映する
 *
 * @param preview - 保存前に検証したインポートプレビュー
 * @returns インポート結果と保存処理の詳細
 */
export function applyImportPreview(preview: ImportPreview): ImportResult {
  if (!preview.canImport || preview.entries === null) {
    return {
      success: false,
      message: preview.message,
      importedKeys: 0,
      warnings: preview.warnings,
    }
  }

  const snapshotResult = createStorageSnapshotResult(preview.entries)
  if (!snapshotResult.ok) {
    return {
      success: false,
      message: i18n.t('ui.message.import_snapshot_error'),
      warnings: preview.warnings,
      transactionOutcome: snapshotResult.outcome,
      transactionIssues: snapshotResult.issues,
    }
  }

  const transaction = applyStorageEntries(preview.entries, snapshotResult.snapshot)
  if (transaction.outcome !== StorageTransactionOutcome.Committed) {
    return {
      success: false,
      message: i18n.t('ui.message.import_write_error'),
      warnings: preview.warnings,
      transactionOutcome: transaction.outcome,
      transactionIssues: transaction.issues,
    }
  }

  return {
    success: true,
    message:
      preview.warnings.length > 0
        ? `${i18n.t('ui.message.import_success', { count: preview.entries.length })}\n${preview.warnings.join('\n')}`
        : i18n.t('ui.message.import_success', { count: preview.entries.length }),
    importedKeys: preview.entries.length,
    warnings: preview.warnings,
    transactionOutcome: transaction.outcome,
    transactionIssues: transaction.issues,
  }
}

/**
 * ユーザーデータのエクスポート／インポート窓口。
 *
 * JSONの詳細検証とストレージ更新は専用モジュールへ委譲し、
 * このファイルでは処理の順序と公開APIだけを管理する。
 */
import * as constant from '../constant'
import { EXPORT_KEYS } from '../data/ui'
import i18n from '../i18n'
import { formatExportFileTimestamp, formatExportedAt } from './exportTimestamp'
import type { ExportData, ValidatedStorageEntry } from './importDataValidation'
import { parseImportText } from './importTextParser'
import { applyStorageEntries, createStorageSnapshot } from './storageTransaction'

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
  /** 補完・除外した項目の警告 */
  warnings: string[]
  /** 保存可能なエントリ数 */
  importedKeys: number
  /** 1件以上保存可能なデータがあるか */
  canImport: boolean
}

/**
 * 現在のユーザーデータを整形済みJSON文字列にする。
 *
 * @param date JSONへ記録する日時。省略時は現在時刻
 * @returns バージョンと保存日時を含むJSON文字列
 */
export function getUserDataJson(date = new Date()): string {
  // 保存対象を定義順に走査し、存在するキーだけを一時データへ集める
  const rawData: Record<string, unknown> = {}
  for (const key of EXPORT_KEYS) {
    const value = localStorage.getItem(key)
    if (value !== null) {
      rawData[key] = value
    }
  }

  // インポート時と同じ検証を通し、壊れたキーをバックアップへ持ち出さない
  const exportedAt = formatExportedAt(date)
  const validated = parseImportText(JSON.stringify({ version: constant.EXPORT_VERSION, exportedAt, data: rawData }))
  const data: Record<string, string> = {}
  for (const [key, value] of validated.entries ?? []) {
    data[key] = value
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
 * @returns 戻り値なし
 */
export function exportUserData(): void {
  const date = new Date()
  const blob = new Blob([getUserDataJson(date)], { type: constant.EXPORT_MIME_TYPE })
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

/** 解析結果から確認画面用のインポートプレビューを作る */
function createImportPreview(parsed: ReturnType<typeof parseImportText>): ImportPreview {
  if (parsed.entries === null) {
    const message = createImportMessage(parsed.error ?? i18n.t('ui.message.import_invalid_format'), parsed.warnings)
    return {
      entries: null,
      message,
      warnings: parsed.warnings,
      importedKeys: 0,
      canImport: false,
    }
  }
  const readyMessage = i18n.t('ui.message.import_ready', { count: parsed.entries.length })
  const message = createImportMessage(readyMessage, parsed.warnings)
  return {
    entries: parsed.entries,
    message,
    warnings: parsed.warnings,
    importedKeys: parsed.entries.length,
    canImport: parsed.entries.length > 0,
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
export function prepareImportText(text: string): ImportPreview {
  return createImportPreview(parseImportText(text))
}

/** JSONファイルを読み込み、保存前のプレビューを作る */
export async function prepareImportFile(file: File): Promise<ImportPreview> {
  try {
    return prepareImportText(await file.text())
  } catch {
    return {
      entries: null,
      message: i18n.t('ui.message.import_read_error'),
      warnings: [],
      importedKeys: 0,
      canImport: false,
    }
  }
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
export function importUserDataText(text: string): ImportResult {
  return applyImportPreview(prepareImportText(text))
}

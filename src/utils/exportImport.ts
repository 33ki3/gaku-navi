/**
 * データ転送ユーティリティ
 *
 * ユーザーの設定データ（凸数・スコア設定・プリセット・フィルター状態・
 * ピン固定）を JSON ファイルとしてエクスポート/
 * インポートする機能。端末間のデータ移行やバックアップに使う。
 */
import * as constant from '../constant'
import i18n from '../i18n'

/** エクスポート対象の localStorage キー一覧 */
const EXPORT_KEYS = [
  constant.UNCAP_STORAGE_KEY,
  constant.SETTINGS_PINNED_KEY,
  constant.SCORE_SETTINGS_STORAGE_KEY,
  constant.SCORE_PRESETS_STORAGE_KEY,
  constant.FILTER_STORAGE_KEY,
  constant.CARD_COUNT_CUSTOM_KEY,
] as const

/** エクスポートされる JSON の構造 */
interface ExportData {
  /** データ形式のバージョン番号 */
  version: number
  /** エクスポートした日時（ISO 8601 形式） */
  exportedAt: string
  /** localStorage から取り出したキーと値のペア */
  data: Record<string, string>
}

/**
 * ユーザーデータを JSON ファイルとしてダウンロードする
 *
 * localStorage から対象キーの値を集めて JSON にし、
 * ブラウザのダウンロード機能でファイルとして保存する。
 */
export function exportUserData(): void {
  // localStorage から対象キーの値を集める
  const data: Record<string, string> = {}
  for (const key of EXPORT_KEYS) {
    const value = localStorage.getItem(key)
    if (value !== null) {
      data[key] = value
    }
  }

  // エクスポート用の JSON 構造を作る
  const exportData: ExportData = {
    version: constant.EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }

  // JSON をファイルとしてダウンロードさせる
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: constant.EXPORT_MIME_TYPE })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${constant.EXPORT_FILE_PREFIX}${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}${constant.EXPORT_FILE_EXT}`
  document.body.appendChild(a)
  a.click()

  // 使い終わったら後片付けする
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** インポート処理の結果 */
interface ImportResult {
  /** 成功したかどうか */
  success: boolean
  /** ユーザーに表示するメッセージ */
  message: string
  /** 復元したキーの数 */
  importedKeys?: number
}

/**
 * JSON ファイルからユーザーデータを読み込んで localStorage に復元する
 *
 * ファイルの中身を読み取り、バージョンとキーを検証した上で、
 * 許可されたキーのみ localStorage に書き戻す。
 *
 * @param file - ユーザーが選択した JSON ファイル
 * @returns インポートの成否とメッセージ
 */
export async function importUserData(file: File): Promise<ImportResult> {
  try {
    // ファイルの内容をテキストとして読む
    const text = await file.text()
    const parsed = JSON.parse(text) as ExportData

    // 形式が正しいかチェックする
    if (!parsed.version || !parsed.data) {
      return { success: false, message: i18n.t('ui.message.import_invalid_format') }
    }

    // 許可されたキーだけを localStorage に復元する（不正なキーは無視する）
    const validKeys = new Set<string>(EXPORT_KEYS)
    let importedCount = 0
    for (const [key, value] of Object.entries(parsed.data)) {
      if (validKeys.has(key) && typeof value === 'string') {
        localStorage.setItem(key, value)
        importedCount++
      }
    }

    // 1件も復元できなかった場合
    if (importedCount === 0) {
      return { success: false, message: i18n.t('ui.message.import_no_data') }
    }

    return {
      success: true,
      message: i18n.t('ui.message.import_success', { count: importedCount }),
      importedKeys: importedCount,
    }
  } catch {
    return { success: false, message: i18n.t('ui.message.import_read_error') }
  }
}

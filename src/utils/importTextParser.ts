/**
 * インポートJSON文字列の解析と検証。
 *
 * JSON構文、外側の形式、各 localStorage 値の順に確認し、保存処理へ渡せるデータだけを返す。
 */
import { EXPORT_KEYS } from '../data/ui'
import type { ExportKey } from '../data/ui'
import i18n from '../i18n'
import type { ImportSalvageResult, ValidatedStorageEntry } from './importDataValidation'
import { fillImportValueDefaults, getImportValueDefinition, isExportData, isExportKey } from './importDataValidation'

/** JSON.parse が返す文字位置を取り出す正規表現。ブラウザ実装差を吸収する */
const JSON_POSITION_PATTERN = /position\s+(\d+)/i
/** 行番号と列番号を返すブラウザ向けの正規表現 */
const JSON_LINE_COLUMN_PATTERN = /line\s+(\d+)\s+column\s+(\d+)/i
/** 不正トークンだけを返すブラウザ向けの正規表現 */
const JSON_UNEXPECTED_TOKEN_PATTERN = /Unexpected token '(.+?)'/i

/** 解析に成功したデータ、または画面表示用エラー */
interface ImportParseResult {
  /** 全件検証済みの保存データ。失敗時は null */
  entries: ValidatedStorageEntry[] | null
  /** 解析・検証エラー。成功時は null */
  error: string | null
  /** 一部補完・スキップが発生した警告 */
  warnings: string[]
  /** JSONには存在するが、画面で選択されていない保存キー */
  excludedKeys: ExportKey[]
  /** 画面では選択されているが、JSONに存在しない保存キー */
  missingKeys: ExportKey[]
}

/** JSONの選択状態と入力内容から、確認画面へ渡すキーの差分を作る */
function getSelectionSummary(data: Record<string, unknown>, selectedKeys: readonly ExportKey[]) {
  const selectedKeySet = new Set(selectedKeys)
  const hasDataKey = (key: string) => Object.prototype.hasOwnProperty.call(data, key)

  return {
    excludedKeys: EXPORT_KEYS.filter((key) => hasDataKey(key) && !selectedKeySet.has(key)),
    missingKeys: EXPORT_KEYS.filter((key) => selectedKeySet.has(key) && !hasDataKey(key)),
  }
}

/**
 * 文字位置を行番号と列番号の表示へ変換する
 *
 * @param text - 解析対象のJSON文字列
 * @param position - JSON.parse が返した文字位置
 * @returns 翻訳済みのエラー位置
 */
function formatJsonPosition(text: string, position: number): string {
  const beforeError = text.slice(0, Math.min(position, text.length))
  const line = beforeError.split('\n').length
  const lastLineBreak = beforeError.lastIndexOf('\n')
  const column = position - lastLineBreak
  // このutilityはReact hookを使えないため、共有i18nインスタンスから翻訳する
  return i18n.t('ui.message.import_error_location', { line, column })
}

/**
 * JSON.parse のエラーから、可能ならユーザーが探せる位置を返す
 *
 * @param text - 解析対象のJSON文字列
 * @param error - JSON.parse が返した例外
 * @returns 取得できたエラー位置。取得できない場合は空文字
 */
function getJsonErrorLocation(text: string, error: unknown): string {
  if (!(error instanceof Error)) return ''

  const lineAndColumn = JSON_LINE_COLUMN_PATTERN.exec(error.message)
  if (lineAndColumn) {
    return i18n.t('ui.message.import_error_location', {
      line: lineAndColumn[1],
      column: lineAndColumn[2],
    })
  }

  const positionMatch = JSON_POSITION_PATTERN.exec(error.message)
  if (positionMatch) {
    return formatJsonPosition(text, Number(positionMatch[1]))
  }

  const unexpectedToken = JSON_UNEXPECTED_TOKEN_PATTERN.exec(error.message)?.[1]
  if (unexpectedToken) {
    const tokenPosition = text.lastIndexOf(unexpectedToken)
    if (tokenPosition >= 0) return formatJsonPosition(text, tokenPosition)
  }

  return ''
}

/**
 * 一部データをスキップした場合の警告文を作る
 *
 * @param item - 読み込み対象の項目名
 * @param reason - スキップ理由
 * @returns 画面表示用の警告文
 */
function createValidationWarning(item: string, reason: string): string {
  return i18n.t('ui.message.import_warning_skipped', { item, reason })
}

/** 配列の一部を除外した場合の警告文を作る */
function createPartialValidationWarning(item: string, salvageIssue: ImportSalvageResult['issues'][number]): string {
  return i18n.t('ui.message.import_warning_partial_item', {
    item,
    index: salvageIssue.index + 1,
    name: salvageIssue.itemName ? `（${salvageIssue.itemName}）` : '',
    reason: i18n.t(salvageIssue.reasonKey),
  })
}

/**
 * インポートJSON文字列を解析し、全保存値を検証する
 *
 * @param text - ファイルまたはテキスト欄から受け取ったJSON文字列
 * @returns 検証済みデータ、または既存データを変更しないエラー
 */
export function parseImportText(text: string, selectedKeys: readonly ExportKey[] = EXPORT_KEYS): ImportParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return {
      entries: null,
      error: i18n.t('ui.message.import_json_syntax_error', {
        location: getJsonErrorLocation(text, error),
      }),
      warnings: [],
      excludedKeys: [],
      missingKeys: [],
    }
  }

  if (!isExportData(parsed)) {
    return {
      entries: null,
      error: i18n.t('ui.message.import_invalid_format'),
      warnings: [],
      excludedKeys: [],
      missingKeys: [],
    }
  }

  const selectionSummary = getSelectionSummary(parsed.data, selectedKeys)
  const rawEntries = Object.entries(parsed.data)
  if (rawEntries.length === 0) {
    return {
      entries: null,
      error: i18n.t('ui.message.import_no_data'),
      warnings: [],
      ...selectionSummary,
    }
  }

  const entries: ValidatedStorageEntry[] = []
  const warnings: string[] = []
  const selectedKeySet = new Set(selectedKeys)
  for (const [key, rawValue] of rawEntries) {
    if (!isExportKey(key)) {
      warnings.push(createValidationWarning(key, i18n.t('ui.message.import_reason_unsupported')))
      continue
    }
    if (!selectedKeySet.has(key)) continue

    const definition = getImportValueDefinition(key)
    const itemLabel = i18n.t(definition.labelKey)
    let value: unknown
    if (typeof rawValue === 'string') {
      // 旧形式はdata内の値がJSON文字列なので、読み込み時にJSON値へ戻す
      try {
        value = JSON.parse(rawValue)
      } catch (error) {
        warnings.push(
          createValidationWarning(
            itemLabel,
            i18n.t('ui.message.import_reason_json_syntax', {
              location: getJsonErrorLocation(rawValue, error),
            }),
          ),
        )
        continue
      }
    } else {
      // 新形式はdata内にオブジェクト・配列・真偽値などのJSON値を直接持つ
      value = rawValue
    }

    value = fillImportValueDefaults(key, value)

    let isValid = false
    try {
      isValid = definition.validate(value)
    } catch {
      // 型ガード側で予期しない例外が発生しても、他のデータの読み込みは継続する
      isValid = false
    }

    let salvageResult: ImportSalvageResult | null = null
    if (!isValid) {
      try {
        salvageResult = definition.salvage?.(value) ?? null
      } catch {
        salvageResult = null
      }

      if (salvageResult?.issues.length) {
        warnings.push(...salvageResult.issues.map((issue) => createPartialValidationWarning(itemLabel, issue)))
      }

      if (!salvageResult?.hasUsableValue) {
        warnings.push(createValidationWarning(itemLabel, i18n.t(definition.invalidReasonKey)))
        continue
      }

      value = salvageResult.value
    }

    // Web Storageへ保存するときだけ、値をコンパクトなJSON文字列へ戻す
    entries.push([key, JSON.stringify(value)])
  }

  if (entries.length === 0) {
    return {
      entries: null,
      error:
        selectionSummary.excludedKeys.length > 0 &&
        rawEntries.every(([key]) => !isExportKey(key) || !selectedKeySet.has(key))
          ? i18n.t('ui.message.import_no_selected_data')
          : i18n.t('ui.message.import_no_valid_data'),
      warnings,
      ...selectionSummary,
    }
  }

  return { entries, error: null, warnings, ...selectionSummary }
}

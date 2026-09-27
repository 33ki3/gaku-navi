import * as data from '../../data'
import type { ExportKey } from '../../data/ui'
import { applyImportPreview, prepareImportText } from '../../utils/exportImport'

/** テスト用にJSONの検証と確定をまとめて行う */
export function importUserDataText(text: string, selectedKeys: readonly ExportKey[] = data.EXPORT_KEYS) {
  return applyImportPreview(prepareImportText(text, selectedKeys))
}

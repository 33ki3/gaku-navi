/**
 * パラメータボーナス入力欄の属性設定マスタ。
 *
 * Vo/Da/Vi の入力欄に使うラベルキーを定義する。
 */
import type { TranslationKey } from '../../i18n'
import { type ParameterType } from '../../types/enums'

/** パラメータ入力欄の1行分 */
interface ParameterInputEntry {
  key: ParameterType
  label: TranslationKey
}

/** パラメータボーナス入力欄マスタ */
export const ParameterInputList: readonly ParameterInputEntry[] = [
  { key: 'vocal', label: 'ui.settings.attr_vo' },
  { key: 'dance', label: 'ui.settings.attr_da' },
  { key: 'visual', label: 'ui.settings.attr_vi' },
] as const satisfies readonly ParameterInputEntry[]

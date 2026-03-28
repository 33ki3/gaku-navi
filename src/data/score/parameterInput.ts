/**
 * パラメータボーナス入力欄の属性設定マスタ。
 *
 * Vo/Da/Vi の入力欄に使うラベルキーを定義する。
 */
import type { TranslationKey } from '../../i18n'
import { ParameterType } from '../../types/enums'

/** パラメータ入力欄の1行分 */
interface ParameterInputEntry {
  id: ParameterType
  label: TranslationKey
}

/** パラメータボーナス入力欄マスタ */
export const ParameterInputList: readonly ParameterInputEntry[] = [
  { id: ParameterType.Vocal, label: 'ui.settings.attr_vo' },
  { id: ParameterType.Dance, label: 'ui.settings.attr_da' },
  { id: ParameterType.Visual, label: 'ui.settings.attr_vi' },
]

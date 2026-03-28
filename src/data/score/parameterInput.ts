/**
 * パラメータボーナス入力欄の属性設定マスタ。
 *
 * Vo/Da/Vi の入力欄に使うラベルキーを定義する。
 */
import rawData from './parameterInput.json'
import type { TranslationKey } from '../../i18n'
import { type ParameterType } from '../../types/enums'

/** パラメータ入力欄の1行分 */
interface ParameterInputEntry {
  key: ParameterType
  label: TranslationKey
}

/** パラメータボーナス入力欄マスタ */
export const ParameterInputList: readonly ParameterInputEntry[] = rawData as ParameterInputEntry[]

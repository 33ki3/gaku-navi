/**
 * カウント対象の対応表マスタデータ。
 *
 * ヘルプモーダルで表示する「効果→トリガー」対応表のデータを提供する。
 */
import rawData from '../json/countTarget.json'
import type { TranslationKey } from '../../i18n'

/** カウント対象の対応表行 */
interface CountTargetRow {
  effect: TranslationKey
  trigger: TranslationKey
}

/** カウント対象の対応表行リスト */
export const CountTargetRows = rawData as CountTargetRow[]

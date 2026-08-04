/**
 * パラメータ表示ラベルのマスタ。
 */
import type { TranslationKey } from '../../i18n'
import * as enums from '../../types/enums'

/** パラメータ種別のラベルマスタ（Vocal/Dance/Visual） */
export const PARAMETER_LABELS: Record<enums.ParameterType, TranslationKey> = {
  [enums.ParameterType.Vocal]: 'ui.settings.attr_vo',
  [enums.ParameterType.Dance]: 'ui.settings.attr_da',
  [enums.ParameterType.Visual]: 'ui.settings.attr_vi',
}

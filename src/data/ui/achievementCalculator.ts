import type { TranslationKey } from '../../i18n'
import * as enums from '../../types/enums'

/** 入力カテゴリの表示順と名称 */
export const ACHIEVEMENT_CALCULATOR_TABS: readonly { id: enums.CalculatorTab; labelKey: TranslationKey }[] = [
  { id: enums.CalculatorTab.Idol, labelKey: 'achievement_calculator.tabs.idol' },
  { id: enums.CalculatorTab.Production, labelKey: 'achievement_calculator.tabs.production' },
  { id: enums.CalculatorTab.Other, labelKey: 'achievement_calculator.tabs.other' },
]

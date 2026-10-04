import type { TranslationKey } from '../../i18n'
import * as enums from '../../types/enums'

/** 補助メニューに表示するページの順序と名称。画面の描画はAppが担当する */
export const APP_PAGE_MENU_ENTRIES: readonly { id: enums.AppPage; labelKey: TranslationKey }[] = [
  { id: enums.AppPage.AchievementCalculator, labelKey: 'achievement_calculator.title' },
]

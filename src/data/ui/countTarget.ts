/**
 * カウント対象の対応表マスタデータ。
 *
 * ヘルプモーダルで表示する「効果→トリガー」対応表のデータを提供する。
 */
import type { TranslationKey } from '../../i18n'

/** カウント対象の対応表行 */
interface CountTargetRow {
  effect: TranslationKey
  trigger: TranslationKey
}

/** カウント対象の対応表行リスト */
export const CountTargetRows: CountTargetRow[] = [
  { effect: 'ui.help.count_target_table.skill_card', trigger: 'ui.help.count_target_table.skill_card_trigger' },
  { effect: 'ui.help.count_target_table.p_item', trigger: 'ui.help.count_target_table.p_item_trigger' },
  { effect: 'ui.help.count_target_table.select_enhance', trigger: 'ui.help.count_target_table.select_enhance_trigger' },
  { effect: 'ui.help.count_target_table.random_enhance', trigger: 'ui.help.count_target_table.random_enhance_trigger' },
  { effect: 'ui.help.count_target_table.select_delete', trigger: 'ui.help.count_target_table.select_delete_trigger' },
  { effect: 'ui.help.count_target_table.card_change', trigger: 'ui.help.count_target_table.card_change_trigger' },
  { effect: 'ui.help.count_target_table.p_drink_acquire', trigger: 'ui.help.count_target_table.p_drink_acquire_trigger' },
  { effect: 'ui.help.count_target_table.trouble_delete', trigger: 'ui.help.count_target_table.trouble_delete_trigger' },
]

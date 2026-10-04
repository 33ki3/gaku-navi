/** EXPの表示色を計算機の各セクションで揃える */
import * as constant from '../../constant'

/**
 * EXP報酬をすべて獲得した合計値を緑で示す
 * @param earnedExp 対象範囲の獲得済みEXP
 * @param totalExp 対象範囲の登録済みEXP報酬の合計
 * @returns 報酬があり全獲得した場合は達成色、それ以外は通常のEXP表示色
 */
export function getExpTotalClass(earnedExp: number, totalExp: number): string {
  // 0/0は報酬のない項目なので、EXPだけを根拠に全達成色へ変えない
  return totalExp > 0 && earnedExp >= totalExp ? constant.ACHIEVEMENT_COMPLETE_TEXT_CLASS : 'text-sky-800'
}

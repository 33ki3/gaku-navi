/** Reactに依存しないqueryの集計を、翻訳済みの画面表示へ変換する */
import { useTranslation } from 'react-i18next'
import { calculateAchievementSummary } from '../application/query/achievementCalculatorQuery'
import type { AchievementCalculatorProgress, IdolAchievementSelectorItem } from '../types/achievementCalculator'

/**
 * 計算結果を変えずに、アイドル選択の名称を表示用に翻訳する
 * @param progress 正規化済みの達成記録と補正EXP
 * @param selectedIdolId 詳細を表示するアイドルの識別子
 * @returns 共通queryの集計と、翻訳済み名称を持つ選択候補
 */
export function useAchievementCalculatorSummary(progress: AchievementCalculatorProgress, selectedIdolId: string) {
  const { t } = useTranslation()
  const summary = calculateAchievementSummary(progress, selectedIdolId)
  // アイドル選択ボタン用の名称と、各アイドルのTrue End・基本・PアイドルのEXP集計
  const idolSelectorItems: IdolAchievementSelectorItem[] = summary.idolSelectorItems.map((item) => ({
    ...item,
    name: t(item.nameKey),
  }))
  return {
    ...summary,
    idolSelectorItems,
  }
}

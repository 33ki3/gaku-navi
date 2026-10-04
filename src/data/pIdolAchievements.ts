/** SR以上のPアイドルに共通する単発条件をゲーム画面順で定義し、カードごとに独立した達成記録を持たせる */
import type { PIdolCardAchievementDefinition } from '../types/achievementCalculator'
import * as enums from '../types/enums'

/** SR以上の各Pアイドルが持つ6項目のEXP報酬 */
export const P_IDOL_CARD_ACHIEVEMENTS: readonly PIdolCardAchievementDefinition[] = [
  // 最終試験に合格
  {
    id: enums.PIdolCardAchievementId.FinalExamPassed,
    titleKey: 'achievement_calculator.achievement_name.p_idol_card.final_exam_passed',
    exp: 250,
  },
  // 特訓段階3にする
  {
    id: enums.PIdolCardAchievementId.SpecialTraining3,
    titleKey: 'achievement_calculator.achievement_name.p_idol_card.special_training_3',
    exp: 1000,
  },
  // クリア時評価A+以上
  {
    id: enums.PIdolCardAchievementId.EvaluationAPlus,
    titleKey: 'achievement_calculator.achievement_name.p_idol_card.evaluation_a_plus',
    exp: 1500,
  },
  // 特訓段階4にする
  {
    id: enums.PIdolCardAchievementId.SpecialTraining4,
    titleKey: 'achievement_calculator.achievement_name.p_idol_card.special_training_4',
    exp: 1500,
  },
  // 特訓段階5にする
  {
    id: enums.PIdolCardAchievementId.SpecialTraining5,
    titleKey: 'achievement_calculator.achievement_name.p_idol_card.special_training_5',
    exp: 1500,
  },
  // 特訓段階6にする
  {
    id: enums.PIdolCardAchievementId.SpecialTraining6,
    titleKey: 'achievement_calculator.achievement_name.p_idol_card.special_training_6',
    exp: 2000,
  },
]

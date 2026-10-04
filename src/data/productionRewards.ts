/** プロデュースの試験結果ごとに、基準の50EXPから差し引く報酬の差額を定義する */
import type { ProductionRunRewardAdjustmentDefinition } from '../types/achievementCalculator'
import * as enums from '../types/enums'

/** 基準報酬との差額を試験結果ごとに記録する */
export const PRODUCTION_RUN_REWARD_ADJUSTMENTS: readonly ProductionRunRewardAdjustmentDefinition[] = [
  // レギュラー：中間試験不合格
  {
    id: enums.ProductionRunRewardAdjustmentId.RegularMidtermFailed,
    expDeduction: 40,
    titleKey: 'achievement_calculator.other.production_reward.regular_midterm_failed',
  },
  // レギュラー：最終試験まで到達
  {
    id: enums.ProductionRunRewardAdjustmentId.RegularFinalExam,
    expDeduction: 30,
    titleKey: 'achievement_calculator.other.production_reward.regular_final_exam',
  },
  // プロ・マスター：試験不合格
  {
    id: enums.ProductionRunRewardAdjustmentId.ProMasterFailed,
    expDeduction: 20,
    titleKey: 'achievement_calculator.other.production_reward.pro_master_failed',
  },
]

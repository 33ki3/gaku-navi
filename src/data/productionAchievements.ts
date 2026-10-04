/** 共通のプロデュース項目をゲーム画面順で並べ、累計条件と段階ごとの増分EXPを定義する */
import type { AchievementTrackerDefinition } from '../types/achievementCalculator'
import * as enums from '../types/enums'

/** プロデュース全体で獲得する段階報酬と進捗上限 */
export const PRODUCTION_ACHIEVEMENTS: readonly AchievementTrackerDefinition[] = [
  // Pポイント獲得数
  {
    id: enums.ProductionAchievementId.PPoints,
    titleKey: 'achievement_calculator.achievement_name.production.p_points',
    metricKey: 'achievement_calculator.metric.production.p_points',
    milestones: [
      {
        threshold: 2000,
        exp: 100,
      },
      {
        threshold: 15000,
        exp: 300,
      },
      {
        threshold: 100000,
        exp: 1250,
      },
      {
        threshold: 200000,
        exp: 2950,
      },
      {
        threshold: 500000,
        exp: 3700,
      },
      {
        threshold: 700000,
        exp: 3700,
      },
      {
        threshold: 1000000,
        exp: 3700,
      },
      {
        threshold: 1300000,
        exp: 3700,
      },
      {
        threshold: 1600000,
        exp: 3700,
      },
      {
        threshold: 1900000,
        exp: 3700,
      },
      {
        threshold: 2200000,
        exp: 3700,
      },
      {
        threshold: 2500000,
        exp: 3700,
      },
      {
        threshold: 2800000,
        exp: 6000,
      },
      {
        threshold: 3100000,
        exp: 6000,
      },
      {
        threshold: 3400000,
        exp: 6000,
      },
      {
        threshold: 3700000,
        exp: 6000,
      },
      {
        threshold: 4000000,
        exp: 6000,
      },
    ],
  },
  // アチーブメント獲得数
  {
    id: enums.ProductionAchievementId.AchievementsAcquired,
    titleKey: 'achievement_calculator.achievement_name.production.achievements_acquired',
    metricKey: 'achievement_calculator.metric.production.achievements_acquired',
    milestones: [
      {
        threshold: 70,
        exp: 400,
      },
      {
        threshold: 300,
        exp: 3250,
      },
      {
        threshold: 400,
        exp: 3700,
      },
      {
        threshold: 700,
        exp: 6000,
      },
      {
        threshold: 1000,
        exp: 6000,
      },
    ],
  },
  // スキルカード獲得数
  {
    id: enums.ProductionAchievementId.SkillCardsAcquired,
    titleKey: 'achievement_calculator.achievement_name.production.skill_cards_acquired',
    metricKey: 'achievement_calculator.metric.production.skill_cards_acquired',
    milestones: [
      {
        threshold: 50,
        exp: 100,
      },
      {
        threshold: 400,
        exp: 300,
      },
      {
        threshold: 2000,
        exp: 1250,
      },
      {
        threshold: 4000,
        exp: 2950,
      },
      {
        threshold: 12000,
        exp: 6000,
      },
      {
        threshold: 18000,
        exp: 6000,
      },
      {
        threshold: 24000,
        exp: 6000,
      },
      {
        threshold: 30000,
        exp: 6000,
      },
      {
        threshold: 36000,
        exp: 6000,
      },
      {
        threshold: 42000,
        exp: 6000,
      },
      {
        threshold: 48000,
        exp: 6000,
      },
      {
        threshold: 54000,
        exp: 6000,
      },
      {
        threshold: 60000,
        exp: 6000,
      },
      {
        threshold: 66000,
        exp: 6000,
      },
      {
        threshold: 72000,
        exp: 6000,
      },
      {
        threshold: 78000,
        exp: 6000,
      },
      {
        threshold: 84000,
        exp: 6000,
      },
      {
        threshold: 90000,
        exp: 6000,
      },
    ],
  },
  // Pアイテム獲得数
  {
    id: enums.ProductionAchievementId.PItemsAcquired,
    titleKey: 'achievement_calculator.achievement_name.production.p_items_acquired',
    metricKey: 'achievement_calculator.metric.production.p_items_acquired',
    milestones: [
      {
        threshold: 30,
        exp: 150,
      },
      {
        threshold: 100,
        exp: 300,
      },
      {
        threshold: 600,
        exp: 3250,
      },
      {
        threshold: 1500,
        exp: 3700,
      },
      {
        threshold: 5000,
        exp: 6000,
      },
      {
        threshold: 7000,
        exp: 6000,
      },
      {
        threshold: 10000,
        exp: 6000,
      },
      {
        threshold: 13000,
        exp: 6000,
      },
      {
        threshold: 16000,
        exp: 6000,
      },
      {
        threshold: 19000,
        exp: 6000,
      },
      {
        threshold: 22000,
        exp: 6000,
      },
      {
        threshold: 25000,
        exp: 6000,
      },
    ],
  },
  // Pドリンク獲得数
  {
    id: enums.ProductionAchievementId.PDrinksAcquired,
    titleKey: 'achievement_calculator.achievement_name.production.p_drinks_acquired',
    metricKey: 'achievement_calculator.metric.production.p_drinks_acquired',
    milestones: [
      {
        threshold: 50,
        exp: 150,
      },
      {
        threshold: 200,
        exp: 300,
      },
      {
        threshold: 1000,
        exp: 3250,
      },
      {
        threshold: 2500,
        exp: 3700,
      },
      {
        threshold: 10000,
        exp: 6000,
      },
      {
        threshold: 15000,
        exp: 6000,
      },
      {
        threshold: 20000,
        exp: 6000,
      },
      {
        threshold: 25000,
        exp: 6000,
      },
      {
        threshold: 30000,
        exp: 6000,
      },
      {
        threshold: 35000,
        exp: 6000,
      },
      {
        threshold: 40000,
        exp: 6000,
      },
      {
        threshold: 45000,
        exp: 6000,
      },
      {
        threshold: 50000,
        exp: 6000,
      },
    ],
  },
  // スキルカード獲得種類数
  {
    id: enums.ProductionAchievementId.SkillCardTypesAcquired,
    titleKey: 'achievement_calculator.achievement_name.production.skill_card_types_acquired',
    metricKey: 'achievement_calculator.metric.production.skill_card_types_acquired',
    milestones: [
      {
        threshold: 100,
        exp: 150,
      },
      {
        threshold: 200,
        exp: 1250,
      },
      {
        threshold: 300,
        exp: 1250,
      },
    ],
  },
  // Pアイテム獲得種類数
  {
    id: enums.ProductionAchievementId.PItemTypesAcquired,
    titleKey: 'achievement_calculator.achievement_name.production.p_item_types_acquired',
    metricKey: 'achievement_calculator.metric.production.p_item_types_acquired',
    milestones: [
      {
        threshold: 20,
        exp: 400,
      },
      {
        threshold: 40,
        exp: 1250,
      },
      {
        threshold: 80,
        exp: 3700,
      },
      {
        threshold: 150,
        exp: 6000,
      },
      {
        threshold: 300,
        exp: 6000,
      },
    ],
  },
  // Pドリンク獲得種類数
  {
    id: enums.ProductionAchievementId.PDrinkTypesAcquired,
    titleKey: 'achievement_calculator.achievement_name.production.p_drink_types_acquired',
    metricKey: 'achievement_calculator.metric.production.p_drink_types_acquired',
    milestones: [
      {
        threshold: 10,
        exp: 400,
      },
      {
        threshold: 15,
        exp: 400,
      },
      {
        threshold: 25,
        exp: 400,
      },
    ],
  },
  // Voレッスン回数
  {
    id: enums.ProductionAchievementId.VocalLessons,
    titleKey: 'achievement_calculator.achievement_name.production.vocal_lessons',
    metricKey: 'achievement_calculator.metric.production.vocal_lessons',
    milestones: [
      {
        threshold: 50,
        exp: 150,
      },
      {
        threshold: 100,
        exp: 400,
      },
      {
        threshold: 750,
        exp: 2950,
      },
      {
        threshold: 1500,
        exp: 3700,
      },
      {
        threshold: 4000,
        exp: 6000,
      },
      {
        threshold: 5000,
        exp: 6000,
      },
      {
        threshold: 6000,
        exp: 6000,
      },
      {
        threshold: 7000,
        exp: 6000,
      },
      {
        threshold: 8000,
        exp: 6000,
      },
      {
        threshold: 9000,
        exp: 6000,
      },
      {
        threshold: 10000,
        exp: 6000,
      },
    ],
  },
  // Daレッスン回数
  {
    id: enums.ProductionAchievementId.DanceLessons,
    titleKey: 'achievement_calculator.achievement_name.production.dance_lessons',
    metricKey: 'achievement_calculator.metric.production.dance_lessons',
    milestones: [
      {
        threshold: 50,
        exp: 150,
      },
      {
        threshold: 100,
        exp: 400,
      },
      {
        threshold: 750,
        exp: 2950,
      },
      {
        threshold: 1500,
        exp: 3700,
      },
      {
        threshold: 4000,
        exp: 6000,
      },
      {
        threshold: 5000,
        exp: 6000,
      },
      {
        threshold: 6000,
        exp: 6000,
      },
      {
        threshold: 7000,
        exp: 6000,
      },
      {
        threshold: 8000,
        exp: 6000,
      },
      {
        threshold: 9000,
        exp: 6000,
      },
      {
        threshold: 10000,
        exp: 6000,
      },
    ],
  },
  // Viレッスン回数
  {
    id: enums.ProductionAchievementId.VisualLessons,
    titleKey: 'achievement_calculator.achievement_name.production.visual_lessons',
    metricKey: 'achievement_calculator.metric.production.visual_lessons',
    milestones: [
      {
        threshold: 50,
        exp: 150,
      },
      {
        threshold: 100,
        exp: 400,
      },
      {
        threshold: 750,
        exp: 2950,
      },
      {
        threshold: 1500,
        exp: 3700,
      },
      {
        threshold: 4000,
        exp: 6000,
      },
      {
        threshold: 5000,
        exp: 6000,
      },
      {
        threshold: 6000,
        exp: 6000,
      },
      {
        threshold: 7000,
        exp: 6000,
      },
      {
        threshold: 8000,
        exp: 6000,
      },
      {
        threshold: 9000,
        exp: 6000,
      },
      {
        threshold: 10000,
        exp: 6000,
      },
    ],
  },
  // 活動支給・差し入れ選択回数
  {
    id: enums.ProductionAchievementId.ActivitiesClaimed,
    titleKey: 'achievement_calculator.achievement_name.production.activities_claimed',
    metricKey: 'achievement_calculator.metric.production.activities_claimed',
    milestones: [
      {
        threshold: 40,
        exp: 400,
      },
      {
        threshold: 150,
        exp: 2950,
      },
      {
        threshold: 300,
        exp: 3250,
      },
      {
        threshold: 700,
        exp: 3700,
      },
      {
        threshold: 1400,
        exp: 6000,
      },
      {
        threshold: 2000,
        exp: 6000,
      },
      {
        threshold: 3000,
        exp: 6000,
      },
      {
        threshold: 4000,
        exp: 6000,
      },
      {
        threshold: 5000,
        exp: 6000,
      },
      {
        threshold: 6000,
        exp: 6000,
      },
      {
        threshold: 7000,
        exp: 6000,
      },
      {
        threshold: 8000,
        exp: 6000,
      },
    ],
  },
  // 授業/おでかけ回数
  {
    id: enums.ProductionAchievementId.ClassesAndOutings,
    titleKey: 'achievement_calculator.achievement_name.production.classes_and_outings',
    metricKey: 'achievement_calculator.metric.production.classes_and_outings',
    milestones: [
      {
        threshold: 50,
        exp: 400,
      },
      {
        threshold: 200,
        exp: 2950,
      },
      {
        threshold: 500,
        exp: 3250,
      },
      {
        threshold: 1000,
        exp: 3700,
      },
      {
        threshold: 2000,
        exp: 6000,
      },
      {
        threshold: 4000,
        exp: 6000,
      },
      {
        threshold: 6000,
        exp: 6000,
      },
      {
        threshold: 8000,
        exp: 6000,
      },
      {
        threshold: 10000,
        exp: 6000,
      },
      {
        threshold: 12000,
        exp: 6000,
      },
      {
        threshold: 14000,
        exp: 6000,
      },
      {
        threshold: 16000,
        exp: 6000,
      },
      {
        threshold: 18000,
        exp: 6000,
      },
      {
        threshold: 20000,
        exp: 6000,
      },
      {
        threshold: 22000,
        exp: 6000,
      },
      {
        threshold: 24000,
        exp: 6000,
      },
      {
        threshold: 26000,
        exp: 6000,
      },
      {
        threshold: 28000,
        exp: 6000,
      },
      {
        threshold: 30000,
        exp: 6000,
      },
    ],
  },
  // スキルカード強化回数
  {
    id: enums.ProductionAchievementId.SkillCardsEnhanced,
    titleKey: 'achievement_calculator.achievement_name.production.skill_cards_enhanced',
    metricKey: 'achievement_calculator.metric.production.skill_cards_enhanced',
    milestones: [
      {
        threshold: 30,
        exp: 150,
      },
      {
        threshold: 150,
        exp: 300,
      },
      {
        threshold: 400,
        exp: 1250,
      },
      {
        threshold: 800,
        exp: 3250,
      },
      {
        threshold: 2000,
        exp: 3700,
      },
      {
        threshold: 4000,
        exp: 6000,
      },
      {
        threshold: 6000,
        exp: 6000,
      },
      {
        threshold: 8000,
        exp: 6000,
      },
      {
        threshold: 10000,
        exp: 6000,
      },
      {
        threshold: 12000,
        exp: 6000,
      },
      {
        threshold: 14000,
        exp: 6000,
      },
      {
        threshold: 16000,
        exp: 6000,
      },
      {
        threshold: 18000,
        exp: 6000,
      },
      {
        threshold: 20000,
        exp: 6000,
      },
      {
        threshold: 22000,
        exp: 6000,
      },
      {
        threshold: 24000,
        exp: 6000,
      },
      {
        threshold: 26000,
        exp: 6000,
      },
      {
        threshold: 28000,
        exp: 6000,
      },
      {
        threshold: 30000,
        exp: 6000,
      },
    ],
  },
  // 相談での交換回数
  {
    id: enums.ProductionAchievementId.ConsultExchanges,
    titleKey: 'achievement_calculator.achievement_name.production.consult_exchanges',
    metricKey: 'achievement_calculator.metric.production.consult_exchanges',
    milestones: [
      {
        threshold: 50,
        exp: 300,
      },
      {
        threshold: 200,
        exp: 400,
      },
      {
        threshold: 500,
        exp: 1200,
      },
      {
        threshold: 2000,
        exp: 2950,
      },
      {
        threshold: 5000,
        exp: 6000,
      },
      {
        threshold: 6000,
        exp: 6000,
      },
      {
        threshold: 8000,
        exp: 6000,
      },
      {
        threshold: 10000,
        exp: 6000,
      },
      {
        threshold: 12000,
        exp: 6000,
      },
      {
        threshold: 14000,
        exp: 6000,
      },
      {
        threshold: 16000,
        exp: 6000,
      },
      {
        threshold: 18000,
        exp: 6000,
      },
      {
        threshold: 20000,
        exp: 6000,
      },
    ],
  },
  // レッスンクリア回数
  {
    id: enums.ProductionAchievementId.LessonsCleared,
    titleKey: 'achievement_calculator.achievement_name.production.lessons_cleared',
    metricKey: 'achievement_calculator.metric.production.lessons_cleared',
    milestones: [
      {
        threshold: 30,
        exp: 100,
      },
      {
        threshold: 90,
        exp: 300,
      },
      {
        threshold: 300,
        exp: 400,
      },
      {
        threshold: 1000,
        exp: 3250,
      },
      {
        threshold: 4000,
        exp: 3700,
      },
      {
        threshold: 6000,
        exp: 3700,
      },
      {
        threshold: 8000,
        exp: 3700,
      },
      {
        threshold: 10000,
        exp: 3700,
      },
      {
        threshold: 12000,
        exp: 3700,
      },
      {
        threshold: 14000,
        exp: 3700,
      },
      {
        threshold: 16000,
        exp: 6000,
      },
      {
        threshold: 18000,
        exp: 6000,
      },
      {
        threshold: 20000,
        exp: 6000,
      },
      {
        threshold: 22000,
        exp: 6000,
      },
      {
        threshold: 24000,
        exp: 6000,
      },
      {
        threshold: 26000,
        exp: 6000,
      },
      {
        threshold: 28000,
        exp: 6000,
      },
      {
        threshold: 30000,
        exp: 6000,
      },
    ],
  },
  // SPレッスンクリア回数
  {
    id: enums.ProductionAchievementId.SpLessonsCleared,
    titleKey: 'achievement_calculator.achievement_name.production.sp_lessons_cleared',
    metricKey: 'achievement_calculator.metric.production.sp_lessons_cleared',
    milestones: [
      {
        threshold: 30,
        exp: 300,
      },
      {
        threshold: 100,
        exp: 400,
      },
      {
        threshold: 500,
        exp: 2950,
      },
      {
        threshold: 1000,
        exp: 3700,
      },
      {
        threshold: 3000,
        exp: 6000,
      },
      {
        threshold: 4000,
        exp: 6000,
      },
      {
        threshold: 6000,
        exp: 6000,
      },
      {
        threshold: 8000,
        exp: 6000,
      },
      {
        threshold: 10000,
        exp: 6000,
      },
      {
        threshold: 12000,
        exp: 6000,
      },
      {
        threshold: 14000,
        exp: 6000,
      },
      {
        threshold: 16000,
        exp: 6000,
      },
      {
        threshold: 18000,
        exp: 6000,
      },
      {
        threshold: 20000,
        exp: 6000,
      },
      {
        threshold: 22000,
        exp: 6000,
      },
      {
        threshold: 24000,
        exp: 6000,
      },
    ],
  },
  // 合計体力消費数
  {
    id: enums.ProductionAchievementId.StaminaSpent,
    titleKey: 'achievement_calculator.achievement_name.production.stamina_spent',
    metricKey: 'achievement_calculator.metric.production.stamina_spent',
    milestones: [
      {
        threshold: 500,
        exp: 150,
      },
      {
        threshold: 1500,
        exp: 300,
      },
      {
        threshold: 10000,
        exp: 1250,
      },
      {
        threshold: 30000,
        exp: 2950,
      },
      {
        threshold: 100000,
        exp: 6000,
      },
      {
        threshold: 120000,
        exp: 6000,
      },
      {
        threshold: 160000,
        exp: 6000,
      },
      {
        threshold: 200000,
        exp: 6000,
      },
      {
        threshold: 240000,
        exp: 6000,
      },
      {
        threshold: 280000,
        exp: 6000,
      },
      {
        threshold: 320000,
        exp: 6000,
      },
      {
        threshold: 360000,
        exp: 6000,
      },
      {
        threshold: 400000,
        exp: 6000,
      },
      {
        threshold: 440000,
        exp: 6000,
      },
      {
        threshold: 480000,
        exp: 6000,
      },
      {
        threshold: 520000,
        exp: 6000,
      },
      {
        threshold: 560000,
        exp: 6000,
      },
      {
        threshold: 600000,
        exp: 6000,
      },
    ],
  },
  // クリア時評価B以上
  {
    id: enums.ProductionAchievementId.RankB,
    titleKey: 'achievement_calculator.achievement_name.production.rank_b',
    metricKey: 'achievement_calculator.metric.production.rank_b',
    milestones: [
      {
        threshold: 1,
        exp: 300,
      },
    ],
  },
  // クリア時評価A以上
  {
    id: enums.ProductionAchievementId.RankA,
    titleKey: 'achievement_calculator.achievement_name.production.rank_a',
    metricKey: 'achievement_calculator.metric.production.rank_a',
    milestones: [
      {
        threshold: 1,
        exp: 2950,
      },
    ],
  },
  // クリア時評価A+以上
  {
    id: enums.ProductionAchievementId.RankAPlus,
    titleKey: 'achievement_calculator.achievement_name.production.rank_a_plus',
    metricKey: 'achievement_calculator.metric.production.rank_a_plus',
    milestones: [
      {
        threshold: 1,
        exp: 3250,
      },
    ],
  },
  // クリア時評価S以上
  {
    id: enums.ProductionAchievementId.RankS,
    titleKey: 'achievement_calculator.achievement_name.production.rank_s',
    metricKey: 'achievement_calculator.metric.production.rank_s',
    milestones: [
      {
        threshold: 1,
        exp: 3700,
      },
    ],
  },
  // クリア時評価S+以上
  {
    id: enums.ProductionAchievementId.RankSPlus,
    titleKey: 'achievement_calculator.achievement_name.production.rank_s_plus',
    metricKey: 'achievement_calculator.metric.production.rank_s_plus',
    milestones: [
      {
        threshold: 1,
        exp: 6000,
      },
    ],
  },
  // クリア時評価SS以上
  {
    id: enums.ProductionAchievementId.RankSs,
    titleKey: 'achievement_calculator.achievement_name.production.rank_ss',
    metricKey: 'achievement_calculator.metric.production.rank_ss',
    milestones: [
      {
        threshold: 1,
        exp: 6000,
      },
    ],
  },
  // クリア時評価SS+以上
  {
    id: enums.ProductionAchievementId.RankSsPlus,
    titleKey: 'achievement_calculator.achievement_name.production.rank_ss_plus',
    metricKey: 'achievement_calculator.metric.production.rank_ss_plus',
    milestones: [
      {
        threshold: 1,
        exp: 6000,
      },
    ],
  },
  // クリア時評価SSS以上
  {
    id: enums.ProductionAchievementId.RankSss,
    titleKey: 'achievement_calculator.achievement_name.production.rank_sss',
    metricKey: 'achievement_calculator.metric.production.rank_sss',
    milestones: [
      {
        threshold: 1,
        exp: 6000,
      },
    ],
  },
  // クリア時評価SSS+以上
  {
    id: enums.ProductionAchievementId.RankSssPlus,
    titleKey: 'achievement_calculator.achievement_name.production.rank_sss_plus',
    metricKey: 'achievement_calculator.metric.production.rank_sss_plus',
    milestones: [
      {
        threshold: 1,
        exp: 6000,
      },
    ],
  },
  // クリア時評価S4以上
  {
    id: enums.ProductionAchievementId.RankS4,
    titleKey: 'achievement_calculator.achievement_name.production.rank_s4',
    metricKey: 'achievement_calculator.metric.production.rank_s4',
    milestones: [
      {
        threshold: 1,
        exp: 6000,
      },
    ],
  },
  // クリア時評価S4+以上
  {
    id: enums.ProductionAchievementId.RankS4Plus,
    titleKey: 'achievement_calculator.achievement_name.production.rank_s4_plus',
    metricKey: 'achievement_calculator.metric.production.rank_s4_plus',
    milestones: [
      {
        threshold: 1,
        exp: 6000,
      },
    ],
  },
  // True Endアチーブメント達成数
  {
    id: enums.ProductionAchievementId.TrueEndIdols,
    titleKey: 'achievement_calculator.achievement_name.production.true_end_idols',
    metricKey: 'achievement_calculator.metric.production.true_end_idols',
    milestones: [
      {
        threshold: 3,
        exp: 1250,
      },
      {
        threshold: 9,
        exp: 3250,
      },
      {
        threshold: 11,
        exp: 3250,
      },
      {
        threshold: 13,
        exp: 3250,
      },
      {
        threshold: 16,
        exp: 3250,
      },
      {
        threshold: 19,
        exp: 3250,
      },
      {
        threshold: 22,
        exp: 3250,
      },
      {
        threshold: 26,
        exp: 3250,
      },
    ],
  },
  // H.I.Fボーナスパネルの進捗数
  {
    id: enums.ProductionAchievementId.HifBonusPanels,
    titleKey: 'achievement_calculator.achievement_name.production.hif_bonus_panels',
    metricKey: 'achievement_calculator.metric.production.hif_bonus_panels',
    milestones: [
      {
        threshold: 50,
        exp: 0,
      },
    ],
  },
  // 『一番星』解放人数
  {
    id: enums.ProductionAchievementId.PrimaStellaIdols,
    titleKey: 'achievement_calculator.achievement_name.production.prima_stella_idols',
    metricKey: 'achievement_calculator.metric.production.prima_stella_idols',
    milestones: [
      {
        threshold: 1,
        exp: 6000,
      },
      {
        threshold: 4,
        exp: 6000,
      },
      {
        threshold: 6,
        exp: 6000,
      },
      {
        threshold: 9,
        exp: 6000,
      },
      {
        threshold: 13,
        exp: 6000,
      },
    ],
  },
  // プロデュース回数
  {
    id: enums.ProductionAchievementId.Productions,
    titleKey: 'achievement_calculator.achievement_name.production.productions',
    metricKey: 'achievement_calculator.metric.production.productions',
    milestones: [
      {
        threshold: 3,
        exp: 100,
      },
      {
        threshold: 20,
        exp: 300,
      },
      {
        threshold: 100,
        exp: 1250,
      },
      {
        threshold: 500,
        exp: 3700,
      },
      {
        threshold: 1000,
        exp: 6000,
      },
      {
        threshold: 1500,
        exp: 6000,
      },
      {
        threshold: 2000,
        exp: 6000,
      },
      {
        threshold: 2500,
        exp: 6000,
      },
      {
        threshold: 3000,
        exp: 6000,
      },
      {
        threshold: 3500,
        exp: 6000,
      },
      {
        threshold: 4000,
        exp: 6000,
      },
    ],
  },
]

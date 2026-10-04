/** アイドル共通の条件・報酬を管理し、個別マスタにある要求値や表記の上書きと組み合わせる */
import type { IdolAchievementRule } from '../types/achievementCalculator'
import * as enums from '../types/enums'

/** 達成項目の識別子ごとに条件・報酬・True End区分をまとめる */
export const IDOL_ACHIEVEMENT_RULES: Record<enums.IdolAchievementMetric, IdolAchievementRule> = {
  // スキルカード使用回数
  [enums.IdolAchievementMetric.SkillCardsUsed]: {
    metricKey: 'achievement_calculator.metric.idol.skill_cards_used',
    milestones: [
      {
        threshold: 250,
        exp: 300,
      },
      {
        threshold: 1500,
        exp: 700,
      },
      {
        threshold: 6000,
        exp: 1300,
      },
      {
        threshold: 20000,
        exp: 2000,
      },
      {
        threshold: 40000,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // レッスンクリア回数
  [enums.IdolAchievementMetric.LessonsCleared]: {
    metricKey: 'achievement_calculator.metric.idol.lessons_cleared',
    milestones: [
      {
        threshold: 10,
        exp: 300,
      },
      {
        threshold: 100,
        exp: 700,
      },
      {
        threshold: 300,
        exp: 1000,
      },
      {
        threshold: 1200,
        exp: 2000,
      },
      {
        threshold: 2500,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // SPレッスンクリア回数
  [enums.IdolAchievementMetric.SpLessonsCleared]: {
    metricKey: 'achievement_calculator.metric.idol.sp_lessons_cleared',
    milestones: [
      {
        threshold: 15,
        exp: 300,
      },
      {
        threshold: 50,
        exp: 700,
      },
      {
        threshold: 200,
        exp: 1300,
      },
      {
        threshold: 700,
        exp: 2000,
      },
      {
        threshold: 1250,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // プロデュース回数
  [enums.IdolAchievementMetric.Productions]: {
    metricKey: 'achievement_calculator.metric.idol.productions',
    milestones: [
      {
        threshold: 1,
        exp: 250,
      },
      {
        threshold: 10,
        exp: 400,
      },
      {
        threshold: 50,
        exp: 1000,
      },
      {
        threshold: 100,
        exp: 1600,
      },
      {
        threshold: 200,
        exp: 2000,
      },
    ],
    isTrueEnd: false,
  },
  // 最終試験合格回数
  [enums.IdolAchievementMetric.FinalExamsPassed]: {
    metricKey: 'achievement_calculator.metric.idol.final_exams_passed',
    milestones: [
      {
        threshold: 5,
        exp: 300,
      },
      {
        threshold: 40,
        exp: 1000,
      },
      {
        threshold: 100,
        exp: 1600,
      },
      {
        threshold: 200,
        exp: 2000,
      },
      {
        threshold: 400,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // ファン人数
  [enums.IdolAchievementMetric.Fans]: {
    metricKey: 'achievement_calculator.metric.idol.fans',
    milestones: [
      {
        threshold: 70000,
        exp: 400,
      },
      {
        threshold: 300000,
        exp: 1000,
      },
      {
        threshold: 600000,
        exp: 1300,
      },
      {
        threshold: 1000000,
        exp: 1600,
      },
      {
        threshold: 3000000,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // プロデュース評価合計
  [enums.IdolAchievementMetric.Evaluation]: {
    metricKey: 'achievement_calculator.metric.idol.evaluation',
    milestones: [
      {
        threshold: 50000,
        exp: 300,
      },
      {
        threshold: 500000,
        exp: 1300,
      },
      {
        threshold: 1000000,
        exp: 1600,
      },
      {
        threshold: 2000000,
        exp: 2000,
      },
      {
        threshold: 4000000,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // スキルカード強化回数
  [enums.IdolAchievementMetric.SkillCardsEnhanced]: {
    metricKey: 'achievement_calculator.metric.idol.skill_cards_enhanced',
    milestones: [
      {
        threshold: 20,
        exp: 300,
      },
      {
        threshold: 250,
        exp: 1300,
      },
      {
        threshold: 500,
        exp: 1600,
      },
      {
        threshold: 1000,
        exp: 2000,
      },
      {
        threshold: 2000,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // 相談での交換回数
  [enums.IdolAchievementMetric.ConsultExchanges]: {
    metricKey: 'achievement_calculator.metric.idol.consult_exchanges',
    milestones: [
      {
        threshold: 15,
        exp: 300,
      },
      {
        threshold: 250,
        exp: 1300,
      },
      {
        threshold: 500,
        exp: 1600,
      },
      {
        threshold: 1000,
        exp: 2000,
      },
      {
        threshold: 2000,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // Pドリンク使用数
  [enums.IdolAchievementMetric.DrinksUsed]: {
    metricKey: 'achievement_calculator.metric.idol.drinks_used',
    milestones: [
      {
        threshold: 30,
        exp: 300,
      },
      {
        threshold: 300,
        exp: 1300,
      },
      {
        threshold: 500,
        exp: 1600,
      },
      {
        threshold: 1000,
        exp: 2000,
      },
      {
        threshold: 2000,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // 元気獲得数
  [enums.IdolAchievementMetric.PowerGained]: {
    metricKey: 'achievement_calculator.metric.idol.power_gained',
    milestones: [
      {
        threshold: 1000,
        exp: 300,
      },
      {
        threshold: 15000,
        exp: 1300,
      },
      {
        threshold: 30000,
        exp: 1600,
      },
      {
        threshold: 50000,
        exp: 2000,
      },
      {
        threshold: 100000,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // 合計体力消費数
  [enums.IdolAchievementMetric.StaminaSpent]: {
    metricKey: 'achievement_calculator.metric.idol.stamina_spent',
    milestones: [
      {
        threshold: 500,
        exp: 300,
      },
      {
        threshold: 15000,
        exp: 1300,
      },
      {
        threshold: 30000,
        exp: 1600,
      },
      {
        threshold: 45000,
        exp: 2000,
      },
      {
        threshold: 90000,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // 特別指導回数
  [enums.IdolAchievementMetric.SpecialTraining]: {
    metricKey: 'achievement_calculator.metric.idol.special_training',
    milestones: [
      {
        threshold: 20,
        exp: 1400,
      },
      {
        threshold: 60,
        exp: 1700,
      },
    ],
    isTrueEnd: false,
  },
  // ファン投票数
  [enums.IdolAchievementMetric.FanVotes]: {
    metricKey: 'achievement_calculator.metric.idol.fan_votes',
    milestones: [
      {
        threshold: 300000,
        exp: 1400,
      },
      {
        threshold: 1000000,
        exp: 1700,
      },
    ],
    isTrueEnd: false,
  },
  // 親愛度
  [enums.IdolAchievementMetric.Affection]: {
    metricKey: 'achievement_calculator.metric.idol.affection',
    milestones: [
      {
        threshold: 9,
        exp: 400,
      },
    ],
    isTrueEnd: false,
  },
  // ステータス
  [enums.IdolAchievementMetric.Status]: {
    metricKey: 'achievement_calculator.metric.idol.status',
    milestones: [
      {
        threshold: 1,
        exp: 300,
      },
    ],
    isTrueEnd: false,
  },
  // 『初』マスター最終試験1位
  [enums.IdolAchievementMetric.MasterFinalExam]: {
    metricKey: 'achievement_calculator.metric.idol.master_final_exam',
    milestones: [
      {
        threshold: 1,
        exp: 1600,
      },
    ],
    isTrueEnd: false,
  },
  // H.I.F最終試験合格回数
  [enums.IdolAchievementMetric.HifFinalExams]: {
    metricKey: 'achievement_calculator.metric.idol.hif_final_exams',
    milestones: [
      {
        threshold: 120,
        exp: 0,
      },
    ],
    isTrueEnd: false,
  },
  // 定期公演『初』True End
  [enums.IdolAchievementMetric.TrueEndHatsu]: {
    metricKey: 'achievement_calculator.metric.idol.true_end_hatsu',
    milestones: [
      {
        threshold: 1,
        exp: 1300,
      },
    ],
    isTrueEnd: true,
  },
  // N.I.A True End
  [enums.IdolAchievementMetric.TrueEndNia]: {
    metricKey: 'achievement_calculator.metric.idol.true_end_nia',
    milestones: [
      {
        threshold: 1,
        exp: 1700,
      },
    ],
    isTrueEnd: true,
  },
  // H.I.F True End
  [enums.IdolAchievementMetric.TrueEndHif]: {
    metricKey: 'achievement_calculator.metric.idol.true_end_hif',
    milestones: [
      {
        threshold: 1,
        exp: 2000,
      },
    ],
    isTrueEnd: true,
  },
  // 特訓段階1〜6
  [enums.IdolAchievementMetric.SpecialTrainingStages1To6]: {
    metricKey: 'achievement_calculator.metric.idol.special_training_stages_1_to_6',
    milestones: [
      {
        threshold: 1,
        exp: 300,
      },
      {
        threshold: 3,
        exp: 700,
      },
      {
        threshold: 5,
        exp: 1000,
      },
      {
        threshold: 6,
        exp: 1600,
      },
    ],
    isTrueEnd: false,
  },
  // 特訓段階7
  [enums.IdolAchievementMetric.SpecialTrainingStage7]: {
    metricKey: 'achievement_calculator.metric.idol.special_training_stage_7',
    milestones: [
      {
        threshold: 1,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // クリア時評価B以上
  [enums.IdolAchievementMetric.RankB]: {
    metricKey: 'achievement_calculator.metric.production.rank_b',
    milestones: [
      {
        threshold: 1,
        exp: 400,
      },
    ],
    isTrueEnd: false,
  },
  // クリア時評価A以上
  [enums.IdolAchievementMetric.RankA]: {
    metricKey: 'achievement_calculator.metric.production.rank_a',
    milestones: [
      {
        threshold: 1,
        exp: 700,
      },
    ],
    isTrueEnd: false,
  },
  // クリア時評価S以上
  [enums.IdolAchievementMetric.RankS]: {
    metricKey: 'achievement_calculator.metric.production.rank_s',
    milestones: [
      {
        threshold: 1,
        exp: 1300,
      },
    ],
    isTrueEnd: false,
  },
  // クリア時評価S+以上
  [enums.IdolAchievementMetric.RankSPlus]: {
    metricKey: 'achievement_calculator.metric.production.rank_s_plus',
    milestones: [
      {
        threshold: 1,
        exp: 1600,
      },
    ],
    isTrueEnd: false,
  },
  // クリア時評価SS以上
  [enums.IdolAchievementMetric.RankSs]: {
    metricKey: 'achievement_calculator.metric.production.rank_ss',
    milestones: [
      {
        threshold: 1,
        exp: 1800,
      },
    ],
    isTrueEnd: false,
  },
  // クリア時評価SS+以上
  [enums.IdolAchievementMetric.RankSsPlus]: {
    metricKey: 'achievement_calculator.metric.production.rank_ss_plus',
    milestones: [
      {
        threshold: 1,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // クリア時評価SSS以上
  [enums.IdolAchievementMetric.RankSss]: {
    metricKey: 'achievement_calculator.metric.production.rank_sss',
    milestones: [
      {
        threshold: 1,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // クリア時評価SSS+以上
  [enums.IdolAchievementMetric.RankSssPlus]: {
    metricKey: 'achievement_calculator.metric.production.rank_sss_plus',
    milestones: [
      {
        threshold: 1,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // クリア時評価S4以上
  [enums.IdolAchievementMetric.RankS4]: {
    metricKey: 'achievement_calculator.metric.production.rank_s4',
    milestones: [
      {
        threshold: 1,
        exp: 2600,
      },
    ],
    isTrueEnd: false,
  },
  // クリア時評価S4+以上
  [enums.IdolAchievementMetric.RankS4Plus]: {
    metricKey: 'achievement_calculator.metric.production.rank_s4_plus',
    milestones: [
      {
        threshold: 1,
        exp: 0,
      },
    ],
    isTrueEnd: false,
  },
}

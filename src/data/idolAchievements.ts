/** アイドル別の正式なアチーブ名と表示順を管理し、共通ルールと異なる条件だけを個別に定義する */
import type { IdolAchievementDefinition } from '../types/achievementCalculator'
import * as enums from '../types/enums'

/** 各アイドルの達成項目をゲーム画面と同じ順番で定義する */
export const IDOL_ACHIEVEMENTS: readonly IdolAchievementDefinition[] = [
  // 花海咲季
  {
    id: enums.IdolId.Saki,
    nameKey: 'idol_names.saki',
    trackers: [
      // 定期公演『初』True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHatsu,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.true_end_hatsu',
      },
      // N.I.A True End
      {
        metric: enums.IdolAchievementMetric.TrueEndNia,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.true_end_nia',
      },
      // H.I.F True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHif,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.true_end_hif',
      },
      // スキルカード使用回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.skill_cards_used',
      },
      // レッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.LessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.lessons_cleared',
      },
      // SPレッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.SpLessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.sp_lessons_cleared',
      },
      // クリア時評価B以上
      {
        metric: enums.IdolAchievementMetric.RankB,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.produce_rank.b',
      },
      // クリア時評価A以上
      {
        metric: enums.IdolAchievementMetric.RankA,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.produce_rank.a',
      },
      // クリア時評価S以上
      {
        metric: enums.IdolAchievementMetric.RankS,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.produce_rank.s',
      },
      // クリア時評価S+以上
      {
        metric: enums.IdolAchievementMetric.RankSPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.produce_rank.s_plus',
      },
      // クリア時評価SS以上
      {
        metric: enums.IdolAchievementMetric.RankSs,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.produce_rank.ss',
      },
      // クリア時評価SS+以上
      {
        metric: enums.IdolAchievementMetric.RankSsPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.produce_rank.ss_plus',
      },
      // クリア時評価SSS以上
      {
        metric: enums.IdolAchievementMetric.RankSss,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.produce_rank.sss',
      },
      // クリア時評価SSS+以上
      {
        metric: enums.IdolAchievementMetric.RankSssPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.produce_rank.sss_plus',
      },
      // クリア時評価S4以上
      {
        metric: enums.IdolAchievementMetric.RankS4,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.produce_rank.s4',
      },
      // クリア時評価S4+以上
      {
        metric: enums.IdolAchievementMetric.RankS4Plus,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.produce_rank.s4_plus',
      },
      // プロデュース回数
      {
        metric: enums.IdolAchievementMetric.Productions,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.productions',
      },
      // H.I.F最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.HifFinalExams,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.hif_final_exams',
      },
      // 特訓段階1〜6
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStages1To6,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.special_training_stage',
      },
      // 特訓段階7
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStage7,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.special_training_stage',
      },
      // 最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.FinalExamsPassed,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.final_exams_passed',
      },
      // ファン人数
      {
        metric: enums.IdolAchievementMetric.Fans,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.fans',
      },
      // 親愛度
      {
        metric: enums.IdolAchievementMetric.Affection,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.affection',
      },
      // プロデュース評価合計
      {
        metric: enums.IdolAchievementMetric.Evaluation,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.evaluation',
      },
      // スキルカード強化回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsEnhanced,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.skill_cards_enhanced',
      },
      // ステータス
      {
        metric: enums.IdolAchievementMetric.Status,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.status',
        metricKey: 'achievement_calculator.metric.idol.status_visual',
        milestones: [
          {
            threshold: 900,
            exp: 300,
          },
        ],
      },
      // 『初』マスター最終試験1位
      {
        metric: enums.IdolAchievementMetric.MasterFinalExam,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.master_final_exam',
      },
      // 特別指導回数
      {
        metric: enums.IdolAchievementMetric.SpecialTraining,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.special_training',
      },
      // ファン投票数
      {
        metric: enums.IdolAchievementMetric.FanVotes,
        titleKey: 'achievement_calculator.achievement_name.idol.saki.fan_votes',
      },
    ],
  },
  // 月村手毬
  {
    id: enums.IdolId.Temari,
    nameKey: 'idol_names.temari',
    trackers: [
      // 定期公演『初』True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHatsu,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.true_end_hatsu',
      },
      // N.I.A True End
      {
        metric: enums.IdolAchievementMetric.TrueEndNia,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.true_end_nia',
      },
      // H.I.F True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHif,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.true_end_hif',
      },
      // スキルカード使用回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.skill_cards_used',
      },
      // レッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.LessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.lessons_cleared',
      },
      // SPレッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.SpLessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.sp_lessons_cleared',
      },
      // クリア時評価B以上
      {
        metric: enums.IdolAchievementMetric.RankB,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.produce_rank.b',
      },
      // クリア時評価A以上
      {
        metric: enums.IdolAchievementMetric.RankA,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.produce_rank.a',
      },
      // クリア時評価S以上
      {
        metric: enums.IdolAchievementMetric.RankS,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.produce_rank.s',
      },
      // クリア時評価S+以上
      {
        metric: enums.IdolAchievementMetric.RankSPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.produce_rank.s_plus',
      },
      // クリア時評価SS以上
      {
        metric: enums.IdolAchievementMetric.RankSs,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.produce_rank.ss',
      },
      // クリア時評価SS+以上
      {
        metric: enums.IdolAchievementMetric.RankSsPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.produce_rank.ss_plus',
      },
      // クリア時評価SSS以上
      {
        metric: enums.IdolAchievementMetric.RankSss,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.produce_rank.sss',
      },
      // クリア時評価SSS+以上
      {
        metric: enums.IdolAchievementMetric.RankSssPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.produce_rank.sss_plus',
      },
      // クリア時評価S4以上
      {
        metric: enums.IdolAchievementMetric.RankS4,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.produce_rank.s4',
      },
      // クリア時評価S4+以上
      {
        metric: enums.IdolAchievementMetric.RankS4Plus,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.produce_rank.s4_plus',
      },
      // プロデュース回数
      {
        metric: enums.IdolAchievementMetric.Productions,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.productions',
      },
      // H.I.F最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.HifFinalExams,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.hif_final_exams',
      },
      // 特訓段階1〜6
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStages1To6,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.special_training_stage',
      },
      // 特訓段階7
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStage7,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.special_training_stage',
      },
      // 最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.FinalExamsPassed,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.final_exams_passed',
      },
      // ファン人数
      {
        metric: enums.IdolAchievementMetric.Fans,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.fans',
      },
      // 親愛度
      {
        metric: enums.IdolAchievementMetric.Affection,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.affection',
      },
      // スキルカード強化回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsEnhanced,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.skill_cards_enhanced',
      },
      // 相談での交換回数
      {
        metric: enums.IdolAchievementMetric.ConsultExchanges,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.consult_exchanges',
      },
      // ステータス
      {
        metric: enums.IdolAchievementMetric.Status,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.status',
        metricKey: 'achievement_calculator.metric.idol.status_vocal',
        milestones: [
          {
            threshold: 1000,
            exp: 300,
          },
        ],
      },
      // 『初』マスター最終試験1位
      {
        metric: enums.IdolAchievementMetric.MasterFinalExam,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.master_final_exam',
      },
      // 特別指導回数
      {
        metric: enums.IdolAchievementMetric.SpecialTraining,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.special_training',
      },
      // ファン投票数
      {
        metric: enums.IdolAchievementMetric.FanVotes,
        titleKey: 'achievement_calculator.achievement_name.idol.temari.fan_votes',
      },
    ],
  },
  // 藤田ことね
  {
    id: enums.IdolId.Kotone,
    nameKey: 'idol_names.kotone',
    trackers: [
      // 定期公演『初』True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHatsu,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.true_end_hatsu',
      },
      // N.I.A True End
      {
        metric: enums.IdolAchievementMetric.TrueEndNia,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.true_end_nia',
      },
      // H.I.F True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHif,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.true_end_hif',
      },
      // スキルカード使用回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.skill_cards_used',
      },
      // レッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.LessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.lessons_cleared',
      },
      // SPレッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.SpLessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.sp_lessons_cleared',
      },
      // クリア時評価B以上
      {
        metric: enums.IdolAchievementMetric.RankB,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.produce_rank.b',
      },
      // クリア時評価A以上
      {
        metric: enums.IdolAchievementMetric.RankA,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.produce_rank.a',
      },
      // クリア時評価S以上
      {
        metric: enums.IdolAchievementMetric.RankS,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.produce_rank.s',
      },
      // クリア時評価S+以上
      {
        metric: enums.IdolAchievementMetric.RankSPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.produce_rank.s_plus',
      },
      // クリア時評価SS以上
      {
        metric: enums.IdolAchievementMetric.RankSs,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.produce_rank.ss',
      },
      // クリア時評価SS+以上
      {
        metric: enums.IdolAchievementMetric.RankSsPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.produce_rank.ss_plus',
      },
      // クリア時評価SSS以上
      {
        metric: enums.IdolAchievementMetric.RankSss,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.produce_rank.sss',
      },
      // クリア時評価SSS+以上
      {
        metric: enums.IdolAchievementMetric.RankSssPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.produce_rank.sss_plus',
      },
      // クリア時評価S4以上
      {
        metric: enums.IdolAchievementMetric.RankS4,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.produce_rank.s4',
      },
      // クリア時評価S4+以上
      {
        metric: enums.IdolAchievementMetric.RankS4Plus,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.produce_rank.s4_plus',
      },
      // プロデュース回数
      {
        metric: enums.IdolAchievementMetric.Productions,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.productions',
      },
      // H.I.F最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.HifFinalExams,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.hif_final_exams',
      },
      // 特訓段階1〜6
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStages1To6,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.special_training_stage',
      },
      // 特訓段階7
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStage7,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.special_training_stage',
      },
      // 最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.FinalExamsPassed,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.final_exams_passed',
      },
      // ファン人数
      {
        metric: enums.IdolAchievementMetric.Fans,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.fans',
      },
      // 親愛度
      {
        metric: enums.IdolAchievementMetric.Affection,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.affection',
      },
      // プロデュース評価合計
      {
        metric: enums.IdolAchievementMetric.Evaluation,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.evaluation',
      },
      // 相談での交換回数
      {
        metric: enums.IdolAchievementMetric.ConsultExchanges,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.consult_exchanges',
      },
      // ステータス
      {
        metric: enums.IdolAchievementMetric.Status,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.status',
        metricKey: 'achievement_calculator.metric.idol.status_dance',
        milestones: [
          {
            threshold: 1000,
            exp: 300,
          },
        ],
      },
      // 『初』マスター最終試験1位
      {
        metric: enums.IdolAchievementMetric.MasterFinalExam,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.master_final_exam',
      },
      // 特別指導回数
      {
        metric: enums.IdolAchievementMetric.SpecialTraining,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.special_training',
      },
      // ファン投票数
      {
        metric: enums.IdolAchievementMetric.FanVotes,
        titleKey: 'achievement_calculator.achievement_name.idol.kotone.fan_votes',
      },
    ],
  },
  // 雨夜燕
  {
    id: enums.IdolId.Tsubame,
    nameKey: 'idol_names.tsubame',
    trackers: [
      // 定期公演『初』True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHatsu,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.true_end_hatsu',
      },
      // N.I.A True End
      {
        metric: enums.IdolAchievementMetric.TrueEndNia,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.true_end_nia',
      },
      // スキルカード使用回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.skill_cards_used',
      },
      // レッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.LessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.lessons_cleared',
      },
      // SPレッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.SpLessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.sp_lessons_cleared',
      },
      // クリア時評価B以上
      {
        metric: enums.IdolAchievementMetric.RankB,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.produce_rank.b',
      },
      // クリア時評価A以上
      {
        metric: enums.IdolAchievementMetric.RankA,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.produce_rank.a',
      },
      // クリア時評価S以上
      {
        metric: enums.IdolAchievementMetric.RankS,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.produce_rank.s',
      },
      // クリア時評価S+以上
      {
        metric: enums.IdolAchievementMetric.RankSPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.produce_rank.s_plus',
      },
      // クリア時評価SS以上
      {
        metric: enums.IdolAchievementMetric.RankSs,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.produce_rank.ss',
      },
      // クリア時評価SS+以上
      {
        metric: enums.IdolAchievementMetric.RankSsPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.produce_rank.ss_plus',
      },
      // クリア時評価SSS以上
      {
        metric: enums.IdolAchievementMetric.RankSss,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.produce_rank.sss',
      },
      // クリア時評価SSS+以上
      {
        metric: enums.IdolAchievementMetric.RankSssPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.produce_rank.sss_plus',
      },
      // クリア時評価S4以上
      {
        metric: enums.IdolAchievementMetric.RankS4,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.produce_rank.s4',
      },
      // プロデュース回数
      {
        metric: enums.IdolAchievementMetric.Productions,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.productions',
      },
      // 特訓段階1〜6
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStages1To6,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.special_training_stage',
      },
      // 最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.FinalExamsPassed,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.final_exams_passed',
      },
      // ファン人数
      {
        metric: enums.IdolAchievementMetric.Fans,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.fans',
      },
      // 親愛度
      {
        metric: enums.IdolAchievementMetric.Affection,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.affection',
      },
      // 元気獲得数
      {
        metric: enums.IdolAchievementMetric.PowerGained,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.power_gained',
      },
      // Pドリンク使用数
      {
        metric: enums.IdolAchievementMetric.DrinksUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.drinks_used',
      },
      // ステータス
      {
        metric: enums.IdolAchievementMetric.Status,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.status',
        metricKey: 'achievement_calculator.metric.idol.status_dance',
        milestones: [
          {
            threshold: 1000,
            exp: 300,
          },
        ],
      },
      // 『初』マスター最終試験1位
      {
        metric: enums.IdolAchievementMetric.MasterFinalExam,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.master_final_exam',
      },
      // 特別指導回数
      {
        metric: enums.IdolAchievementMetric.SpecialTraining,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.special_training',
      },
      // ファン投票数
      {
        metric: enums.IdolAchievementMetric.FanVotes,
        titleKey: 'achievement_calculator.achievement_name.idol.tsubame.fan_votes',
      },
    ],
  },
  // 有村麻央
  {
    id: enums.IdolId.Mao,
    nameKey: 'idol_names.mao',
    trackers: [
      // 定期公演『初』True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHatsu,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.true_end_hatsu',
      },
      // N.I.A True End
      {
        metric: enums.IdolAchievementMetric.TrueEndNia,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.true_end_nia',
      },
      // H.I.F True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHif,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.true_end_hif',
      },
      // スキルカード使用回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.skill_cards_used',
      },
      // レッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.LessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.lessons_cleared',
      },
      // SPレッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.SpLessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.sp_lessons_cleared',
      },
      // クリア時評価B以上
      {
        metric: enums.IdolAchievementMetric.RankB,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.produce_rank.b',
      },
      // クリア時評価A以上
      {
        metric: enums.IdolAchievementMetric.RankA,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.produce_rank.a',
      },
      // クリア時評価S以上
      {
        metric: enums.IdolAchievementMetric.RankS,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.produce_rank.s',
      },
      // クリア時評価S+以上
      {
        metric: enums.IdolAchievementMetric.RankSPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.produce_rank.s_plus',
      },
      // クリア時評価SS以上
      {
        metric: enums.IdolAchievementMetric.RankSs,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.produce_rank.ss',
      },
      // クリア時評価SS+以上
      {
        metric: enums.IdolAchievementMetric.RankSsPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.produce_rank.ss_plus',
      },
      // クリア時評価SSS以上
      {
        metric: enums.IdolAchievementMetric.RankSss,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.produce_rank.sss',
      },
      // クリア時評価SSS+以上
      {
        metric: enums.IdolAchievementMetric.RankSssPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.produce_rank.sss_plus',
      },
      // クリア時評価S4以上
      {
        metric: enums.IdolAchievementMetric.RankS4,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.produce_rank.s4',
      },
      // クリア時評価S4+以上
      {
        metric: enums.IdolAchievementMetric.RankS4Plus,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.produce_rank.s4_plus',
      },
      // プロデュース回数
      {
        metric: enums.IdolAchievementMetric.Productions,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.productions',
      },
      // H.I.F最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.HifFinalExams,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.hif_final_exams',
      },
      // 特訓段階1〜6
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStages1To6,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.special_training_stage',
      },
      // 特訓段階7
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStage7,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.special_training_stage',
      },
      // 最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.FinalExamsPassed,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.final_exams_passed',
      },
      // ファン人数
      {
        metric: enums.IdolAchievementMetric.Fans,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.fans',
      },
      // 親愛度
      {
        metric: enums.IdolAchievementMetric.Affection,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.affection',
      },
      // Pドリンク使用数
      {
        metric: enums.IdolAchievementMetric.DrinksUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.drinks_used',
      },
      // 合計体力消費数
      {
        metric: enums.IdolAchievementMetric.StaminaSpent,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.stamina_spent',
      },
      // ステータス
      {
        metric: enums.IdolAchievementMetric.Status,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.status',
        metricKey: 'achievement_calculator.metric.idol.status_visual',
        milestones: [
          {
            threshold: 1000,
            exp: 300,
          },
        ],
      },
      // 『初』マスター最終試験1位
      {
        metric: enums.IdolAchievementMetric.MasterFinalExam,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.master_final_exam',
      },
      // 特別指導回数
      {
        metric: enums.IdolAchievementMetric.SpecialTraining,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.special_training',
      },
      // ファン投票数
      {
        metric: enums.IdolAchievementMetric.FanVotes,
        titleKey: 'achievement_calculator.achievement_name.idol.mao.fan_votes',
      },
    ],
  },
  // 葛城リーリヤ
  {
    id: enums.IdolId.Lilja,
    nameKey: 'idol_names.lilja',
    trackers: [
      // 定期公演『初』True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHatsu,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.true_end_hatsu',
      },
      // N.I.A True End
      {
        metric: enums.IdolAchievementMetric.TrueEndNia,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.true_end_nia',
      },
      // H.I.F True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHif,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.true_end_hif',
      },
      // スキルカード使用回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.skill_cards_used',
      },
      // レッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.LessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.lessons_cleared',
      },
      // SPレッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.SpLessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.sp_lessons_cleared',
      },
      // クリア時評価B以上
      {
        metric: enums.IdolAchievementMetric.RankB,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.produce_rank.b',
      },
      // クリア時評価A以上
      {
        metric: enums.IdolAchievementMetric.RankA,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.produce_rank.a',
      },
      // クリア時評価S以上
      {
        metric: enums.IdolAchievementMetric.RankS,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.produce_rank.s',
      },
      // クリア時評価S+以上
      {
        metric: enums.IdolAchievementMetric.RankSPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.produce_rank.s_plus',
      },
      // クリア時評価SS以上
      {
        metric: enums.IdolAchievementMetric.RankSs,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.produce_rank.ss',
      },
      // クリア時評価SS+以上
      {
        metric: enums.IdolAchievementMetric.RankSsPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.produce_rank.ss_plus',
      },
      // クリア時評価SSS以上
      {
        metric: enums.IdolAchievementMetric.RankSss,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.produce_rank.sss',
      },
      // クリア時評価SSS+以上
      {
        metric: enums.IdolAchievementMetric.RankSssPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.produce_rank.sss_plus',
      },
      // クリア時評価S4以上
      {
        metric: enums.IdolAchievementMetric.RankS4,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.produce_rank.s4',
      },
      // クリア時評価S4+以上
      {
        metric: enums.IdolAchievementMetric.RankS4Plus,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.produce_rank.s4_plus',
      },
      // プロデュース回数
      {
        metric: enums.IdolAchievementMetric.Productions,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.productions',
      },
      // H.I.F最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.HifFinalExams,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.hif_final_exams',
      },
      // 特訓段階1〜6
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStages1To6,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.special_training_stage',
      },
      // 特訓段階7
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStage7,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.special_training_stage',
      },
      // 最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.FinalExamsPassed,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.final_exams_passed',
      },
      // ファン人数
      {
        metric: enums.IdolAchievementMetric.Fans,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.fans',
      },
      // 親愛度
      {
        metric: enums.IdolAchievementMetric.Affection,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.affection',
      },
      // 元気獲得数
      {
        metric: enums.IdolAchievementMetric.PowerGained,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.power_gained',
      },
      // スキルカード強化回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsEnhanced,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.skill_cards_enhanced',
      },
      // ステータス
      {
        metric: enums.IdolAchievementMetric.Status,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.status',
        metricKey: 'achievement_calculator.metric.idol.status_visual',
        milestones: [
          {
            threshold: 1000,
            exp: 300,
          },
        ],
      },
      // 『初』マスター最終試験1位
      {
        metric: enums.IdolAchievementMetric.MasterFinalExam,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.master_final_exam',
      },
      // 特別指導回数
      {
        metric: enums.IdolAchievementMetric.SpecialTraining,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.special_training',
      },
      // ファン投票数
      {
        metric: enums.IdolAchievementMetric.FanVotes,
        titleKey: 'achievement_calculator.achievement_name.idol.lilja.fan_votes',
      },
    ],
  },
  // 倉本千奈
  {
    id: enums.IdolId.China,
    nameKey: 'idol_names.china',
    trackers: [
      // 定期公演『初』True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHatsu,
        titleKey: 'achievement_calculator.achievement_name.idol.china.true_end_hatsu',
      },
      // N.I.A True End
      {
        metric: enums.IdolAchievementMetric.TrueEndNia,
        titleKey: 'achievement_calculator.achievement_name.idol.china.true_end_nia',
      },
      // H.I.F True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHif,
        titleKey: 'achievement_calculator.achievement_name.idol.china.true_end_hif',
      },
      // スキルカード使用回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.china.skill_cards_used',
      },
      // レッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.LessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.china.lessons_cleared',
      },
      // SPレッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.SpLessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.china.sp_lessons_cleared',
      },
      // クリア時評価B以上
      {
        metric: enums.IdolAchievementMetric.RankB,
        titleKey: 'achievement_calculator.achievement_name.idol.china.produce_rank.b',
      },
      // クリア時評価A以上
      {
        metric: enums.IdolAchievementMetric.RankA,
        titleKey: 'achievement_calculator.achievement_name.idol.china.produce_rank.a',
      },
      // クリア時評価S以上
      {
        metric: enums.IdolAchievementMetric.RankS,
        titleKey: 'achievement_calculator.achievement_name.idol.china.produce_rank.s',
      },
      // クリア時評価S+以上
      {
        metric: enums.IdolAchievementMetric.RankSPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.china.produce_rank.s_plus',
      },
      // クリア時評価SS以上
      {
        metric: enums.IdolAchievementMetric.RankSs,
        titleKey: 'achievement_calculator.achievement_name.idol.china.produce_rank.ss',
      },
      // クリア時評価SS+以上
      {
        metric: enums.IdolAchievementMetric.RankSsPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.china.produce_rank.ss_plus',
      },
      // クリア時評価SSS以上
      {
        metric: enums.IdolAchievementMetric.RankSss,
        titleKey: 'achievement_calculator.achievement_name.idol.china.produce_rank.sss',
      },
      // クリア時評価SSS+以上
      {
        metric: enums.IdolAchievementMetric.RankSssPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.china.produce_rank.sss_plus',
      },
      // クリア時評価S4以上
      {
        metric: enums.IdolAchievementMetric.RankS4,
        titleKey: 'achievement_calculator.achievement_name.idol.china.produce_rank.s4',
      },
      // クリア時評価S4+以上
      {
        metric: enums.IdolAchievementMetric.RankS4Plus,
        titleKey: 'achievement_calculator.achievement_name.idol.china.produce_rank.s4_plus',
      },
      // プロデュース回数
      {
        metric: enums.IdolAchievementMetric.Productions,
        titleKey: 'achievement_calculator.achievement_name.idol.china.productions',
      },
      // H.I.F最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.HifFinalExams,
        titleKey: 'achievement_calculator.achievement_name.idol.china.hif_final_exams',
      },
      // 特訓段階1〜6
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStages1To6,
        titleKey: 'achievement_calculator.achievement_name.idol.china.special_training_stage',
      },
      // 特訓段階7
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStage7,
        titleKey: 'achievement_calculator.achievement_name.idol.china.special_training_stage',
      },
      // 最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.FinalExamsPassed,
        titleKey: 'achievement_calculator.achievement_name.idol.china.final_exams_passed',
      },
      // ファン人数
      {
        metric: enums.IdolAchievementMetric.Fans,
        titleKey: 'achievement_calculator.achievement_name.idol.china.fans',
      },
      // 親愛度
      {
        metric: enums.IdolAchievementMetric.Affection,
        titleKey: 'achievement_calculator.achievement_name.idol.china.affection',
      },
      // 元気獲得数
      {
        metric: enums.IdolAchievementMetric.PowerGained,
        titleKey: 'achievement_calculator.achievement_name.idol.china.power_gained',
      },
      // 相談での交換回数
      {
        metric: enums.IdolAchievementMetric.ConsultExchanges,
        titleKey: 'achievement_calculator.achievement_name.idol.china.consult_exchanges',
      },
      // ステータス
      {
        metric: enums.IdolAchievementMetric.Status,
        titleKey: 'achievement_calculator.achievement_name.idol.china.status',
        metricKey: 'achievement_calculator.metric.idol.status_dance',
        milestones: [
          {
            threshold: 1000,
            exp: 300,
          },
        ],
      },
      // 『初』マスター最終試験1位
      {
        metric: enums.IdolAchievementMetric.MasterFinalExam,
        titleKey: 'achievement_calculator.achievement_name.idol.china.master_final_exam',
      },
      // 特別指導回数
      {
        metric: enums.IdolAchievementMetric.SpecialTraining,
        titleKey: 'achievement_calculator.achievement_name.idol.china.special_training',
      },
      // ファン投票数
      {
        metric: enums.IdolAchievementMetric.FanVotes,
        titleKey: 'achievement_calculator.achievement_name.idol.china.fan_votes',
      },
    ],
  },
  // 紫雲清夏
  {
    id: enums.IdolId.Sumika,
    nameKey: 'idol_names.sumika',
    trackers: [
      // 定期公演『初』True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHatsu,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.true_end_hatsu',
      },
      // N.I.A True End
      {
        metric: enums.IdolAchievementMetric.TrueEndNia,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.true_end_nia',
      },
      // H.I.F True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHif,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.true_end_hif',
      },
      // スキルカード使用回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.skill_cards_used',
      },
      // レッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.LessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.lessons_cleared',
      },
      // SPレッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.SpLessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.sp_lessons_cleared',
      },
      // クリア時評価B以上
      {
        metric: enums.IdolAchievementMetric.RankB,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.produce_rank.b',
      },
      // クリア時評価A以上
      {
        metric: enums.IdolAchievementMetric.RankA,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.produce_rank.a',
      },
      // クリア時評価S以上
      {
        metric: enums.IdolAchievementMetric.RankS,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.produce_rank.s',
      },
      // クリア時評価S+以上
      {
        metric: enums.IdolAchievementMetric.RankSPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.produce_rank.s_plus',
      },
      // クリア時評価SS以上
      {
        metric: enums.IdolAchievementMetric.RankSs,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.produce_rank.ss',
      },
      // クリア時評価SS+以上
      {
        metric: enums.IdolAchievementMetric.RankSsPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.produce_rank.ss_plus',
      },
      // クリア時評価SSS以上
      {
        metric: enums.IdolAchievementMetric.RankSss,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.produce_rank.sss',
      },
      // クリア時評価SSS+以上
      {
        metric: enums.IdolAchievementMetric.RankSssPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.produce_rank.sss_plus',
      },
      // クリア時評価S4以上
      {
        metric: enums.IdolAchievementMetric.RankS4,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.produce_rank.s4',
      },
      // クリア時評価S4+以上
      {
        metric: enums.IdolAchievementMetric.RankS4Plus,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.produce_rank.s4_plus',
      },
      // プロデュース回数
      {
        metric: enums.IdolAchievementMetric.Productions,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.productions',
      },
      // H.I.F最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.HifFinalExams,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.hif_final_exams',
      },
      // 特訓段階1〜6
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStages1To6,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.special_training_stage',
      },
      // 特訓段階7
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStage7,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.special_training_stage',
      },
      // 最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.FinalExamsPassed,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.final_exams_passed',
      },
      // ファン人数
      {
        metric: enums.IdolAchievementMetric.Fans,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.fans',
      },
      // 親愛度
      {
        metric: enums.IdolAchievementMetric.Affection,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.affection',
      },
      // Pドリンク使用数
      {
        metric: enums.IdolAchievementMetric.DrinksUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.drinks_used',
      },
      // 合計体力消費数
      {
        metric: enums.IdolAchievementMetric.StaminaSpent,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.stamina_spent',
      },
      // ステータス
      {
        metric: enums.IdolAchievementMetric.Status,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.status',
        metricKey: 'achievement_calculator.metric.idol.status_dance',
        milestones: [
          {
            threshold: 1000,
            exp: 300,
          },
        ],
      },
      // 『初』マスター最終試験1位
      {
        metric: enums.IdolAchievementMetric.MasterFinalExam,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.master_final_exam',
      },
      // 特別指導回数
      {
        metric: enums.IdolAchievementMetric.SpecialTraining,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.special_training',
      },
      // ファン投票数
      {
        metric: enums.IdolAchievementMetric.FanVotes,
        titleKey: 'achievement_calculator.achievement_name.idol.sumika.fan_votes',
      },
    ],
  },
  // 篠澤広
  {
    id: enums.IdolId.Hiro,
    nameKey: 'idol_names.hiro',
    trackers: [
      // 定期公演『初』True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHatsu,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.true_end_hatsu',
      },
      // N.I.A True End
      {
        metric: enums.IdolAchievementMetric.TrueEndNia,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.true_end_nia',
      },
      // H.I.F True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHif,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.true_end_hif',
      },
      // スキルカード使用回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.skill_cards_used',
      },
      // レッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.LessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.lessons_cleared',
      },
      // SPレッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.SpLessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.sp_lessons_cleared',
      },
      // クリア時評価B以上
      {
        metric: enums.IdolAchievementMetric.RankB,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.produce_rank.b',
      },
      // クリア時評価A以上
      {
        metric: enums.IdolAchievementMetric.RankA,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.produce_rank.a',
      },
      // クリア時評価S以上
      {
        metric: enums.IdolAchievementMetric.RankS,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.produce_rank.s',
      },
      // クリア時評価S+以上
      {
        metric: enums.IdolAchievementMetric.RankSPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.produce_rank.s_plus',
      },
      // クリア時評価SS以上
      {
        metric: enums.IdolAchievementMetric.RankSs,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.produce_rank.ss',
      },
      // クリア時評価SS+以上
      {
        metric: enums.IdolAchievementMetric.RankSsPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.produce_rank.ss_plus',
      },
      // クリア時評価SSS以上
      {
        metric: enums.IdolAchievementMetric.RankSss,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.produce_rank.sss',
      },
      // クリア時評価SSS+以上
      {
        metric: enums.IdolAchievementMetric.RankSssPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.produce_rank.sss_plus',
      },
      // クリア時評価S4以上
      {
        metric: enums.IdolAchievementMetric.RankS4,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.produce_rank.s4',
      },
      // クリア時評価S4+以上
      {
        metric: enums.IdolAchievementMetric.RankS4Plus,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.produce_rank.s4_plus',
      },
      // プロデュース回数
      {
        metric: enums.IdolAchievementMetric.Productions,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.productions',
      },
      // H.I.F最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.HifFinalExams,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.hif_final_exams',
      },
      // 特訓段階1〜6
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStages1To6,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.special_training_stage',
      },
      // 特訓段階7
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStage7,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.special_training_stage',
      },
      // 最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.FinalExamsPassed,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.final_exams_passed',
      },
      // ファン人数
      {
        metric: enums.IdolAchievementMetric.Fans,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.fans',
      },
      // 親愛度
      {
        metric: enums.IdolAchievementMetric.Affection,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.affection',
      },
      // プロデュース評価合計
      {
        metric: enums.IdolAchievementMetric.Evaluation,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.evaluation',
      },
      // 元気獲得数
      {
        metric: enums.IdolAchievementMetric.PowerGained,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.power_gained',
      },
      // ステータス
      {
        metric: enums.IdolAchievementMetric.Status,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.status',
        metricKey: 'achievement_calculator.metric.idol.status_vocal',
        milestones: [
          {
            threshold: 1000,
            exp: 300,
          },
        ],
      },
      // 『初』マスター最終試験1位
      {
        metric: enums.IdolAchievementMetric.MasterFinalExam,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.master_final_exam',
      },
      // 特別指導回数
      {
        metric: enums.IdolAchievementMetric.SpecialTraining,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.special_training',
      },
      // ファン投票数
      {
        metric: enums.IdolAchievementMetric.FanVotes,
        titleKey: 'achievement_calculator.achievement_name.idol.hiro.fan_votes',
      },
    ],
  },
  // 十王星南
  {
    id: enums.IdolId.Sena,
    nameKey: 'idol_names.sena',
    trackers: [
      // 定期公演『初』True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHatsu,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.true_end_hatsu',
      },
      // N.I.A True End
      {
        metric: enums.IdolAchievementMetric.TrueEndNia,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.true_end_nia',
      },
      // H.I.F True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHif,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.true_end_hif',
      },
      // スキルカード使用回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.skill_cards_used',
      },
      // レッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.LessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.lessons_cleared',
      },
      // SPレッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.SpLessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.sp_lessons_cleared',
      },
      // クリア時評価B以上
      {
        metric: enums.IdolAchievementMetric.RankB,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.produce_rank.b',
      },
      // クリア時評価A以上
      {
        metric: enums.IdolAchievementMetric.RankA,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.produce_rank.a',
      },
      // クリア時評価S以上
      {
        metric: enums.IdolAchievementMetric.RankS,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.produce_rank.s',
      },
      // クリア時評価S+以上
      {
        metric: enums.IdolAchievementMetric.RankSPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.produce_rank.s_plus',
      },
      // クリア時評価SS以上
      {
        metric: enums.IdolAchievementMetric.RankSs,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.produce_rank.ss',
      },
      // クリア時評価SS+以上
      {
        metric: enums.IdolAchievementMetric.RankSsPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.produce_rank.ss_plus',
      },
      // クリア時評価SSS以上
      {
        metric: enums.IdolAchievementMetric.RankSss,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.produce_rank.sss',
      },
      // クリア時評価SSS+以上
      {
        metric: enums.IdolAchievementMetric.RankSssPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.produce_rank.sss_plus',
      },
      // クリア時評価S4以上
      {
        metric: enums.IdolAchievementMetric.RankS4,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.produce_rank.s4',
      },
      // クリア時評価S4+以上
      {
        metric: enums.IdolAchievementMetric.RankS4Plus,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.produce_rank.s4_plus',
      },
      // プロデュース回数
      {
        metric: enums.IdolAchievementMetric.Productions,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.productions',
      },
      // H.I.F最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.HifFinalExams,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.hif_final_exams',
      },
      // 特訓段階1〜6
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStages1To6,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.special_training_stage',
      },
      // 特訓段階7
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStage7,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.special_training_stage',
      },
      // 最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.FinalExamsPassed,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.final_exams_passed',
      },
      // ファン人数
      {
        metric: enums.IdolAchievementMetric.Fans,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.fans',
      },
      // 親愛度
      {
        metric: enums.IdolAchievementMetric.Affection,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.affection',
      },
      // 相談での交換回数
      {
        metric: enums.IdolAchievementMetric.ConsultExchanges,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.consult_exchanges',
      },
      // 合計体力消費数
      {
        metric: enums.IdolAchievementMetric.StaminaSpent,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.stamina_spent',
      },
      // ステータス
      {
        metric: enums.IdolAchievementMetric.Status,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.status',
        metricKey: 'achievement_calculator.metric.idol.status_visual',
        milestones: [
          {
            threshold: 900,
            exp: 300,
          },
        ],
      },
      // 『初』マスター最終試験1位
      {
        metric: enums.IdolAchievementMetric.MasterFinalExam,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.master_final_exam',
      },
      // 特別指導回数
      {
        metric: enums.IdolAchievementMetric.SpecialTraining,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.special_training',
      },
      // ファン投票数
      {
        metric: enums.IdolAchievementMetric.FanVotes,
        titleKey: 'achievement_calculator.achievement_name.idol.sena.fan_votes',
      },
    ],
  },
  // 秦谷美鈴
  {
    id: enums.IdolId.Misuzu,
    nameKey: 'idol_names.misuzu',
    trackers: [
      // 定期公演『初』True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHatsu,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.true_end_hatsu',
      },
      // N.I.A True End
      {
        metric: enums.IdolAchievementMetric.TrueEndNia,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.true_end_nia',
      },
      // H.I.F True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHif,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.true_end_hif',
      },
      // スキルカード使用回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.skill_cards_used',
      },
      // レッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.LessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.lessons_cleared',
      },
      // SPレッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.SpLessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.sp_lessons_cleared',
      },
      // クリア時評価B以上
      {
        metric: enums.IdolAchievementMetric.RankB,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.produce_rank.b',
      },
      // クリア時評価A以上
      {
        metric: enums.IdolAchievementMetric.RankA,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.produce_rank.a',
      },
      // クリア時評価S以上
      {
        metric: enums.IdolAchievementMetric.RankS,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.produce_rank.s',
      },
      // クリア時評価S+以上
      {
        metric: enums.IdolAchievementMetric.RankSPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.produce_rank.s_plus',
      },
      // クリア時評価SS以上
      {
        metric: enums.IdolAchievementMetric.RankSs,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.produce_rank.ss',
      },
      // クリア時評価SS+以上
      {
        metric: enums.IdolAchievementMetric.RankSsPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.produce_rank.ss_plus',
      },
      // クリア時評価SSS以上
      {
        metric: enums.IdolAchievementMetric.RankSss,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.produce_rank.sss',
      },
      // クリア時評価SSS+以上
      {
        metric: enums.IdolAchievementMetric.RankSssPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.produce_rank.sss_plus',
      },
      // クリア時評価S4以上
      {
        metric: enums.IdolAchievementMetric.RankS4,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.produce_rank.s4',
      },
      // クリア時評価S4+以上
      {
        metric: enums.IdolAchievementMetric.RankS4Plus,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.produce_rank.s4_plus',
      },
      // プロデュース回数
      {
        metric: enums.IdolAchievementMetric.Productions,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.productions',
      },
      // H.I.F最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.HifFinalExams,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.hif_final_exams',
      },
      // 特訓段階1〜6
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStages1To6,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.special_training_stage',
      },
      // 最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.FinalExamsPassed,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.final_exams_passed',
      },
      // ファン人数
      {
        metric: enums.IdolAchievementMetric.Fans,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.fans',
      },
      // 親愛度
      {
        metric: enums.IdolAchievementMetric.Affection,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.affection',
      },
      // プロデュース評価合計
      {
        metric: enums.IdolAchievementMetric.Evaluation,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.evaluation',
      },
      // スキルカード強化回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsEnhanced,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.skill_cards_enhanced',
      },
      // ステータス
      {
        metric: enums.IdolAchievementMetric.Status,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.status',
        metricKey: 'achievement_calculator.metric.idol.status_vocal',
        milestones: [
          {
            threshold: 1000,
            exp: 300,
          },
        ],
      },
      // 『初』マスター最終試験1位
      {
        metric: enums.IdolAchievementMetric.MasterFinalExam,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.master_final_exam',
      },
      // 特別指導回数
      {
        metric: enums.IdolAchievementMetric.SpecialTraining,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.special_training',
      },
      // ファン投票数
      {
        metric: enums.IdolAchievementMetric.FanVotes,
        titleKey: 'achievement_calculator.achievement_name.idol.misuzu.fan_votes',
      },
    ],
  },
  // 花海佑芽
  {
    id: enums.IdolId.Ume,
    nameKey: 'idol_names.ume',
    trackers: [
      // 定期公演『初』True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHatsu,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.true_end_hatsu',
      },
      // N.I.A True End
      {
        metric: enums.IdolAchievementMetric.TrueEndNia,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.true_end_nia',
      },
      // H.I.F True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHif,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.true_end_hif',
      },
      // スキルカード使用回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.skill_cards_used',
      },
      // レッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.LessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.lessons_cleared',
      },
      // SPレッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.SpLessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.sp_lessons_cleared',
      },
      // クリア時評価B以上
      {
        metric: enums.IdolAchievementMetric.RankB,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.produce_rank.b',
      },
      // クリア時評価A以上
      {
        metric: enums.IdolAchievementMetric.RankA,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.produce_rank.a',
      },
      // クリア時評価S以上
      {
        metric: enums.IdolAchievementMetric.RankS,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.produce_rank.s',
      },
      // クリア時評価S+以上
      {
        metric: enums.IdolAchievementMetric.RankSPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.produce_rank.s_plus',
      },
      // クリア時評価SS以上
      {
        metric: enums.IdolAchievementMetric.RankSs,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.produce_rank.ss',
      },
      // クリア時評価SS+以上
      {
        metric: enums.IdolAchievementMetric.RankSsPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.produce_rank.ss_plus',
      },
      // クリア時評価SSS以上
      {
        metric: enums.IdolAchievementMetric.RankSss,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.produce_rank.sss',
      },
      // クリア時評価SSS+以上
      {
        metric: enums.IdolAchievementMetric.RankSssPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.produce_rank.sss_plus',
      },
      // クリア時評価S4以上
      {
        metric: enums.IdolAchievementMetric.RankS4,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.produce_rank.s4',
      },
      // クリア時評価S4+以上
      {
        metric: enums.IdolAchievementMetric.RankS4Plus,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.produce_rank.s4_plus',
      },
      // プロデュース回数
      {
        metric: enums.IdolAchievementMetric.Productions,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.productions',
      },
      // H.I.F最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.HifFinalExams,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.hif_final_exams',
      },
      // 特訓段階1〜6
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStages1To6,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.special_training_stage',
      },
      // 特訓段階7
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStage7,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.special_training_stage',
      },
      // 最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.FinalExamsPassed,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.final_exams_passed',
      },
      // ファン人数
      {
        metric: enums.IdolAchievementMetric.Fans,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.fans',
      },
      // 親愛度
      {
        metric: enums.IdolAchievementMetric.Affection,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.affection',
      },
      // Pドリンク使用数
      {
        metric: enums.IdolAchievementMetric.DrinksUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.drinks_used',
      },
      // 元気獲得数
      {
        metric: enums.IdolAchievementMetric.PowerGained,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.power_gained',
      },
      // ステータス
      {
        metric: enums.IdolAchievementMetric.Status,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.status',
        metricKey: 'achievement_calculator.metric.idol.status_dance',
        milestones: [
          {
            threshold: 1000,
            exp: 300,
          },
        ],
      },
      // 『初』マスター最終試験1位
      {
        metric: enums.IdolAchievementMetric.MasterFinalExam,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.master_final_exam',
      },
      // 特別指導回数
      {
        metric: enums.IdolAchievementMetric.SpecialTraining,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.special_training',
      },
      // ファン投票数
      {
        metric: enums.IdolAchievementMetric.FanVotes,
        titleKey: 'achievement_calculator.achievement_name.idol.ume.fan_votes',
      },
    ],
  },
  // 姫崎莉波
  {
    id: enums.IdolId.Rinami,
    nameKey: 'idol_names.rinami',
    trackers: [
      // 定期公演『初』True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHatsu,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.true_end_hatsu',
      },
      // N.I.A True End
      {
        metric: enums.IdolAchievementMetric.TrueEndNia,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.true_end_nia',
      },
      // H.I.F True End
      {
        metric: enums.IdolAchievementMetric.TrueEndHif,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.true_end_hif',
      },
      // スキルカード使用回数
      {
        metric: enums.IdolAchievementMetric.SkillCardsUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.skill_cards_used',
      },
      // レッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.LessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.lessons_cleared',
      },
      // SPレッスンクリア回数
      {
        metric: enums.IdolAchievementMetric.SpLessonsCleared,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.sp_lessons_cleared',
      },
      // クリア時評価B以上
      {
        metric: enums.IdolAchievementMetric.RankB,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.produce_rank.b',
      },
      // クリア時評価A以上
      {
        metric: enums.IdolAchievementMetric.RankA,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.produce_rank.a',
      },
      // クリア時評価S以上
      {
        metric: enums.IdolAchievementMetric.RankS,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.produce_rank.s',
      },
      // クリア時評価S+以上
      {
        metric: enums.IdolAchievementMetric.RankSPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.produce_rank.s_plus',
      },
      // クリア時評価SS以上
      {
        metric: enums.IdolAchievementMetric.RankSs,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.produce_rank.ss',
      },
      // クリア時評価SS+以上
      {
        metric: enums.IdolAchievementMetric.RankSsPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.produce_rank.ss_plus',
      },
      // クリア時評価SSS以上
      {
        metric: enums.IdolAchievementMetric.RankSss,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.produce_rank.sss',
      },
      // クリア時評価SSS+以上
      {
        metric: enums.IdolAchievementMetric.RankSssPlus,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.produce_rank.sss_plus',
      },
      // クリア時評価S4以上
      {
        metric: enums.IdolAchievementMetric.RankS4,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.produce_rank.s4',
      },
      // クリア時評価S4+以上
      {
        metric: enums.IdolAchievementMetric.RankS4Plus,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.produce_rank.s4_plus',
      },
      // プロデュース回数
      {
        metric: enums.IdolAchievementMetric.Productions,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.productions',
      },
      // H.I.F最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.HifFinalExams,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.hif_final_exams',
      },
      // 特訓段階1〜6
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStages1To6,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.special_training_stage',
      },
      // 特訓段階7
      {
        metric: enums.IdolAchievementMetric.SpecialTrainingStage7,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.special_training_stage',
      },
      // 最終試験合格回数
      {
        metric: enums.IdolAchievementMetric.FinalExamsPassed,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.final_exams_passed',
      },
      // ファン人数
      {
        metric: enums.IdolAchievementMetric.Fans,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.fans',
      },
      // 親愛度
      {
        metric: enums.IdolAchievementMetric.Affection,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.affection',
      },
      // Pドリンク使用数
      {
        metric: enums.IdolAchievementMetric.DrinksUsed,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.drinks_used',
      },
      // 合計体力消費数
      {
        metric: enums.IdolAchievementMetric.StaminaSpent,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.stamina_spent',
      },
      // ステータス
      {
        metric: enums.IdolAchievementMetric.Status,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.status',
        metricKey: 'achievement_calculator.metric.idol.status_visual',
        milestones: [
          {
            threshold: 1000,
            exp: 300,
          },
        ],
      },
      // 『初』マスター最終試験1位
      {
        metric: enums.IdolAchievementMetric.MasterFinalExam,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.master_final_exam',
      },
      // 特別指導回数
      {
        metric: enums.IdolAchievementMetric.SpecialTraining,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.special_training',
      },
      // ファン投票数
      {
        metric: enums.IdolAchievementMetric.FanVotes,
        titleKey: 'achievement_calculator.achievement_name.idol.rinami.fan_votes',
      },
    ],
  },
]

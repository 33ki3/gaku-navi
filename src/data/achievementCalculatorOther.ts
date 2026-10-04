/** 初星課題・P課題・十王邦夫のチャレンジミッションのプロデューサーEXP報酬 */
import type {
  AchievementMilestone,
  OtherExperienceSectionDefinition,
  OtherExperienceTrackerDefinition,
} from '../types/achievementCalculator'
import * as enums from '../types/enums'

/** 同じEXP報酬が連続する課題のまとまり */
interface RewardRun {
  /** 同じ報酬額が続く課題数、達成数の累計ではない */
  count: number
  /** このまとまり内の課題1件を達成した時のEXP */
  exp: number
}

/**
 * 同額報酬が続く課題を累計達成数の段階報酬へ展開する
 * @param runs 課題の順序に並べた同額報酬の連続数とEXP
 * @returns 各課題を1つずつ達成したときの累計値と報酬
 * @example [{ count: 2, exp: 20 }, { count: 1, exp: 40 }] は達成数1・2・3の報酬20・20・40へ展開し、3件達成時に計80EXPを得る
 */
function createMilestonesFromRewardRuns(runs: readonly RewardRun[]): readonly AchievementMilestone[] {
  let threshold = 0

  return runs.flatMap(({ count, exp }) => Array.from({ length: count }, () => ({ threshold: ++threshold, exp })))
}

/**
 * パネル内の同額ミッション報酬と全達成ボーナスを段階報酬へ展開する
 * @param missionCount パネル内のミッション総数
 * @param missionExp 各ミッションの達成時にもらうEXP
 * @param completionBonus 最後のミッション達成時に追加する全達成報酬
 * @returns 累計クリア数ごとの報酬、最後の段階だけ全達成報酬を含む
 * @example 9件×8,000EXPと全達成100,000EXPのパネルは、最後の段階が108,000EXP、全段階の合計が172,000EXPになる
 */
function createMissionMilestones(missionCount: number, missionExp: number, completionBonus = 0) {
  // パネルの全達成報酬を独立項目にせず、最後の達成数で一度だけ加算する
  return Array.from({ length: missionCount }, (_, index) => ({
    threshold: index + 1,
    exp: missionExp + (index === missionCount - 1 ? completionBonus : 0),
  }))
}

/** その他の経験値入力を分ける表示セクション */
export const OTHER_EXPERIENCE_SECTIONS: readonly OtherExperienceSectionDefinition[] = [
  {
    id: enums.OtherExperienceSectionId.InitialAndPTasks,
    titleKey: 'achievement_calculator.other.section.initial_and_p_tasks',
  },
  { id: enums.OtherExperienceSectionId.Nia, titleKey: 'achievement_calculator.other.section.nia' },
  { id: enums.OtherExperienceSectionId.Step3, titleKey: 'achievement_calculator.other.section.step3' },
  { id: enums.OtherExperienceSectionId.HifSupport, titleKey: 'achievement_calculator.other.section.hif_support' },
]

/** 各課題・パネルミッションの順序と累計達成数に対応する報酬 */
export const OTHER_EXPERIENCE_TRACKERS: readonly OtherExperienceTrackerDefinition[] = [
  {
    id: 'initial_star_tasks',
    sectionId: enums.OtherExperienceSectionId.InitialAndPTasks,
    titleKey: 'achievement_calculator.other.tracker.initial_star_tasks',
    metricKey: 'achievement_calculator.other.metric.task_count',
    milestones: createMilestonesFromRewardRuns([
      { count: 2, exp: 20 },
      { count: 8, exp: 40 },
      { count: 10, exp: 100 },
      { count: 20, exp: 150 },
      { count: 9, exp: 200 },
      { count: 9, exp: 250 },
      { count: 2, exp: 350 },
    ]),
  },
  {
    id: 'producer_tasks',
    sectionId: enums.OtherExperienceSectionId.InitialAndPTasks,
    titleKey: 'achievement_calculator.other.tracker.producer_tasks',
    metricKey: 'achievement_calculator.other.metric.task_count',
    milestones: createMilestonesFromRewardRuns([
      { count: 19, exp: 350 },
      { count: 41, exp: 500 },
      { count: 10, exp: 1000 },
      { count: 10, exp: 1350 },
      { count: 10, exp: 1500 },
      { count: 10, exp: 2000 },
    ]),
  },
  {
    id: 'producer_tasks_2',
    sectionId: enums.OtherExperienceSectionId.InitialAndPTasks,
    titleKey: 'achievement_calculator.other.tracker.producer_tasks_2',
    metricKey: 'achievement_calculator.other.metric.task_count',
    milestones: createMilestonesFromRewardRuns([{ count: 100, exp: 2000 }]),
  },
  {
    id: 'producer_tasks_3',
    sectionId: enums.OtherExperienceSectionId.InitialAndPTasks,
    titleKey: 'achievement_calculator.other.tracker.producer_tasks_3',
    metricKey: 'achievement_calculator.other.metric.task_count',
    milestones: createMilestonesFromRewardRuns([{ count: 50, exp: 2000 }]),
  },
  {
    id: 'nia_sheet_1',
    sectionId: enums.OtherExperienceSectionId.Nia,
    titleKey: 'achievement_calculator.other.tracker.nia_sheet_1',
    metricKey: 'achievement_calculator.other.metric.mission_count',
    milestones: createMissionMilestones(9, 8000),
  },
  {
    id: 'nia_sheet_2',
    sectionId: enums.OtherExperienceSectionId.Nia,
    titleKey: 'achievement_calculator.other.tracker.nia_sheet_2',
    metricKey: 'achievement_calculator.other.metric.mission_count',
    milestones: createMissionMilestones(9, 8000),
  },
  {
    id: 'step3_sheet_1',
    sectionId: enums.OtherExperienceSectionId.Step3,
    titleKey: 'achievement_calculator.other.tracker.step3_sheet_1',
    metricKey: 'achievement_calculator.other.metric.mission_count',
    milestones: createMissionMilestones(9, 8000),
  },
  {
    id: 'step3_sheet_2',
    sectionId: enums.OtherExperienceSectionId.Step3,
    titleKey: 'achievement_calculator.other.tracker.step3_sheet_2',
    metricKey: 'achievement_calculator.other.metric.mission_count',
    milestones: createMissionMilestones(9, 8000),
  },
  {
    id: 'hif_support_sheet_1',
    sectionId: enums.OtherExperienceSectionId.HifSupport,
    titleKey: 'achievement_calculator.other.tracker.hif_support_sheet_1',
    metricKey: 'achievement_calculator.other.metric.mission_count',
    milestones: createMissionMilestones(9, 8000, 100_000),
  },
  {
    id: 'hif_support_sheet_2',
    sectionId: enums.OtherExperienceSectionId.HifSupport,
    titleKey: 'achievement_calculator.other.tracker.hif_support_sheet_2',
    metricKey: 'achievement_calculator.other.metric.mission_count',
    milestones: createMissionMilestones(9, 8000, 100_000),
  },
]

/** 段階報酬の集計と、獲得済み累計EXPからのPLv・目標進捗計算を担当する */
import * as constant from '../constant'
import * as data from '../data'
import type {
  AchievementMilestone,
  AchievementProgressSummary,
  IdolAchievementTrackerDefinition,
} from '../types/achievementCalculator'
import type { IdolAchievementMetric } from '../types/enums'

/**
 * True Endセクションに表示する項目かを共通ルールから判定する
 * @param metric アイドル固有の達成条件の識別子
 * @returns 共通ルールがTrue End区分の場合はtrue
 */
export function isIdolTrueEndMetric(metric: IdolAchievementMetric): boolean {
  return data.IDOL_ACHIEVEMENT_RULES[metric].isTrueEnd
}

/**
 * 個別の要求値・報酬がある場合は共通ルールより優先する
 * @param tracker 達成条件の識別子と、任意の個別報酬
 * @returns 個別報酬があればその段階列、それ以外は全アイドル共通の段階列
 * @example 咲季の「オールラウンダー」は固有のビジュアル900条件、手毬の「歌姫」はボーカル1,000条件を優先し、スキル使用回数は共通条件を使う
 */
export function getIdolAchievementMilestones(
  tracker: IdolAchievementTrackerDefinition,
): readonly AchievementMilestone[] {
  return tracker.milestones ?? data.IDOL_ACHIEVEMENT_RULES[tracker.metric].milestones
}

/**
 * EXPを獲得できる最後の条件を報酬定義から求める
 * @param milestones 各段階の累計条件と増分EXP、報酬なしの段階も含められる
 * @returns EXP報酬のある最大条件、報酬がない場合は0
 * @example 星10で3,000EXP・星20で3,000EXP・星30で0EXPなら、EXP報酬の上限は星20になる
 */
export function getAchievementRewardTarget(milestones: readonly AchievementMilestone[]): number {
  return milestones.reduce((max, { threshold, exp }) => (exp > 0 ? Math.max(max, threshold) : max), 0)
}

/**
 * 現在PLv以下の最新の定義を選び、そのレベルから次レベルへの必要EXPを返す
 * @param level 必要EXPを調べる現在PLv
 * @returns 直前の境界に定義された必要EXP
 * @example 54で70,000EXP、90で80,000EXPを定義すれば、PLv89は70,000EXP、PLv90以降は80,000EXPになる
 */
export function getProducerLevelExpRequirement(level: number): number {
  const boundary = Object.keys(data.PRODUCER_LEVEL_EXP_REQUIREMENTS)
    .map(Number)
    .reduce((latest, candidate) => (candidate <= level && candidate > latest ? candidate : latest), 0)
  if (boundary === 0) throw new Error(`Producer level requirement is missing: ${level}`)
  return data.PRODUCER_LEVEL_EXP_REQUIREMENTS[boundary]
}

/**
 * 配列順に依存せず、現在値より大きい最小の段階を求める
 * @param milestones 累計条件と増分EXPの報酬定義
 * @param value 現在の累計値
 * @param includeZeroExp EXPがない達成項目も次の段階として扱うか
 * @returns 次の段階、最終条件に達している場合はundefined
 * @example 条件100・300・200の順でも、現在値150に対して条件200を返す
 */
export function getNextAchievementMilestone(
  milestones: readonly AchievementMilestone[],
  value: number,
  includeZeroExp = false,
): AchievementMilestone | undefined {
  return milestones.reduce<AchievementMilestone | undefined>(
    (next, milestone) =>
      milestone.threshold > value &&
      (includeZeroExp || milestone.exp > 0) &&
      (!next || milestone.threshold < next.threshold)
        ? milestone
        : next,
    undefined,
  )
}

/**
 * 獲得済み累計EXPをPLv1からの必要EXPと照合する
 * @param earnedExp アチーブ・プレイ報酬・補正を含む獲得済みEXPの累計
 * @returns 現在PLvと次のPLvまでの残りEXP、レベル上限では残り0
 * @example 累計100EXPならPLv1の必要40EXPを消費し、PLv2の必要120EXPのうち60EXPを獲得済みで残り60EXPになる
 */
export function calculateProducerLevelFromEarnedExp(earnedExp: number): {
  currentLevel: number
  remainingExpToNextLevel: number
} {
  let remainingExp = Number.isFinite(earnedExp) ? Math.max(0, Math.floor(earnedExp)) : 0

  // レベルごとの必要量を順に差し引き、初めて不足するレベルで残りEXPを求める
  for (let level = 1; level < constant.PRODUCER_LEVEL_CAP; level++) {
    const requirement = getProducerLevelExpRequirement(level)
    if (remainingExp < requirement) {
      return { currentLevel: level, remainingExpToNextLevel: requirement - remainingExp }
    }
    remainingExp -= requirement
  }

  return { currentLevel: constant.PRODUCER_LEVEL_CAP, remainingExpToNextLevel: 0 }
}

/**
 * PLv1から指定レベルへ到達するまでの累計必要EXPを求める
 * @param targetLevel 到達先のPLv。設定可能な上限内の値を渡す
 * @returns PLv1から到達先までのレベル間必要EXPの合計
 */
function sumLevelRequirements(targetLevel: number): number {
  let total = 0
  for (let level = 1; level < targetLevel; level++) total += getProducerLevelExpRequirement(level)
  return total
}

/**
 * 現在PLvと次レベルまでの残りEXPを、目標到達に必要な累計EXPへ換算する
 * @param currentLevel 獲得済み累計EXPから求めた現在PLv
 * @param remainingExpToNextLevel 現在PLv内で次レベルに到達するまでの残りEXP
 * @param targetLevel 進捗率の100%に相当する目標PLv
 * @returns 現在レベル内の獲得済み・必要・残りEXP、目標までの残りEXPとPLv1を起点とした目標進捗率
 * @example PLv2・次まで60EXP・目標PLv3なら累計100/160EXPなので、目標まで60EXP、進捗62.5%になる
 */
export function calculateProducerLevelProgress(
  currentLevel: number,
  remainingExpToNextLevel: number,
  targetLevel: number,
): {
  nextLevelRemainingExp: number
  nextLevelRequiredExp: number
  nextLevelEarnedExp: number
  expToTargetLevel: number
  targetProgressPercent: number
} {
  const level = Math.min(constant.PRODUCER_LEVEL_CAP, Math.max(1, Math.floor(currentLevel)))
  const target = Math.min(constant.PRODUCER_LEVEL_CAP, Math.max(1, Math.floor(targetLevel)))
  const nextLevelRequirement = level < constant.PRODUCER_LEVEL_CAP ? getProducerLevelExpRequirement(level) : 0
  const nextLevelRemainingExp =
    level < constant.PRODUCER_LEVEL_CAP
      ? Math.min(nextLevelRequirement, Math.max(0, Math.floor(remainingExpToNextLevel)))
      : 0
  // レベル内で獲得済みの分を足し戻し、目標と同じ累計EXPの基準に揃える
  const expAtCurrentLevel = sumLevelRequirements(level)
  const earnedWithinCurrentLevel =
    level < constant.PRODUCER_LEVEL_CAP ? nextLevelRequirement - nextLevelRemainingExp : 0
  const currentTotalExp = expAtCurrentLevel + earnedWithinCurrentLevel
  const targetTotalExp = sumLevelRequirements(target)
  const expToTargetLevel = Math.max(0, targetTotalExp - currentTotalExp)
  // 目標を超えた場合も100%に収め、残りEXPが負にならないようにする
  const targetProgressPercent =
    target <= level ? 100 : targetTotalExp > 0 ? Math.min(100, (currentTotalExp / targetTotalExp) * 100) : 0

  return {
    nextLevelRemainingExp,
    nextLevelRequiredExp: nextLevelRequirement,
    nextLevelEarnedExp: earnedWithinCurrentLevel,
    expToTargetLevel,
    targetProgressPercent,
  }
}

/**
 * 現在値以下の段階報酬を累積し、次にEXPを受け取れる段階を返す
 * @param milestones 累計条件の昇順で並ぶ、その段階だけのEXP報酬
 * @param currentValue 達成回数や合計値など、項目の現在値
 * @returns 獲得済み・未獲得EXP、達成段階数と次のEXP報酬
 * @example 条件100回で300EXP・条件500回で500EXPなら、現在1,000回の獲得済みEXPは300+500=800EXPになる
 */
export function calculateAchievementProgress(
  milestones: readonly AchievementMilestone[],
  currentValue: number,
): AchievementProgressSummary {
  const value = Number.isFinite(currentValue) ? Math.max(0, currentValue) : 0
  // 報酬値は各段階の増分なので、現在段階の値だけではなく達成済みの全段階を足す
  const earnedMilestones = milestones.filter((milestone) => milestone.threshold <= value)
  const earnedExp = earnedMilestones.reduce((total, milestone) => total + milestone.exp, 0)
  const totalExp = milestones.reduce((total, milestone) => total + milestone.exp, 0)

  return {
    earnedExp,
    remainingExp: totalExp - earnedExp,
    totalExp,
    completedMilestones: earnedMilestones.length,
    milestoneCount: milestones.length,
    // EXPがない段階は除き、配列順に依存せず現在値に最も近い次の報酬を返す
    nextMilestone: getNextAchievementMilestone(milestones, value),
  }
}

/**
 * 複数の達成項目のEXPを合算する
 * @param summaries 各項目の獲得済みEXP・未獲得EXP・段階数の集計
 * @returns カテゴリ全体の合計、条件が異なる項目間では次の段階を定めない
 * @example 獲得済み300/800EXPと100/200EXPの項目を合算すると、獲得済み400/1,000EXP・未獲得600EXPになる
 */
export function sumAchievementProgress(summaries: readonly AchievementProgressSummary[]): AchievementProgressSummary {
  // 項目間では条件の単位が異なるため、合算結果に次の段階を持たせない
  return summaries.reduce(
    (total, summary) => ({
      earnedExp: total.earnedExp + summary.earnedExp,
      remainingExp: total.remainingExp + summary.remainingExp,
      totalExp: total.totalExp + summary.totalExp,
      completedMilestones: total.completedMilestones + summary.completedMilestones,
      milestoneCount: total.milestoneCount + summary.milestoneCount,
      nextMilestone: undefined,
    }),
    {
      earnedExp: 0,
      remainingExp: 0,
      totalExp: 0,
      completedMilestones: 0,
      milestoneCount: 0,
      nextMilestone: undefined,
    },
  )
}

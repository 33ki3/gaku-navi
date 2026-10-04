/** UIとWebMCPが共有する、達成記録からのEXP・PLv・アイドル別集計 */
import * as constant from '../../constant'
import * as data from '../../data'
import type { AchievementCalculatorProgress } from '../../types/achievementCalculator'
import * as enums from '../../types/enums'
import {
  calculateAchievementProgress,
  calculateProducerLevelFromEarnedExp,
  calculateProducerLevelProgress,
  getAchievementRewardTarget,
  getIdolAchievementMilestones,
  isIdolTrueEndMetric,
  sumAchievementProgress,
} from '../../utils/achievementCalculator'
import type { CommandStatePort } from '../command/ports'

/**
 * 保存された現在値を集計し、ページ全体と選択中のアイドルへ同じ計算結果を渡す
 * @param progress 入力・保存処理で正規化済みの達成状況と補正値
 * @param selectedIdolId 詳細を表示するアイドルの識別子
 * @returns カテゴリ別EXP・PLv・アイドル選択と詳細表示に必要な集計
 */
export function calculateAchievementSummary(progress: AchievementCalculatorProgress, selectedIdolId: string) {
  // アチーブの段階報酬と、プレイごとにもらう報酬は別々に集計する
  const productionProgress = data.PRODUCTION_ACHIEVEMENTS.map((tracker) =>
    calculateAchievementProgress(tracker.milestones, progress.production[tracker.id]),
  )
  // プロデュースの段階報酬を合算する。プレイ1回ごとのEXPは別途集計する
  const productionSummary = sumAchievementProgress(productionProgress)
  // その他タブからも同じプロデュース回数を編集するための項目定義
  const productionCountTracker = data.PRODUCTION_ACHIEVEMENTS.find(
    ({ id }) => id === enums.ProductionAchievementId.Productions,
  )
  // プレイ報酬と試験結果の補正が共有する、プロデュースの総回数
  const productionRunCount = progress.production.productions ?? 0
  // 基準の50EXP以外の試験結果に割り当てた回数の合計
  const productionRewardAdjustmentCount = data.PRODUCTION_RUN_REWARD_ADJUSTMENTS.reduce(
    (sum, adjustment) => sum + progress.productionRewardAdjustments[adjustment.id],
    0,
  )
  // 回数を減らして試験結果の合計が超過した場合は、補正を保留して入力修正を促す
  const productionRewardAdjustmentIsValid = productionRewardAdjustmentCount <= productionRunCount
  // 試験結果を補正する前の、総回数に対する基準EXP
  const productionRunBaseExp = productionRunCount * constant.PRODUCTION_RUN_BASE_EXP
  // 各試験結果の回数と基準報酬との差額から差し引くEXP
  const productionRunExpDeduction = productionRewardAdjustmentIsValid
    ? data.PRODUCTION_RUN_REWARD_ADJUSTMENTS.reduce(
        (sum, adjustment) => sum + progress.productionRewardAdjustments[adjustment.id] * adjustment.expDeduction,
        0,
      )
    : 0
  // 補正後に実際のプレイ報酬として加算するEXP
  const productionRunEarnedExp = Math.max(0, productionRunBaseExp - productionRunExpDeduction)
  // 課題・パネルミッションは達成数までの報酬を累積し、全アイドルの報酬と合算する
  const otherExperienceSummary = sumAchievementProgress(
    data.OTHER_EXPERIENCE_TRACKERS.map((tracker) =>
      calculateAchievementProgress(tracker.milestones, progress.otherTasks[tracker.id] ?? 0),
    ),
  )
  // 基本とTrue Endを含む全アイドルの段階報酬、総獲得EXPへ一度ずつ加算する
  const idolProgress = data.IDOL_ACHIEVEMENTS.flatMap((idol) =>
    idol.trackers.map((tracker) =>
      calculateAchievementProgress(
        getIdolAchievementMilestones(tracker),
        progress.idols[idol.id]?.[tracker.metric] ?? 0,
      ),
    ),
  )
  // Pアイドルは条件ごとに独立した達成記録を持ち、オンになった項目だけ加算する
  const pIdolCardEarnedExp = data.P_IDOLS.reduce(
    (sum, card) =>
      sum +
      data.P_IDOL_CARD_ACHIEVEMENTS.reduce(
        (cardSum, achievement) => cardSum + (progress.pIdolCards[card.id]?.[achievement.id] ? achievement.exp : 0),
        0,
      ),
    0,
  )
  // 全アイドルの各ステージに記録された星数の合計
  const totalStars = Object.values(progress.idolRoad).reduce(
    (total, stages) =>
      total + Object.values(stages).reduce((idolStars, stageStars) => idolStars + stageStars.filter(Boolean).length, 0),
    0,
  )
  // 星の獲得状況は全ステージ分を残し、EXP集計だけを登録済み報酬の上限へ収める
  const roadProgress = calculateAchievementProgress(
    data.IDOL_ROAD_REWARD_MILESTONES,
    Math.min(totalStars, getAchievementRewardTarget(data.IDOL_ROAD_REWARD_MILESTONES)),
  )
  // Pアイドル1枚に登録された6条件すべてのEXP合計
  const pIdolCardTotalExp = data.P_IDOL_CARD_ACHIEVEMENTS.reduce((sum, achievement) => sum + achievement.exp, 0)
  const idolSummary = sumAchievementProgress(idolProgress)
  // 負数の補正も累計へ反映する。獲得済みEXPとPLv計算の基準は0を下回らない
  const totalEarnedExp = Math.max(
    0,
    productionSummary.earnedExp +
      productionRunEarnedExp +
      idolSummary.earnedExp +
      pIdolCardEarnedExp +
      roadProgress.earnedExp +
      otherExperienceSummary.earnedExp +
      progress.otherExp,
  )
  // 繰り返し獲得するプレイ報酬には固定上限がないため、入力済みEXPに登録済みの未獲得報酬を足した総量を使う
  const totalAvailableExp =
    totalEarnedExp +
    productionSummary.remainingExp +
    idolSummary.remainingExp +
    (data.P_IDOLS.length * pIdolCardTotalExp - pIdolCardEarnedExp) +
    roadProgress.remainingExp +
    otherExperienceSummary.remainingExp
  // アチーブ以外の報酬も含む累計から求めた現在PLv
  const currentProducerLevel = calculateProducerLevelFromEarnedExp(totalEarnedExp)
  // 現在PLvと目標PLvを累計EXPの同じ基準で比較した進捗
  const levelProgress = calculateProducerLevelProgress(
    currentProducerLevel.currentLevel,
    currentProducerLevel.remainingExpToNextLevel,
    progress.producerLevel,
  )
  // 詳細タブではTrue End・基本・Pアイドルの見出しごとに分母と獲得済みEXPを分ける
  const selectedIdol = data.IDOL_ACHIEVEMENTS.find((idol) => idol.id === selectedIdolId)
  // 詳細の基本セクションではTrue Endを除き、独立した見出しの合計にする
  const selectedIdolNormalProgress = selectedIdol
    ? sumAchievementProgress(
        selectedIdol.trackers
          .filter((tracker) => !isIdolTrueEndMetric(tracker.metric))
          .map((tracker) =>
            calculateAchievementProgress(
              getIdolAchievementMilestones(tracker),
              progress.idols[selectedIdol.id]?.[tracker.metric] ?? 0,
            ),
          ),
      )
    : undefined
  // 選択アイドルに所属するカードを、マスタの登場日順を保って抽出する
  const selectedPIdolCards = selectedIdol ? data.P_IDOLS.filter((card) => card.idolId === selectedIdol.id) : []
  // 選択アイドルの各カードで独立して達成済みになった条件のEXP合計
  const selectedPIdolEarnedExp = selectedPIdolCards.reduce(
    (sum, card) =>
      sum +
      data.P_IDOL_CARD_ACHIEVEMENTS.reduce(
        (cardSum, achievement) => cardSum + (progress.pIdolCards[card.id]?.[achievement.id] ? achievement.exp : 0),
        0,
      ),
    0,
  )
  // 選択アイドルに登録されたカード数に対する報酬の総量
  const selectedPIdolTotalExp = selectedPIdolCards.length * pIdolCardTotalExp
  // 基本の集計と重複させず、True Endの見出しで表示する達成項目
  const selectedTrueEndTrackers = selectedIdol?.trackers.filter((tracker) => isIdolTrueEndMetric(tracker.metric)) ?? []
  // 選択アイドルのTrue Endだけに含まれる獲得済みと未獲得のEXP
  const selectedTrueEndProgress = sumAchievementProgress(
    selectedTrueEndTrackers.map((tracker) =>
      calculateAchievementProgress(
        getIdolAchievementMilestones(tracker),
        progress.idols[selectedIdolId]?.[tracker.metric] ?? 0,
      ),
    ),
  )
  // 基本セクションの見出しに表示する獲得済みEXP
  const selectedBasicEarnedExp = selectedIdolNormalProgress?.earnedExp ?? 0
  // 基本セクションの見出しに表示するEXP報酬の総量
  const selectedBasicTotalExp = selectedIdolNormalProgress?.totalExp ?? 0
  // 選択ボタンの全達成判定には、EXPがない評価ランクなどの記録も含める
  const idolSelectorItems = data.IDOL_ACHIEVEMENTS.map((idol) => {
    const trackers = sumAchievementProgress(
      idol.trackers.map((tracker) =>
        calculateAchievementProgress(
          getIdolAchievementMilestones(tracker),
          progress.idols[idol.id]?.[tracker.metric] ?? 0,
        ),
      ),
    )
    const cards = data.P_IDOLS.filter((card) => card.idolId === idol.id)
    const cardExp = cards.reduce(
      (sum, card) =>
        sum +
        data.P_IDOL_CARD_ACHIEVEMENTS.reduce(
          (total, achievement) => total + (progress.pIdolCards[card.id]?.[achievement.id] ? achievement.exp : 0),
          0,
        ),
      0,
    )
    return {
      id: idol.id,
      nameKey: idol.nameKey,
      earnedExp: trackers.earnedExp + cardExp,
      isCompleted:
        idol.trackers.every(
          (tracker) =>
            (progress.idols[idol.id]?.[tracker.metric] ?? 0) >=
            (getIdolAchievementMilestones(tracker).at(-1)?.threshold ?? 0),
        ) && cards.every((card) => data.P_IDOL_CARD_ACHIEVEMENTS.every(({ id }) => progress.pIdolCards[card.id]?.[id])),
      totalExp: trackers.totalExp + cards.length * pIdolCardTotalExp,
    }
  })

  return {
    productionProgress,
    productionSummary,
    productionCountTracker,
    productionRunCount,
    productionRewardAdjustmentCount,
    productionRewardAdjustmentIsValid,
    productionRunBaseExp,
    productionRunExpDeduction,
    productionRunEarnedExp,
    otherExperienceSummary,
    idolProgress,
    pIdolCardEarnedExp,
    totalStars,
    roadProgress,
    totalEarnedExp,
    totalAvailableExp,
    currentProducerLevel,
    levelProgress,
    selectedIdol,
    selectedIdolNormalProgress,
    selectedPIdolCards,
    selectedPIdolEarnedExp,
    pIdolCardTotalExp,
    selectedPIdolTotalExp,
    selectedTrueEndTrackers,
    selectedTrueEndProgress,
    selectedBasicEarnedExp,
    selectedBasicTotalExp,
    idolSelectorItems,
  }
}

/**
 * commandと同じ状態を参照し、読み取った版と一緒に集計を返す問い合わせを作る
 * @param state 更新commandと共有する、達成記録の読み取り先
 * @returns 状態のrevision・digest付きでEXPとPLvを返す問い合わせ
 */
export function createAchievementCalculatorQuery(state: CommandStatePort<AchievementCalculatorProgress>) {
  return {
    /**
     * 読み取った達成記録の版と同じ基準でEXP・PLvを集計する
     * @param selectedIdolId 詳細を表示する収録アイドルのID
     * @returns 集計値と、取得元の達成記録を識別するrevision・digest
     */
    getSummary(selectedIdolId: string) {
      const snapshot = state.getSnapshot()
      return { ...snapshot, value: calculateAchievementSummary(snapshot.value, selectedIdolId) }
    },
  }
}

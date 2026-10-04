/** アチーブ計算機で共有するマスタ定義・達成記録・報酬集計・表示入力の型 */
import type { useAchievementCalculatorSummary } from '../hooks/useAchievementCalculatorSummary'
import type { TranslationKey } from '../i18n'
import type {
  IdolAchievementMetric,
  IdolId,
  OtherExperienceSectionId,
  PIdolCardAchievementId,
  ProductionAchievementId,
  ProductionRunRewardAdjustmentId,
} from './enums'

/** 達成条件に達したときに一度受け取る報酬 */
export interface AchievementMilestone {
  /** 報酬を受け取れる累計値 */
  threshold: number
  /** その段階だけで獲得するプロデューサーEXP */
  exp: number
}

/** プロデュース全体の達成条件と報酬 */
export interface AchievementTrackerDefinition {
  /** 保存記録や更新commandが項目を特定する識別子 */
  id: ProductionAchievementId
  /** ゲーム内の正式名称を表示する翻訳キー */
  titleKey: TranslationKey
  /** 達成条件や入力値の単位を表示する翻訳キー */
  metricKey: TranslationKey
  /** 累計条件と、その段階だけで加算するEXPの一覧 */
  milestones: readonly AchievementMilestone[]
}

/** アイドル固有の名称・条件・報酬の上書き */
export interface IdolAchievementTrackerDefinition {
  /** 共通の条件・報酬ルールを参照する識別子 */
  metric: IdolAchievementMetric
  /** ゲーム内の正式名称を表示する翻訳キー */
  titleKey: TranslationKey
  /** 条件表記だけがアイドル固有の場合に共通ルールを上書きする */
  metricKey?: TranslationKey
  /** 要求値やEXPがアイドル固有の場合に共通ルールを上書きする */
  milestones?: readonly AchievementMilestone[]
}

/** ゲーム画面の表示順で達成項目を持つアイドル */
export interface IdolAchievementDefinition {
  /** 保存記録や更新commandが項目を特定する識別子 */
  id: IdolId
  /** アイドル名を表示する翻訳キー */
  nameKey: TranslationKey
  /** ゲーム画面順に並ぶ、このアイドルの達成項目 */
  trackers: readonly IdolAchievementTrackerDefinition[]
}

/** 全アイドル共通の条件・報酬と表示区分 */
export interface IdolAchievementRule {
  /** 達成条件や入力値の単位を表示する翻訳キー */
  metricKey: TranslationKey
  /** 累計条件と、その段階だけで加算するEXPの一覧 */
  milestones: readonly AchievementMilestone[]
  /** 基本項目から分けてTrue Endセクションに表示するか */
  isTrueEnd: boolean
}

/** カード固有の単発アチーブメント */
export interface PIdolCardAchievementDefinition {
  /** 保存記録や更新commandが項目を特定する識別子 */
  id: PIdolCardAchievementId
  /** ゲーム内の正式名称を表示する翻訳キー */
  titleKey: TranslationKey
  /** この単発条件を達成した時に一度だけ加算するEXP */
  exp: number
}

/** その他の経験値を分類する見出し */
export interface OtherExperienceSectionDefinition {
  /** 保存記録や更新commandが項目を特定する識別子 */
  id: OtherExperienceSectionId
  /** ゲーム内の正式名称を表示する翻訳キー */
  titleKey: TranslationKey
}

/** 初星課題・P課題・パネルミッションの達成報酬 */
export interface OtherExperienceTrackerDefinition {
  /** 保存記録や更新commandが項目を特定する識別子 */
  id: string
  /** 達成数を集計し見出しを表示する所属セクション */
  sectionId: OtherExperienceSectionId
  /** ゲーム内の正式名称を表示する翻訳キー */
  titleKey: TranslationKey
  /** 達成条件や入力値の単位を表示する翻訳キー */
  metricKey: TranslationKey
  /** 累計条件と、その段階だけで加算するEXPの一覧 */
  milestones: readonly AchievementMilestone[]
}

/** プロデュースの試験結果ごとに基準報酬から差し引くEXP */
export interface ProductionRunRewardAdjustmentDefinition {
  /** 試験結果の回数記録と更新操作を結び付ける識別子 */
  id: ProductionRunRewardAdjustmentId
  /** 通常のプロデュース報酬から1回ごとに差し引くEXP */
  expDeduction: number
  /** 試験結果の名称を表示する翻訳キー */
  titleKey: TranslationKey
}

/** アチーブ計算機の入力内容 */
export interface AchievementCalculatorProgress {
  /** プロデュース項目IDごとの累計現在値 */
  production: Record<string, number>
  /** アイドルIDと条件IDごとの独立した現在値 */
  idols: Record<string, Record<string, number>>
  /** アイドルID・0始まりのステージ番号をキーに、3つの独立した星を記録する */
  idolRoad: Record<string, Record<string, boolean[]>>
  /** カードIDごとの単発条件の達成記録 */
  pIdolCards: Record<string, Record<PIdolCardAchievementId, boolean>>
  /** 課題やパネルの項目IDごとの累計達成数 */
  otherTasks: Record<string, number>
  /** 通常の50EXPから補正する試験結果ごとの回数 */
  productionRewardAdjustments: Record<ProductionRunRewardAdjustmentId, number>
  /** 登録済み報酬との差を加減算する補正値。負数は累計から差し引く */
  otherExp: number
  /** 入力目標だけを保存し、現在PLvは獲得済みEXPから毎回導出する */
  producerLevel: number
}

/** 現在値に対応するアチーブメント報酬の集計 */
export interface AchievementProgressSummary {
  /** 現在値までに達成済みの段階のEXP合計 */
  earnedExp: number
  /** 登録されたEXP報酬のうち、まだ獲得していない合計 */
  remainingExp: number
  /** この項目の登録済みEXP報酬すべての合計 */
  totalExp: number
  /** 現在値以下の達成段階数、EXPなしの段階も含む */
  completedMilestones: number
  /** 登録された達成段階の総数 */
  milestoneCount: number
  /** 現在値より先にある最も近いEXP報酬、全獲得時はundefined */
  nextMilestone: AchievementMilestone | undefined
}

/** 保存・バックアップ用の省略形式。未記録項目は表示状態の復元時に補う */
export interface StoredAchievementCalculatorProgress {
  /** 0以外のプロデュース項目 */
  production: Record<string, number>
  /** 0以外の条件を持つアイドルだけを記録する */
  idols: Record<string, Record<string, number>>
  /** 達成した星を含むステージだけを0始まりの番号で記録する。3つの星の順序は保持する */
  idolRoad: Record<string, Record<string, boolean[]>>
  /** 達成した条件を持つカードだけを記録する */
  pIdolCards: Record<string, Partial<Record<PIdolCardAchievementId, boolean>>>
  /** 0以外の課題・パネルの達成数 */
  otherTasks: Record<string, number>
  /** 0以外の試験結果回数 */
  productionRewardAdjustments: Partial<Record<ProductionRunRewardAdjustmentId, number>>
  /** 負数を含め、そのまま保持する補正値 */
  otherExp: number
  /** 既定値の変更で記録済み目標が変わらないよう、目標は常に保持する */
  producerLevel: number
}

/** 保存処理の結果を待たずに画面から呼ぶ、入力値ごとの更新操作 */
export interface AchievementCalculatorControls {
  /** 表示と集計に使う現在の達成記録 */
  progress: AchievementCalculatorProgress
  /** プロデュース全体の回数を更新する */
  setProductionValue: (id: string, value: number) => void
  /** アイドル固有の条件を独立して更新する */
  setIdolValue: (id: string, metric: IdolAchievementMetric, value: number) => void
  /** 課題・パネルの達成数を更新する */
  setOtherTaskValue: (id: string, value: number) => void
  /** 試験結果によるプロデュース報酬の補正回数を更新する */
  setProductionRewardAdjustment: (id: ProductionRunRewardAdjustmentId, value: number) => void
  /** ステージ内の星を指定数までまとめて更新する */
  setIdolRoadStageStars: (id: string, index: number, value: number) => void
  /** ステージ内の星を独立して更新する */
  setIdolRoadStageStar: (id: string, stageIndex: number, starIndex: number, completed: boolean) => void
  /** アイドルの全ステージを一括更新する */
  setIdolRoadStars: (id: string, completed: boolean) => void
  /** Pアイドルの条件を独立して更新する */
  setPIdolCardAchievement: (id: string, achievement: PIdolCardAchievementId, completed: boolean) => void
  /** Pアイドル1枚の条件を一括更新する */
  setPIdolCardAchievements: (id: string, completed: boolean) => void
  /** PLvの進捗目標を更新する */
  setTargetProducerLevel: (value: number) => void
  /** 登録済み報酬以外の補正EXPを更新する */
  setOtherExp: (value: number) => void
}

/** 各タブで共有する表示集計と達成記録の更新操作 */
export interface AchievementCalculatorTabProps {
  /** 入力状態から導出したEXP・PLv・選択アイドルの表示用集計 */
  summary: ReturnType<typeof useAchievementCalculatorSummary>
  /** アプリ全体で共有する入力状態と、保存を伴う項目ごとの更新操作 */
  controls: AchievementCalculatorControls
}

/** アイドル選択ボタンに表示する、翻訳済み名称と達成集計 */
export interface IdolAchievementSelectorItem {
  /** 入力先のアイドルを特定するID */
  id: string
  /** 選択ボタンに表示するアイドル名 */
  name: string
  /** True End・基本・Pアイドルで獲得済みのEXP */
  earnedExp: number
  /** 同じアイドルに登録されたEXP報酬の総量 */
  totalExp: number
  /** EXPなしの条件も含め、対象項目をすべて達成したか */
  isCompleted: boolean
}

/** Pアイドル1枚の達成条件に表示する名称と、条件単独のEXP報酬 */
export interface PIdolAchievementOption {
  /** 更新する達成条件のID */
  id: PIdolCardAchievementId
  /** 翻訳済みの達成条件名 */
  title: string
  /** この条件を達成した際に加算するEXP */
  exp: number
}

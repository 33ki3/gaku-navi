/**
 * 画面の状態から切り離した計算条件と、一時比較用の差分型
 *
 * 計算開始時点の条件を固定し、別の条件を試すときも保存値や画面表示を
 * 変更せずに扱う
 */
import type { DomainDigest, DomainRevision } from './application'
import type { CardCountCustom, ParameterValues, ScoreSettings, SupportCard } from './card'
import type { ActionIdType, ActivityIdType, CardType, DifficultyType, PlanType, ScenarioType, UncapType } from './enums'
import type { SpRateConstraint, TypeCountValues, UnitSimulatorSettings } from './unit'

/** 計算条件の変更と内容を確認するための状態番号と比較用の印 */
export interface CalculationRevision {
  /** 計算条件が更新されるたびに増える状態番号 */
  revision: DomainRevision
  /** 状態番号が同じでも内容を比較できる短い印 */
  digest: DomainDigest
}

/** 計算開始時点で固定した条件と、その取得時点の識別情報 */
export interface CalculationSnapshotEnvelope extends CalculationRevision {
  /** 固定した計算条件 */
  snapshot: CalculationSnapshot
}

/** カード・点数・編成の現在値を計算用に固定した条件 */
export interface CalculationSnapshot {
  /** 点数設定 */
  scoreSettings: ScoreSettings
  /** 最適編成設定 */
  unitSettings: UnitSimulatorSettings
  /** サポート名から凸数を探す表 */
  cardUncaps: Record<string, UncapType>
  /** サポート名から回数調整を探す表 */
  cardCountCustom: CardCountCustom
  /** ユーザー追加分を含む全サポート */
  allCards: SupportCard[]
  /** サポート名からカードを探す表 */
  cardByName: Map<string, SupportCard>
}

/** 計算開始時点の条件を作るための現在値 */
export interface CalculationSnapshotInput {
  /** 点数設定 */
  scoreSettings: ScoreSettings
  /** 最適編成設定 */
  unitSettings: UnitSimulatorSettings
  /** サポート名から凸数を探す表 */
  cardUncaps: Readonly<Record<string, UncapType>>
  /** サポート名から回数調整を探す表 */
  cardCountCustom: CardCountCustom
  /** ユーザー追加分を含む全サポート */
  allCards: readonly SupportCard[]
  /** サポート名からカードを探す表 */
  cardByName: ReadonlyMap<string, SupportCard>
}

/** シナリオごとに保存する週番号と活動IDの対応表 */
export type ScenarioScheduleSelections = Partial<Record<ScenarioType, Record<number, ActivityIdType>>>

/** 点数設定へ適用する一時差分 */
export interface ScoreSettingsVariantPatch {
  /** シナリオ */
  scenario?: ScenarioType
  /** 難易度 */
  difficulty?: DifficultyType
  /** パラメータボーナス対象値 */
  parameterBonusBase?: ParameterValues
  /** アクション回数の差分。既存のキーへ上書きする */
  actionCounts?: Partial<Record<ActionIdType, number>>
  /** スケジュール選択の差分。指定した週だけ既存値へ上書きする */
  scheduleSelections?: Record<number, ActivityIdType>
  /** スケジュールに基づく上限を有効にするか */
  useScheduleLimits?: boolean
  /** 自サポートの自己発火を含めるか */
  includeSelfTrigger?: boolean
  /** Pアイテムを含めるか */
  includePItem?: boolean
  /** 凸数設定を無視するか */
  useFixedUncap?: boolean
  /** カスタムモードを使うか */
  useCustomMode?: boolean
  /** カスタムモードのパラメータボーナス行 */
  customParamBonusRows?: ParameterValues[]
  /** カスタムモードの授業上昇値 */
  customClassBonus?: ParameterValues
  /** カスタムモードの対象外上昇値 */
  customNonBonusGain?: ParameterValues
  /** HIF試験比率 */
  hifExamRatios?: ParameterValues[]
  /** HIFレッスンのサブ値分配 */
  hifLessonSplitSub?: boolean
}

/** 最適編成設定へ適用する一時差分 */
export interface UnitSettingsVariantPatch {
  /** 育成プラン */
  plan?: PlanType
  /** 許可するサポートタイプ */
  allowedTypes?: CardType[]
  /** SP発生率の枚数制約 */
  spConstraint?: SpRateConstraint
  /** タイプ別最小枚数 */
  typeCountMin?: TypeCountValues
  /** タイプ別最大枚数 */
  typeCountMax?: TypeCountValues
  /** サポート外パラメータボーナス% */
  paramBonusPercent?: ParameterValues
  /** レンタル枠を手動指定するか */
  manualRental?: boolean
  /** 手動指定するレンタル名 */
  rentalCardName?: string | null
  /** 固定カード */
  lockedCards?: string[]
  /** 手動編成 */
  manualCards?: (string | null)[]
  /** 自動候補から除外するカード */
  excludedCardNames?: string[]
  /** 初期パラメータ */
  initialParams?: ParameterValues
  /** パラメータ上限 */
  paramCapOverride?: number | null
  /** レンタル枠のロックを統一するか */
  unifyRentalLock?: boolean
  /** コンテスト用スキルカード獲得サポートを除外するか */
  excludeContestSkillCards?: boolean
  /** コンテスト用メモリ化Pアイテム獲得サポートを除外するか */
  excludeContestPItems?: boolean
  /** 除外設定を無視するか */
  ignoreCardExclusions?: boolean
  /** 総当たり候補枚数 */
  exhaustiveCandidateLimit?: number
}

/** 固定した計算条件へ適用する一時差分 */
export interface CalculationVariantPatch {
  /** 点数設定の差分 */
  scoreSettings?: ScoreSettingsVariantPatch
  /** 最適編成設定の差分 */
  unitSettings?: UnitSettingsVariantPatch
  /** 全サポートへ一括適用する凸数 */
  cardUncapAll?: UncapType
  /** 一時的な凸数差分 */
  cardUncaps?: Partial<Record<string, UncapType>>
  /** 一時的な回数調整。指定カードの値を置き換える */
  cardCountCustom?: CardCountCustom
}

/**
 * サポートカードに関する型定義
 *
 * サポートの全情報（SupportCard）、アビリティ、イベント、Pアイテム、
 * スキルカード、そしてスコア計算結果など、アプリケーション全体の
 * データ構造をインターフェースとして定義するファイル
 * cards.json から読み込んだデータはここの型で型付けされる
 */
import type {
  AbilityNameKeyType,
  ActionIdType,
  ActivityIdType,
  CardType,
  CardZoneType,
  CostType,
  DifficultyType,
  EffectKeywordType,
  EffectTemplateKeyType,
  EventEffectType,
  PItemActionType,
  PItemMemoryType,
  PItemRarityType,
  ParameterType,
  PlanType,
  RarityType,
  ReleaseConditionType,
  ScenarioType,
  SkillCardLevelType,
  SkillCardRarityType,
  SkillCardType,
  SourceType,
  TriggerKeyType,
} from './enums'

/**
 * サポートカード1枚分の情報
 *
 * cards.jsonから読み込み、一覧・計算画面で共有する
 */
export interface SupportCard {
  /** サポート名（例: "いめーじとれーにんぐ"） */
  name: string
  /** レアリティ（例: "ssr", "sr", "r"） */
  rarity: RarityType
  /** プラン制限（例: "sense", "logic", "free"） */
  plan: PlanType
  /** パラメータタイプ（例: "vocal", "dance", "visual", "assist"） */
  type: CardType
  /** 実際に上昇するパラメータ（AssistでもVo/Da/Viのいずれか。例: "vocal"） */
  parameter_type: ParameterType
  /** 入手方法（例: "gacha", "event", "season_limited"） */
  source: SourceType
  /**
   * 配布系の入手先か（イベント・ショップ・コインガチャなど）
   *
   * イベント配布の判定に使う
   */
  is_event_source?: boolean
  /** 入手方法の詳細名（イベント名・ショップ名など。例: "夢よりも先の場所"） */
  source_detail?: string
  /** 登場日（例: "2024/05/16"） */
  release_date: string
  /** サポートアビリティ一覧 */
  abilities: Ability[]
  /** サポートイベント一覧 */
  events: SupportEvent[]
  /** 獲得Pアイテム情報（Pアイテムがない場合は null） */
  p_item: PItem | null
  /** 獲得スキルカード情報（イベントでスキルカードを提供する場合） */
  skill_card: SkillCardInfo | null
}

/** サポート1枚分の回数調整データ */
export interface CardCustomData {
  /** 自動発動アビリティの回数調整 */
  selfTrigger?: Partial<Record<ActionIdType, number>>
  /** Pアイテム発動回数の回数調整 */
  pItemCount?: Partial<Record<ActionIdType, number>>
}

/** サポート名から回数調整データを探す表 */
export type CardCountCustom = Record<string, CardCustomData>

/** サポートアビリティ */
export interface Ability {
  /**
   * 表示名の種類を示すキー（card.abilityName.* に対応）
   * 例: "parameter_bonus", "outing", "event_boost"
   */
  name_key: AbilityNameKeyType
  /** 凸数(0〜4) → 効果量のマッピング（例: {}, {"0": "10", "4": "20"}） */
  values: Record<string, string>
  /** スコア計算時のトリガーキー（例: "parameter_bonus", "outing", "sp_lesson_end"） */
  trigger_key: TriggerKeyType
  /**
   * 効果対象のパラメータ（対象がない場合は省略）
   * 例: "vocal", "dance", "visual"
   */
  parameter_type?: ParameterType
  /** プロデュース中の最大発動回数（制限なしの場合は省略）（例: 3） */
  max_count?: number
  /** パーセンテージ値か（例: true） */
  is_percentage?: boolean
  /** イベントパラメータ上昇の倍率か（例: true） */
  is_event_boost?: boolean
  /** パラメータボーナスか（例: true） */
  is_parameter_bonus?: boolean
  /** 初期値上昇か（例: true） */
  is_initial_stat?: boolean
  /** 計算をスキップすべきか（例: true） */
  skip_calculation?: boolean
}

/** サポートイベントの情報 */
export interface SupportEvent {
  /** 解放条件（"initial" / "lv20" / "lv40"）（例: "initial", "lv20", "lv40"） */
  release: ReleaseConditionType
  /** 効果タイプ（分類済み）（例: "p_item", "param_boost", "skill_card", "card_enhance"） */
  effect_type: EventEffectType
  /** パラメータタイプ（param_boost の場合のみ）（例: "vocal", "visual"） */
  param_type?: ParameterType
  /** パラメータ上昇値（param_boost の場合のみ）（例: 15, 20） */
  param_value?: number
  /** コミュ名（イベント名称）（例: "自慢のお姉ちゃん！", "よくわからない同士"） */
  title: string
}

/** Pアイテムのパラメータ上昇効果（構造化済み） */
interface PItemBoost {
  /** トリガーキー（例: "vitality_card_acquire"） */
  trigger_key: TriggerKeyType
  /** パラメータタイプ（例: "vocal"） */
  parameter_type: ParameterType
  /** 上昇値（例: 6） */
  value: number
  /** プロデュース中の回数上限（0 = 無制限） */
  max_count?: number
}

/** Pアイテム効果の構成要素（制限・トリガー・条件・ボディアクション・回数制限） */
export interface PItemEffectPart {
  /** テンプレートキー（例: "turn_start", "keyword_gte", "param_up", "per_lesson"） */
  key: EffectTemplateKeyType
  /** パラメータ種別（vocal / dance / visual）（例: "vocal", "dance"） */
  param?: ParameterType
  /**
   * 効果の対象となるキーワード（好調・やる気など）
   * 例: "concentration", "good_condition", "vitality"
   */
  keyword?: EffectKeywordType
  /** 第2キーワード（例: "concentration"） */
  keyword2?: EffectKeywordType
  /** 第3キーワード */
  keyword3?: EffectKeywordType
  /**
   * 条件の基準値（「パラメータN以上」「キーワードN以上」のN部分）
   * 例: 集中1以上→1、ビジュアル700以上→700
   */
  threshold?: number
  /** 回数・個数（1回発動あたりの操作枚数や獲得数）（例: 1, 2） */
  count?: number
  /** 効果量（パラメータ上昇値など）（例: ボーカル+6→6, PP+40→40） */
  value?: number
  /** ターン数（例: 3） */
  turns?: number
  /** 手札生成やカード獲得で指定するカード名（例: "静かな意志+"） */
  card_name?: string
  /** Pドリンク獲得効果で指定するPドリンク名 */
  pdrink_name?: string
  /** 効果テンプレート固有の名称や補足値 */
  item_name?: string
  /**
   * ユーザー定義サポートが提供するアクションID
   * 表示時にアプリ側で対応する文言へ変換する
   */
  action_id?: ActionIdType
}

/** Pアイテム効果の構造化データ（分解済み） */
export interface PItemEffect {
  /** レッスン制限（任意）（例: { key: "lesson_turn", param: "dance" }） */
  restriction?: PItemEffectPart
  /** トリガー（例: { key: "turn_start" }, { key: "keyword_card_acquire", keyword: "vitality" }） */
  trigger: PItemEffectPart
  /** 条件（任意）（例: { key: "keyword_gte", keyword: "concentration", threshold: 1 }） */
  condition?: PItemEffectPart
  /**
   * 発動時に実行する効果の一覧
   * 例: ボーカル+6→[{ key: "param_up", param: "vocal", value: 6 }]
   */
  body: PItemEffectPart[]
  /** 回数制限（任意）（例: { key: "per_lesson", count: 1 }, { key: "per_produce", count: 2 }） */
  limit?: PItemEffectPart
}

/** 獲得Pアイテムの情報 */
export interface PItem {
  /** アイテム名（例: "お残しにんじん"） */
  name: string
  /** アイテムのレアリティ（例: "sr", "ssr"） */
  rarity: PItemRarityType
  /** メモリ化可否（例: "memorizable", "non_memorizable"） */
  memory: PItemMemoryType
  /** アイテムの効果（例: 元気系カード獲得時→ボーカル+6（レッスン中1回）） */
  effect?: PItemEffect
  /** パラメータ上昇効果 */
  boost?: PItemBoost
  /** Pアイテムが行うアクション一覧（例: ["delete", "enhance", "p_drink_acquire"]） */
  actions?: PItemActionType[]
  /** ユーザー定義サポート用：スコア計算で提供するアクションIDと回数 */
  provided_action_ids?: Partial<Record<ActionIdType, number>>
  /** ユーザー定義サポート用：boost がない場合でも発動条件を保持する */
  trigger_key?: TriggerKeyType
}

/** スキルカード効果を構成する条件・時間・発動条件・効果の部品 */
export interface SkillCardEffectAction {
  /**
   * 効果の種類を示すキー
   * 例: keyword_up（キーワード上昇）、hp_recovery（体力回復）
   */
  key: EffectTemplateKeyType
  /** 効果量（集中+3→3, 体力回復15→15） */
  value?: number
  /** 第2数値パラメータ（例: 1000） */
  value2?: number
  /** ターン数（例: 2, 3） */
  turns?: number
  /**
   * 効果の対象となるキーワード
   * 例: concentration（集中）、good_condition（好調）、vitality（元気）
   */
  keyword?: EffectKeywordType
  /** パーセンテージ値（例: 50） */
  pct?: number
  /** 倍率（"1.5" 等の文字列）（例: "2"） */
  rate?: string
  /** 回数（例: 2, 3） */
  count?: number
  /** カードゾーン（"hand" / "discard"）（例: "hand"） */
  card_zone?: CardZoneType
  /** スキルカード種別（"active" / "mental"）（例: "mental"） */
  skill_type?: SkillCardType
  /** 段階数（例: 2） */
  stage?: number
}
/** スキルカード効果のアクショングループ（条件+時間修飾+トリガー+アクション） */
interface SkillCardActionGroup {
  /** 条件（任意）（例: { key: "hp_gte_pct", pct: 50 }） */
  condition?: SkillCardEffectAction
  /**
   * 効果が続く時間
   * 例: 「3ターンの間」→{ key: "ongoing", turns: 3 }
   */
  temporal?: SkillCardEffectAction
  /** トリガー（任意）（例: { key: "turn_start" }） */
  trigger?: SkillCardEffectAction
  /** 本体アクション（「集中+2」→{ key: "keyword_up", value: 2, keyword: "concentration" }） */
  action?: SkillCardEffectAction
  /**
   * temporal が action より先に出現したか。省略時は false
   * 例: 「3ターンの間、集中+3」→ true（temporal が先）
   *      「集中+3（3ターン）」→ false（action が先）
   */
  temporal_first?: boolean
}

/** スキルカード効果の構造化データ（分解済み） */
export interface SkillCardEffectStructured {
  /** 使用条件（任意）（例: { key: "keyword_state", keyword: "reserve" }） */
  use_condition?: SkillCardEffectAction
  /**
   * 効果テキスト冒頭の前提条件（任意）。カード使用時の発動条件テキスト
   * 例: 「好印象6以上の場合、好印象+3」
   * → pre_modifier = { key: "keyword_state", keyword: "good_impression", value: 6 }
   *      「レッスン開始時手札にある場合、集中+2」→ pre_modifier = { key: "lesson_start_in_hand" }
   */
  pre_modifier?: SkillCardEffectAction
  /** アクショングループ一覧 */
  groups: SkillCardActionGroup[]
}

/** カスタムスロット名の構造化データ（分解済み） */
export interface CustomSlotNameStructured {
  /**
   * 表示する効果の種類を示すキー（card.customSlotName.* に対応）
   * 例: "keyword_plus", "keyword_add", "hp_cost_reduce_add"
   */
  key: EffectTemplateKeyType
  /** キーワードID（common.keyword.* に対応）（例: "full_power_value", "reserve"） */
  keyword?: EffectKeywordType
}

/** カスタムスロット効果の構造化データ（分解済み） */
export interface CustomSlotEffectStructured {
  /**
   * 効果の種類を示すキー（card.customSlotEffect.* に対応）
   * 例: "keyword_up", "change_policy", "cost_reduce_turns", "null"
   */
  template: EffectTemplateKeyType
  /** テンプレート補間パラメータ（「全力値+4」→{ keyword: "full_power_value", value: "4" }） */
  params?: CustomSlotParams
}

/**
 * カスタムスロット効果のテンプレート補間パラメータ
 * keyword/cond_keyword は EffectKeywordType
 */
export interface CustomSlotParams {
  /**
   * 効果の対象となるキーワード（集中・好調など）
   * 例: "full_power_value", "reserve", "vitality", "motivation"
   */
  keyword?: EffectKeywordType
  /** 条件キーワード（好調時・集中時など）（例: "motivation"） */
  cond_keyword?: EffectKeywordType
  /** 効果値（数値文字列）（例: "4", "6"） */
  value?: string
  /** 効果持続ターン数（例: "2"） */
  turns?: string
  /** パーセント値（例: "110", "410"） */
  pct?: string
  /** 発動回数（例: "1"） */
  count?: string
  /** 発動閾値（例: "3"） */
  threshold?: string
  /** 補足説明テキスト（例: "2回目の元気を追加"） */
  note?: string
  /** 指針段階番号（例: "2"）— 強気・温存などの指針変更段階 */
  stage?: string
}

/** 獲得スキルカードの情報 */
export interface SkillCardInfo {
  /** スキルカード名（例: "愛情レインボー"） */
  name: string
  /** スキルカードのレアリティ（SSR / SR）（例: "sr", "ssr"） */
  rarity: SkillCardRarityType
  /** カードタイプ（メンタル / アクティブ）（例: "mental", "active"） */
  type: SkillCardType
  /** レッスン中の回数制限（0 = 制限なし）（例: 0, 1） */
  lesson_limit: number
  /** デッキに同名カードを複数枚入れられないかどうか */
  no_duplicate: boolean
  /** 強化段階ごとの効果 */
  effects: {
    /** 強化段階キー（"base" / "plus"）（例: "base", "plus"） */
    level: SkillCardLevelType
    /** コストタイプ（例: "none", "hp"） */
    cost_type: CostType
    /** コスト値（例: 0, 3） */
    cost_value: number
    /** 効果（構造化済み、効果テキストがない場合は省略） */
    effect?: SkillCardEffectStructured
  }[]
  /** カスタム上限（カスタム枠の最大数）（例: 2） */
  custom_cap: number
  /** カスタム枠一覧 */
  custom_slot: {
    /** 枠名（構造化済み、card.customSlotName.* に対応） */
    name: CustomSlotNameStructured
    /** 各段階の効果 */
    stages: {
      /** 段階番号（1, 2）（例: 1, 2） */
      stage: number
      /** 消費P（0 = コスト不要）（例: 0, 40, 70） */
      cost: number
      /** 効果（構造化済み） */
      effect?: CustomSlotEffectStructured
    }[]
  }[]
}

/** Vo/Da/Vi の3パラメータ値 */
export interface ParameterValues {
  /** ボーカル値 */
  vocal: number
  /** ダンス値 */
  dance: number
  /** ビジュアル値 */
  visual: number
}

/**
 * レッスンごとの Vo/Da/Vi パラメータ値配列
 *
 * パラメータボーナスをレッスン1回ごとに切り捨て計算するために使う
 * 各配列の要素が1回のレッスンでの上昇量に対応する
 */
export interface PerLessonParameterValues {
  /** ボーカル値の配列（レッスンごと） */
  vocal: number[]
  /** ダンス値の配列（レッスンごと） */
  dance: number[]
  /** ビジュアル値の配列（レッスンごと） */
  visual: number[]
}

/** 表示対象のアビリティ計算内訳 */
export interface CardAbilityBoost {
  /** 表示名の種類を示すキー（アビリティ用） */
  nameKey?: AbilityNameKeyType
  /** 表示時に使うパラメータ */
  parameterType?: ParameterType
  /** 表示時に使う発動回数上限 */
  maxCount?: number
  /** 直接表示テキスト（Pアイテム用） */
  displayName?: string
  /** トリガーキー */
  trigger: TriggerKeyType
  /** 発動回数 */
  count: number
  /** 1回あたりの上昇量 */
  valuePerTrigger: number
  /** 合計上昇量 */
  total: number
}

/** 点数計算対象となった全アビリティの内訳 */
export interface CardAbilityDetail extends CardAbilityBoost {
  /** Pアイテム効果の構造化データ（表示用の全文テキストを作るための情報） */
  effectData?: PItemEffect
}

/** ActionIdTypeごとの回数 */
export type ActionCounts = Partial<Record<ActionIdType, number>>

/**
 * サポート1枚の計算結果
 *
 * 点数内訳画面で表示し、同じ条件で再計算するときにも使う
 */
export interface CardCalculationResult {
  /** サポート名 */
  cardName: string
  /** このサポートのパラメータタイプ */
  parameterType: ParameterType
  /** サポートイベントによるパラメータ上昇量 */
  eventBoost: number
  /** アビリティごとの上昇量内訳 */
  abilityBoosts: CardAbilityBoost[]
  /** 全点数上昇系アビリティの内訳（0点のものも含む） */
  allAbilityDetails: CardAbilityDetail[]
  /** パラメータボーナスによる上昇量 */
  parameterBonus: number
  /** パラメータボーナスの倍率（%）— 0 ならボーナスアビリティ無し */
  paramBonusPercent: number
  /** パラメータボーナスの対象値（Vo/Da/Vi からサポートタイプで選択された値） */
  paramBonusBase: number
  /** イベント上昇の元値（ブースト前） */
  eventBoostBase: number
  /** イベントブースト倍率（%）— 0 ならブーストアビリティ無し */
  eventBoostPercent: number
  /** 総パラメータ上昇量 */
  totalIncrease: number
  /** アクション別の自動カウント回数（上限適用前。回数調整画面で表示するため） */
  autoCounts: ActionCounts
}

/** 保存・計算で共通して使うスコア設定項目 */
export interface ScoreSettingsBase {
  /** 設定名（プリセット保存用） */
  name: string
  /** シナリオ */
  scenario: ScenarioType
  /** 難易度 */
  difficulty: DifficultyType
  /** 各アクションカテゴリの回数 */
  actionCounts: ActionCounts
  /** スケジュール自動計算から手動モードへ戻すためのパラメータボーナス */
  manualParameterBonusBase?: ParameterValues
  /** スケジュール自動計算から手動モードへ戻すための制御対象アクション回数 */
  manualScheduleActionCounts?: ActionCounts
  /** スケジュール選択（週番号 → 選択した活動ID） */
  scheduleSelections: Record<number, ActivityIdType>
  /** スケジュールに基づく上限を有効にするか */
  useScheduleLimits: boolean
  /** サポート自身の効果でアビリティ条件を満たした場合に点数に含めるか */
  includeSelfTrigger: boolean
  /** Pアイテムの効果を点数計算に含めるか */
  includePItem: boolean
  /** 凸数設定を無視して4凸で点数を表示するか */
  useFixedUncap: boolean
  /** カスタムモードを使うか（スケジュール週選択を使わない場合に true） */
  useCustomMode: boolean
  /** カスタムモードでのパラメータボーナス複数行入力 */
  customParamBonusRows: ParameterValues[]
  /** カスタムモードでの授業パラメータ上昇量（Vo/Da/Vi別） */
  customClassBonus: ParameterValues
  /** カスタムモードでの試験などパラメータボーナス対象外の上昇量（Vo/Da/Vi別） */
  customNonBonusGain: ParameterValues
  /** HIF選抜試験3回分のVo:Da:Vi配分比率（x:y:z） */
  hifExamRatios: ParameterValues[]
  /** HIFレッスンのサブ値を残り2属性に半分ずつ割り振るか */
  hifLessonSplitSub: boolean
}

/**
 * スコア設定（保存・計算用）
 *
 * 点数設定画面で編集し、サポート点数と最適編成の計算に使う
 */
export interface ScoreSettings extends ScoreSettingsBase {
  /** パラメータボーナス対象値（Vo/Da/Vi別） */
  parameterBonusBase: ParameterValues
}

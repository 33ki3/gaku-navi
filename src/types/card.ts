/**
 * サポートカードに関する型定義。
 *
 * カードの全情報（SupportCard）、アビリティ、イベント、Pアイテム、
 * スキルカード、そしてスコア計算結果など、アプリケーション全体の
 * データ構造をインターフェースとして定義するファイル。
 * cards.json から読み込んだデータはここの型で型付けされる。
 */
import type {
  RarityType,
  PlanType,
  CardType,
  SourceType,
  PItemRarityType,
  PItemMemoryType,
  ParameterType,
  ScenarioType,
  DifficultyType,
  ActionIdType,
  ActivityIdType,
  SkillCardType,
  SkillCardRarityType,
  SkillCardLevelType,
  CostType,
  TriggerKeyType,
  EventEffectType,
  PItemActionType,
  AbilityNameKeyType,
  ReleaseConditionType,
  EffectKeywordType,
  CardZoneType,
  EffectTemplateKeyType,
} from './enums'

/**
 * サポートカードの全情報を表すインターフェース。
 *
 * データフロー: cards.json → AllCards → コンポーネント
 */
export interface SupportCard {
  /** カード名（例: "いめーじとれーにんぐ"） */
  name: string
  /** レアリティ（例: "ssr", "sr", "r"） */
  rarity: RarityType
  /** プラン制限（例: "sense", "logic", "free"） */
  plan: PlanType
  /** パラメータタイプ（例: "vocal", "dance", "visual", "assist"） */
  type: CardType
  /** パラメータタイプ（Vo/Da/Vi のいずれか。assist カードでも abilities から決定済み。例: "vocal"） */
  parameter_type: ParameterType
  /** 入手方法（例: "gacha", "event", "season_limited"） */
  source: SourceType
  /** 配布系ソースか（イベント・ショップ・コインガチャ等。EventSSR判定に使用） */
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

/** サポートアビリティ */
export interface Ability {
  /** i18n 表示名テンプレートのキー（card.abilityName.* に対応）（例: "parameter_bonus", "outing", "event_boost"） */
  name_key: AbilityNameKeyType
  /** 凸数(0〜4) → 効果量のマッピング（例: {}, {"0": "10", "4": "20"}） */
  values: Record<string, string>
  /** スコア計算時のトリガーキー（例: "parameter_bonus", "outing", "sp_lesson_end"） */
  trigger_key: TriggerKeyType
  /** 効果対象のパラメータタイプ（該当なしの場合は省略）（例: "vocal", "dance", "visual"） */
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

/** Pアイテム効果の構成要素（制限・トリガー・条件・ボディアクション・回数制限）。 */
export interface PItemEffectPart {
  /** テンプレートキー（例: "turn_start", "keyword_gte", "param_up", "per_lesson"） */
  key: EffectTemplateKeyType
  /** パラメータ種別（vocal / dance / visual）（例: "vocal", "dance"） */
  param?: ParameterType
  /** キーワード種別（good_condition / motivation 等）（例: "concentration", "good_condition", "vitality"） */
  keyword?: EffectKeywordType
  /** 第2キーワード（例: "concentration"） */
  keyword2?: EffectKeywordType
  /** 第3キーワード */
  keyword3?: EffectKeywordType
  /** 条件の閾値（「パラメータN以上」「キーワードN以上」のN部分）（例: 集中1以上→1, ビジュアル700以上→700） */
  threshold?: number
  /** 回数・個数（1回発動あたりの操作枚数や獲得数）（例: 1, 2） */
  count?: number
  /** 効果量（パラメータ上昇値など）（例: ボーカル+6→6, PP+40→40） */
  value?: number
  /** ターン数（例: 3） */
  turns?: number
  /** カード名（手札生成で使用）（例: "静かな意志+"） */
  card_name?: string
  /** 獲得対象のPアイテム名（例: Pアイテム「ハッピー♪」獲得→"ハッピー♪"） */
  item_name?: string
}

/** Pアイテム効果の構造化データ（分解済み）。 */
export interface PItemEffect {
  /** レッスン制限（任意）（例: { key: "lesson_turn", param: "dance" }） */
  restriction?: PItemEffectPart
  /** トリガー（例: { key: "turn_start" }, { key: "keyword_card_acquire", keyword: "vitality" }） */
  trigger: PItemEffectPart
  /** 条件（任意）（例: { key: "keyword_gte", keyword: "concentration", threshold: 1 }） */
  condition?: PItemEffectPart
  /** 効果本体（発動時に実行されるアクション群）（例: ボーカル+6→[{ key: "param_up", param: "vocal", value: 6 }]） */
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
}

/** スキルカード効果のアクション部品（条件・時間修飾・トリガー・本体アクション共通）。 */
export interface SkillCardEffectAction {
  /** テンプレートキー（keyword_up: キーワード上昇, hp_recovery: 体力回復, param_up: パラメータ上昇, draw_card: カードを引く） */
  key: EffectTemplateKeyType
  /** 効果量（集中+3→3, 体力回復15→15） */
  value?: number
  /** 第2数値パラメータ（例: 1000） */
  value2?: number
  /** ターン数（例: 2, 3） */
  turns?: number
  /** キーワード種別（concentration: 集中, good_condition: 好調, motivation: やる気, vitality: 元気） */
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
/** スキルカード効果のアクショングループ（条件+時間修飾+トリガー+アクション）。 */
interface SkillCardActionGroup {
  /** 条件（任意）（例: { key: "hp_gte_pct", pct: 50 }） */
  condition?: SkillCardEffectAction
  /** 時間修飾（「3ターンの間」→{ key: "ongoing", turns: 3 }、「次のターン」→{ key: "next_turn" }） */
  temporal?: SkillCardEffectAction
  /** トリガー（任意）（例: { key: "turn_start" }） */
  trigger?: SkillCardEffectAction
  /** 本体アクション（「集中+2」→{ key: "keyword_up", value: 2, keyword: "concentration" }） */
  action?: SkillCardEffectAction
  /**
   * temporal が action より先に出現したか。省略時は false。
   * 例: 「3ターンの間、集中+3」→ true（temporal が先）
   *      「集中+3（3ターン）」→ false（action が先）
   */
  temporal_first?: boolean
}

/** スキルカード効果の構造化データ（分解済み）。 */
export interface SkillCardEffectStructured {
  /** 使用条件（任意）（例: { key: "keyword_state", keyword: "reserve" }） */
  use_condition?: SkillCardEffectAction
  /**
   * 効果テキスト冒頭の前提条件（任意）。カード使用時の発動条件テキスト。
   * 例: 「好印象6以上の場合、好印象+3」→ pre_modifier = { key: "keyword_state", keyword: "good_impression", value: 6 }
   *      「レッスン開始時手札にある場合、集中+2」→ pre_modifier = { key: "lesson_start_in_hand" }
   */
  pre_modifier?: SkillCardEffectAction
  /** アクショングループ一覧 */
  groups: SkillCardActionGroup[]
}

/** カスタムスロット名の構造化データ（分解済み）。 */
export interface CustomSlotNameStructured {
  /** テンプレートキー（card.customSlotName.* に対応）（例: "keyword_plus", "keyword_add", "hp_cost_reduce_add"） */
  key: EffectTemplateKeyType
  /** キーワードID（common.keyword.* に対応）（例: "full_power_value", "reserve"） */
  keyword?: EffectKeywordType
}

/** カスタムスロット効果の構造化データ（分解済み）。 */
export interface CustomSlotEffectStructured {
  /** テンプレートキー（card.customSlotEffect.* に対応）（例: "keyword_up", "change_policy", "cost_reduce_turns", "null"） */
  template: EffectTemplateKeyType
  /** テンプレート補間パラメータ（「全力値+4」→{ keyword: "full_power_value", value: "4" }） */
  params?: CustomSlotParams
}

/** カスタムスロット効果のテンプレート補間パラメータ。keyword/cond_keyword は EffectKeywordType。 */
export interface CustomSlotParams {
  /** 効果キーワード（集中・好調など）（例: "full_power_value", "reserve", "vitality", "motivation"） */
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
  /** 指針段階番号（例: "2"）— 強気・温存などの指針変更時に使用 */
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
 * パラメータボーナスをレッスン1回ごとに切り捨て計算するために使う。
 * 各配列の要素が1回のレッスンでの上昇量に対応する。
 */
export interface PerLessonParameterValues {
  /** ボーカル値の配列（レッスンごと） */
  vocal: number[]
  /** ダンス値の配列（レッスンごと） */
  dance: number[]
  /** ビジュアル値の配列（レッスンごと） */
  visual: number[]
}

/**
 * カード計算結果。
 *
 * calculateCardParameter() の戻り値。ScoreBreakdownModal で内訳表示に使う。
 */
export interface CardCalculationResult {
  /** カード名 */
  cardName: string
  /** このカードのパラメータタイプ */
  parameterType: ParameterType
  /** サポートイベントによるパラメータ上昇量 */
  eventBoost: number
  /** アビリティごとの上昇量内訳 */
  abilityBoosts: {
    /** i18n テンプレートキー（アビリティ用） */
    nameKey?: AbilityNameKeyType
    /** パラメータタイプ（i18n 補間用） */
    parameterType?: ParameterType
    /** 回数上限（i18n 補間用） */
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
  }[]
  /** 全点数上昇系アビリティの内訳（0点のものも含む） */
  allAbilityDetails: {
    /** i18n テンプレートキー（アビリティ用） */
    nameKey?: AbilityNameKeyType
    /** パラメータタイプ（i18n 補間用） */
    parameterType?: ParameterType
    /** 回数上限（i18n 補間用） */
    maxCount?: number
    /** 直接表示テキスト（Pアイテム用） */
    displayName?: string
    /** 発動トリガーキー（Pアイテム用。score.action.*のラベルに対応） */
    triggerKey?: TriggerKeyType
    /** Pアイテム効果の構造化データ（UIで全文テキストを生成する用） */
    effectData?: PItemEffect
    /** 発動回数 */
    count: number
    /** 1回あたりの上昇量 */
    valuePerTrigger: number
    /** 合計上昇量（0点の場合は 0） */
    total: number
  }[]
  /** パラメータボーナスによる上昇量 */
  parameterBonus: number
  /** パラメータボーナスの倍率（%）— 0 ならボーナスアビリティ無し */
  paramBonusPercent: number
  /** パラメータボーナスの対象値（Vo/Da/Vi からカードタイプで選択された値） */
  paramBonusBase: number
  /** イベント上昇の元値（ブースト前） */
  eventBoostBase: number
  /** イベントブースト倍率（%）— 0 ならブーストアビリティ無し */
  eventBoostPercent: number
  /** 総パラメータ上昇量 */
  totalIncrease: number
  /** アクション別の自動計算回数（maxCount制限前。カウント設定UI用） */
  autoActionCounts: Partial<Record<ActionIdType, number>>
}

/**
 * スコア設定（ローカル保存用）。
 *
 * ScoreSettingsPanel で編集し、useCardScores で消費する。localStorage に永続化。
 */
export interface ScoreSettings {
  /** 設定名（プリセット保存用） */
  name: string
  /** シナリオ */
  scenario: ScenarioType
  /** 難易度 */
  difficulty: DifficultyType
  /** パラメータボーナス対象値（Vo/Da/Vi別） */
  parameterBonusBase: ParameterValues
  /** 各アクションカテゴリの回数 */
  actionCounts: Partial<Record<ActionIdType, number>>
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
}

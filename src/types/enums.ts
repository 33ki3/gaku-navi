/**
 * アプリケーション全体で使う列挙型（enum 相当の定数オブジェクト）をまとめたファイル。
 *
 * TypeScript の `as const` パターンで定義し、値の型と同名の型エイリアスを
 * 同時にエクスポートしている。サポート情報・スコア計算・UI フィルターなど
 * あらゆる場面で参照される基盤型定義。
 */

/**
 * レアリティ定数。
 * サポートカードの希少度を表す。SSR > SR > R の順にレアリティが高い。
 */
export const RarityType = {
  /** SSR */
  SSR: 'ssr',
  /** SR */
  SR: 'sr',
  /** R */
  R: 'r',
} as const
export type RarityType = (typeof RarityType)[keyof typeof RarityType]

/**
 * レアリティ階層定数。
 * アビリティ値マスタで使用する4分類。SSR のうち配布系（イベント・ショップ・コインガチャ・パック）は EventSSR として区別する。
 */
export const RarityTierType = {
  /** SSR（ガチャ産） */
  SSR: 'ssr',
  /** SSR（配布系: イベント・ショップ・コインガチャ） */
  EventSSR: 'event_ssr',
  /** SR */
  SR: 'sr',
  /** R */
  R: 'r',
} as const
export type RarityTierType = (typeof RarityTierType)[keyof typeof RarityTierType]

/**
 * サポートタイプ定数。
 * サポートカードが得意とするパラメータの種類（Vo / Da / Vi / アシスト）。
 * フィルターやバッジの色分けに使う。
 */
export const CardType = {
  /** ボーカルタイプ */
  Vocal: 'vocal',
  /** ダンスタイプ */
  Dance: 'dance',
  /** ビジュアルタイプ */
  Visual: 'visual',
  /** アシストタイプ（全パラメータ対応） */
  Assist: 'assist',
} as const
export type CardType = (typeof CardType)[keyof typeof CardType]

/**
 * パラメータタイプ定数。
 * プロデュースで育てる 3 つの能力値（ボーカル / ダンス / ビジュアル）。
 * サポートタイプの Assist を含まない純粋な能力パラメータ。
 */
export const ParameterType = {
  /** ボーカル */
  Vocal: 'vocal',
  /** ダンス */
  Dance: 'dance',
  /** ビジュアル */
  Visual: 'visual',
} as const
export type ParameterType = (typeof ParameterType)[keyof typeof ParameterType]

/**
 * 育成プラン定数。
 * サポートカードが対応する育成プラン。
 * Sense / Logic / Anomaly のほか、プラン制限のない Free がある。
 */
export const PlanType = {
  /** プラン制限なし */
  Free: 'free',
  /** センス育成 */
  Sense: 'sense',
  /** ロジック育成 */
  Logic: 'logic',
  /** アノマリー育成 */
  Anomaly: 'anomaly',
} as const
export type PlanType = (typeof PlanType)[keyof typeof PlanType]

/**
 * 入手方法の固定値定数。
 * サポートをどこで手に入れられるかを示す。ガチャ・限定・フェスなど。
 * イベント配布やショップ購入はカテゴリID（"event" / "shop" / "pack"）で表現する。
 */
export const SourceType = {
  /** 恒常ガチャ */
  Gacha: 'gacha',
  /** コインガチャ */
  CoinGacha: 'coin_gacha',
  /** 季節限定 */
  SeasonLimited: 'season_limited',
  /** ユニット限定 */
  UnitLimited: 'unit_limited',
  /** ライブツアー限定 */
  LiveTourLimited: 'live_tour_limited',
  /** 初星フェス */
  HatsuboshiFes: 'hatsuboshi_fes',
  /** 初期配布 */
  Initial: 'initial',
  /** イベント配布 */
  Event: 'event',
  /** ショップ購入 */
  Shop: 'shop',
  /** パック購入 */
  Pack: 'pack',
} as const
export type SourceType = (typeof SourceType)[keyof typeof SourceType]

/**
 * アビリティキーワード定数。
 * サポートアビリティをカテゴリ分けするためのキーワード。
 * フィルター UI のトグルボタンに 1 つずつ対応する。
 */
export const AbilityKeywordType = {
  /** 初期パラメータ */
  InitialParameter: 'initial_parameter',
  /** パラメータボーナス */
  ParameterBonus: 'parameter_bonus',
  /** SPレッスン */
  SpLesson: 'sp_lesson',
  /** レッスン */
  Lesson: 'lesson',
  /** カード強化 */
  CardEnhance: 'card_enhance',
  /** カード削除 */
  CardDelete: 'card_delete',
  /** カードチェンジ */
  CardChange: 'card_change',
  /** カード獲得 */
  CardAcquire: 'card_acquire',
  /** 授業・営業 */
  ClassWork: 'class_work',
  /** 試験 */
  Exam: 'exam',
  /** 差し入れ・活動支給 */
  ActivitySupplyGift: 'activity_supply_gift',
  /** お出かけ */
  Outing: 'outing',
  /** 相談 */
  Consult: 'consult',
  /** Pドリンク */
  PDrink: 'p_drink',
  /** 休む */
  Rest: 'rest',
  /** カスタマイズ */
  Customize: 'customize',
  /** Pアイテム */
  PItem: 'p_item',
  /** 特別指導 */
  SpecialTraining: 'special_training',
} as const
export type AbilityKeywordType = (typeof AbilityKeywordType)[keyof typeof AbilityKeywordType]

/**
 * アビリティ名キー定数。
 * 各サポートアビリティの識別子。i18n テンプレート `card.ability_name.*` に対応し、
 * アビリティ表示名の生成やスコア計算でのルックアップに使う。
 */
export const AbilityNameKeyType = {
  /** 初期ステータス */
  InitialStat: 'initial_stat',
  /** パラメータボーナス */
  ParameterBonus: 'parameter_bonus',
  /** SPレッスン発生率 */
  SpLessonRate: 'sp_lesson_rate',
  /** SPレッスン発生率（全体） */
  SpLessonRateAll: 'sp_lesson_rate_all',
  /** レッスン終了時 */
  LessonEnd: 'lesson_end',
  /** 通常レッスン終了時 */
  NormalLessonEnd: 'normal_lesson_end',
  /** SPレッスン終了時 */
  SpLessonEnd: 'sp_lesson_end',
  /** スキルカード強化 */
  SkillEnhance: 'skill_enhance',
  /** メンタルスキル強化 */
  MSkillEnhance: 'm_skill_enhance',
  /** アクティブスキル強化 */
  ASkillEnhance: 'a_skill_enhance',
  /** スキルカード削除 */
  Delete: 'delete',
  /** メンタルスキル削除 */
  MSkillDelete: 'm_skill_delete',
  /** アクティブスキル削除 */
  ASkillDelete: 'a_skill_delete',
  /** カードチェンジ */
  Change: 'change',
  /** スキルカード獲得 */
  SkillAcquire: 'skill_acquire',
  /** メンタルスキル獲得 */
  MSkillAcquire: 'm_skill_acquire',
  /** アクティブスキル獲得 */
  ASkillAcquire: 'a_skill_acquire',
  /** 元気系カード獲得 */
  VitalityCardAcquire: 'vitality_card_acquire',
  /** 好調系カード獲得 */
  GoodConditionCardAcquire: 'good_condition_card_acquire',
  /** 集中系カード獲得 */
  ConcentrationCardAcquire: 'concentration_card_acquire',
  /** 好印象系カード獲得 */
  GoodImpressionCardAcquire: 'good_impression_card_acquire',
  /** やる気系カード獲得 */
  MotivationCardAcquire: 'motivation_card_acquire',
  /** 温存系カード獲得 */
  ReserveCardAcquire: 'reserve_card_acquire',
  /** 強気系カード獲得 */
  AggressiveCardAcquire: 'aggressive_card_acquire',
  /** 全力系カード獲得 */
  FullPowerCardAcquire: 'full_power_card_acquire',
  /** 授業・営業終了時 */
  ClassWorkEnd: 'class_work_end',
  /** 試験終了時 */
  ExamEnd: 'exam_end',
  /** 差し入れ・活動支給 */
  ActivitySupplyGift: 'activity_supply_gift',
  /** お出かけ */
  Outing: 'outing',
  /** 相談 */
  Consult: 'consult',
  /** Pドリンク交換 */
  PDrinkExchange: 'p_drink_exchange',
  /** 休む */
  Rest: 'rest',
  /** 最大体力 */
  MaxHp: 'max_hp',
  /** Pドリンク獲得 */
  PDrinkAcquire: 'p_drink_acquire',
  /** SPレッスン終了時体力回復 */
  SpLessonHp: 'sp_lesson_hp',
  /** SPレッスン終了時体力回復（全体） */
  SpLessonHpAll: 'sp_lesson_hp_all',
  /** カスタマイズ */
  Customize: 'customize',
  /** 試験終了時体力回復 */
  ExamHp: 'exam_hp',
  /** 活動支給・差し入れ選択時体力回復 */
  ActivitySupplyGiftHp: 'activity_supply_gift_hp',
  /** SSRカード獲得 */
  SsrCardAcquire: 'ssr_card_acquire',
  /** 初期PP */
  InitialPp: 'initial_pp',
  /** Pアイテム獲得 */
  PItemAcquire: 'p_item_acquire',
  /** レッスンPPブースト */
  LessonPpBoost: 'lesson_pp_boost',
  /** SPレッスン終了時カード20枚以上 */
  SpLesson20: 'sp_lesson_20',
  /** 相談Pドリンク割引 */
  Discount: 'discount',
  /** 特別指導 */
  SpecialTraining: 'special_training',
  /** レッスンボーナス */
  LessonBonus: 'lesson_bonus',
  /** SPレッスンPポイント */
  SpLessonPp: 'sp_lesson_pp',
  /** イベントブースト */
  EventBoost: 'event_boost',
  /** イベントPポイントブースト */
  EventPpBoost: 'event_pp_boost',
  /** イベント回復ブースト */
  EventRecoveryBoost: 'event_recovery_boost',
  /** サポート率 */
  SupportRate: 'support_rate',
} as const
export type AbilityNameKeyType = (typeof AbilityNameKeyType)[keyof typeof AbilityNameKeyType]

/**
 * スキルカードのコストタイプ定数。
 * スキルカードを使うときに消費するリソースの種類。
 * None はコストなし、残りは元気・体力・やる気・好調。
 */
export const CostType = {
  /** コストなし */
  None: 'none',
  /** 元気消費 */
  Vitality: 'vitality',
  /** 体力消費 */
  Hp: 'hp',
  /** やる気消費 */
  Motivation: 'motivation',
  /** 好調消費 */
  GoodCondition: 'good_condition',
} as const
export type CostType = (typeof CostType)[keyof typeof CostType]

/**
 * イベント効果タイプ定数。
 * サポートイベントの効果を分類する。パラメータ上昇・Pアイテム獲得・
 * スキルカード獲得・カード強化など、イベントの内容をカテゴリ分けする。
 */
export const EventEffectType = {
  /** パラメータ上昇 */
  ParamBoost: 'param_boost',
  /** スキルカード獲得 */
  SkillCard: 'skill_card',
  /** Pアイテム獲得 */
  PItem: 'p_item',
  /** 体力回復 */
  HpRecovery: 'hp_recovery',
  /** カード強化 */
  CardEnhance: 'card_enhance',
  /** カード削除 */
  CardDelete: 'card_delete',
  /** カードチェンジ */
  CardChange: 'card_change',
  /** Pポイント獲得 */
  PpGain: 'pp_gain',
  /** 選択強化 */
  SelectEnhance: 'select_enhance',
  /** 選択削除 */
  SelectDelete: 'select_delete',
  /** トラブル削除 */
  TroubleDelete: 'trouble_delete',
} as const
export type EventEffectType = (typeof EventEffectType)[keyof typeof EventEffectType]

/**
 * イベント種別フィルター値定数。
 * ユーザーがサポート一覧画面でイベント効果で絞り込むためのフィルター値。
 * 6 種類のボタンに 1 つずつ対応する。
 */
export const EventFilterType = {
  /** スキルカード獲得 */
  SkillCard: 'skill_card',
  /** Pアイテム獲得 */
  PItem: 'p_item',
  /** 強化 */
  Enhance: 'enhance',
  /** カード削除 */
  Delete: 'delete',
  /** チェンジ */
  Change: 'change',
  /** トラブル削除 */
  TroubleDelete: 'trouble_delete',
} as const
export type EventFilterType = (typeof EventFilterType)[keyof typeof EventFilterType]

/**
 * イベントフィルターカテゴリ定数。
 * フィルター UI でイベント種別を「獲得系」「操作系」に分類する。
 */
export const EventFilterCategoryType = {
  /** 獲得系（スキルカード獲得・Pアイテム獲得） */
  Acquire: 'acquire',
  /** 操作系（強化・チェンジ・削除・トラブル削除） */
  Modify: 'modify',
} as const
export type EventFilterCategoryType = (typeof EventFilterCategoryType)[keyof typeof EventFilterCategoryType]

/**
 * Pアイテムアクション定数。
 * Pアイテムが起こすアクション（強化・削除・チェンジ・トラブル削除・
 * Pドリンク獲得・Pドリンク交換）の識別子。
 */
export const PItemActionType = {
  /** カード強化 */
  Enhance: 'enhance',
  /** カード削除 */
  Delete: 'delete',
  /** カードチェンジ */
  Change: 'change',
  /** トラブル削除 */
  TroubleDelete: 'trouble_delete',
  /** Pドリンク獲得 */
  PDrinkAcquire: 'p_drink_acquire',
  /** Pドリンク交換 */
  PDrinkExchange: 'p_drink_exchange',
} as const
export type PItemActionType = (typeof PItemActionType)[keyof typeof PItemActionType]

/**
 * メモリ化区分定数。
 * Pアイテムがメモリー編成で使えるかどうかを表す。
 * Memorizable = メモリ化可能、NonMemorizable = メモリ化不可。
 */
export const PItemMemoryType = {
  /** メモリ化可能 */
  Memorizable: 'memorizable',
  /** メモリ化不可 */
  NonMemorizable: 'non_memorizable',
} as const
export type PItemMemoryType = (typeof PItemMemoryType)[keyof typeof PItemMemoryType]

/**
 * Pアイテムレアリティ定数。
 * Pアイテムのレアリティ。SSR または SR の 2 段階。
 */
export const PItemRarityType = {
  /** SSRランク */
  SSR: 'ssr',
  /** SRランク */
  SR: 'sr',
} as const
export type PItemRarityType = (typeof PItemRarityType)[keyof typeof PItemRarityType]

/**
 * スキルカードレアリティ定数。
 * スキルカードのレアリティ。SSR / SR / R の 3 段階。
 */
export const SkillCardRarityType = {
  /** SSRランク */
  SSR: 'ssr',
  /** SRランク */
  SR: 'sr',
  /** Rランク */
  R: 'r',
} as const
export type SkillCardRarityType = (typeof SkillCardRarityType)[keyof typeof SkillCardRarityType]

/**
 * スキルカードの強化段階定数。
 * Base = 未強化、Plus = 強化済み（+マーク付き）。
 */
export const SkillCardLevelType = {
  /** 未強化 */
  Base: 'base',
  /** 強化済み（+マーク付き） */
  Plus: 'plus',
} as const
export type SkillCardLevelType = (typeof SkillCardLevelType)[keyof typeof SkillCardLevelType]

/**
 * スキルカードタイプ定数。
 * メンタルスキルカードとアクティブスキルカードの 2 種類。
 */
export const SkillCardType = {
  /** メンタルスキルカード */
  Mental: 'mental',
  /** アクティブスキルカード */
  Active: 'active',
} as const
export type SkillCardType = (typeof SkillCardType)[keyof typeof SkillCardType]

/**
 * スキルカード表示モード定数。
 * 詳細モーダルでスキルカードの効果表示を切り替えるモード。
 * Unenhanced = 未強化、Enhanced = 強化済み、Custom = カスタム効果。
 */
export const SkillCardViewModeType = {
  /** 未強化表示 */
  Unenhanced: 'unenhanced',
  /** 強化済み表示 */
  Enhanced: 'enhanced',
  /** カスタム効果表示 */
  Custom: 'custom',
} as const
export type SkillCardViewModeType = (typeof SkillCardViewModeType)[keyof typeof SkillCardViewModeType]

/**
 * ソートモード定数。
 * サポート一覧の並び替え方法。Rarity = レアリティ順、Date = 登場日順、
 * Score = 点数順、Uncap = 凸数順。
 */
export const SortModeType = {
  /** レアリティ順 */
  Rarity: 'rarity',
  /** 登場日順 */
  Date: 'date',
  /** 点数順 */
  Score: 'score',
  /** 凸数順 */
  Uncap: 'uncap',
} as const
export type SortModeType = (typeof SortModeType)[keyof typeof SortModeType]

/**
 * フィルターアクション種別定数。
 * useFilterState の useReducer で使用するアクション種別。
 */
export const FilterActionType = {
  /** 検索テキスト設定 */
  SetSearch: 'SET_SEARCH',
  /** レアリティ切替 */
  ToggleRarity: 'TOGGLE_RARITY',
  /** タイプ切替 */
  ToggleType: 'TOGGLE_TYPE',
  /** SP切替 */
  ToggleSP: 'TOGGLE_SP',
  /** アビリティキーワード切替 */
  ToggleAbilityKeyword: 'TOGGLE_ABILITY_KEYWORD',
  /** プラン切替 */
  TogglePlan: 'TOGGLE_PLAN',
  /** イベントフィルター切替 */
  ToggleEventFilter: 'TOGGLE_EVENT_FILTER',
  /** 凸数切替 */
  ToggleUncap: 'TOGGLE_UNCAP',
  /** 並び替えモード設定 */
  SetSortMode: 'SET_SORT_MODE',
  /** 並び替え逆順切替 */
  ToggleSortReverse: 'TOGGLE_SORT_REVERSE',
  /** フィルタークリア */
  ClearFilters: 'CLEAR_FILTERS',
} as const
export type FilterActionType = (typeof FilterActionType)[keyof typeof FilterActionType]

/**
 * 凸数定数。
 * サポートカードの上限解放段階を 0（無凸）〜4（完凸）で表す。
 * 凸数が上がるとアビリティの効果量やレベル上限が上がる。
 */
export const UncapType = {
  /** 未所持 */
  NotOwned: -1,
  /** 0凸（無凸） */
  Zero: 0,
  /** 1凸 */
  One: 1,
  /** 2凸 */
  Two: 2,
  /** 3凸 */
  Three: 3,
  /** 4凸（完凸） */
  Four: 4,
} as const
export type UncapType = (typeof UncapType)[keyof typeof UncapType]

/**
 * SP分類結果。
 * サポートのSPレッスン種別を判定した結果を表す。
 */
export const SpCategoryType = {
  /** ボーカルSP */
  Vocal: 'vocal',
  /** ダンスSP */
  Dance: 'dance',
  /** ビジュアルSP */
  Visual: 'visual',
  /** SP以外 */
  None: 'none',
} as const
export type SpCategoryType = (typeof SpCategoryType)[keyof typeof SpCategoryType]

/**
 * アクショングループ定数。
 * 点数計算のアクション回数設定で、アクションをセクションごとに
 * グループ分けするためのカテゴリ。UI のアコーディオン表示に対応する。
 */
export const ActionGroupType = {
  /** 活動アクション（レッスン・お出かけ等） */
  Activity: 'activity',
  /** スキルカード獲得 */
  SkillAcquire: 'skill_acquire',
  /** スキルカード強化 */
  SkillEnhance: 'skill_enhance',
  /** スキルカード削除 */
  SkillDelete: 'skill_delete',
  /** Pドリンク */
  PDrink: 'p_drink',
  /** その他 */
  Other: 'other',
} as const
export type ActionGroupType = (typeof ActionGroupType)[keyof typeof ActionGroupType]

/**
 * アクションID定数。
 * 点数計算で回数を数えるアクションの識別子。
 * レッスン・お出かけ・スキル獲得/強化/削除など
 * プロデュース中に発生するすべてのアクションを網羅する。
 */
export const ActionIdType = {
  /** レッスン */
  Lesson: 'lesson',
  /** レッスン（Vo） */
  LessonVo: 'lesson_vo',
  /** レッスン（Da） */
  LessonDa: 'lesson_da',
  /** レッスン（Vi） */
  LessonVi: 'lesson_vi',
  /** 通常レッスン */
  NormalLesson: 'normal_lesson',
  /** 通常レッスン（Vo） */
  NormalLessonVo: 'normal_lesson_vo',
  /** 通常レッスン（Da） */
  NormalLessonDa: 'normal_lesson_da',
  /** 通常レッスン（Vi） */
  NormalLessonVi: 'normal_lesson_vi',
  /** 授業・営業 */
  ClassWork: 'class_work',
  /** スキルカード強化 */
  SkillEnhance: 'skill_enhance',
  /** メンタルスキル強化 */
  MSkillEnhance: 'm_skill_enhance',
  /** アクティブスキル強化 */
  ASkillEnhance: 'a_skill_enhance',
  /** スキルカード削除 */
  Delete: 'delete',
  /** メンタルスキル削除 */
  MSkillDelete: 'm_skill_delete',
  /** アクティブスキル削除 */
  ASkillDelete: 'a_skill_delete',
  /** カードチェンジ */
  Change: 'change',
  /** スキルカード獲得 */
  SkillAcquire: 'skill_acquire',
  /** メンタルスキル獲得 */
  MSkillAcquire: 'm_skill_acquire',
  /** アクティブスキル獲得 */
  ASkillAcquire: 'a_skill_acquire',
  /** 元気系カード獲得 */
  VitalityCardAcquire: 'vitality_card_acquire',
  /** 好調系カード獲得 */
  GoodConditionCardAcquire: 'good_condition_card_acquire',
  /** 集中系カード獲得 */
  ConcentrationCardAcquire: 'concentration_card_acquire',
  /** 好印象系カード獲得 */
  GoodImpressionCardAcquire: 'good_impression_card_acquire',
  /** やる気系カード獲得 */
  MotivationCardAcquire: 'motivation_card_acquire',
  /** 温存系カード獲得 */
  ReserveCardAcquire: 'reserve_card_acquire',
  /** 強気系カード獲得 */
  AggressiveCardAcquire: 'aggressive_card_acquire',
  /** 全力系カード獲得 */
  FullPowerCardAcquire: 'full_power_card_acquire',
  /** SSRカード獲得 */
  SsrCardAcquire: 'ssr_card_acquire',
  /** 眠気カード獲得 */
  DrowsyAcquire: 'drowsy_acquire',
  /** 試験終了時 */
  ExamEnd: 'exam_end',
  /** 差し入れ・活動支給 */
  ActivitySupplyGift: 'activity_supply_gift',
  /** お出かけ */
  Outing: 'outing',
  /** 相談 */
  Consult: 'consult',
  /** Pドリンク獲得 */
  PDrinkAcquire: 'p_drink_acquire',
  /** Pドリンク交換 */
  PDrinkExchange: 'p_drink_exchange',
  /** 休む */
  Rest: 'rest',
  /** カスタマイズ */
  Customize: 'customize',
  /** Pアイテム獲得 */
  PItemAcquire: 'p_item_acquire',
  /** 試験後Pアイテム獲得 */
  ExamPItemAcquire: 'exam_p_item_acquire',
  /** SPレッスン終了時 */
  SpLesson: 'sp_lesson',
  /** SPレッスン（Vo） */
  SpLessonVo: 'sp_lesson_vo',
  /** SPレッスン（Da） */
  SpLessonDa: 'sp_lesson_da',
  /** SPレッスン（Vi） */
  SpLessonVi: 'sp_lesson_vi',
  /** SPレッスン終了時カード20枚以上 */
  SpLesson20: 'sp_lesson_20',
  /** 特別指導 */
  SpecialTraining: 'special_training',
  /** トラブル削除 */
  TroubleDelete: 'trouble_delete',
  /** 非スコア系（計算対象外） */
  Nothing: 'nothing',
} as const
export type ActionIdType = (typeof ActionIdType)[keyof typeof ActionIdType]

/**
 * スケジュール活動ID定数。
 * プロデュースの週間スケジュールで選べる活動の識別子。
 * Vo/Da/Viレッスン・授業・お出かけ・相談・差し入れ・追い込み・試験・休む。
 */
export const ActivityIdType = {
  /** Voレッスン */
  VoLesson: 'vo_lesson',
  /** Daレッスン */
  DaLesson: 'da_lesson',
  /** Viレッスン */
  ViLesson: 'vi_lesson',
  /** 授業 */
  Class: 'class',
  /** お出かけ */
  Outing: 'outing',
  /** 相談 */
  Consult: 'consult',
  /** 活動支給（初シナリオ） */
  ActivitySupply: 'activity_supply',
  /** 差し入れ（NIAシナリオ） */
  SupplyGift: 'supply_gift',
  /** 特別指導 */
  SpecialTraining: 'special_training',
  /** 中間試験 */
  MidExam: 'mid_exam',
  /** 最終試験 */
  FinalExam: 'final_exam',
  /** 休む */
  Rest: 'rest',
} as const
export type ActivityIdType = (typeof ActivityIdType)[keyof typeof ActivityIdType]

/**
 * 難易度定数。
 * プロデュースの難易度。Regular → Pro → Master → Legend の順に難しくなる。
 * スケジュールやレッスンのスコアテーブルが難易度で変わる。
 */
export const DifficultyType = {
  /** レギュラー */
  Regular: 'regular',
  /** プロ */
  Pro: 'pro',
  /** マスター */
  Master: 'master',
  /** レジェンド */
  Legend: 'legend',
} as const
export type DifficultyType = (typeof DifficultyType)[keyof typeof DifficultyType]

/**
 * レッスンタイプ定数。
 * SPレッスンの獲得パラメータ量定義に使用。
 */
export const LessonType = {
  /** SPレッスン */
  Sp: 'sp',
} as const
export type LessonType = (typeof LessonType)[keyof typeof LessonType]

/**
 * シナリオ種別定数。
 * プロデュースのシナリオ。Hajime = 初（はじめ）、Nia = ニア。
 * シナリオごとにスケジュールやレッスン内容が異なる。
 */
export const ScenarioType = {
  /** 初シナリオ */
  Hajime: 'hajime',
  /** N.I.Aシナリオ */
  Nia: 'nia',
} as const
export type ScenarioType = (typeof ScenarioType)[keyof typeof ScenarioType]

/**
 * トリガーキー定数。
 * アビリティの発動条件を表すキー。
 * パラメータボーナスや初期ステータスなど計算専用の特殊キーも含む。
 * スコア計算でアクション回数とアビリティを紐づけるために使う。
 */
export const TriggerKeyType = {
  /** レッスン終了時（汎用。属性別は Vo/Da/ViLessonEnd を使用） */
  LessonEnd: 'lesson_end',
  /** Voレッスン終了時 */
  VoLessonEnd: 'vo_lesson_end',
  /** Daレッスン終了時 */
  DaLessonEnd: 'da_lesson_end',
  /** Viレッスン終了時 */
  ViLessonEnd: 'vi_lesson_end',
  /** 通常レッスン終了時（汎用。属性別は Vo/Da/ViNormalLessonEnd を使用） */
  NormalLessonEnd: 'normal_lesson_end',
  /** Vo通常レッスン終了時 */
  VoNormalLessonEnd: 'vo_normal_lesson_end',
  /** Da通常レッスン終了時 */
  DaNormalLessonEnd: 'da_normal_lesson_end',
  /** Vi通常レッスン終了時 */
  ViNormalLessonEnd: 'vi_normal_lesson_end',
  /** スキルカード強化 */
  SkillEnhance: 'skill_enhance',
  /** メンタルスキル強化 */
  MSkillEnhance: 'm_skill_enhance',
  /** アクティブスキル強化 */
  ASkillEnhance: 'a_skill_enhance',
  /** カード削除 */
  Delete: 'delete',
  /** メンタルスキル削除 */
  MSkillDelete: 'm_skill_delete',
  /** アクティブスキル削除 */
  ASkillDelete: 'a_skill_delete',
  /** カードチェンジ */
  Change: 'change',
  /** スキルカード獲得 */
  SkillAcquire: 'skill_acquire',
  /** メンタルスキル獲得 */
  MSkillAcquire: 'm_skill_acquire',
  /** アクティブスキル獲得 */
  ASkillAcquire: 'a_skill_acquire',
  /** 元気系カード獲得 */
  VitalityCardAcquire: 'vitality_card_acquire',
  /** 好調系カード獲得 */
  GoodConditionCardAcquire: 'good_condition_card_acquire',
  /** 集中系カード獲得 */
  ConcentrationCardAcquire: 'concentration_card_acquire',
  /** 好印象系カード獲得 */
  GoodImpressionCardAcquire: 'good_impression_card_acquire',
  /** やる気系カード獲得 */
  MotivationCardAcquire: 'motivation_card_acquire',
  /** 温存系カード獲得 */
  ReserveCardAcquire: 'reserve_card_acquire',
  /** 強気系カード獲得 */
  AggressiveCardAcquire: 'aggressive_card_acquire',
  /** 全力系カード獲得 */
  FullPowerCardAcquire: 'full_power_card_acquire',
  /** SSRカード獲得 */
  SsrCardAcquire: 'ssr_card_acquire',
  /** 眠気カード獲得 */
  DrowsyAcquire: 'drowsy_acquire',
  /** 授業・営業終了時 */
  ClassWorkEnd: 'class_work_end',
  /** 試験終了時 */
  ExamEnd: 'exam_end',
  /** 差し入れ・活動支給 */
  ActivitySupplyGift: 'activity_supply_gift',
  /** お出かけ */
  Outing: 'outing',
  /** 相談 */
  Consult: 'consult',
  /** Pドリンク獲得 */
  PDrinkAcquire: 'p_drink_acquire',
  /** Pドリンク交換 */
  PDrinkExchange: 'p_drink_exchange',
  /** 休む */
  Rest: 'rest',
  /** カスタマイズ */
  Customize: 'customize',
  /** Pアイテム獲得 */
  PItemAcquire: 'p_item_acquire',
  /** SPレッスン終了時カード20枚以上 */
  SpLesson20: 'sp_lesson_20',
  /** 特別指導 */
  SpecialTraining: 'special_training',
  /** トラブル削除 */
  TroubleDelete: 'trouble_delete',

  // 計算専用の特殊トリガーキー
  /** 初期ステータス上昇 */
  InitialStat: 'initial_stat',
  /** Vo初期ステータス上昇 */
  VoInitialStat: 'vo_initial_stat',
  /** Da初期ステータス上昇 */
  DaInitialStat: 'da_initial_stat',
  /** Vi初期ステータス上昇 */
  ViInitialStat: 'vi_initial_stat',
  /** パラメータボーナス */
  ParameterBonus: 'parameter_bonus',
  /** Voパラメータボーナス */
  VoParameterBonus: 'vo_parameter_bonus',
  /** Daパラメータボーナス */
  DaParameterBonus: 'da_parameter_bonus',
  /** Viパラメータボーナス */
  ViParameterBonus: 'vi_parameter_bonus',
  /** SPレッスン発生率 */
  SpLessonRate: 'sp_lesson_rate',
  /** VoSPレッスン発生率 */
  VoSpLessonRate: 'vo_sp_lesson_rate',
  /** DaSPレッスン発生率 */
  DaSpLessonRate: 'da_sp_lesson_rate',
  /** ViSPレッスン発生率 */
  ViSpLessonRate: 'vi_sp_lesson_rate',
  /** すべてのSPレッスン発生率 */
  SpLessonRateAll: 'sp_lesson_rate_all',
  /** SPレッスン終了 */
  SpLessonEnd: 'sp_lesson_end',
  /** VoSPレッスン終了 */
  VoSpLessonEnd: 'vo_sp_lesson_end',
  /** DaSPレッスン終了 */
  DaSpLessonEnd: 'da_sp_lesson_end',
  /** ViSPレッスン終了 */
  ViSpLessonEnd: 'vi_sp_lesson_end',
  /** SPレッスン体力 */
  SpLessonHp: 'sp_lesson_hp',
  /** VoSPレッスン体力 */
  VoSpLessonHp: 'vo_sp_lesson_hp',
  /** DaSPレッスン体力 */
  DaSpLessonHp: 'da_sp_lesson_hp',
  /** ViSPレッスン体力 */
  ViSpLessonHp: 'vi_sp_lesson_hp',
  /** すべてのSPレッスン体力 */
  SpLessonHpAll: 'sp_lesson_hp_all',
  /** SPレッスンPポイント */
  SpLessonPp: 'sp_lesson_pp',
  /** VoSPレッスンPポイント */
  VoSpLessonPp: 'vo_sp_lesson_pp',
  /** DaSPレッスンPポイント */
  DaSpLessonPp: 'da_sp_lesson_pp',
  /** ViSPレッスンPポイント */
  ViSpLessonPp: 'vi_sp_lesson_pp',
  /** レッスンボーナス */
  LessonBonus: 'lesson_bonus',
  /** Voレッスンボーナス */
  VoLessonBonus: 'vo_lesson_bonus',
  /** Daレッスンボーナス */
  DaLessonBonus: 'da_lesson_bonus',
  /** Viレッスンボーナス */
  ViLessonBonus: 'vi_lesson_bonus',
  /** 最大体力 */
  MaxHp: 'max_hp',
  /** 試験体力 */
  ExamHp: 'exam_hp',
  /** 初期Pポイント */
  InitialPp: 'initial_pp',
  /** イベントブースト倍率 */
  EventBoost: 'event_boost',
  /** サポート率 */
  SupportRate: 'support_rate',
  /** 効果なし（計算スキップ用） */
  Nothing: 'nothing',
} as const
export type TriggerKeyType = (typeof TriggerKeyType)[keyof typeof TriggerKeyType]

/**
 * Badge サイズ種別定数。
 * Badge コンポーネントのサイズバリアント。
 */
export const BadgeSizeType = {
  /** 小 */
  Sm: 'sm',
  /** 中 */
  Md: 'md',
  /** 中角丸 */
  MdRounded: 'md_rounded',
} as const
export type BadgeSizeType = (typeof BadgeSizeType)[keyof typeof BadgeSizeType]

/**
 * Badge フォントウェイト種別定数。
 * Badge コンポーネントの文字太さバリアント。
 */
export const BadgeWeightType = {
  /** 太字 */
  Bold: 'bold',
  /** 極太 */
  Black: 'black',
} as const
export type BadgeWeightType = (typeof BadgeWeightType)[keyof typeof BadgeWeightType]

/**
 * ボタンサイズ種別定数。
 * CloseButton / ToggleButton などのサイズバリアント。
 */
export const ButtonSizeType = {
  /** 小 */
  Sm: 'sm',
  /** 中 */
  Md: 'md',
  /** 大 */
  Lg: 'lg',
} as const
export type ButtonSizeType = (typeof ButtonSizeType)[keyof typeof ButtonSizeType]

/**
 * 折りたたみセクションバリアント定数。
 * CollapsibleSection コンポーネントの表示バリアント。
 */
export const CollapsibleVariantType = {
  /** モーダル用 */
  Modal: 'modal',
  /** パネル用 */
  Panel: 'panel',
} as const
export type CollapsibleVariantType = (typeof CollapsibleVariantType)[keyof typeof CollapsibleVariantType]

/**
 * モーダル配置定数。
 * ModalOverlay コンポーネントの配置バリアント。
 */
export const ModalAlignType = {
  /** 中央 */
  Center: 'center',
  /** 右端 */
  End: 'end',
} as const
export type ModalAlignType = (typeof ModalAlignType)[keyof typeof ModalAlignType]

/**
 * 凸数セレクターバリアント定数。
 * UncapSelector コンポーネントの表示バリアント。
 */
export const UncapSelectorVariantType = {
  /** サポート一覧用（コンパクト） */
  Compact: 'compact',
  /** サポート詳細用 */
  Detail: 'detail',
} as const
export type UncapSelectorVariantType = (typeof UncapSelectorVariantType)[keyof typeof UncapSelectorVariantType]

/**
 * フィルターボタンカテゴリ定数。
 * フィルターバーのトグルボタンの色カテゴリ。
 */
export const FilterButtonCategory = {
  /** 汎用アクティブ状態（トグルボタンの ON 表示） */
  Active: 'active',
  /** 非活性状態 */
  Inactive: 'inactive',
  /** アビリティ（初期パラ・パラボ）活性色 */
  AbilityParam: 'ability_param',
  /** アビリティ（効果系）活性色 */
  AbilityEffect: 'ability_effect',
  /** イベント（取得系）活性色 */
  EventAcquire: 'event_acquire',
  /** イベント（操作系）活性色 */
  EventModify: 'event_modify',
} as const
export type FilterButtonCategory = (typeof FilterButtonCategory)[keyof typeof FilterButtonCategory]

/**
 * イベント解放条件定数。
 * サポートイベントの解放タイミング。初期 / レベル20 / レベル40 の 3 段階。
 */
export const ReleaseConditionType = {
  /** 初期（サポート入手時に解放） */
  Initial: 'initial',
  /** レベル20到達で解放 */
  Lv20: 'lv20',
  /** レベル40到達で解放 */
  Lv40: 'lv40',
} as const
export type ReleaseConditionType = (typeof ReleaseConditionType)[keyof typeof ReleaseConditionType]

/**
 * 効果キーワード定数。
 * Pアイテム効果やスキルカード効果で使われるキーワード識別子。
 * 状態異常や能力バフの種類を表す。
 */
export const EffectKeywordType = {
  /** 元気 */
  Vitality: 'vitality',
  /** 好調 */
  GoodCondition: 'good_condition',
  /** 絶好調 */
  PerfectCondition: 'perfect_condition',
  /** 集中 */
  Concentration: 'concentration',
  /** 好印象 */
  GoodImpression: 'good_impression',
  /** やる気 */
  Motivation: 'motivation',
  /** 温存 */
  Reserve: 'reserve',
  /** 強気 */
  Aggressive: 'aggressive',
  /** 全力 */
  FullPower: 'full_power',
  /** 全力値 */
  FullPowerValue: 'full_power_value',
  /** 熱意 */
  Enthusiasm: 'enthusiasm',
} as const
export type EffectKeywordType = (typeof EffectKeywordType)[keyof typeof EffectKeywordType]

/**
 * エフェクトセクション定数。
 * カード効果テンプレートの各セクション（Pアイテム効果・スキルカード効果・
 * カスタムスロット効果・アビリティ名など）を区別する。
 * i18n プレフィックスと 1:1 で対応する。
 */
export const EffectSectionType = {
  /** アビリティ名 */
  AbilityName: 'ability_name',
  /** Pアイテム制限条件 */
  PitemRestriction: 'pitem_restriction',
  /** Pアイテムトリガー */
  PitemTrigger: 'pitem_trigger',
  /** Pアイテム条件 */
  PitemCondition: 'pitem_condition',
  /** Pアイテム本体効果 */
  PitemBody: 'pitem_body',
  /** Pアイテム回数制限 */
  PitemLimit: 'pitem_limit',
  /** スキルカード使用条件 */
  SkillUseCondition: 'skill_use_condition',
  /** スキルカード前修飾 */
  SkillPreModifier: 'skill_pre_modifier',
  /** スキルカード時制 */
  SkillTemporal: 'skill_temporal',
  /** スキルカードトリガー */
  SkillTrigger: 'skill_trigger',
  /** スキルカード条件 */
  SkillCondition: 'skill_condition',
  /** スキルカードアクション */
  SkillAction: 'skill_action',
  /** カスタムスロット名 */
  CustomSlotName: 'custom_slot_name',
  /** カスタムスロット効果 */
  CustomSlotEffect: 'custom_slot_effect',
} as const
export type EffectSectionType = (typeof EffectSectionType)[keyof typeof EffectSectionType]

/**
 * カードゾーン定数。
 * スキルカード効果で参照するカードの存在場所。
 */
export const CardZoneType = {
  /** 手札 */
  Hand: 'hand',
  /** 捨て札 */
  Discard: 'discard',
} as const
export type CardZoneType = (typeof CardZoneType)[keyof typeof CardZoneType]

/**
 * 効果テンプレートキー定数。
 * Pアイテム効果・スキルカード効果・カスタムスロットの
 * i18n テンプレートを識別するキー。
 */
export const EffectTemplateKeyType = {
  /** アイテム獲得+Pポイント */
  AcquireItemPp: 'acquire_item_pp',
  /** アクティブスキルカード使用時 */
  ActiveCardUse: 'active_card_use',

  /** 全カードパラメータ上昇量ブースト */
  AllCardParamBoost: 'all_card_param_boost',
  /** パラメータ追加 */
  ParameterAdd: 'parameter_add',
  /** パラメータ加算 */
  ParameterPlus: 'parameter_plus',
  /** パラメータ上昇 */
  ParameterUp: 'parameter_up',
  /** パラメータ上昇（指定パラメータ） */
  ParamUp: 'param_up',
  /** パラメータ上昇+体力回復 */
  ParamUpHp: 'param_up_hp',
  /** パラメータ上昇+Pポイント */
  ParamUpPp: 'param_up_pp',
  /** パラメータ上昇+Pポイント+体力回復 */
  ParamUpPpHp: 'param_up_pp_hp',
  /** パラメータ上昇+ランダムPドリンク獲得 */
  ParamUpRandomPdrink: 'param_up_random_pdrink',
  /** パラメータ上昇+ランダムPドリンク（SR以上）獲得 */
  ParamUpRandomPdrinkSr: 'param_up_random_pdrink_sr',
  /** パラメータ上昇+スキルカード選択チェンジ */
  ParamUpSelectChange: 'param_up_select_change',
  /** パラメータ上昇+スキルカード選択コピー */
  ParamUpSelectCopy: 'param_up_select_copy',
  /** パラメータ上昇量ブースト */
  ParamUpBoost: 'param_up_boost',
  /** パラメータ上昇量ブースト+キーワード */
  ParamUpBoostKeyword: 'param_up_boost_keyword',
  /** パラメータ上昇量ブースト+キーワード乗算 */
  ParamUpBoostKeywordMultiply: 'param_up_boost_keyword_multiply',
  /** パラメータ上昇（回数） */
  ParamUpCount: 'param_up_count',
  /** パラメータ上昇（キーワード乗算） */
  ParamUpKeywordMultiply: 'param_up_keyword_multiply',
  /** パラメータ上昇（複数） */
  ParamUpMulti: 'param_up_multi',

  /** スキルカード強化 */
  CardEnhance: 'card_enhance',
  /** スキルカード強化追加 */
  CardEnhanceAdd: 'card_enhance_add',
  /** スキルカード使用時 */
  CardUse: 'card_use',
  /** スキルカード引く */
  DrawCard: 'draw_card',
  /** スキルカード複数引く */
  DrawCards: 'draw_cards',
  /** スキルカード引く+固定キーワード */
  DrawFixedKeyword: 'draw_fixed_keyword',
  /** 手札全強化 */
  EnhanceAllHand: 'enhance_all_hand',
  /** スキルカード生成 */
  GenerateCard: 'generate_card',
  /** 強化済みスキルカード生成 */
  GenerateEnhancedCard: 'generate_enhanced_card',
  /** ランダム強化 */
  RandomEnhance: 'random_enhance',
  /** ランダム強化+体力回復 */
  RandomEnhanceHp: 'random_enhance_hp',
  /** ランダム強化+Pポイント */
  RandomEnhancePp: 'random_enhance_pp',
  /** 手札全入れ替え */
  ReplaceAllHand: 'replace_all_hand',
  /** スキルカード選択強化 */
  SelectEnhance: 'select_enhance',
  /** スキルカード選択強化+体力回復 */
  SelectEnhanceHp: 'select_enhance_hp',
  /** スキルカード複数選択強化 */
  SelectCardsEnhance: 'select_cards_enhance',
  /** スキルカード選択コピー+Pポイント */
  SelectCopyPp: 'select_copy_pp',
  /** スキルカード選択削除+アイテム獲得 */
  SelectDeleteAcquireItem: 'select_delete_acquire_item',
  /** スキルカード選択削除+Pポイント */
  SelectDeletePp: 'select_delete_pp',
  /** スキルカード選択ホールド */
  SelectHold: 'select_hold',
  /** スキルカード選択ホールド（山札/捨札） */
  SelectHoldDeckDiscard: 'select_hold_deck_discard',
  /** アイドル固有スキルカード移動+手札強化 */
  MoveIdolEnhanceHand: 'move_idol_enhance_hand',
  /** SSRスキルカード移動 */
  KeywordUpMoveSsr: 'keyword_up_move_ssr',

  /** コスト減少 */
  CostReduce: 'cost_reduce',
  /** コスト減少（固定値） */
  CostReduceFlat: 'cost_reduce_flat',
  /** コスト減少（ターン制） */
  CostReduceTurns: 'cost_reduce_turns',
  /** 体力消費 */
  HpCost: 'hp_cost',
  /** 消費体力減少（追加） */
  HpCostReduceAdd: 'hp_cost_reduce_add',
  /** 消費体力減少（加算） */
  HpCostReducePlus: 'hp_cost_reduce_plus',
  /** 消費体力値減少 */
  HpCostValueReduce: 'hp_cost_value_reduce',
  /** 好調コスト */
  GoodConditionCost: 'good_condition_cost',
  /** キーワードコスト値減少（{{keyword}}コスト値-） */
  KeywordCostReduce: 'keyword_cost_reduce',
  /** やる気消費 */
  MotivationCost: 'motivation_cost',
  /** 次のカードコスト0 */
  NextCardCostZero: 'next_card_cost_zero',

  /** 体力回復 */
  HpRecovery: 'hp_recovery',
  /** 体力回復+Pポイント */
  HpRecoveryPp: 'hp_recovery_pp',
  /** 最大体力%回復 */
  MaxHpPctRecovery: 'max_hp_pct_recovery',
  /** Pポイント+体力回復 */
  PpHpRecovery: 'pp_hp_recovery',

  /** Pポイント獲得 */
  PpGain: 'pp_gain',

  /** キーワード追加 */
  KeywordAdd: 'keyword_add',
  /** キーワードカード獲得 */
  KeywordCardAcquire: 'keyword_card_acquire',
  /** キーワードカード強化 */
  KeywordCardEnhance: 'keyword_card_enhance',
  /** キーワード数以上条件 */
  KeywordCountGte: 'keyword_count_gte',
  /** キーワード強化ブースト */
  KeywordEnhanceBoost: 'keyword_enhance_boost',
  /** キーワード一致条件 */
  KeywordEq: 'keyword_eq',
  /** キーワード以上条件 */
  KeywordGte: 'keyword_gte',
  /** キーワード増加量ブースト */
  KeywordIncreaseBoost: 'keyword_increase_boost',
  /** キーワード%パラメータ追加 */
  KeywordPctParamAdd: 'keyword_pct_param_add',
  /** キーワード%パラメータ加算 */
  KeywordPctParamPlus: 'keyword_pct_param_plus',
  /** キーワード%パラメータ上昇 */
  KeywordPctParamUp: 'keyword_pct_param_up',
  /** キーワード加算 */
  KeywordPlus: 'keyword_plus',
  /** キーワード状態 */
  KeywordState: 'keyword_state',
  /** キーワードステータス */
  KeywordStatus: 'keyword_status',
  /** キーワードターン以上条件 */
  KeywordTurnsGte: 'keyword_turns_gte',
  /** キーワードターン体力消費 */
  KeywordTurnsHpCost: 'keyword_turns_hp_cost',
  /** キーワードターンキーワード減少 */
  KeywordTurnsKeywordDecrease: 'keyword_turns_keyword_decrease',
  /** キーワードターンキーワード上昇 */
  KeywordTurnsKeywordUp: 'keyword_turns_keyword_up',
  /** キーワード上昇 */
  KeywordUp: 'keyword_up',
  /** キーワード3種上昇 */
  KeywordUp3: 'keyword_up_3',
  /** キーワード上昇+体力消費 */
  KeywordUpHpCost: 'keyword_up_hp_cost',
  /** キーワード上昇+消費体力減少 */
  KeywordUpHpCostReduce: 'keyword_up_hp_cost_reduce',
  /** キーワード上昇+体力回復 */
  KeywordUpHpRecovery: 'keyword_up_hp_recovery',
  /** キーワード上昇+備考 */
  KeywordUpNote: 'keyword_up_note',
  /** キーワード上昇+パラメータ */
  KeywordUpParameter: 'keyword_up_parameter',

  /** キーワード以上→キーワード%パラメータ上昇 */
  CondKeywordGteKeywordPctParamUp: 'cond_keyword_gte_keyword_pct_param_up',
  /** 状態変化条件 */
  ConditionChange: 'condition_change',
  /** キーワード以上条件 */
  ConditionKeywordGte: 'condition_keyword_gte',
  /** キーワードターン以上条件 */
  ConditionKeywordTurnsGte: 'condition_keyword_turns_gte',
  /** クリア率以下条件 */
  ClearRateLte: 'clear_rate_lte',
  /** 体力%以上条件 */
  HpGtePct: 'hp_gte_pct',
  /** 体力%以下条件 */
  HpLtePct: 'hp_lte_pct',
  /** 非キーワードステータス条件 */
  NotKeywordStatus: 'not_keyword_status',
  /** パラメータ以上条件 */
  ParamGte: 'param_gte',
  /** 方針転換以上条件 */
  PolicyChangeGte: 'policy_change_gte',
  /** ターン以上条件 */
  TurnGte: 'turn_gte',
  /** 前のアクティブカード条件 */
  PrevActiveCard: 'prev_active_card',

  /** 指針変更（全力・温存・強気の切り替え） */
  ChangePolicy: 'change_policy',
  /** 指針段階変更 */
  ChangePolicyStage: 'change_policy_stage',
  /** 低下状態無効 */
  DebuffNull: 'debuff_null',
  /** 固定キーワード上昇 */
  FixedKeywordUp: 'fixed_keyword_up',
  /** 固定キーワード上昇+低下状態無効 */
  FixedKeywordDebuffNull: 'fixed_keyword_debuff_null',
  /** 好調ターン */
  GoodConditionTurns: 'good_condition_turns',
  /** 絶好調 */
  PerfectCondition: 'perfect_condition',
  /** 絶好調ターン */
  PerfectConditionTurns: 'perfect_condition_turns',

  /** 熱意追加 */
  EnthusiasmAdd: 'enthusiasm_add',
  /** 熱意ブースト */
  EnthusiasmBoost: 'enthusiasm_boost',
  /** やる気増加後 */
  MotivationIncreaseAfter: 'motivation_increase_after',

  /** ターン遅延（Nターン後に効果が発動する）。表示例:「2ターン後、」 */
  Delay: 'delay',
  /** 差分値（カスタムスロットの効果量変更に使用）。表示例:「-1」（コスト-1等） */
  Delta: 'delta',
  /** N回カード使用ごと */
  EveryNCardUse: 'every_n_card_use',
  /** N回まで使用 */
  UpToNCardUse: 'up_to_n_card_use',
  /** 次のターン */
  NextTurn: 'next_turn',
  /** 永続 */
  Ongoing: 'ongoing',
  /** ターン終了時 */
  TurnEnd: 'turn_end',
  /** ターン開始時 */
  TurnStart: 'turn_start',
  /** ターン開始後 */
  TurnStartAfter: 'turn_start_after',

  /** 授業・営業終了時 */
  ClassWorkEnd: 'class_work_end',
  /** 試験終了時 */
  ExamEnd: 'exam_end',
  /** レッスンリミット */
  LessonLimit: 'lesson_limit',
  /** レッスン開始時 */
  LessonStart: 'lesson_start',
  /** レッスン開始時手札 */
  LessonStartInHand: 'lesson_start_in_hand',
  /** レッスンターン */
  LessonTurn: 'lesson_turn',
  /** お出かけ終了時 */
  OutingEnd: 'outing_end',
  /** レッスン終了時パラメータ */
  ParamLessonEnd: 'param_lesson_end',
  /** SPレッスン終了時パラメータ */
  ParamSpLessonEnd: 'param_sp_lesson_end',
  /** レッスンリミット解除 */
  RemoveLessonLimit: 'remove_lesson_limit',
  /** 特別指導開始 */
  SpecialTrainingStart: 'special_training_start',

  /** ランダムPドリンク複数獲得 */
  RandomPdrinkCount: 'random_pdrink_count',
  /** ランダムPドリンク（SR以上）獲得 */
  RandomPdrinkSr: 'random_pdrink_sr',

  /** スキルカード使用数追加 */
  ExtraCardUse: 'extra_card_use',
  /** 成長追加 */
  GrowthAdd: 'growth_add',
  /** 相談割引 */
  ConsultDiscount: 'consult_discount',
  /** 相談選択 */
  ConsultSelection: 'consult_selection',
  /** 活動支給・差し入れ選択 */
  ActivitySupplyGiftSelection: 'activity_supply_gift_selection',
  /** 眠気移動 */
  MoveDrowsiness: 'move_drowsiness',
  /** 効果なし */
  Null: 'null',
  /** レッスンごと */
  PerLesson: 'per_lesson',
  /** プロデュースごと */
  PerProduce: 'per_produce',
  /** トラブルカード削除+体力回復 */
  TroubleDeleteHp: 'trouble_delete_hp',
  /** トラブルカード削除+パラメータ上昇 */
  TroubleDeleteParamUp: 'trouble_delete_param_up',
  /** トラブルカード削除+Pポイント */
  TroubleDeletePp: 'trouble_delete_pp',
} as const
export type EffectTemplateKeyType = (typeof EffectTemplateKeyType)[keyof typeof EffectTemplateKeyType]

/**
 * ヘルプセクションキー定数。
 * ヘルプモーダル内の各セクションを識別するキー。
 * アコーディオンの開閉状態管理に使用する。
 */
export const HelpSectionKey = {
  /** フィルター */
  Filter: 'filter',
  /** サポート一覧 */
  CardList: 'cardList',
  /** スコア */
  Score: 'score',
  /** カウント対象 */
  CountTarget: 'countTarget',
  /** 凸数 */
  Uncap: 'uncap',
  /** データ */
  Data: 'data',
  /** 最適編成 */
  UnitSimulator: 'unitSimulator',
} as const
export type HelpSectionKey = (typeof HelpSectionKey)[keyof typeof HelpSectionKey]

/**
 * 点数設定パネルのセクションキー。
 * 各設定ブロック（プリセット・シナリオ・スケジュール等）を識別する。
 */
export const ScoreSettingsSectionKey = {
  /** プリセット */
  Preset: 'preset',
  /** シナリオ/難易度 */
  Scenario: 'scenario',
  /** スケジュール */
  Schedule: 'schedule',
  /** パラメータボーナス */
  ParamBonus: 'paramBonus',
  /** アクション回数 */
  Actions: 'actions',
  /** オプション */
  Options: 'options',
} as const
export type ScoreSettingsSectionKey = (typeof ScoreSettingsSectionKey)[keyof typeof ScoreSettingsSectionKey]

/**
 * スコア詳細モーダルのセクションキー。
 */
export const ScoreDetailSectionKey = {
  /** カウント調整 */
  CountCustom: 'countCustom',
} as const
export type ScoreDetailSectionKey = (typeof ScoreDetailSectionKey)[keyof typeof ScoreDetailSectionKey]

/**
 * 最適編成パネルのセクションキー。
 */
export const SimulatorSectionKey = {
  /** 編成設定 */
  Settings: 'settings',
  /** スロット編集 */
  Slots: 'slots',
  /** 結果 */
  Result: 'result',
} as const
export type SimulatorSectionKey = (typeof SimulatorSectionKey)[keyof typeof SimulatorSectionKey]

/**
 * フィルタ・ソートモーダルのタブ種別。
 */
export const FilterSortTab = {
  /** フィルタタブ */
  Filter: 'filter',
  /** ソートタブ */
  Sort: 'sort',
} as const
export type FilterSortTab = (typeof FilterSortTab)[keyof typeof FilterSortTab]

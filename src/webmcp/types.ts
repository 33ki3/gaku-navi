/**
 * AIからカード検索や設定操作を行うための公開データ形式
 *
 * WebMCPに対応していないブラウザでもアプリを動かせるよう、ブラウザのAPIに
 * 依存しない形で型を定義し、利用可能な環境でだけツールを登録する
 */
import type { AchievementCalculatorCommand } from '../application/command/achievementCalculatorCommand'
import type { CalculationCommand } from '../application/command/calculationCommand'
import type { FilterCommand } from '../application/command/filterCommand'
import type { ImportCommand } from '../application/command/importCommand'
import type { PreferencesCommand } from '../application/command/preferencesCommand'
import type { PresetCommand } from '../application/command/presetCommand'
import type { UserSupportCommand } from '../application/command/userSupportCommand'
import type { calculateAchievementSummary } from '../application/query/achievementCalculatorQuery'
import type { AchievementCalculatorProgress } from '../types/achievementCalculator'
import type { AppPreferences, PersistedFilterState } from '../types/app'
import type { DomainStateSnapshot } from '../types/application'
import type { CalculationSnapshot } from '../types/calculation'
import type { SupportCard } from '../types/card'
import type {
  AbilityKeywordType,
  AbilityNameKeyType,
  ActionIdType,
  ActivityIdType,
  CardExclusionFilterType,
  CardListInteractionModeType,
  CardType,
  CountCustomFilter,
  DifficultyType,
  EventFilterType,
  FilterSortTab,
  IdolAchievementMetric,
  PIdolCardAchievementId,
  ParameterType,
  PlanType,
  ProductionRunRewardAdjustmentId,
  RarityType,
  ScenarioType,
  SortModeType,
  SourceType,
  TriggerKeyType,
  UncapType,
} from '../types/enums'
import { ApplicationUiAction } from '../types/enums'
import type { WebMcpCurrentAppStateSectionType, WebMcpToolNameType } from './enums'
import { AchievementUpdateAction } from './enums'
export * from './enums'

/** 検索結果などのページ情報。offsetは次の呼び出しへそのまま渡せる */
export interface WebMcpPageInfo {
  /** 現在のページの開始位置 */
  offset: number
  /** 現在のページへ要求した最大件数 */
  limit: number
  /** 条件に一致した全件数 */
  total: number
  /** 後続ページが存在するか */
  hasMore: boolean
  /** 次のページの開始位置。末尾ならnull */
  nextOffset: number | null
}

/** ページング変換へ渡す開始位置と件数 */
export interface WebMcpPageOptions {
  /** ページの開始位置 */
  offset: number
  /** 1ページあたりの最大件数 */
  limit: number
}

/** アプリで使うカード情報を公開用に変換するための値の型 */
export type WebMcpJsonValue = string | number | boolean | null | WebMcpJsonValue[] | { [key: string]: WebMcpJsonValue }
/** WebMCPへ公開できるJSONオブジェクト */
export type WebMcpJsonObject = { [key: string]: WebMcpJsonValue }

/** 一覧や比較結果で返すサポートカードの概要 */
export interface WebMcpCardSummary {
  /** サポートカード名 */
  name: string
  /** サポートカードのレアリティ */
  rarity: RarityType
  /** 対応する育成プラン */
  plan: PlanType
  /** サポートカードのタイプ */
  type: CardType
  /** サポートカードが担当するパラメータ種別 */
  parameter_type: ParameterType
  /** カードの入手元種別 */
  source: SourceType
  /** 入手元の詳細。該当しない場合はnull */
  source_detail: string | null
  /** カードが追加された日 */
  release_date: string
}

/** 詳細取得で返すアビリティの公開項目 */
export interface WebMcpAbilityDetail {
  /** アビリティ名を表示するためのキー */
  name_key: AbilityNameKeyType
  /** 凸数や条件ごとのアビリティ値 */
  values: Readonly<Record<string, string>>
  /** アビリティの発動条件 */
  trigger_key: TriggerKeyType
  /** アビリティが対象とするパラメータ種別 */
  parameter_type?: ParameterType
  /** アビリティの発動回数上限 */
  max_count?: number
  /** 値が割合を表すか */
  is_percentage?: boolean
  /** イベント上昇効果か */
  is_event_boost?: boolean
  /** パラメータボーナス効果か */
  is_parameter_bonus?: boolean
  /** 初期パラメータ効果か */
  is_initial_stat?: boolean
  /** 通常の点数計算から除外するか */
  skip_calculation?: boolean
}

/** 詳細取得で返すイベントの公開項目 */
export interface WebMcpEventDetail {
  /** イベントの発生条件 */
  release: string
  /** イベント効果の種別 */
  effect_type: string
  /** 効果対象のパラメータ種別 */
  param_type?: ParameterType
  /** 効果で増減するパラメータ値 */
  param_value?: number
  /** イベント名 */
  title: string
}

/** アプリで使うカード情報から公開項目だけを抜き出したサポートカード詳細 */
export interface WebMcpCardDetail extends WebMcpCardSummary {
  /** イベント発生元カードか。能力・イベントsectionを指定した場合だけ返す */
  is_event_source?: boolean | null
  /** カードが持つアビリティ一覧。abilities sectionを指定した場合だけ返す */
  abilities?: readonly WebMcpAbilityDetail[]
  /** カードが持つイベント一覧。events sectionを指定した場合だけ返す */
  events?: readonly WebMcpEventDetail[]
  /** Pアイテムの詳細。p_item sectionを指定した場合だけ返す */
  p_item?: WebMcpJsonObject | null
  /** スキルカードの詳細。skill_card sectionを指定した場合だけ返す */
  skill_card?: WebMcpJsonObject | null
}

/** 1つのアビリティがスコアへ寄与した内訳 */
export interface WebMcpScoreBreakdownItem {
  /** アビリティ名を表示するためのキー */
  nameKey?: AbilityNameKeyType
  /** 効果対象のパラメータ種別 */
  parameterType?: ParameterType
  /** 効果の発動回数上限 */
  maxCount?: number
  /** 表示用に解決したアビリティ名 */
  displayName?: string
  /** 効果の発動条件 */
  trigger: TriggerKeyType
  /** 実際に効果が発動した回数 */
  count: number
  /** 1回の発動で増える値 */
  valuePerTrigger: number
  /** このアビリティによる合計上昇量 */
  total: number
}

/** アプリで使う計算結果から公開に必要な数値だけを抜き出したカード点数の内訳 */
export interface WebMcpScoreBreakdown {
  /** 計算対象カード名 */
  cardName: string
  /** カードのパラメータ種別 */
  parameterType: ParameterType
  /** イベントによる上昇量 */
  eventBoost: number
  /** アビリティごとの上昇内訳 */
  abilityBoosts: readonly WebMcpScoreBreakdownItem[]
  /** パラメータボーナスによる上昇量 */
  parameterBonus: number
  /** 適用されたパラメータボーナス率 */
  paramBonusPercent: number
  /** パラメータボーナスの基礎値 */
  paramBonusBase: number
  /** イベント上昇量の基礎値 */
  eventBoostBase: number
  /** 適用されたイベント上昇率 */
  eventBoostPercent: number
  /** カード単体の最終上昇量 */
  totalIncrease: number
  /** 発動回数として計算へ使ったアクション別回数 */
  autoCounts: Partial<Record<ActionIdType, number>>
}

/** カード点数の公開結果 */
export interface WebMcpScoreResult {
  /** 計算に使った凸数 */
  uncap: UncapType
  /** カードの点数 */
  score: number
  /** 計算対象として有効だったか */
  calculated: boolean
  /** 計算できた場合の内訳。対象外ならnull */
  breakdown: WebMcpScoreBreakdown | null
}

/** 点数設定のWebMCP公開形式 */
export interface WebMcpScoreSettings {
  /** 点数設定の名前 */
  name: string
  /** 計算対象のシナリオ */
  scenario: ScenarioType
  /** 計算対象の難易度 */
  difficulty: DifficultyType
  /** パラメータボーナスの基礎値 */
  parameterBonusBase: WebMcpParameterValues
  /** アクション種別ごとの実行回数 */
  actionCounts: Partial<Record<ActionIdType, number>>
  /** 週番号ごとのスケジュール選択 */
  scheduleSelections: Record<number, ActivityIdType>
  /** スケジュール上限を使うか */
  useScheduleLimits: boolean
  /** 自分で発動するアビリティを含めるか */
  includeSelfTrigger: boolean
  /** Pアイテム効果を含めるか */
  includePItem: boolean
  /** 固定凸数モードを使うか */
  useFixedUncap: boolean
  /** カスタムモードを使うか */
  useCustomMode: boolean
  /** カスタムモードのパラメータボーナス行 */
  customParamBonusRows: readonly WebMcpParameterValues[]
  /** カスタムモードの授業ボーナス */
  customClassBonus: WebMcpParameterValues
  /** カスタムモードのその他上昇量 */
  customNonBonusGain: WebMcpParameterValues
  /** HIF選抜試験のパラメータ配分比率 */
  hifExamRatios: readonly WebMcpParameterValues[]
  /** HIF公開レッスンをメイン属性だけで分割するか */
  hifLessonSplitSub: boolean
}

/** Vo/Da/Viの公開パラメータ値 */
export interface WebMcpParameterValues {
  /** ボーカル値 */
  vocal: number
  /** ダンス値 */
  dance: number
  /** ビジュアル値 */
  visual: number
}

/** 最適編成設定の公開形式 */
export interface WebMcpUnitSettings {
  /** 育成プラン */
  plan: PlanType
  /** 候補に含めるサポートタイプ */
  allowedTypes: readonly CardType[]
  /** タイプ別のSP発生枚数条件 */
  spConstraint: WebMcpParameterValues
  /** タイプ別の最低枚数条件 */
  typeCountMin: WebMcpParameterValues
  /** タイプ別の最大枚数条件 */
  typeCountMax: WebMcpParameterValues
  /** サポート外パラメータボーナス率 */
  paramBonusPercent: WebMcpParameterValues
  /** 選択中のレンタルカード名。固定一覧に含まれる場合だけ最適化でも固定する */
  rentalCardName: string | null
  /** 最適化結果へ固定するカード名。通常枠とレンタル枠を含む */
  lockedCards: readonly string[]
  /** 画面のスロット順で保持する選択カード名。nullはその位置の空き枠 */
  selectedCards: readonly (string | null)[]
  /** 最適化候補から除外するカード名 */
  excludedCardNames: readonly string[]
  /** 育成開始時の初期パラメータ */
  initialParams: WebMcpParameterValues
  /** パラメータ上限の上書き値。未指定時はnullまたはundefined */
  paramCapOverride?: number | null
  /** レンタル枠と通常枠のロックを統合するか */
  unifyRentalLock?: boolean
  /** コンテスト獲得スキルカードを候補から除外するか */
  excludeContestSkillCards?: boolean
  /** コンテスト獲得Pアイテムを候補から除外するか */
  excludeContestPItems?: boolean
  /** カード除外設定を最適化で無視するか */
  ignoreCardExclusions?: boolean
  /** 総当たりで評価する候補枚数の上限 */
  exhaustiveCandidateLimit?: number
}

/** 最適編成結果として公開する1枚分の概要 */
export interface WebMcpUnitMemberSummary {
  /** サポート名 */
  name: string
  /** 凸数 */
  uncap: UncapType
  /** レンタル枠か */
  isRental: boolean
  /** このサポートの点数 */
  score: number
  /** サポート間連携で増えた点数 */
  supportSynergy: number
  /** このサポートのパラメータボーナス% */
  paramBonusPercent: WebMcpParameterValues
}

/** 最適編成結果として公開する比較用の概要 */
export interface WebMcpUnitResultSummary {
  /** 6枚の合計点数 */
  totalScore: number
  /** サポートを含めたパラメータボーナス% */
  totalParamBonusPercent: WebMcpParameterValues
  /** パラメータボーナスの実数値 */
  parameterBonus: WebMcpParameterValues
  /** パラメータボーナスの基礎値 */
  parameterBonusBase: WebMcpParameterValues
  /** サポート外パラメータボーナス% */
  outsideParamBonusPercent: WebMcpParameterValues
  /** 選出された6枚の概要 */
  members: WebMcpUnitMemberSummary[]
}

/** カード別の回数調整を公開形式へ変換した値 */
export interface WebMcpCardCountCustom {
  /** 自動発動アビリティのカード別回数調整 */
  selfTrigger?: Partial<Record<ActionIdType, number>>
  /** Pアイテム発動のカード別回数調整 */
  pItemCount?: Partial<Record<ActionIdType, number>>
}

/** カード名をキーにページングした公開値 */
export interface WebMcpCardMapPage<T> {
  /** カード名をキーにしたページ内の値 */
  values: Readonly<Record<string, T>>
  /** ページング情報 */
  pagination: WebMcpPageInfo
}

/** 現在の計算条件を返す公開形式 */
export interface WebMcpCalculationState {
  /** 現在の点数設定 */
  scoreSettings: WebMcpScoreSettings
  /** 現在の最適編成設定 */
  unitSettings: WebMcpUnitSettings
  /** カードごとの凸数ページ */
  cardUncaps: WebMcpCardMapPage<UncapType>
  /** カードごとの回数調整ページ */
  cardCountCustom: WebMcpCardMapPage<WebMcpCardCountCustom>
}

/** カード一覧の公開フィルター状態 */
export interface WebMcpFilterState {
  /** カード名などの検索文字列 */
  searchTerm: string
  /** 絞り込むレアリティ */
  rarities: RarityType[]
  /** 絞り込むサポートタイプ */
  types: CardType[]
  /** 絞り込む育成プラン */
  plans: PlanType[]
  /** SP発生カードだけに絞るか */
  spOnly: boolean
  /** 絞り込むアビリティキーワード */
  abilityKeywords: AbilityKeywordType[]
  /** 絞り込むイベント種別 */
  eventFilters: EventFilterType[]
  /** 絞り込む入手元 */
  sources: SourceType[]
  /** 絞り込む凸数 */
  uncaps: UncapType[]
  /** 回数調整の有無による絞り込み */
  countCustom: CountCustomFilter[]
  /** 最適編成除外状態による絞り込み */
  cardExclusionFilters: CardExclusionFilterType[]
  /** カード一覧の並び順 */
  sortMode: SortModeType
  /** 並び順を逆にするか */
  sortReverse: boolean
}

/** 現在状態取得の詳細セクションとページ指定 */
export interface WebMcpCurrentAppStateOptions {
  /** 取得する状態セクション */
  sections: readonly WebMcpCurrentAppStateSectionType[]
  /** 組み込みカードのページ取得条件 */
  cardMap: WebMcpPageOptions
  /** ユーザー定義サポートのページ取得条件 */
  userSupports: WebMcpPageOptions
}

interface WebMcpAppPreferences {
  /** スマホ下部ナビを表示するか */
  showMobileBottomNav: boolean
  /** スクロール中もスマホ下部ナビを固定するか */
  keepMobileBottomNavFixed: boolean
}

interface WebMcpUserSupportsState {
  /** ユーザー定義サポートの総数 */
  count: number
  /** ユーザー定義サポート名の一覧 */
  names: readonly string[]
  /** 名前一覧のページング情報 */
  pagination: WebMcpPageInfo
}

/** 現在状態取得で常に返す概要 */
export interface WebMcpCurrentAppStateSummary {
  /** 組み込みカードの総数 */
  cardCount: number
  /** ユーザー定義サポートの総数 */
  userSupportCount: number
  /** 現在の計算状態を識別する状態番号 */
  calculationRevision?: string
  /** 現在の計算状態を識別する内容の印 */
  calculationDigest?: string
  calculation: {
    /** 現在のシナリオ */
    scenario: ScenarioType
    /** 現在の難易度 */
    difficulty: DifficultyType
    /** 現在の育成プラン */
    plan: PlanType
    /** 固定凸数を使っているか */
    useFixedUncap: boolean
    /** 個別凸数を上書きしているカード数 */
    cardUncapOverrideCount: number
    /** 回数調整を設定しているカード数 */
    cardCountCustomCount: number
  }
  filters: {
    /** 現在の検索文字列 */
    searchTerm: string
    /** 適用中の絞り込み数 */
    activeFilterCount: number
    /** 現在の並び順 */
    sortMode: SortModeType
    /** 並び順を逆にしているか */
    sortReverse: boolean
  }
  /** 現在のアプリ表示設定 */
  preferences: WebMcpAppPreferences
  ui: {
    /** 詳細表示中のカード名 */
    selectedCardName: string | null
    /** 点数設定パネルが開いているか */
    scoreSettingsOpen: boolean
    /** 最適編成パネルが開いているか */
    simulatorOpen: boolean
    /** 絞り込み・並び替えパネルが開いているか */
    filterSortOpen: boolean
    /** 点数内訳を表示中のカード名 */
    scoreBreakdownCardName: string | null
    /** ユーザー定義サポート入力フォームが開いているか */
    userSupportFormOpen: boolean
  }
}

/** 現在状態取得で要求された詳細セクション */
export interface WebMcpCurrentAppStateSections {
  /** 計算状態。要求された場合だけ含む */
  calculation?: WebMcpCalculationState
  /** フィルター状態。要求された場合だけ含む */
  filters?: WebMcpFilterState
  /** 表示設定。要求された場合だけ含む */
  preferences?: WebMcpAppPreferences
  /** 表示状態。要求された場合だけ含む */
  ui?: WebMcpUiState
  /** ユーザー定義サポート。要求された場合だけ含む */
  user_supports?: WebMcpUserSupportsState
}

/** 現在のアプリ状態を返す公開形式 */
export interface WebMcpCurrentAppState {
  /** 常に返す件数・計算概要 */
  summary: WebMcpCurrentAppStateSummary
  /** 要求された詳細セクション */
  sections: WebMcpCurrentAppStateSections
}

/** ツール実行時に受け取る中断情報。クライアントによっては省略される */
export interface WebMcpToolExecuteOptions {
  /** 呼び出し側が実行を中断したか確認する通知 */
  signal?: AbortSignal
}

/** ページツールの動作リスクを示すメタデータ */
export interface WebMcpToolAnnotations {
  /** 保存や削除を行わず、読み取りだけを行うツールか */
  readOnlyHint?: boolean
  /** カード・ユーザー入力など、ページ外部由来として扱うデータを含むか */
  untrustedContentHint?: boolean
  /** 保存・削除など、ユーザーのデータや画面へ影響する操作か */
  consequentialHint?: boolean
}

/** AIエージェントへ公開する1つのページツール */
export interface WebMcpToolDefinition {
  /** ModelContextへ登録する一意なツール名 */
  name: WebMcpToolNameType
  /** ツール一覧へ表示する人間向けタイトル */
  title: string
  /** 入力方法・副作用・返却内容を説明するツール概要 */
  description: string
  /** 外部入力の項目・型・制約を定義する検証規則 */
  inputSchema: Record<string, unknown>
  /** ツールの読み取り専用・外部データ・影響範囲を示す注釈 */
  annotations?: WebMcpToolAnnotations
  /** 入力を受け取り、読み取り結果または保存結果を返す実行関数 */
  execute: (input: Record<string, unknown>, options?: WebMcpToolExecuteOptions) => unknown | Promise<unknown>
}

/** WebMCPのModelContextで利用する登録オプション */
interface WebMcpRegisterToolOptions {
  /** ツールを公開する対象クライアントの指定。未指定なら標準の公開対象を使う */
  exposedTo?: string[]
  /** ページ破棄やコード更新で登録を解除するための中断通知 */
  signal?: AbortSignal
}

/** WebMCPのModelContextで今回利用するAPI */
interface WebMcpModelContext {
  /**
   * 1件のツールを現在のページへ登録するAPI
   *
   * @param tool - ページへ公開するツール定義
   * @param options - 公開対象と登録解除の中断通知
   * @returns 登録完了後の非同期結果
   */
  registerTool(tool: WebMcpToolDefinition, options?: WebMcpRegisterToolOptions): Promise<void>
}

/** AIが参照できる画面状態のうち、JSONで返せる部分 */
export interface WebMcpUiState {
  /** 詳細表示中のカード名。未表示ならnull */
  selectedCardName: string | null
  /** 点数設定パネルが開いているか */
  scoreSettingsOpen: boolean
  /** 点数設定パネルが固定表示されているか */
  settingsPinned: boolean
  /** 最適編成パネルが開いているか */
  simulatorOpen: boolean
  /** 最適編成パネルが固定表示されているか */
  simulatorPinned: boolean
  /** 絞り込み・並び替えパネルが開いているか */
  filterSortOpen: boolean
  /** 絞り込みパネルで選択中のタブ */
  filterSortTab: FilterSortTab
  /** カード一覧の現在の操作モード */
  cardListMode: CardListInteractionModeType
  /** 凸数編集モードが有効か */
  uncapEditMode: boolean
  /** 点数内訳を表示中のカード名。未表示ならnull */
  scoreBreakdownCardName: string | null
  /** ユーザー定義サポート入力フォームが開いているか */
  userSupportFormOpen: boolean
  /** 編集中のユーザー定義サポート名。新規入力または未表示ならnull */
  editingUserSupportName: string | null
  /** データ管理モーダルが開いているか */
  dataManagementOpen: boolean
  /** オプションモーダルが開いているか */
  optionsOpen: boolean
}

/** 人間が画面で行える、表示・モーダル操作のAI向け命令 */
export type WebMcpUiCommand =
  /** 点数設定パネルを開く */
  | { action: typeof ApplicationUiAction.OpenScoreSettings }
  /** 点数設定パネルを閉じ、固定も解除する */
  | { action: typeof ApplicationUiAction.CloseScoreSettings }
  /** 点数設定パネルの固定表示を変更する */
  | { action: typeof ApplicationUiAction.SetScoreSettingsPinned; pinned: boolean }
  /** 最適編成パネルを開く */
  | { action: typeof ApplicationUiAction.OpenUnitSimulator }
  /** 最適編成パネルを閉じ、固定も解除する */
  | { action: typeof ApplicationUiAction.CloseUnitSimulator }
  /** 最適編成パネルの固定表示を変更する */
  | { action: typeof ApplicationUiAction.SetSimulatorPinned; pinned: boolean }
  /** 絞り込み・並び替えパネルを開く */
  | { action: typeof ApplicationUiAction.OpenFilterSort }
  /** 絞り込み・並び替えパネルを閉じる */
  | { action: typeof ApplicationUiAction.CloseFilterSort }
  /** 絞り込みパネルで表示するタブを変更する */
  | { action: typeof ApplicationUiAction.SetFilterSortTab; tab: FilterSortTab }
  /** カード一覧の操作モードを変更する */
  | { action: typeof ApplicationUiAction.SetCardListMode; mode: CardListInteractionModeType }
  /** 凸数編集モードの有効・無効を変更する */
  | { action: typeof ApplicationUiAction.SetUncapEditMode; enabled: boolean }
  /** 指定カードの詳細モーダルを開く */
  | { action: typeof ApplicationUiAction.ShowCard; cardName: string }
  /** カード詳細モーダルを閉じる */
  | { action: typeof ApplicationUiAction.HideCard }
  /** 指定カードの点数内訳モーダルを開く */
  | { action: typeof ApplicationUiAction.ShowCardScore; cardName: string }
  /** 点数内訳モーダルを閉じる */
  | { action: typeof ApplicationUiAction.HideCardScore }
  /** ユーザー定義サポートの新規入力フォームを開く */
  | { action: typeof ApplicationUiAction.OpenUserSupportForm }
  /** 指定したユーザー定義サポートの編集フォームを開く */
  | { action: typeof ApplicationUiAction.EditUserSupportForm; cardName: string }
  /** ユーザー定義サポート入力フォームを閉じる */
  | { action: typeof ApplicationUiAction.CloseUserSupportForm }
  /** データ管理モーダルを開く */
  | { action: typeof ApplicationUiAction.OpenDataManagement }
  /** データ管理モーダルを閉じる */
  | { action: typeof ApplicationUiAction.CloseDataManagement }
  /** オプションモーダルを開く */
  | { action: typeof ApplicationUiAction.OpenOptions }
  /** オプションモーダルを閉じる */
  | { action: typeof ApplicationUiAction.CloseOptions }

/** ツール実行時に現在のアプリ状態を取得する窓口 */
export interface WebMcpRuntime {
  /** 現在の達成記録と、その記録を識別するrevision・digestを取得する */
  getAchievementSnapshot: () => DomainStateSnapshot<AchievementCalculatorProgress>
  /** 指定アイドルのEXP・PLvを、読み取った達成記録と同じ版で集計する */
  getAchievementSummary: (idolId: string) => DomainStateSnapshot<ReturnType<typeof calculateAchievementSummary>>
  /** 対象指定を省略した読み取りで使う、画面の選択アイドルを取得する */
  getSelectedAchievementIdolId: () => string
  /** 組み込みサポートとユーザー定義サポートを合わせた現在の一覧を取得する */
  getCards: () => readonly SupportCard[]
  /** カード名からカード本体を探せる現在の一覧を取得する */
  getCardByName: () => ReadonlyMap<string, SupportCard>
  /** 点数・編成・凸数・回数調整をコピーした計算条件を取得する */
  getCalculationSnapshot: () => CalculationSnapshot
  /** 一覧の絞り込み・並び替え状態を取得する */
  getFilterState: () => PersistedFilterState
  /** アプリ表示設定を取得する */
  getPreferences: () => AppPreferences
  /** ユーザー定義サポートを取得する */
  getUserSupports: () => readonly SupportCard[]
  /** 保存領域を直接更新した後、同じ画面の各設定へ再読込を通知する */
  refreshFromStorage: () => Promise<void>
  /** 現在のモーダル・パネル表示状態を取得する */
  getUiState: () => WebMcpUiState
  /** 既存の画面遷移規則に従って表示状態を変更する */
  controlUi: (command: WebMcpUiCommand) => void
  /** 画面操作とWebMCPで共有する保存処理 */
  applicationCommands?: {
    /** 画面と同じ検証・直列化・保存経路で達成記録を更新する */
    achievement: AchievementCalculatorCommand
    calculation: CalculationCommand
    filters: FilterCommand
    preferences: PreferencesCommand
    presets: PresetCommand
    importData: ImportCommand
    userSupports: UserSupportCommand
  }
}

declare global {
  interface Document {
    /** WebMCP対応ブラウザが提供するページツール登録窓口 */
    readonly modelContext?: WebMcpModelContext
  }
}

/** 公開入力を検証してからcommandへ渡す、操作別の更新値 */
export type WebMcpAchievementCommand = { expectedRevision?: string } & (
  | { action: typeof AchievementUpdateAction.Production; trackerId: string; value: number }
  | { action: typeof AchievementUpdateAction.Idol; idolId: string; metric: IdolAchievementMetric; value: number }
  | {
      action: typeof AchievementUpdateAction.PIdol
      cardId: string
      achievementId: PIdolCardAchievementId
      completed: boolean
    }
  | { action: typeof AchievementUpdateAction.PIdolAll; cardId: string; completed: boolean }
  | {
      action: typeof AchievementUpdateAction.RoadStar
      idolId: string
      stageIndex: number
      starIndex: number
      completed: boolean
    }
  | { action: typeof AchievementUpdateAction.RoadAll; idolId: string; completed: boolean }
  | { action: typeof AchievementUpdateAction.OtherTask; trackerId: string; value: number }
  | {
      action: typeof AchievementUpdateAction.ProductionReward
      adjustmentId: ProductionRunRewardAdjustmentId
      value: number
    }
  | { action: typeof AchievementUpdateAction.TargetLevel; value: number }
  | { action: typeof AchievementUpdateAction.OtherExp; value: number }
)

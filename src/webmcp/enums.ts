/** WebMCPの公開契約で使うenum相当の値と型 */
import { ApplicationOperationStatus, DomainIssueCode } from '../types/application'

/** WebMCPの入力JSON Schemaで使用するproperty名 */
export const WebMcpSchemaField = {
  /** アビリティキーワードによる絞り込み */
  AbilityKeywords: 'abilityKeywords',
  /** アクションIDごとの点数計算回数 */
  ActionCounts: 'actionCounts',
  /** 最適編成へ含めるカードタイプ */
  AllowedTypes: 'allowedTypes',
  /** 画面操作 */
  Action: 'action',
  /** サポートカード */
  Card: 'card',
  /** カードごとの回数調整 */
  CardCountCustom: 'cardCountCustom',
  /** カード一覧のページ指定 */
  CardMap: 'cardMap',
  /** サポートカード名 */
  CardName: 'cardName',
  /** 最適編成候補からの除外条件 */
  CardExclusionFilters: 'cardExclusionFilters',
  /** 全カードへ一律に適用する凸数 */
  CardUncapAll: 'cardUncapAll',
  /** カードごとに適用する凸数 */
  CardUncaps: 'cardUncaps',
  /** 確認操作 */
  Confirmation: 'confirmation',
  /** 回数調整を削除するカード名 */
  ClearCardCountCustom: 'clearCardCountCustom',
  /** 絞り込みを既定値へ戻すか */
  ClearFilters: 'clearFilters',
  /** 回数調整の有無による絞り込み */
  CountCustom: 'countCustom',
  /** カスタムクラスボーナス */
  CustomClassBonus: 'customClassBonus',
  /** カスタム非ボーナス獲得値 */
  CustomNonBonusGain: 'customNonBonusGain',
  /** カスタムパラメータボーナス行 */
  CustomParamBonusRows: 'customParamBonusRows',
  /** 難易度 */
  Difficulty: 'difficulty',
  /** 画面操作の有効状態 */
  Enabled: 'enabled',
  /** コンテストで獲得するPアイテムを除外するか */
  ExcludeContestPItems: 'excludeContestPItems',
  /** コンテストで獲得するスキルカードを除外するか */
  ExcludeContestSkillCards: 'excludeContestSkillCards',
  /** 最適編成から除外するカード名 */
  ExcludedCardNames: 'excludedCardNames',
  /** 探索候補数の上限 */
  ExhaustiveCandidateLimit: 'exhaustiveCandidateLimit',
  /** イベント効果による絞り込み */
  EventFilters: 'eventFilters',
  /** HIF試験のパラメータ配分 */
  HifExamRatios: 'hifExamRatios',
  /** HIFレッスンでサブパラメータを分割するか */
  HifLessonSplitSub: 'hifLessonSplitSub',
  /** カード除外設定を無視するか */
  IgnoreCardExclusions: 'ignoreCardExclusions',
  /** Pアイテムの効果を点数へ含めるか */
  IncludePItem: 'includePItem',
  /** カード自身の発動を点数へ含めるか */
  IncludeSelfTrigger: 'includeSelfTrigger',
  /** 最適編成の初期パラメータ */
  InitialParams: 'initialParams',
  /** インポートJSON */
  Json: 'json',
  /** モバイル下部ナビを固定表示するか */
  KeepMobileBottomNavFixed: 'keepMobileBottomNavFixed',
  /** 条件セットの説明ラベル */
  Label: 'label',
  /** 件数 */
  Limit: 'limit',
  /** 編成へ固定するカード名 */
  LockedCards: 'lockedCards',
  /** 選択中の編成カード名 */
  SelectedCards: 'selectedCards',
  /** カード一覧の操作モード */
  Mode: 'mode',
  /** 名前 */
  Name: 'name',
  /** 先頭から読み飛ばす件数 */
  Offset: 'offset',
  /** 編集前のカード名 */
  OldName: 'oldName',
  /** 既存プリセットを上書きするか */
  Overwrite: 'overwrite',
  /** シナリオ開始時のパラメータボーナス */
  ParameterBonusBase: 'parameterBonusBase',
  /** 最適編成のパラメータボーナス率 */
  ParamBonusPercent: 'paramBonusPercent',
  /** パラメータ上限の上書き値 */
  ParamCapOverride: 'paramCapOverride',
  /** 比較条件の差分 */
  Patch: 'patch',
  /** パネルを固定表示するか */
  Pinned: 'pinned',
  /** 編成方針 */
  Plan: 'plan',
  /** プランによる絞り込み */
  Plans: 'plans',
  /** 固定凸数を使うか */
  UseFixedUncap: 'useFixedUncap',
  /** カスタム計算モードを使うか */
  UseCustomMode: 'useCustomMode',
  /** 活動上限を計算へ反映するか */
  UseScheduleLimits: 'useScheduleLimits',
  /** カードごとのPアイテム発動回数 */
  PItemCount: 'pItemCount',
  /** 点数設定 */
  ScoreSettings: 'scoreSettings',
  /** 検索文字列 */
  Query: 'query',
  /** カード一覧の検索文字列 */
  SearchTerm: 'searchTerm',
  /** レアリティによる絞り込み */
  Rarities: 'rarities',
  /** 手動指定するレンタルカード名 */
  RentalCardName: 'rentalCardName',
  /** 確認トークン */
  PreviewToken: 'previewToken',
  /** シナリオ */
  Scenario: 'scenario',
  /** 活動ごとの選択値 */
  ScheduleSelections: 'scheduleSelections',
  /** 取得する状態セクション一覧 */
  Sections: 'sections',
  /** ユーザーデータの対象キー */
  SelectedKeys: 'selectedKeys',
  /** カード自身が提供するアクション回数調整 */
  SelfTrigger: 'selfTrigger',
  /** モバイル下部ナビを表示するか */
  ShowMobileBottomNav: 'showMobileBottomNav',
  /** 並び替えモード */
  SortMode: 'sortMode',
  /** 並び替え順を反転するか */
  SortReverse: 'sortReverse',
  /** 入手種別による絞り込み */
  Sources: 'sources',
  /** 最適編成のSP条件 */
  SpConstraint: 'spConstraint',
  /** SPカードだけを表示するか */
  SpOnly: 'spOnly',
  /** capability取得で要求する分類 */
  Section: 'section',
  /** 画面操作で選択するタブ */
  Tab: 'tab',
  /** 凸数による絞り込み */
  Uncaps: 'uncaps',
  /** 最適編成のタイプ別最大枚数 */
  TypeCountMax: 'typeCountMax',
  /** 最適編成のタイプ別最小枚数 */
  TypeCountMin: 'typeCountMin',
  /** カードタイプによる絞り込み */
  Types: 'types',
  /** レンタル・固定カードの制約を統一するか */
  UnifyRentalLock: 'unifyRentalLock',
  /** 最適編成設定 */
  UnitSettings: 'unitSettings',
  /** ユーザー定義サポート一覧のページ指定 */
  UserSupports: 'userSupports',
  /** 比較条件一覧 */
  Variants: 'variants',
  /** 更新時に照合する達成記録のrevision */
  ExpectedRevision: 'expected_revision',
  /** 対象アイドルの識別子 */
  IdolId: 'idol_id',
  /** 達成回数を更新する項目 */
  TrackerId: 'tracker_id',
  /** Pアイドルカードの識別子 */
  CardId: 'card_id',
  /** カード内の達成条件 */
  AchievementId: 'achievement_id',
  /** 単発条件または星の達成状態 */
  Completed: 'completed',
  /** アイドル固有の達成項目 */
  Metric: 'metric',
  /** 0始まりのステージ番号 */
  StageIndex: 'stage_index',
  /** 0始まりの星の位置 */
  StarIndex: 'star_index',
  /** 試験結果による補正区分 */
  AdjustmentId: 'adjustment_id',
  /** 達成数・目標PLv・補正EXPの入力値 */
  Value: 'value',
} as const

/** JSON Schemaの構造を表すキーワード */
export const WebMcpSchemaKeyword = {
  /** 説明文をツール単位の説明へ集約する */
  Description: 'description',
  /** 実行時に補完する値 */
  Default: 'default',
  /** 追加propertyの受け入れを制限する設定 */
  AdditionalProperties: 'additionalProperties',
} as const

/** WebMCPで公開するツール名 */
export const WebMcpToolName = {
  /** アチーブ計算機の入力項目と報酬条件 */
  GetAchievementCatalog: 'get_achievement_catalog',
  /** アチーブ計算機の記録・EXP・PLv集計 */
  GetAchievementState: 'get_achievement_state',
  /** アチーブ計算機の達成記録更新 */
  UpdateAchievementProgress: 'update_achievement_progress',
  /** サポートカード検索 */
  SearchSupportCards: 'search_support_cards',
  /** サポートカード詳細 */
  GetSupportCard: 'get_support_card',
  /** サポートカード点数 */
  GetSupportCardScore: 'get_support_card_score',
  /** 計算条件の選択肢 */
  GetCalculationCapabilities: 'get_calculation_capabilities',
  /** 現在のアプリ状態 */
  GetCurrentAppState: 'get_current_app_state',
  /** フィルター更新 */
  UpdateCardFilters: 'update_card_filters',
  /** アプリ表示設定更新 */
  UpdateAppPreferences: 'update_app_preferences',
  /** 計算設定更新 */
  UpdateCalculationSettings: 'update_calculation_settings',
  /** 点数設定プリセット一覧 */
  GetScorePresets: 'get_score_presets',
  /** 点数設定プリセット保存 */
  UpsertScorePreset: 'upsert_score_preset',
  /** 点数設定プリセット読込 */
  LoadScorePreset: 'load_score_preset',
  /** 点数設定プリセット削除プレビュー */
  PreviewDeleteScorePreset: 'preview_delete_score_preset',
  /** 点数設定プリセット削除 */
  DeleteScorePreset: 'delete_score_preset',
  /** サポートカード点数比較 */
  CompareSupportCardScores: 'compare_support_card_scores',
  /** 最適編成比較 */
  CompareUnitOptimizations: 'compare_unit_optimizations',
  /** ユーザー定義サポート一覧 */
  GetUserSupportCards: 'get_user_support_cards',
  /** ユーザー定義サポート保存 */
  UpsertUserSupportCard: 'upsert_user_support_card',
  /** ユーザー定義サポート削除プレビュー */
  PreviewDeleteUserSupportCard: 'preview_delete_user_support_card',
  /** ユーザー定義サポート削除 */
  DeleteUserSupportCard: 'delete_user_support_card',
  /** ユーザーデータ出力 */
  GetUserDataExport: 'get_user_data_export',
  /** ユーザーデータ出力のダウンロード */
  DownloadUserDataExport: 'download_user_data_export',
  /** ユーザーデータインポートプレビュー */
  PreviewUserDataImport: 'preview_user_data_import',
  /** ユーザーデータインポート適用 */
  ApplyUserDataImport: 'apply_user_data_import',
  /** 画面操作 */
  ControlAppUi: 'control_app_ui',
  /** 直前の変更を取り消す */
  UndoLastChange: 'undo_last_change',
} as const

/** WebMCPで公開するツール名の型 */
export type WebMcpToolNameType = (typeof WebMcpToolName)[keyof typeof WebMcpToolName]

/** WebMCPが返すエラーの識別子。アプリ共通のエラーは同じ名前で返す */
export const WebMcpErrorCode = {
  ...DomainIssueCode,
  /** 状態番号の競合をWebMCPへ短い名前で返す */
  Stale: ApplicationOperationStatus.Stale,
  /** 確認後に対象が変更された */
  StateChanged: 'state_changed',
  /** 最適編成の条件を満たす候補がない */
  NoFeasibleUnit: 'no_feasible_unit',
} as const

/** WebMCPが返せるエラーコードの型 */
export type WebMcpErrorCodeType = (typeof WebMcpErrorCode)[keyof typeof WebMcpErrorCode]

/** WebMCPで確認待ちにできる破壊的操作の種類 */
export const WebMcpPendingOperation = {
  /** ユーザー定義サポートの削除 */
  DeleteUserSupportCard: 'delete_user_support_card',
  /** 点数設定プリセットの削除 */
  DeleteScorePreset: 'delete_score_preset',
  /** ユーザーデータのインポート */
  ImportUserData: 'import_user_data',
} as const

/** WebMCPで確認待ちにできる破壊的操作の種類の型 */
export type WebMcpPendingOperationType = (typeof WebMcpPendingOperation)[keyof typeof WebMcpPendingOperation]

/** WebMCPの保存更新結果に含める操作種別 */
export const WebMcpMutationOperation = {
  /** 新しいデータを作成した */
  Created: 'created',
  /** 既存データを更新した */
  Updated: 'updated',
  /** 既存データを上書きした */
  Overwritten: 'overwritten',
} as const

/** WebMCPの保存更新結果に含める操作種別の型 */
export type WebMcpMutationOperationType = (typeof WebMcpMutationOperation)[keyof typeof WebMcpMutationOperation]

/** WebMCPのcapability取得で指定できる条件の分類 */
export const WebMcpCapabilitySection = {
  /** 点数設定の選択肢 */
  Score: 'score',
  /** 最適編成設定の選択肢 */
  Unit: 'unit',
  /** カード別回数調整の選択肢 */
  CardCountCustom: 'card_count_custom',
  /** スケジュール設定の選択肢 */
  Schedule: 'schedule',
} as const

/** カード詳細で追加取得できるsection */
export const WebMcpCardDetailSection = {
  /** アビリティ一覧 */
  Abilities: 'abilities',
  /** イベント一覧 */
  Events: 'events',
  /** Pアイテム */
  PItem: 'p_item',
  /** スキルカード */
  SkillCard: 'skill_card',
} as const

/** カード詳細で追加取得できるsectionの型 */
export type WebMcpCardDetailSectionType = (typeof WebMcpCardDetailSection)[keyof typeof WebMcpCardDetailSection]

/** 現在状態取得で指定できる公開セクション */
export const WebMcpCurrentAppStateSection = {
  /** 計算条件・凸数・回数調整 */
  Calculation: 'calculation',
  /** カード一覧の絞り込み・並び替え */
  Filters: 'filters',
  /** アプリの表示設定 */
  Preferences: 'preferences',
  /** モーダル・パネルなどの表示状態 */
  Ui: 'ui',
  /** ユーザー定義サポート */
  UserSupports: 'user_supports',
} as const

/** 現在状態取得で指定できるセクション名の型 */
export type WebMcpCurrentAppStateSectionType =
  (typeof WebMcpCurrentAppStateSection)[keyof typeof WebMcpCurrentAppStateSection]

/** アチーブ計算機で公開する個別更新の対象 */
export const AchievementUpdateAction = {
  /** プロデュースアチーブの現在値 */
  Production: 'production',
  /** アイドル固有アチーブの現在値 */
  Idol: 'idol',
  /** Pアイドルの条件1つ */
  PIdol: 'p_idol',
  /** Pアイドル1枚の全条件 */
  PIdolAll: 'p_idol_all',
  /** ステージ内の星1つ */
  RoadStar: 'road_star',
  /** アイドル1人の全ステージ */
  RoadAll: 'road_all',
  /** 課題・パネルの現在値 */
  OtherTask: 'other_task',
  /** プロデュース試験結果の回数 */
  ProductionReward: 'production_reward',
  /** 目標PLv */
  TargetLevel: 'target_level',
  /** 符号付きの補正EXP */
  OtherExp: 'other_exp',
} as const

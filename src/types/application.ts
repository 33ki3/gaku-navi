/**
 * 画面と外部操作で共有する更新結果・状態番号・エラーの型
 *
 * ここでは表示文言を持たず、エラーの種類・入力位置・補足値だけを返す
 * 画面とWebMCPが、それぞれの利用者に合わせて表示へ変換する
 */

/** 共通の更新処理が返すエラーの種類 */
export const DomainIssueCode = {
  /** 入力値が期待する形式や値ではない */
  InvalidInput: 'invalid_input',
  /** 条件比較などへ渡された比較条件が不正 */
  InvalidVariant: 'invalid_variant',
  /** 指定されたデータが存在しない */
  NotFound: 'not_found',
  /** 現在の状態と操作対象が競合している */
  Conflict: 'conflict',
  /** 保存領域の読み書きに失敗した */
  StorageError: 'storage_error',
  /** 操作対象の状態番号が現在の値と一致しない */
  StaleRevision: 'stale_revision',
  /** 保存後の画面反映を待つ処理が時間切れになった */
  StateSyncTimeout: 'state_sync_timeout',
  /** 保存失敗後のロールバックに失敗した */
  RollbackFailed: 'rollback_failed',
  /** 処理結果を確定できない */
  UnknownOutcome: 'unknown_outcome',
  /** AbortSignalなどで処理が中断された */
  Aborted: 'aborted',
  /** 確認情報の形式や値が不正 */
  InvalidConfirmation: 'invalid_confirmation',
  /** 破壊的操作に確認が必要 */
  ConfirmationRequired: 'confirmation_required',
  /** 計算開始時点の条件を固定できなかった */
  SnapshotFailed: 'snapshot_failed',
  /** データのシリアライズや復元に失敗した */
  SerializationError: 'serialization_error',
  /** 現在の環境や操作が未対応 */
  Unsupported: 'unsupported',
} as const
/** 共通の更新処理が扱うエラーコードの型 */
export type DomainIssueCodeType = (typeof DomainIssueCode)[keyof typeof DomainIssueCode]

/** DomainIssue.pathの入力項目 */
export const DomainIssuePath = {
  /** 計算条件 */
  Calculation: 'calculation',
  /** アチーブ計算機の達成記録とEXP補正 */
  Achievement: 'achievement',
  /** 絞り込み条件 */
  Filter: 'filter',
  /** アプリ設定 */
  Preferences: 'preferences',
  /** 点数設定プリセット */
  Preset: 'preset',
  /** サポートカード */
  Card: 'card',
  /** 現在の名前 */
  Name: 'name',
  /** 変更前の名前 */
  OldName: 'oldName',
  /** インポート項目一覧 */
  Entries: 'entries',
  /** インポートentryのkey */
  EntriesKey: 'entriesKey',
  /** インポートentryのvalue */
  EntriesValue: 'entriesValue',
  /** 復元する状態 */
  State: 'state',
} as const
/** DomainIssue.pathが指す入力項目の型 */
type DomainIssuePathFieldType = (typeof DomainIssuePath)[keyof typeof DomainIssuePath]
/** 行indexと組み合わせて使うインポートentry内の項目 */
type DomainIssueIndexedPathFieldType = typeof DomainIssuePath.EntriesKey | typeof DomainIssuePath.EntriesValue

/** エラー位置。インポートentry内の項目を指す場合のみ行indexを持つ */
export type DomainIssuePathLocation =
  | { field: Exclude<DomainIssuePathFieldType, DomainIssueIndexedPathFieldType>; index?: never }
  | { field: DomainIssueIndexedPathFieldType; index: number }

/** 非同期の計算・保存処理が取りうる終了状態 */
export const ApplicationOperationStatus = {
  /** 処理が完了した */
  Complete: 'complete',
  /** 処理が中断された */
  Aborted: 'aborted',
  /** 処理が通常のキャンセル条件で終了した */
  Cancelled: 'cancelled',
  /** 開始時点の状態と現在状態が一致しない */
  Stale: 'stale',
} as const

/** 非同期の計算・保存処理の終了状態の型 */
export type ApplicationOperationStatusType =
  (typeof ApplicationOperationStatus)[keyof typeof ApplicationOperationStatus]

/** 変更確認用の状態番号を別々に管理する設定の種類 */
export const ApplicationDomain = {
  /** 点数・編成・凸数・回数調整 */
  Calculation: 'calculation',
  /** アチーブ計算機の達成記録とEXP補正 */
  Achievement: 'achievement',
  /** 検索・絞り込み・並び順 */
  Filters: 'filters',
  /** アプリの表示設定 */
  Preferences: 'preferences',
  /** 点数設定プリセット */
  Presets: 'presets',
  /** インポート表示状態 */
  Import: 'import',
  /** ユーザー定義サポート */
  UserSupports: 'user_supports',
} as const

/** 変更確認用の状態番号を管理する設定名の型 */
export type ApplicationDomainType = (typeof ApplicationDomain)[keyof typeof ApplicationDomain]

/** 保存後の画面反映で失敗した段階を示す値 */
export const ApplicationStatePhase = {
  /** 画面へ新しい値を渡す段階 */
  Publish: 'state_publish',
  /** 画面側の更新を完了する段階 */
  Commit: 'state_commit',
  /** 失敗後に画面の値を元へ戻す段階 */
  Rollback: 'state_rollback',
} as const

/** 更新処理の失敗理由に付ける補足情報 */
export interface DomainIssueOptions {
  /** フォームや入力内の位置。位置がない全体エラーでは省略する */
  path?: DomainIssuePathLocation
  /** 翻訳やログに渡す値。循環参照や複雑なオブジェクトは入れない */
  params?: Readonly<Record<string, string | number | boolean>>
  /** 同じ入力で再試行してよい可能性があるか */
  retryable?: boolean
}

/** 更新処理の失敗理由。表示文言はこの型へ持ち込まない */
export interface DomainIssue extends DomainIssueOptions {
  /** エラーの分類 */
  code: DomainIssueCodeType
}

/** 状態番号として使う文字列型。値の変更順を確認するために使う */
export type DomainRevision = string

/** 値の内容を比較する印として使う文字列型。状態番号とは用途を分ける */
export type DomainDigest = string

/** 設定ごとの現在値と、値の変更を確認するための情報 */
export interface DomainStateSnapshot<T> {
  /** 状態の種類 */
  readonly domain: ApplicationDomainType
  /** 現在の設定値 */
  readonly value: T
  /** 値の変更順を示す状態番号 */
  readonly revision: DomainRevision
  /** 値の内容から作った比較用の印 */
  readonly digest: DomainDigest
}

/** 成功結果が持つ共通の値 */
export interface ResultSuccess<T> {
  ok: true
  value: T
}

/** 構造化された失敗結果 */
export interface ResultFailure {
  ok: false
  error: DomainIssue
}

/** 成功または構造化された失敗を表す共通結果 */
export type Result<T> = ResultSuccess<T> | ResultFailure

/** 更新成功時に結果へ追加する変更情報 */
export interface CommandSuccessOptions<T> {
  /** 実際に値が変わったか */
  changed: boolean
  /** 更新後の状態番号 */
  revision: DomainRevision
  /** 更新後の内容比較用の印 */
  digest: DomainDigest
  /** 更新前の値。不要な更新処理では省略できる */
  before?: T
  /** 更新後の値。valueと同じ内容でも前後を分けて扱う場合に使う */
  after?: T
}

/** 更新成功時の結果。同じ値でも現在の状態番号を返す */
export type CommandSuccess<T> = ResultSuccess<T> & CommandSuccessOptions<T>

/** 設定更新の成功・失敗結果 */
export type CommandResult<T> = CommandSuccess<T> | ResultFailure

/** 状態番号を受け取る更新の条件 */
export interface ExpectedRevisionOptions {
  /** 指定時は現在の状態番号と一致する場合だけ更新する */
  expectedRevision?: DomainRevision
}

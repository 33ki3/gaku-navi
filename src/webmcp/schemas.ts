/**
 * WebMCPへ公開する入力形式と操作注釈
 *
 * 入力形式は翻訳の準備前にも読み込まれるため、説明文はツール登録時に作る
 */
import * as constant from '../constant'
import * as data from '../data'
import i18n from '../i18n'
import * as enums from '../types/enums'
import * as webMcpConstant from './constants'
import * as webMcp from './types'
/**
 * WebMCPの読み取りツールへ渡す操作注釈
 *
 * readOnlyHintは状態を変更しないこと、untrustedContentHintは外部由来のデータを含むこと、
 * consequentialHintは重大な結果を伴わないことを示す
 */
export const readOnlyAnnotations = {
  /** アプリの保存状態を変更しないことを示す */
  readOnlyHint: true,
  /** カードデータなどを外部由来の内容として扱うことを示す */
  untrustedContentHint: true,
  /** 重大な結果を伴う操作ではないことを示す */
  consequentialHint: false,
}

/** WebMCPの保存・削除・インポートなどの更新ツールへ渡す操作注釈 */
export const updateAnnotations = {
  /** アプリの保存状態を変更することを示す */
  readOnlyHint: false,
  /** 入力やカードデータに外部由来の内容が含まれることを示す */
  untrustedContentHint: true,
  /** 利用者の確認が必要な結果を伴う操作であることを示す */
  consequentialHint: true,
}

/** Vo・Da・Viの数値を受け付ける共通schema。比較条件と保存更新で共有する */
const parameterValuesSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** Vo・Da・Viの各項目と制約 */
  properties: {
    /** ボーカル値 */
    [enums.ParameterType.Vocal]: { type: 'integer', minimum: 0 },
    /** ダンス値 */
    [enums.ParameterType.Dance]: { type: 'integer', minimum: 0 },
    /** ビジュアル値 */
    [enums.ParameterType.Visual]: { type: 'integer', minimum: 0 },
  },
  /** 必須とする項目 */
  required: [enums.ParameterType.Vocal, enums.ParameterType.Dance, enums.ParameterType.Visual],
  /** 定義していない項目を受け付けない */
  additionalProperties: false,
}

/** アクション識別子ごとの回数を受け付けるschema。キーの有効性は実行時に確認する */
const actionCountValuesSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** アクション識別子ごとの回数。キーの有効性は実行時に確認する */
  additionalProperties: { type: 'integer', minimum: 0, maximum: constant.ACTION_COUNT_MAX },
}

/**
 * 点数設定フォームにあるアクションIDごとの回数を受け付けるschema
 * 識別子は実行時に確認する
 */
const scoreActionCountValuesSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** 点数設定フォームに表示されるアクション識別子ごとの回数 */
  additionalProperties: { type: 'integer', minimum: 0, maximum: constant.ACTION_COUNT_MAX },
}

/**
 * 活動IDごとの選択値を受け付けるschema
 * 候補の有効性はcapabilityと実行時検証で確認する
 */
const scheduleSelectionsSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** 活動IDごとの選択値 */
  additionalProperties: { type: 'string' },
  get description() {
    return i18n.t('webmcp.schema.schedule_selections')
  },
}

/**
 * 点数設定の差分を受け付けるschema
 * 未指定項目は維持し、比較では保存せず、更新ツールだけが現在値へ反映する
 */
const scoreSettingsPatchSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** 点数設定で変更できる項目と制約 */
  properties: {
    /** シナリオ */
    [webMcp.WebMcpSchemaField.Scenario]: { type: 'string', enum: Object.values(enums.ScenarioType) },
    /** 難易度 */
    [webMcp.WebMcpSchemaField.Difficulty]: { type: 'string', enum: Object.values(enums.DifficultyType) },
    /** シナリオ開始時のパラメータボーナス */
    [webMcp.WebMcpSchemaField.ParameterBonusBase]: parameterValuesSchema,
    /** アクション識別子ごとの点数設定回数 */
    [webMcp.WebMcpSchemaField.ActionCounts]: {
      ...scoreActionCountValuesSchema,
      get description() {
        return i18n.t('webmcp.schema.action_counts')
      },
    },
    /** 活動IDごとの選択値 */
    [webMcp.WebMcpSchemaField.ScheduleSelections]: scheduleSelectionsSchema,
    /** 活動の上限を点数計算へ反映するか */
    [webMcp.WebMcpSchemaField.UseScheduleLimits]: { type: 'boolean' },
    /** サポートカード自身の発動を点数へ含めるか */
    [webMcp.WebMcpSchemaField.IncludeSelfTrigger]: { type: 'boolean' },
    /** Pアイテムの効果を点数へ含めるか */
    [webMcp.WebMcpSchemaField.IncludePItem]: { type: 'boolean' },
    /** 固定凸数を使うか */
    [webMcp.WebMcpSchemaField.UseFixedUncap]: { type: 'boolean' },
    /** カスタム計算モードを使うか */
    [webMcp.WebMcpSchemaField.UseCustomMode]: { type: 'boolean' },
    /** カスタムモードのパラメータボーナス行 */
    [webMcp.WebMcpSchemaField.CustomParamBonusRows]: { type: 'array', items: parameterValuesSchema },
    /** カスタムモードのクラスボーナス */
    [webMcp.WebMcpSchemaField.CustomClassBonus]: parameterValuesSchema,
    /** カスタムモードの非ボーナス獲得値 */
    [webMcp.WebMcpSchemaField.CustomNonBonusGain]: parameterValuesSchema,
    /** HIF試験のパラメータ配分 */
    [webMcp.WebMcpSchemaField.HifExamRatios]: { type: 'array', minItems: 3, maxItems: 3, items: parameterValuesSchema },
    /** HIFレッスンでサブパラメータを分割するか */
    [webMcp.WebMcpSchemaField.HifLessonSplitSub]: { type: 'boolean' },
  },
  /** 定義していない項目を受け付けない */
  additionalProperties: false,
}

/**
 * 最適編成の差分を受け付けるschema
 * 未指定項目は維持し、画面で入力できる範囲と探索負荷の上限を定義する
 */
const unitSettingsPatchSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** 最適編成設定で変更できる項目と制約 */
  properties: {
    /** 編成方針 */
    [webMcp.WebMcpSchemaField.Plan]: { type: 'string', enum: Object.values(enums.PlanType) },
    /** 編成へ含めるカードタイプ */
    [webMcp.WebMcpSchemaField.AllowedTypes]: {
      type: 'array',
      items: { type: 'string', enum: Object.values(enums.CardType) },
    },
    /** タイプごとのSP条件 */
    [webMcp.WebMcpSchemaField.SpConstraint]: {
      ...parameterValuesSchema,
      /** パラメータ種別ごとのSP条件 */
      properties: Object.fromEntries(
        Object.values(enums.ParameterType).map((parameterType) => [
          parameterType,
          { type: 'integer', minimum: 0, maximum: constant.SP_TOTAL_MAX },
        ]),
      ),
    },
    /** タイプごとの最小枚数 */
    [webMcp.WebMcpSchemaField.TypeCountMin]: {
      ...parameterValuesSchema,
      /** パラメータ種別ごとの最小枚数 */
      properties: Object.fromEntries(
        Object.values(enums.ParameterType).map((parameterType) => [
          parameterType,
          { type: 'integer', minimum: 0, maximum: constant.UNIT_SIZE },
        ]),
      ),
    },
    /** タイプごとの最大枚数 */
    [webMcp.WebMcpSchemaField.TypeCountMax]: {
      ...parameterValuesSchema,
      /** パラメータ種別ごとの最大枚数 */
      properties: Object.fromEntries(
        Object.values(enums.ParameterType).map((parameterType) => [
          parameterType,
          { type: 'integer', minimum: 0, maximum: constant.UNIT_SIZE },
        ]),
      ),
    },
    /** タイプごとのパラメータボーナス率 */
    [webMcp.WebMcpSchemaField.ParamBonusPercent]: {
      ...parameterValuesSchema,
      /** パラメータ種別ごとのボーナス率 */
      properties: Object.fromEntries(
        Object.values(enums.ParameterType).map((parameterType) => [
          parameterType,
          {
            type: 'number',
            minimum: 0,
            maximum: constant.PARAMETER_BONUS_PERCENT_MAX,
            multipleOf: constant.PARAMETER_BONUS_PERCENT_STEP,
          },
        ]),
      ),
    },
    /** 選択中のレンタルカード名。固定一覧に含まれる場合は最適化でも固定する */
    [webMcp.WebMcpSchemaField.RentalCardName]: { type: ['string', 'null'] },
    /** 編成へ固定するカード名 */
    [webMcp.WebMcpSchemaField.LockedCards]: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      maxItems: constant.UNIT_SIZE,
      uniqueItems: true,
    },
    /** 画面のスロット順の選択カード名。nullはその位置の空き枠を示す */
    [webMcp.WebMcpSchemaField.SelectedCards]: {
      type: 'array',
      items: { type: ['string', 'null'], minLength: 1 },
      maxItems: constant.UNIT_SIZE,
    },
    /** 最適編成から除外するカード名 */
    [webMcp.WebMcpSchemaField.ExcludedCardNames]: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
    },
    /** 初期パラメータ */
    [webMcp.WebMcpSchemaField.InitialParams]: {
      ...parameterValuesSchema,
      /** パラメータ種別ごとの初期値 */
      properties: Object.fromEntries(
        Object.values(enums.ParameterType).map((parameterType) => [
          parameterType,
          { type: 'integer', minimum: 0, maximum: constant.INITIAL_PARAMETER_MAX },
        ]),
      ),
    },
    /** パラメータ上限の上書き値。nullなら上書きを解除する */
    [webMcp.WebMcpSchemaField.ParamCapOverride]: {
      type: ['integer', 'null'],
      minimum: constant.PARAM_CAP_MIN,
      maximum: constant.INITIAL_PARAMETER_MAX,
    },
    /** レンタルカードと固定カードの制約を統一するか */
    [webMcp.WebMcpSchemaField.UnifyRentalLock]: { type: 'boolean' },
    /** コンテストで獲得するスキルカードを除外するか */
    [webMcp.WebMcpSchemaField.ExcludeContestSkillCards]: { type: 'boolean' },
    /** コンテストで獲得するPアイテムを除外するか */
    [webMcp.WebMcpSchemaField.ExcludeContestPItems]: { type: 'boolean' },
    /** カード除外設定を無視するか */
    [webMcp.WebMcpSchemaField.IgnoreCardExclusions]: { type: 'boolean' },
    /** 探索候補数の上限 */
    [webMcp.WebMcpSchemaField.ExhaustiveCandidateLimit]: {
      /** 整数値だけを受け付ける */
      type: 'integer',
      /** 候補数の下限 */
      minimum: constant.CANDIDATE_LIMIT_MIN,
      /** 候補数の上限 */
      maximum: constant.CANDIDATE_LIMIT_MAX,
    },
  },
  /** 定義していない項目を受け付けない */
  additionalProperties: false,
}

/** 1枚のカードについて変更可能な自動カウントとPアイテム回数を受け付けるschema */
const cardCustomSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** カード内で調整できる回数項目 */
  properties: {
    /** カード自身が提供するアクション識別子ごとの回数調整 */
    [webMcp.WebMcpSchemaField.SelfTrigger]: actionCountValuesSchema,
    /** Pアイテムが提供するアクション識別子ごとの回数調整 */
    [webMcp.WebMcpSchemaField.PItemCount]: actionCountValuesSchema,
  },
  /** 定義していない項目を受け付けない */
  additionalProperties: false,
}

/** 全カードへ一律に適用する凸数 */
const cardUncapAllSchema = {
  /** 凸数を数値として受け付ける */
  type: 'number',
  enum: Object.values(enums.UncapType),
  get description() {
    return i18n.t('webmcp.schema.card_uncap_all')
  },
}

/** カード名ごとに適用する凸数 */
const cardUncapsSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** カード名ごとの凸数 */
  additionalProperties: { type: 'number', enum: Object.values(enums.UncapType) },
  get description() {
    return i18n.t('webmcp.schema.card_uncaps')
  },
}

/** カード名ごとの回数調整 */
const cardCountCustomSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** カード名ごとの回数調整項目 */
  additionalProperties: cardCustomSchema,
  get description() {
    return i18n.t('webmcp.schema.card_count_custom')
  },
}

/**
 * 単体カード点数比較で受け付ける計算条件の入力形式
 *
 * 無関係な編成設定をツール定義へ複製しない
 */
export const supportCardComparisonPatchSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** 点数比較で変更できる項目と制約 */
  properties: {
    /** 点数計算条件の差分 */
    [webMcp.WebMcpSchemaField.ScoreSettings]: scoreSettingsPatchSchema,
    /** 全カードへ一律に適用する凸数 */
    [webMcp.WebMcpSchemaField.CardUncapAll]: cardUncapAllSchema,
    /** カード名ごとに適用する凸数 */
    [webMcp.WebMcpSchemaField.CardUncaps]: cardUncapsSchema,
    /** カード名ごとの回数調整 */
    [webMcp.WebMcpSchemaField.CardCountCustom]: cardCountCustomSchema,
  },
  /** 定義していない項目を受け付けない */
  additionalProperties: false,
}

/**
 * 最適編成比較で受け付ける計算条件の入力形式
 *
 * 比較と保存更新で同じ計算条件の入力形を共有する
 */
export const calculationVariantPatchSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** 最適編成比較で変更できる項目と制約 */
  properties: {
    /** 点数計算条件の差分 */
    [webMcp.WebMcpSchemaField.ScoreSettings]: scoreSettingsPatchSchema,
    /** 最適編成条件の差分 */
    [webMcp.WebMcpSchemaField.UnitSettings]: unitSettingsPatchSchema,
    /** 全カードへ一律に適用する凸数 */
    [webMcp.WebMcpSchemaField.CardUncapAll]: cardUncapAllSchema,
    /** カード名ごとに適用する凸数 */
    [webMcp.WebMcpSchemaField.CardUncaps]: cardUncapsSchema,
    /** カード名ごとの回数調整 */
    [webMcp.WebMcpSchemaField.CardCountCustom]: cardCountCustomSchema,
  },
  /** 定義していない項目を受け付けない */
  additionalProperties: false,
}

/**
 * 計算条件の保存更新で受け付ける入力形式
 *
 * 回数調整を明示的に削除する操作も差分として受け付ける
 */
export const calculationUpdateSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** 保存更新で変更できる項目と制約 */
  properties: {
    ...calculationVariantPatchSchema.properties,
    /** 回数調整を削除するカード名の一覧 */
    [webMcp.WebMcpSchemaField.ClearCardCountCustom]: {
      type: 'array',
      items: { type: 'string' },
      get description() {
        return i18n.t('webmcp.schema.clear_card_count_custom')
      },
    },
  },
  /** 定義していない項目を受け付けない */
  additionalProperties: false,
}

/** 絞り込み・並び順更新で受け付ける入力形式 */
export const filterStatePatchSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** 絞り込み・並び順で変更できる項目と制約 */
  properties: {
    /** 検索文字列 */
    [webMcp.WebMcpSchemaField.SearchTerm]: { type: 'string' },
    /** レアリティの絞り込み */
    [webMcp.WebMcpSchemaField.Rarities]: {
      type: 'array',
      items: { type: 'string', enum: Object.values(enums.RarityType) },
    },
    /** カードタイプの絞り込み */
    [webMcp.WebMcpSchemaField.Types]: { type: 'array', items: { type: 'string', enum: Object.values(enums.CardType) } },
    /** プランの絞り込み */
    [webMcp.WebMcpSchemaField.Plans]: { type: 'array', items: { type: 'string', enum: Object.values(enums.PlanType) } },
    /** SPカードだけを表示するか */
    [webMcp.WebMcpSchemaField.SpOnly]: { type: 'boolean' },
    /** アビリティキーワードの絞り込み */
    [webMcp.WebMcpSchemaField.AbilityKeywords]: {
      type: 'array',
      items: { type: 'string', enum: Object.values(enums.AbilityKeywordType) },
    },
    /** イベント効果の絞り込み */
    [webMcp.WebMcpSchemaField.EventFilters]: {
      type: 'array',
      items: { type: 'string', enum: Object.values(enums.EventFilterType) },
    },
    /** 入手種別の絞り込み */
    [webMcp.WebMcpSchemaField.Sources]: {
      type: 'array',
      items: { type: 'string', enum: Object.values(enums.SourceType) },
    },
    /** 凸数の絞り込み */
    [webMcp.WebMcpSchemaField.Uncaps]: {
      type: 'array',
      items: { type: 'number', enum: Object.values(enums.UncapType) },
    },
    /** 回数調整の有無による絞り込み */
    [webMcp.WebMcpSchemaField.CountCustom]: {
      type: 'array',
      items: { type: 'string', enum: Object.values(enums.CountCustomFilter) },
    },
    /** 最適編成候補からの除外状態による絞り込み */
    [webMcp.WebMcpSchemaField.CardExclusionFilters]: {
      type: 'array',
      items: { type: 'string', enum: Object.values(enums.CardExclusionFilterType) },
    },
    /** 並び替えモード */
    [webMcp.WebMcpSchemaField.SortMode]: { type: 'string', enum: Object.values(enums.SortModeType) },
    /** 並び替えを逆順にするか */
    [webMcp.WebMcpSchemaField.SortReverse]: { type: 'boolean' },
    /** trueなら既定状態へ戻してから同じ入力内のほかの変更を適用する */
    [webMcp.WebMcpSchemaField.ClearFilters]: {
      type: 'boolean',
      get description() {
        return i18n.t('webmcp.schema.clear_filters')
      },
    },
  },
  /** 定義していない項目を受け付けない */
  additionalProperties: false,
}

/** 表示設定更新で受け付ける入力形式 */
export const appPreferencesPatchSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** 表示設定で変更できる項目と制約 */
  properties: {
    /** モバイル下部ナビを表示するか */
    [webMcp.WebMcpSchemaField.ShowMobileBottomNav]: { type: 'boolean' },
    /** モバイル下部ナビを画面下部へ固定するか */
    [webMcp.WebMcpSchemaField.KeepMobileBottomNavFixed]: { type: 'boolean' },
  },
  /** 定義していない項目を受け付けない */
  additionalProperties: false,
}

/** 現在状態取得で受け付けるセクションとページ指定の入力形式 */
export const currentAppStateSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  /** 現在状態取得で指定できる項目と制約 */
  properties: {
    /** 取得する状態セクション */
    [webMcp.WebMcpSchemaField.Sections]: {
      type: 'array',
      maxItems: Object.values(webMcp.WebMcpCurrentAppStateSection).length,
      uniqueItems: true,
      items: { type: 'string', enum: Object.values(webMcp.WebMcpCurrentAppStateSection) },
    },
    /** カード一覧の取得範囲 */
    [webMcp.WebMcpSchemaField.CardMap]: {
      /** JSON Schemaとしてオブジェクトを表す */
      type: 'object',
      /** カード一覧のページ指定 */
      properties: {
        /** 先頭から読み飛ばす件数 */
        [webMcp.WebMcpSchemaField.Offset]: {
          type: 'integer',
          minimum: 0,
          maximum: webMcpConstant.WEB_MCP_MAX_PAGE_OFFSET,
          default: 0,
        },
        /** 取得する件数 */
        [webMcp.WebMcpSchemaField.Limit]: {
          type: 'integer',
          minimum: 1,
          maximum: webMcpConstant.WEB_MCP_MAX_PAGE_LIMIT,
          default: webMcpConstant.WEB_MCP_DEFAULT_PAGE_LIMIT,
        },
      },
      /** 定義していない項目を受け付けない */
      additionalProperties: false,
    },
    /** ユーザー追加サポート一覧の取得範囲 */
    [webMcp.WebMcpSchemaField.UserSupports]: {
      /** JSON Schemaとしてオブジェクトを表す */
      type: 'object',
      /** ユーザー追加サポート一覧のページ指定 */
      properties: {
        /** 先頭から読み飛ばす件数 */
        [webMcp.WebMcpSchemaField.Offset]: {
          type: 'integer',
          minimum: 0,
          maximum: webMcpConstant.WEB_MCP_MAX_PAGE_OFFSET,
          default: 0,
        },
        /** 取得する件数 */
        [webMcp.WebMcpSchemaField.Limit]: {
          type: 'integer',
          minimum: 1,
          maximum: webMcpConstant.WEB_MCP_MAX_PAGE_LIMIT,
          default: webMcpConstant.WEB_MCP_DEFAULT_PAGE_LIMIT,
        },
      },
      /** 定義していない項目を受け付けない */
      additionalProperties: false,
    },
  },
  /** 定義していない項目を受け付けない */
  additionalProperties: false,
}

/** ユーザー定義サポート入力の概要形式。詳細な項目構造は実行時にフォーム規則で検証する */
export const supportCardInputSchema = {
  /** JSON Schemaとしてオブジェクトを表す */
  type: 'object',
  get description() {
    return i18n.t('webmcp.schema.support_card_input')
  },
  /** ユーザー定義サポートで受け付ける項目と制約 */
  properties: {
    /** サポートカード名 */
    [enums.SupportCardFieldKeyType.Name]: {
      type: 'string',
      minLength: 1,
      maxLength: constant.USER_SUPPORT_NAME_MAX_LENGTH,
    },
    /** レアリティ */
    [enums.SupportCardFieldKeyType.Rarity]: { type: 'string', enum: Object.values(enums.RarityType) },
    /** プラン */
    [enums.SupportCardFieldKeyType.Plan]: { type: 'string', enum: Object.values(enums.PlanType) },
    /** カードタイプ */
    [enums.SupportCardFieldKeyType.Type]: {
      type: 'string',
      enum: [enums.CardType.Vocal, enums.CardType.Dance, enums.CardType.Visual],
    },
    /** 得意パラメータ */
    [enums.SupportCardFieldKeyType.ParameterType]: { type: 'string', enum: Object.values(enums.ParameterType) },
    /** 入手種別 */
    [enums.SupportCardFieldKeyType.Source]: { type: 'string', enum: [enums.SourceType.User] },
    /** イベント由来のカードか（省略可能） */
    [enums.SupportCardFieldKeyType.IsEventSource]: { type: 'boolean' },
    /** 実装日 */
    [enums.SupportCardFieldKeyType.ReleaseDate]: { type: 'string' },
    /** アビリティ6枠 */
    [enums.SupportCardFieldKeyType.Abilities]: {
      type: 'array',
      minItems: constant.SLOT_COUNT,
      maxItems: constant.SLOT_COUNT,
      items: { type: 'object' },
    },
    /** イベント2〜3件 */
    [enums.SupportCardFieldKeyType.Events]: { type: 'array', minItems: 2, maxItems: 3, items: { type: 'object' } },
    /** Pアイテム。未設定ならnull */
    [enums.SupportCardFieldKeyType.PItem]: { anyOf: [{ type: 'object' }, { type: 'null' }] },
    /** スキルカード。未設定ならnull */
    [enums.SupportCardFieldKeyType.SkillCard]: { anyOf: [{ type: 'object' }, { type: 'null' }] },
  },
  /** 必須とするユーザー定義サポート項目 */
  required: [
    enums.SupportCardFieldKeyType.Name,
    enums.SupportCardFieldKeyType.Rarity,
    enums.SupportCardFieldKeyType.Plan,
    enums.SupportCardFieldKeyType.Type,
    enums.SupportCardFieldKeyType.ParameterType,
    enums.SupportCardFieldKeyType.Source,
    enums.SupportCardFieldKeyType.ReleaseDate,
    enums.SupportCardFieldKeyType.Abilities,
    enums.SupportCardFieldKeyType.Events,
    enums.SupportCardFieldKeyType.PItem,
    enums.SupportCardFieldKeyType.SkillCard,
  ],
  /** 定義していない項目を受け付けない */
  additionalProperties: false,
}

/** エクスポート対象キー選択の入力形式 */
export const selectedExportKeysSchema = {
  /** エクスポート対象キーを配列で受け取る */
  type: 'array',
  /** エクスポート対象にする保存キー */
  items: { type: 'string', enum: [...data.EXPORT_KEYS] },
  /** エクスポート対象キーの入力説明を現在の言語で返す */
  get description() {
    return i18n.t('webmcp.schema.selected_export_keys')
  },
}

/** 読み取り対象を選ぶ共通schema。省略時は画面の選択アイドルを使う */
export const achievementReadSchema = {
  type: 'object',
  properties: {
    /** 操作対象のアイドル。読み取り時の省略は画面の選択対象を使う */
    [webMcp.WebMcpSchemaField.IdolId]: { type: 'string', minLength: 1, enum: Object.values(enums.IdolId) },
  },
  /** 定義していない入力項目を拒否する */
  additionalProperties: false,
}

/** 対象ごとに許可する更新項目。schemaと実行時のキー検証で共用する */
export const achievementActionProperties = {
  /** プロデュース全体のアチーブメントの累計値を更新する */
  [webMcp.AchievementUpdateAction.Production]: {
    /** 更新する回数項目の識別子。存在はcommandで確認する */
    [webMcp.WebMcpSchemaField.TrackerId]: { type: 'string', minLength: 1 },
    /** 更新後の整数値。各操作の範囲制約に従う */
    [webMcp.WebMcpSchemaField.Value]: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
  },
  /** アイドル固有の条件を他の条件と連動させず更新する */
  [webMcp.AchievementUpdateAction.Idol]: {
    /** 更新対象のアイドル。対象指定は必須 */
    [webMcp.WebMcpSchemaField.IdolId]: { type: 'string', minLength: 1 },
    /** アイドル固有の条件を特定する識別子 */
    [webMcp.WebMcpSchemaField.Metric]: {
      type: 'string',
      minLength: 1,
      enum: Object.values(enums.IdolAchievementMetric),
    },
    /** 更新後の整数値。各操作の範囲制約に従う */
    [webMcp.WebMcpSchemaField.Value]: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
  },
  /** Pアイドル1枚の達成条件を独立して更新する */
  [webMcp.AchievementUpdateAction.PIdol]: {
    /** 達成状況を記録するPアイドルの識別子 */
    [webMcp.WebMcpSchemaField.CardId]: { type: 'string', minLength: 1 },
    /** カード内で独立して記録する達成条件 */
    [webMcp.WebMcpSchemaField.AchievementId]: {
      type: 'string',
      minLength: 1,
      enum: Object.values(enums.PIdolCardAchievementId),
    },
    /** 達成はtrue、未達成はfalseで指定する */
    [webMcp.WebMcpSchemaField.Completed]: { type: 'boolean' },
  },
  /** Pアイドル1枚に登録された条件をまとめて更新する */
  [webMcp.AchievementUpdateAction.PIdolAll]: {
    /** 達成状況を記録するPアイドルの識別子 */
    [webMcp.WebMcpSchemaField.CardId]: { type: 'string', minLength: 1 },
    /** 達成はtrue、未達成はfalseで指定する */
    [webMcp.WebMcpSchemaField.Completed]: { type: 'boolean' },
  },
  /** ステージ内の星1つを独立して更新する */
  [webMcp.AchievementUpdateAction.RoadStar]: {
    /** 更新対象のアイドル。対象指定は必須 */
    [webMcp.WebMcpSchemaField.IdolId]: { type: 'string', minLength: 1 },
    /** 0始まりのステージ番号。収録ステージ数を上限とする */
    [webMcp.WebMcpSchemaField.StageIndex]: {
      type: 'integer',
      minimum: 0,
      maximum: constant.ROAD_STAGE_COUNT_PER_IDOL - 1,
    },
    /** ステージ内の0始まりの星番号 */
    [webMcp.WebMcpSchemaField.StarIndex]: { type: 'integer', minimum: 0, maximum: constant.ROAD_STARS_PER_STAGE - 1 },
    /** 達成はtrue、未達成はfalseで指定する */
    [webMcp.WebMcpSchemaField.Completed]: { type: 'boolean' },
  },
  /** 指定アイドルの全ステージの星を一括更新する */
  [webMcp.AchievementUpdateAction.RoadAll]: {
    /** 更新対象のアイドル。対象指定は必須 */
    [webMcp.WebMcpSchemaField.IdolId]: { type: 'string', minLength: 1 },
    /** 達成はtrue、未達成はfalseで指定する */
    [webMcp.WebMcpSchemaField.Completed]: { type: 'boolean' },
  },
  /** 初星課題・P課題・パネルの累計達成数を更新する */
  [webMcp.AchievementUpdateAction.OtherTask]: {
    /** 更新する回数項目の識別子。存在はcommandで確認する */
    [webMcp.WebMcpSchemaField.TrackerId]: { type: 'string', minLength: 1 },
    /** 更新後の整数値。各操作の範囲制約に従う */
    [webMcp.WebMcpSchemaField.Value]: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
  },
  /** 試験結果ごとの回数を記録し、基準報酬との差額を補正する */
  [webMcp.AchievementUpdateAction.ProductionReward]: {
    /** 基準の50EXPと異なる試験結果の識別子 */
    [webMcp.WebMcpSchemaField.AdjustmentId]: {
      type: 'string',
      minLength: 1,
      enum: Object.values(enums.ProductionRunRewardAdjustmentId),
    },
    /** 更新後の整数値。各操作の範囲制約に従う */
    [webMcp.WebMcpSchemaField.Value]: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
  },
  /** PLvの進捗目標を設定し、獲得済みEXPは変更しない */
  [webMcp.AchievementUpdateAction.TargetLevel]: {
    /** 更新後の整数値。各操作の範囲制約に従う */
    [webMcp.WebMcpSchemaField.Value]: { type: 'integer', minimum: 1, maximum: constant.PRODUCER_LEVEL_TARGET_MAX },
  },
  /** アチーブ以外のEXPを補正し、負数は累計から差し引く */
  [webMcp.AchievementUpdateAction.OtherExp]: {
    /** 更新後の整数値。各操作の範囲制約に従う */
    [webMcp.WebMcpSchemaField.Value]: {
      type: 'integer',
      maximum: Number.MAX_SAFE_INTEGER,
      minimum: Number.MIN_SAFE_INTEGER,
    },
  },
}

/** 各更新は単一対象で、revisionが指定された場合は古い状態への上書きを拒否する */
export const achievementUpdateSchema = {
  type: 'object',
  oneOf: Object.entries(achievementActionProperties).map(([action, properties]) => ({
    type: 'object',
    properties: {
      /** 更新対象を切り替える操作種別。この候補では値を固定する */
      [webMcp.WebMcpSchemaField.Action]: { type: 'string', const: action },
      /** 読み取った記録の版。指定時は別操作による変更後の上書きを拒否する */
      [webMcp.WebMcpSchemaField.ExpectedRevision]: { type: 'string', minLength: 1 },
      ...properties,
    },
    /** 操作種別と対象操作の入力項目をすべて必須とする */
    required: [webMcp.WebMcpSchemaField.Action, ...Object.keys(properties)],
    /** 定義していない入力項目を拒否する */
    additionalProperties: false,
  })),
}

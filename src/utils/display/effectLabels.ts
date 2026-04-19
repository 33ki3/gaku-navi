/**
 * エフェクト表示テキスト合成ユーティリティ
 *
 * カード詳細画面で表示する「イベント効果」「Pアイテム効果」「スキルカード効果」
 * 「カスタムスロット効果」のテキストを、構造化データ + i18n翻訳から組み立てる。
 */
import type {
  SupportEvent,
  PItemEffect,
  PItemEffectPart,
  SkillCardEffectStructured,
  SkillCardEffectAction,
  CustomSlotEffectStructured,
  CustomSlotNameStructured,
} from '../../types/card'
import type {
  UncapType,
  EffectKeywordType,
  ParameterType,
  EffectTemplateKeyType,
  AbilityNameKeyType,
  TriggerKeyType,
} from '../../types/enums'
import { EventEffectType, EffectSectionType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'
import type { TFunction } from 'i18next'
import * as data from '../../data'

/**
 * エフェクトテンプレートの i18n ラベルキーを返す。
 *
 * セクションプレフィックスとキーを結合して i18n パスを構築する。
 *
 * @param section - セクション識別子
 * @param key - テンプレートキー
 * @returns i18n キー（例: "card.pitem_body.param_boost"）
 */
export function getEffectLabelKey(
  section: EffectSectionType,
  key: EffectTemplateKeyType | AbilityNameKeyType | TriggerKeyType,
): TranslationKey {
  return `${data.getEffectSectionPrefix(section)}.${key}` as TranslationKey
}

/**
 * アビリティ名の i18n ラベルキーを返す。
 *
 * `getEffectLabelKey('ability_name', key)` のショートハンド。
 *
 * @param key - アビリティ名キー
 * @returns i18n キー（例: "card.ability_name.vitality"）
 */
export function getAbilityNameLabelKey(key: AbilityNameKeyType): TranslationKey {
  return getEffectLabelKey(EffectSectionType.AbilityName, key)
}

/**
 * キーワードキーを i18n 翻訳済みの表示名に変換する
 *
 * @param keyword - キーワードの識別キー（例: "好印象"）
 * @param t - i18n の翻訳関数
 * @returns 翻訳済みのキーワード名（未定義なら空文字列）
 */
function resolveKeyword(keyword: EffectKeywordType | undefined, t: TFunction): string {
  if (!keyword) return ''
  return t(data.getEffectKeywordEntry(keyword)!.label)
}

/**
 * イベント効果の表示テキストを生成する
 *
 * イベントの種類に応じて適切な翻訳テンプレートを選び、
 * パラメータ名や値を埋め込んで返す。
 *
 * 例: 「ボーカル +15」「PP +30」「体力回復 +20」「スキルカード獲得」
 *
 * @param event - サポートイベントのデータ
 * @param t - i18n の翻訳関数
 * @returns 表示用テキスト
 */
export function getEventEffectLabel(event: SupportEvent, t: TFunction): string {
  const key = data.getEventEffectLabelKey(event.effect_type)

  switch (event.effect_type) {
    // パラメータ上昇: パラメータ名と値を埋め込む
    case EventEffectType.ParamBoost:
      return t(key, {
        param: t(data.getParamLabel(event.param_type!)),
        value: event.param_value,
      })
    // PP獲得・体力回復: 値だけ埋め込む
    case EventEffectType.PpGain:
    case EventEffectType.HpRecovery:
      return t(key, { value: event.param_value })
    // それ以外: テンプレートをそのまま返す
    default:
      return t(key)
  }
}

/**
 * パラメータキーを翻訳済みの表示名に変換する
 *
 * @param param - パラメータキー（例: "vocal"）
 * @param t - i18n の翻訳関数
 * @returns 翻訳済みの名前（未定義なら空文字列）
 */
function resolveParam(param: ParameterType | undefined, t: TFunction): string {
  if (!param) return ''
  return t(data.getParamLabel(param))
}

/**
 * Pアイテム効果パーツの全パラメータを i18n 補間用オブジェクトに変換する
 *
 * 構造化データの各フィールド（keyword, value, count等）を、
 * 翻訳テンプレートのプレースホルダに渡せる形に変換する。
 *
 * @param part - Pアイテム効果の1パーツ
 * @param t - i18n の翻訳関数
 * @returns テンプレート補間用のパラメータオブジェクト
 */
function buildPItemInterpolation(part: PItemEffectPart, t: TFunction): Record<string, string | number> {
  const result: Record<string, string | number> = {}
  // 効果キーワード（好印象、やる気 等）を翻訳して補間パラメータに設定
  if (part.keyword) result.keyword = resolveKeyword(part.keyword, t)
  if (part.keyword2) result.keyword2 = resolveKeyword(part.keyword2, t)
  if (part.keyword3) result.keyword3 = resolveKeyword(part.keyword3, t)
  // パラメータ属性（Vo/Da/Vi）を翻訳して設定
  if (part.param) result.param = resolveParam(part.param, t)
  // 閾値（「体力が{threshold}%以上の時」「元気が0の場合」等）
  if (part.threshold != null) result.threshold = part.threshold
  // 回数（「{count}回」等）
  if (part.count !== undefined && part.count !== 0) result.count = part.count
  // 効果値（「+{value}」等）
  if (part.value !== undefined && part.value !== 0) result.value = part.value
  // ターン数（「{turns}ターン」等）
  if (part.turns !== undefined && part.turns !== 0) result.turns = part.turns
  // カード名・アイテム名（固有名詞をそのまま設定）
  if (part.card_name) result.card_name = part.card_name
  if (part.item_name) result.item_name = part.item_name
  // 汎用テンプレートのラベル名（i18nキーを翻訳して設定）
  if (part.label_key) result.name = t(part.label_key as TranslationKey)
  return result
}

/**
 * Pアイテム効果の構造化データから表示テキストを組み立てる
 *
 * Pアイテムの効果は以下のパーツで構成される:
 * 制限条件（restriction）→ トリガー（trigger）→ 条件（condition）→
 * 本体効果（body）→ 回数制限（limit）
 *
 * 各パーツを翻訳して順番に連結したテキストを返す。
 * 例: 「レッスン開始時、好印象+3（プロデュース中2回）」「ターン開始時、体力が50%以上の場合、やる気+5」
 *
 * @param effect - Pアイテム効果の構造化データ
 * @param t - i18n の翻訳関数
 * @returns 完成した表示テキスト
 */
export function getPItemEffectLabel(effect: PItemEffect, t: TFunction): string {
  const parts: string[] = []

  // 制限条件（例: "センス編のみ"）
  if (effect.restriction) {
    const key = getEffectLabelKey(EffectSectionType.PitemRestriction, effect.restriction.key)
    parts.push(t(key, buildPItemInterpolation(effect.restriction, t)))
  }

  // トリガー（例: "レッスン開始時"）
  const triggerKey = getEffectLabelKey(EffectSectionType.PitemTrigger, effect.trigger.key)
  parts.push(t(triggerKey, buildPItemInterpolation(effect.trigger, t)))

  // 条件（例: "体力が50%以上の時"）
  if (effect.condition) {
    const condKey = getEffectLabelKey(EffectSectionType.PitemCondition, effect.condition.key)
    parts.push(t(condKey, buildPItemInterpolation(effect.condition, t)))
  }

  // 本体効果（例: "パラメータ+10"）— 複数ある場合は「、」で区切る
  for (let i = 0; i < effect.body.length; i++) {
    if (i > 0) parts.push(t('userSupport.pitem_body_separator'))
    const bodyKey = getEffectLabelKey(EffectSectionType.PitemBody, effect.body[i].key)
    parts.push(t(bodyKey, buildPItemInterpolation(effect.body[i], t)))
  }

  // 回数制限（例: "（プロデュース中3回）"）
  if (effect.limit) {
    const limitKey = getEffectLabelKey(EffectSectionType.PitemLimit, effect.limit.key)
    parts.push(t(limitKey, buildPItemInterpolation(effect.limit, t)))
  }

  return parts.join('')
}

/**
 * スキルカード効果アクションの全パラメータを i18n 補間用オブジェクトに変換する
 *
 * @param action - スキルカード効果のアクションデータ
 * @param t - i18n の翻訳関数
 * @returns テンプレート補間用のパラメータオブジェクト
 */
function buildSkillInterpolation(action: SkillCardEffectAction, t: TFunction): Record<string, string | number> {
  const result: Record<string, string | number> = {}
  // 効果値（「+{value}」「{value}%」等の数値パラメータ）
  if (action.value !== undefined) result.value = action.value
  if (action.value2 !== undefined && action.value2 !== 0) result.value2 = action.value2
  // ターン数（「{turns}ターン」等の持続期間）
  if (action.turns !== undefined && action.turns !== 0) result.turns = action.turns
  // 効果キーワード（好印象、やる気 等）を翻訳して設定
  if (action.keyword) result.keyword = resolveKeyword(action.keyword, t)
  // 確率（「{pct}%の確率で」等）
  if (action.pct !== undefined && action.pct !== 0) result.pct = action.pct
  // 倍率（「{rate}倍」等）
  if (action.rate) result.rate = action.rate
  // 回数（「{count}回」等）
  if (action.count !== undefined && action.count !== 0) result.count = action.count
  // カードゾーン（「手札」「捨て札」等を翻訳して設定）
  if (action.card_zone) result.card_zone = t(data.getCardZoneLabel(action.card_zone))
  // スキルカード種別（「メンタル」「アクティブ」等を翻訳して設定）
  if (action.skill_type) result.skill_type = t(data.getSkillTypeLabel(action.skill_type))
  // 段階番号（カスタム段階）
  if (action.stage !== undefined && action.stage !== 0) result.stage = action.stage
  return result
}

/**
 * スキルカード効果の構造化データから表示テキストを組み立てる
 *
 * スキルカード効果は以下の構造:
 * 使用条件（use_condition）→ 前修飾（pre_modifier）→
 * グループ群 [条件/時制/トリガー/アクション] → …
 *
 * 各グループ内の temporal_first フラグにより、
 * 時制と条件の出力順序が切り替わる。
 * 例: 「3ターンの間、集中+3」「パラメータ+15」
 *
 * @param effect - スキルカード効果の構造化データ
 * @param t - i18n の翻訳関数
 * @returns 完成した表示テキスト
 */
export function getSkillCardEffectLabel(effect: SkillCardEffectStructured, t: TFunction): string {
  const parts: string[] = []

  // 使用条件（例: "レッスン中1回"）
  if (effect.use_condition) {
    const key = getEffectLabelKey(EffectSectionType.SkillUseCondition, effect.use_condition.key)
    parts.push(t(key, buildSkillInterpolation(effect.use_condition, t)))
  }

  // 前修飾（例: "次のターン"）
  if (effect.pre_modifier) {
    const key = getEffectLabelKey(EffectSectionType.SkillPreModifier, effect.pre_modifier.key)
    parts.push(t(key, buildSkillInterpolation(effect.pre_modifier, t)))
  }

  // 各効果グループを処理する
  for (const group of effect.groups) {
    if (group.temporal_first) {
      // 時制が先に来るパターン（例: "次のターン、○○時、△△する"）
      if (group.temporal) {
        const key = getEffectLabelKey(EffectSectionType.SkillTemporal, group.temporal.key)
        parts.push(t(key, buildSkillInterpolation(group.temporal, t)))
      }
      if (group.trigger) {
        const key = getEffectLabelKey(EffectSectionType.SkillTrigger, group.trigger.key)
        parts.push(t(key, buildSkillInterpolation(group.trigger, t)))
      }
      if (group.condition) {
        const key = getEffectLabelKey(EffectSectionType.SkillCondition, group.condition.key)
        parts.push(t(key, buildSkillInterpolation(group.condition, t)))
      }
    } else {
      // 条件が先に来るパターン（例: "○○時、次のターン、△△する"）
      if (group.condition) {
        const key = getEffectLabelKey(EffectSectionType.SkillCondition, group.condition.key)
        parts.push(t(key, buildSkillInterpolation(group.condition, t)))
      }
      if (group.temporal) {
        const key = getEffectLabelKey(EffectSectionType.SkillTemporal, group.temporal.key)
        parts.push(t(key, buildSkillInterpolation(group.temporal, t)))
      }
      if (group.trigger) {
        const key = getEffectLabelKey(EffectSectionType.SkillTrigger, group.trigger.key)
        parts.push(t(key, buildSkillInterpolation(group.trigger, t)))
      }
    }

    // アクション（実際の効果本体）
    if (group.action) {
      const key = getEffectLabelKey(EffectSectionType.SkillAction, group.action.key)
      parts.push(t(key, buildSkillInterpolation(group.action, t)))
    }
  }

  return parts.join('')
}

/**
 * カスタムスロット名を表示テキストに変換する
 *
 * 構造化データから表示テキストを復元する。
 * 例: { key: "keyword_plus", keyword: "full_power_value" } → 「全力+」
 * 例: { key: "parameter_plus" } → 「パラメータ+」
 *
 * @param name - カスタムスロット名の構造化データ
 * @param t - i18n の翻訳関数
 * @returns 翻訳済みの表示テキスト
 */
export function getCustomSlotNameLabel(name: CustomSlotNameStructured, t: TFunction): string {
  const key = getEffectLabelKey(EffectSectionType.CustomSlotName, name.key)
  if (!name.keyword) return t(key)
  return t(key, { keyword: resolveKeyword(name.keyword, t) })
}

/**
 * カスタムスロット効果を表示テキストに変換する
 * 例: 「好印象+1」
 *
 * @param effect - カスタムスロット効果の構造化データ（nullの場合もある）
 * @param t - i18n の翻訳関数
 * @returns 翻訳済みの表示テキスト（nullなら空文字列）
 */
export function getCustomSlotEffectLabel(effect: CustomSlotEffectStructured | undefined, t: TFunction): string {
  if (!effect) return ''
  const { template, params } = effect
  const key = getEffectLabelKey(EffectSectionType.CustomSlotEffect, template)

  // パラメータがなければそのまま翻訳する
  if (!params || Object.keys(params).length === 0) {
    return t(key)
  }

  // パラメータを翻訳に渡す形に変換する（keyword系は翻訳が必要）
  const interpolation: Record<string, string | number> = {}
  if (params.keyword) interpolation.keyword = resolveKeyword(params.keyword, t)
  if (params.cond_keyword) interpolation.cond_keyword = resolveKeyword(params.cond_keyword, t)
  if (params.value) interpolation.value = params.value
  if (params.turns) interpolation.turns = params.turns
  if (params.pct) interpolation.pct = params.pct
  if (params.count) interpolation.count = params.count
  if (params.threshold != null) interpolation.threshold = params.threshold
  if (params.note) interpolation.note = params.note
  if (params.stage) interpolation.stage = params.stage

  return t(key, interpolation)
}

/**
 * カスタムスロットの段階番号を表示テキストに変換する
 *
 * @param stage - 段階番号（1, 2, 3...）
 * @param t - i18n の翻訳関数
 * @returns 翻訳済みのテキスト（例: "段階1"）
 */
export function getCustomSlotStageLabel(stage: number, t: TFunction): string {
  return t('card.custom_slot_stage' as TranslationKey, { n: stage })
}

/**
 * アビリティ名テンプレートの {v} を凸数に対応する値で置き換える
 *
 * @param template - 翻訳済みテンプレート文字列
 * @param uncap - 現在の凸数
 * @param values - 凸数→値のマップ
 * @returns 値を埋め込んだ文字列
 */
export function resolveAbilityValue(template: string, uncap: UncapType, values: Record<string, string>): string {
  const value = values[String(uncap)] ?? values['0'] ?? ''
  if (!value) return template
  return template.replace('{v}', value)
}

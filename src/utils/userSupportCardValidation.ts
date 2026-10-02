/**
 * ユーザー追加サポートフォームの出力検証
 *
 * サポートカードの形だけでなく、フォームの選択肢・固定枠・
 * 自動で決まる値との整合性まで確認する
 */
import * as constant from '../constant'
import * as data from '../data'
import type { Ability, PItem, SkillCardInfo, SupportCard, SupportEvent } from '../types/card'
import * as enums from '../types/enums'
import { deriveAbilityConfig } from './abilityDeriver'
import { resolveEffectTrigger } from './pItemResolver'
import { isSupportCard } from './supportCardValidation'
import { isRecord } from './valueValidation'

/** フォームで選択できるPアイテム由来アクションID */
const FORM_ACTION_IDS = new Set(data.PITEM_EFFECT_OPTIONS.map((option) => option.value))
/** フォームで選択できるPアイテム発動条件 */
const FORM_TRIGGER_KEYS = new Set(data.PITEM_TRIGGER_OPTIONS.map((option) => option.value))

/**
 * オブジェクトが指定したキーだけで構成されているか判定する
 *
 * @param value - 判定対象のオブジェクト
 * @param allowed - 許可するキー集合
 * @returns 許可されたキーだけで構成される場合はtrue
 */
function hasOnlyKeys(value: object, allowed: ReadonlySet<string>): boolean {
  // フォームのJSONにない項目を、外部入力から持ち込ませない
  return Object.keys(value).every((key) => allowed.has(key))
}

/**
 * オブジェクトが明示的にキーを持つか判定する
 *
 * @param value - 判定対象のオブジェクト
 * @param key - 確認するキー
 * @returns キーを直接持つ場合はtrue
 */
function hasOwnKey(value: object, key: enums.SupportCardFieldKeyType | enums.AbilityDerivedFlagType): boolean {
  // 値がundefinedでも、フォームがそのキーを出力したかどうかを区別する
  return Object.prototype.hasOwnProperty.call(value, key)
}

/**
 * フォームで使う非負の安全な整数か判定する
 *
 * @param value - 判定対象の値
 * @returns 非負の安全な整数の場合はtrue
 */
function isNonNegativeSafeInteger(value: unknown): value is number {
  // 回数・効果値を有限の整数へ限定し、NaNや小数をカード計算へ入れない
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/**
 * フォームで使う正の安全な整数か判定する
 *
 * @param value - 判定対象の値
 * @returns 正の安全な整数の場合はtrue
 */
function isPositiveSafeInteger(value: unknown): value is number {
  // 最大回数や提供アクション数は、0ではなく実際に1回以上であることを要求する
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

/**
 * アビリティが枠位置とレアリティの選択肢から生成されたものか判定する
 *
 * @param card - 検証対象のサポートカード
 * @param ability - 検証対象のアビリティ
 * @param slotIndex - アビリティの枠位置
 * @param rarityTier - フォームで選択したレアリティ層
 * @returns フォームの選択肢から生成された場合はtrue
 */
function isFormAbility(
  card: SupportCard,
  ability: Ability,
  slotIndex: number,
  rarityTier: enums.RarityTierType,
): boolean {
  // フォームの固定枠ごとに候補を再構成し、枠番号と無関係なアビリティを拒否する
  if (
    !hasOnlyKeys(ability, data.FORM_FIELD_KEYS[enums.SupportCardFormFieldGroupType.Ability]) ||
    Object.keys(ability.values).length !== 0
  )
    return false

  const fixedAbilities = new Set<enums.AbilityNameKeyType>([
    ...data.SLOT1_OPTIONS,
    ...data.SLOT3_OPTIONS,
    ...data.SLOT6_OPTIONS[rarityTier],
  ])
  // 固定枠以外は、そのレアリティで選べる能力から固定枠を除いた候補だけを使う
  const freeSlotAbilities = data.getAvailableAbilities(rarityTier).filter((nameKey) => !fixedAbilities.has(nameKey))
  const options =
    slotIndex === 0
      ? data.SLOT1_OPTIONS
      : slotIndex === 2
        ? data.SLOT3_OPTIONS
        : slotIndex === 5
          ? data.SLOT6_OPTIONS[rarityTier]
          : freeSlotAbilities
  if (!options.includes(ability.name_key)) return false

  // 能力名から自動導出される発動条件が、入力に書かれた値と一致するか確認する
  const expectedConfig = deriveAbilityConfig(ability.name_key, card.parameter_type)
  if (ability.trigger_key !== expectedConfig.triggerKey) return false
  // フォームは固定枠以外の選択時にカードの得意パラメータを保持する
  if (slotIndex === 2 || slotIndex === 5) {
    // 固定枠の能力は、フォームでカードの得意パラメータを入力しない形式に合わせる
    if (hasOwnKey(ability, enums.SupportCardFieldKeyType.ParameterType)) return false
  } else if (
    !hasOwnKey(ability, enums.SupportCardFieldKeyType.ParameterType) ||
    ability.parameter_type !== card.parameter_type
  )
    return false
  const expectedMaxCount = data.ABILITY_MAX_COUNT[ability.name_key]
  // 回数上限が定義される能力だけmax_countを持ち、それ以外はキー自体を持たない
  if (
    expectedMaxCount === undefined
      ? hasOwnKey(ability, enums.SupportCardFieldKeyType.MaxCount)
      : ability.max_count !== expectedMaxCount
  )
    return false

  const derivedFlags = [
    [enums.AbilityDerivedFlagType.IsPercentage, expectedConfig.isPercentage === true],
    [enums.AbilityDerivedFlagType.IsEventBoost, expectedConfig.isEventBoost === true],
    [enums.AbilityDerivedFlagType.IsParameterBonus, expectedConfig.isParameterBonus === true],
    [enums.AbilityDerivedFlagType.IsInitialStat, expectedConfig.isInitialStat === true],
    [enums.AbilityDerivedFlagType.SkipCalculation, expectedConfig.skipCalculation === true],
  ] as const satisfies ReadonlyArray<readonly [enums.AbilityDerivedFlagType, boolean]>
  // is_percentageなどの項目はフォーム入力ではなく能力名から自動で決まるため、手入力された矛盾する値を拒否する
  return derivedFlags.every(([key, expected]) => (expected ? ability[key] === true : !hasOwnKey(ability, key)))
}

/**
 * イベント1件がフォームから生成されたものか判定する
 *
 * @param event - 検証対象のイベント
 * @param release - 期待する解放条件
 * @param effectType - 期待するイベント効果種別
 * @param card - 検証対象のサポートカード
 * @returns フォームの選択肢から生成された場合はtrue
 */
function isFormEvent(
  event: SupportEvent,
  release: enums.ReleaseConditionType,
  effectType: enums.EventEffectType,
  card: SupportCard,
): boolean {
  // イベントの基本キーと固定解放条件を先に確認し、レアリティごとの構成判定を単純にする
  if (
    !hasOnlyKeys(event, data.FORM_FIELD_KEYS[enums.SupportCardFormFieldGroupType.Event]) ||
    event.release !== release ||
    event.effect_type !== effectType ||
    typeof event.title !== 'string'
  ) {
    return false
  }

  if (effectType === enums.EventEffectType.ParamBoost) {
    // パラメータ上昇イベントだけは、カード属性とレアリティから値が自動決定される
    return (
      hasOwnKey(event, enums.SupportCardFieldKeyType.ParamType) &&
      hasOwnKey(event, enums.SupportCardFieldKeyType.ParamValue) &&
      event.param_type === card.parameter_type &&
      event.param_value === data.EVENT_PARAM_VALUE[card.rarity]
    )
  }

  // その他のイベントでは、パラメータ専用フィールドを持たない
  return (
    !hasOwnKey(event, enums.SupportCardFieldKeyType.ParamType) &&
    !hasOwnKey(event, enums.SupportCardFieldKeyType.ParamValue)
  )
}

/**
 * フォームのイベント構成と、Pアイテム・スキルカードの対応を判定する
 *
 * @param card - 検証対象のサポートカード
 * @returns フォームのイベント構成として有効な場合はtrue
 */
function isFormEventConfiguration(card: SupportCard): boolean {
  // Rは固定された2つのイベント、それ以上のレアリティは
  // Pアイテムまたはスキルカードを含む構成を要求する
  const events = card.events
  const firstEvent = events[0]
  if (!firstEvent) return false

  if (card.rarity === enums.RarityType.R) {
    if (
      events.length !== 2 ||
      !isFormEvent(events[0], enums.ReleaseConditionType.Initial, enums.EventEffectType.ParamBoost, card) ||
      !isFormEvent(events[1], enums.ReleaseConditionType.Lv20, enums.EventEffectType.PpGain, card)
    ) {
      return false
    }
    return card.p_item === null && card.skill_card === null && card.is_event_source !== true
  }

  if (
    events.length < 2 ||
    events.length > 3 ||
    (firstEvent.effect_type !== enums.EventEffectType.PItem &&
      firstEvent.effect_type !== enums.EventEffectType.SkillCard) ||
    !isFormEvent(events[0], enums.ReleaseConditionType.Initial, firstEvent.effect_type, card) ||
    !isFormEvent(events[1], enums.ReleaseConditionType.Lv20, enums.EventEffectType.ParamBoost, card)
  ) {
    return false
  }

  if (events.length === 3) {
    // 3件目に許される効果は、SRとSSRで異なるためレアリティごとに候補を作る
    const thirdEventTypes: enums.EventEffectType[] =
      card.rarity === enums.RarityType.SSR
        ? [enums.EventEffectType.CardEnhance, enums.EventEffectType.CardChange, enums.EventEffectType.TroubleDelete]
        : [enums.EventEffectType.CardEnhance]
    if (
      !thirdEventTypes.includes(events[2].effect_type) ||
      !isFormEvent(events[2], enums.ReleaseConditionType.Lv40, events[2].effect_type, card)
    ) {
      return false
    }
  }

  if (firstEvent.effect_type === enums.EventEffectType.PItem) {
    // 1件目がPアイテムなら、カード本体にもPアイテムだけを持たせる
    return card.p_item !== null && card.skill_card === null && isFormPItem(card, card.p_item)
  }
  // 1件目がスキルカードなら、Pアイテムは持たずスキルカードだけを持たせる
  return card.p_item === null && card.skill_card !== null && isFormSkillCard(card.skill_card)
}

/**
 * Pアイテム効果の部品がフォーム出力のキーだけで構成されているか判定する
 *
 * @param value - 判定対象の効果部品
 * @returns フォーム出力の効果部品として有効な場合はtrue
 */
function isFormEffectPart(value: unknown): value is Record<string, unknown> {
  // Pアイテム効果の各部品に、フォームへ存在しない条件式や制御情報を混ぜない
  return isRecord(value) && hasOnlyKeys(value, data.FORM_FIELD_KEYS[enums.SupportCardFormFieldGroupType.EffectPart])
}

/**
 * Pアイテムがフォームの入力値から生成されたものか判定する
 *
 * @param card - 検証対象のサポートカード
 * @param pItem - 検証対象のPアイテム
 * @returns フォームの入力値から生成された場合はtrue
 */
function isFormPItem(card: SupportCard, pItem: PItem): boolean {
  // Pアイテムのレアリティ・記憶可否・効果構造をフォームの出力規則と照合する
  if (
    !hasOnlyKeys(pItem, data.FORM_FIELD_KEYS[enums.SupportCardFormFieldGroupType.PItem]) ||
    pItem.name.trim() === '' ||
    pItem.rarity !== (card.rarity === enums.RarityType.SSR ? enums.PItemRarityType.SSR : enums.PItemRarityType.SR) ||
    pItem.memory !== enums.PItemMemoryType.NonMemorizable ||
    pItem.actions !== undefined
  ) {
    return false
  }

  const triggerKey = pItem.trigger_key
  if (triggerKey === undefined || triggerKey === enums.TriggerKeyType.None) {
    // トリガーなしの場合は、boostやeffectなどの連動フィールドを一切持たない
    return (
      triggerKey === undefined &&
      pItem.boost === undefined &&
      pItem.provided_action_ids === undefined &&
      pItem.effect === undefined
    )
  }

  if (!FORM_TRIGGER_KEYS.has(triggerKey) || !isFormBoost(card, pItem)) return false

  const providedActionIds = pItem.provided_action_ids
  if (providedActionIds !== undefined) {
    // 提供アクションはフォーム選択肢にあるIDだけを、正の整数回数で受け付ける
    if (
      Object.keys(providedActionIds).length === 0 ||
      !hasOnlyKeys(providedActionIds, FORM_ACTION_IDS) ||
      Object.values(providedActionIds).some((count) => !isPositiveSafeInteger(count))
    ) {
      return false
    }
  }

  const boostValue = pItem.boost!.value
  const maxCount = pItem.boost!.max_count
  const hasEffect = boostValue > 0 || (maxCount ?? 0) > 0 || providedActionIds !== undefined
  // 効果が実質的に空ならeffectを省略できるが、効果がある場合は発動条件・内容・上限をすべて照合する
  if (!hasEffect) return pItem.effect === undefined
  if (
    !pItem.effect ||
    !hasOnlyKeys(pItem.effect, data.FORM_FIELD_KEYS[enums.SupportCardFormFieldGroupType.PItemEffect])
  )
    return false

  const expectedBody: Record<string, unknown>[] = []
  // boostと提供アクションから、フォームが自動生成するeffect.bodyを再構成する
  if (boostValue > 0) {
    expectedBody.push({ key: enums.EffectTemplateKeyType.ParamUp, param: card.parameter_type, value: boostValue })
  }
  for (const [actionId, count] of Object.entries(providedActionIds ?? {})) {
    expectedBody.push({ key: enums.EffectTemplateKeyType.SimpleEffectCount, action_id: actionId, count })
  }

  const body = pItem.effect.body
  if (
    JSON.stringify(pItem.effect.trigger) !== JSON.stringify(resolveEffectTrigger(triggerKey)) ||
    pItem.effect.restriction !== undefined ||
    pItem.effect.condition !== undefined ||
    body.length !== expectedBody.length ||
    body.some((part, index) => !isFormEffectPart(part) || JSON.stringify(part) !== JSON.stringify(expectedBody[index]))
  ) {
    return false
  }

  if (maxCount === undefined) return pItem.effect.limit === undefined
  // max_countがある場合だけ、発動回数上限をPerProduce形式で保持する
  return (
    pItem.effect.limit !== undefined &&
    isFormEffectPart(pItem.effect.limit) &&
    JSON.stringify(pItem.effect.limit) ===
      JSON.stringify({ key: enums.EffectTemplateKeyType.PerProduce, count: maxCount })
  )
}

/**
 * Pアイテムのブースト値がフォームの固定連動値と一致するか判定する
 *
 * @param card - 検証対象のサポートカード
 * @param pItem - 検証対象のPアイテム
 * @returns フォームの固定連動値と一致する場合はtrue
 */
function isFormBoost(card: SupportCard, pItem: PItem): boolean {
  // boostはPアイテムのトリガーとカードの得意属性から固定される連動値
  const boost = pItem.boost
  if (!boost || boost.trigger_key !== pItem.trigger_key || boost.parameter_type !== card.parameter_type) return false
  if (!isNonNegativeSafeInteger(boost.value)) return false
  return boost.max_count === undefined || isPositiveSafeInteger(boost.max_count)
}

/**
 * スキルカードがフォームの簡易入力から生成されたものか判定する
 *
 * @param skillCard - 検証対象のスキルカード
 * @returns フォームの簡易入力から生成された場合はtrue
 */
function isFormSkillCard(skillCard: SkillCardInfo): boolean {
  // 簡易フォームではスキル効果本体を入力しないため、空の初期構造だけを許可する
  const skillRarities: enums.SkillCardRarityType[] = [enums.SkillCardRarityType.SSR, enums.SkillCardRarityType.SR]
  const skillTypes: enums.SkillCardType[] = [enums.SkillCardType.Mental, enums.SkillCardType.Active]
  return (
    hasOnlyKeys(skillCard, data.FORM_FIELD_KEYS[enums.SupportCardFormFieldGroupType.SkillCard]) &&
    skillCard.name.trim() !== '' &&
    skillRarities.includes(skillCard.rarity) &&
    skillTypes.includes(skillCard.type) &&
    skillCard.lesson_limit === 0 &&
    skillCard.no_duplicate === false &&
    skillCard.effects.length === 0 &&
    skillCard.custom_cap === 0 &&
    skillCard.custom_slot.length === 0
  )
}

/**
 * ユーザー追加サポートがフォームの選択肢だけで構成されているか判定する
 *
 * @param value - 検証対象の値
 * @returns フォームで保存できるSupportCardならtrue
 */
export function isUserSupportCardFormValue(value: unknown): value is SupportCard {
  // まずサポートカードの基本形を確認し、その後フォームで保存できる項目と自動で決まる値を確認する
  if (!isSupportCard(value)) return false

  const card = value
  if (
    !hasOnlyKeys(card, data.FORM_FIELD_KEYS[enums.SupportCardFormFieldGroupType.SupportCard]) ||
    card.name.trim() === '' ||
    card.name.length > constant.USER_SUPPORT_NAME_MAX_LENGTH ||
    card.source !== enums.SourceType.User ||
    card.type === enums.CardType.Assist ||
    card.parameter_type !== card.type ||
    card.source_detail !== undefined ||
    card.release_date.trim() === '' ||
    !/^\d{4}\/\d{2}\/\d{2}$/.test(card.release_date) ||
    (card.is_event_source !== undefined && card.is_event_source !== true) ||
    (card.rarity !== enums.RarityType.SSR && card.is_event_source === true) ||
    card.abilities.length !== constant.SLOT_COUNT
  ) {
    return false
  }

  const rarityTier =
    card.rarity === enums.RarityType.SSR
      ? card.is_event_source === true
        ? enums.RarityTierType.EventSSR
        : enums.RarityTierType.SSR
      : card.rarity
  // フォームは常に6枠を出力するため、各枠を同じ順番で検証する
  if (!card.abilities.every((ability, index) => isFormAbility(card, ability, index, rarityTier))) return false

  // イベントとPアイテム・スキルカードの組み合わせまで確認して、初めて保存可能とする
  return isFormEventConfiguration(card)
}

/**
 * ユーザー定義サポートフォームのヘルパー関数・型定義
 *
 * フォーム状態の初期化・復元・正規化を担当する。
 * useUserCardForm フックから分離した純粋関数群。
 */
import type { SupportCard } from '../types/card'
import * as enums from '../types/enums'
import * as constant from '../constant'
import * as data from '../data'

/** アビリティ入力行の状態 */
export interface AbilityFormRow {
  /** アビリティ種別 */
  nameKey: enums.AbilityNameKeyType
  /** パラメータ種別（パラメータ特化型の場合） */
  parameterType?: enums.ParameterType
  /** 最大回数（空文字 = 無制限） */
  maxCount: string
}

/** イベント入力行の状態 */
export interface EventFormRow {
  /** 効果種別 */
  effectType: enums.EventEffectType
  /** パラメータ種別（param_boost のみ） */
  paramType: enums.ParameterType
  /** パラメータ上昇値（param_boost のみ） */
  paramValue: string
  /** コミュ名 */
  title: string
}

/** Pアイテム発動時効果の入力行 */
export interface PItemEffectRow {
  /** 効果のアクションID */
  action: enums.ActionIdType
  /** 1発動あたりの回数（空文字 = 1） */
  count: string
}

/** フォーム全体の状態 */
export interface UserCardFormState {
  /** カード名 */
  name: string
  /** レアリティ */
  rarity: enums.RarityType
  /** タイプ */
  type: enums.CardType
  /** プラン */
  plan: enums.PlanType
  /** パラメータ種別 */
  parameterType: enums.ParameterType
  /** アビリティ一覧 */
  abilities: AbilityFormRow[]
  /** イベント一覧（initial, lv20, lv40） */
  events: [EventFormRow, EventFormRow, EventFormRow]
  /** Pアイテムあり */
  hasPItem: boolean
  /** Pアイテム：トリガーキー */
  pItemTrigger: enums.TriggerKeyType
  /** Pアイテム：パラメータ種別 */
  pItemParamType: enums.ParameterType
  /** Pアイテム：上昇値 */
  pItemValue: string
  /** Pアイテム：発動時効果（複数設定可、各効果に回数付き） */
  pItemEffects: PItemEffectRow[]
  /** Pアイテム：発動回数（プロデュース中、空文字 = 無制限） */
  pItemEffectCount: string
  /** イベントSSR（is_event_source） */
  isEventSource: boolean
  /** スキルカードあり */
  hasSkillCard: boolean
  /** スキルカード：種別 */
  skillCardType: enums.SkillCardType
  /** スキルカード：レアリティ */
  skillCardRarity: enums.SkillCardRarityType
}

/** emptyEventRow は空のイベント行を生成する */
export function emptyEventRow(): EventFormRow {
  return {
    effectType: enums.EventEffectType.ParamBoost,
    paramType: enums.ParameterType.Vocal,
    paramValue: '',
    title: '',
  }
}

/** emptyAbilityRow は空のアビリティ行を生成する */
function emptyAbilityRow(): AbilityFormRow {
  return {
    nameKey: '' as enums.AbilityNameKeyType,
    maxCount: '',
  }
}

/** createDefaultAbilities は固定スロットのデフォルト値を含むアビリティ配列を生成する */
export function createDefaultAbilities(): AbilityFormRow[] {
  return Array.from({ length: constant.SLOT_COUNT }, (_, i) => {
    // スロット3（idx 2）: SupportRate 固定
    if (i === 2) {
      return { nameKey: enums.AbilityNameKeyType.SupportRate, maxCount: '' }
    }
    // スロット6（idx 5）: EventBoost 固定
    if (i === 5) {
      return { nameKey: enums.AbilityNameKeyType.EventBoost, maxCount: '' }
    }
    return emptyAbilityRow()
  })
}

/** createInitialState はフォームの初期状態を生成する */
export function createInitialState(): UserCardFormState {
  return {
    name: '',
    rarity: enums.RarityType.SSR,
    type: enums.CardType.Vocal,
    plan: enums.PlanType.Free,
    parameterType: enums.ParameterType.Vocal,
    abilities: createDefaultAbilities(),
    events: [
      { effectType: enums.EventEffectType.PItem, paramType: enums.ParameterType.Vocal, paramValue: '', title: '' },
      {
        effectType: enums.EventEffectType.ParamBoost,
        paramType: enums.ParameterType.Vocal,
        paramValue: '20',
        title: '',
      },
      {
        effectType: enums.EventEffectType.CardEnhance,
        paramType: enums.ParameterType.Vocal,
        paramValue: '',
        title: '',
      },
    ],
    hasPItem: true,
    pItemTrigger: enums.TriggerKeyType.None,
    pItemParamType: enums.ParameterType.Vocal,
    pItemValue: '',
    pItemEffects: [],
    pItemEffectCount: '',
    isEventSource: false,
    hasSkillCard: false,
    skillCardType: enums.SkillCardType.Mental,
    skillCardRarity: enums.SkillCardRarityType.SSR,
  }
}

/** normalizePItemActions は delete+trouble_delete の組み合わせを trouble_delete のみに正規化する */
function normalizePItemActions(actions: enums.PItemActionType[]): enums.PItemActionType[] {
  if (actions.includes(enums.PItemActionType.Delete) && actions.includes(enums.PItemActionType.TroubleDelete)) {
    return actions.filter((a) => a !== enums.PItemActionType.Delete)
  }
  return actions
}

/** PItemActionType を汎用 ActionIdType に変換する（マスタデータ読み込み用） */
function pItemActionToActionId(action: enums.PItemActionType): enums.ActionIdType {
  switch (action) {
    case enums.PItemActionType.Enhance:
      return enums.ActionIdType.SkillEnhance
    case enums.PItemActionType.Delete:
      return enums.ActionIdType.Delete
    case enums.PItemActionType.Change:
      return enums.ActionIdType.Change
    case enums.PItemActionType.TroubleDelete:
      return enums.ActionIdType.TroubleDelete
    case enums.PItemActionType.PDrinkAcquire:
      return enums.ActionIdType.PDrinkAcquire
    default:
      return enums.ActionIdType.SkillEnhance
  }
}

/** getRarityTier はレアリティとイベントSSRフラグからレアリティ階層を導出する */
export function getRarityTier(rarity: enums.RarityType, isEventSource: boolean): enums.RarityTierType {
  if (rarity !== enums.RarityType.SSR) return rarity as enums.RarityTierType
  return isEventSource ? enums.RarityTierType.EventSSR : enums.RarityTierType.SSR
}

/** cleanAbilityLabel はアビリティ名のテンプレートから値プレースホルダを除去する */
export function cleanAbilityLabel(raw: string): string {
  return raw
    .replace(/\+\{v\}/g, '')
    .replace(/\{v\}/g, '')
    .replace(/（プロデュース中\d*回）/g, '')
    .replace(/\+N/g, '')
    .replace(/、\s*上昇/g, '')
    .trim()
}

/** getSlotOptions はスロット位置に応じたアビリティ選択肢を返す */
export function getSlotOptions(
  slotIdx: number,
  rarityTier: enums.RarityTierType,
  freeSlotAbilities: readonly enums.AbilityNameKeyType[],
): readonly enums.AbilityNameKeyType[] {
  switch (slotIdx) {
    case 0:
      return data.SLOT1_OPTIONS
    case 2:
      return data.SLOT3_OPTIONS
    case 5:
      return data.SLOT6_OPTIONS[rarityTier]
    default:
      return freeSlotAbilities
  }
}

/** cardToFormState は既存のカードからフォーム状態を復元する */
export function cardToFormState(card: SupportCard): UserCardFormState {
  const eventRows: [EventFormRow, EventFormRow, EventFormRow] = [emptyEventRow(), emptyEventRow(), emptyEventRow()]
  const releaseOrder: enums.ReleaseConditionType[] = [
    enums.ReleaseConditionType.Initial,
    enums.ReleaseConditionType.Lv20,
    enums.ReleaseConditionType.Lv40,
  ]
  for (const evt of card.events) {
    const idx = releaseOrder.indexOf(evt.release)
    if (idx >= 0) {
      eventRows[idx] = {
        effectType: evt.effect_type,
        paramType: evt.param_type ?? enums.ParameterType.Vocal,
        paramValue: evt.param_value != null ? String(evt.param_value) : '',
        title: evt.title,
      }
    }
  }

  return {
    name: card.name,
    rarity: card.rarity,
    type: card.type,
    plan: card.plan,
    parameterType: card.parameter_type,
    abilities: Array.from({ length: constant.SLOT_COUNT }, (_, i) => {
      const a = card.abilities[i]
      if (!a) return emptyAbilityRow()
      return {
        nameKey: a.name_key,
        parameterType: a.parameter_type,
        maxCount: a.max_count != null ? String(a.max_count) : '',
      }
    }),
    events: eventRows,
    hasPItem: card.p_item !== null,
    pItemTrigger: card.p_item?.trigger_key ?? card.p_item?.boost?.trigger_key ?? enums.TriggerKeyType.None,
    pItemParamType: card.p_item?.boost?.parameter_type ?? enums.ParameterType.Vocal,
    pItemValue: card.p_item?.boost?.value != null ? String(card.p_item.boost.value) : '',
    pItemEffects: (() => {
      // provided_action_ids がある場合（ユーザー定義）はそのまま復元する
      if (card.p_item?.provided_action_ids) {
        return Object.entries(card.p_item.provided_action_ids).map(([actionId, count]) => ({
          action: actionId as enums.ActionIdType,
          count: count != null && count > 0 ? String(count) : '',
        }))
      }
      // マスタデータの場合は PItemActionType → ActionIdType に変換する
      const actions = normalizePItemActions(card.p_item?.actions ?? [])
      return actions.map((action) => ({
        action: pItemActionToActionId(action),
        count: '',
      }))
    })(),
    pItemEffectCount:
      card.p_item?.boost?.max_count != null && card.p_item.boost.max_count > 0
        ? String(card.p_item.boost.max_count)
        : card.p_item?.effect?.limit?.count != null && card.p_item.effect.limit.count > 0
          ? String(card.p_item.effect.limit.count)
          : '',
    isEventSource: card.is_event_source ?? false,
    hasSkillCard: card.skill_card !== null,
    skillCardType: card.skill_card?.type ?? enums.SkillCardType.Mental,
    skillCardRarity: card.skill_card?.rarity ?? enums.SkillCardRarityType.SSR,
  }
}

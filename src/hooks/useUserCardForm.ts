/**
 * ユーザー定義サポートフォームの状態管理フック
 *
 * サポート追加・編集モーダルの入力状態と検証、
 * 保存用サポートデータへの変換を提供する
 */
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as data from '../data'
import type { Ability, SkillCardInfo, SupportCard, SupportEvent } from '../types/card'
import * as enums from '../types/enums'
import { deriveAbilityConfig } from '../utils/abilityDeriver'
import { resolveEffectTrigger } from '../utils/pItemResolver'
import type { AbilityFormRow, EventFormRow, UserCardFormEvents, UserCardFormState } from '../utils/userCardForm'
import { cardToFormState, createDefaultAbilities, createInitialState, emptyEventRow } from '../utils/userCardForm'
import { isEnumValue } from '../utils/valueValidation'

/** ユーザー追加フォームで選べるアクションIDの一覧（入力値の確認用） */
const VALID_ACTION_IDS = new Set<string>(data.PITEM_EFFECT_OPTIONS.map((opt) => opt.value))

/** Pアイテム発動時のアクション回数を保存形式へまとめた1項目 */
type SimpleActionBodyEntry = {
  [enums.SupportCardFieldKeyType.Key]: typeof enums.EffectTemplateKeyType.SimpleEffectCount
  [enums.SupportCardFieldKeyType.ActionId]: enums.ActionIdType
  [enums.SupportCardFieldKeyType.Count]: number
}

/**
 * フォームのアクションIDと回数を、保存できる効果データへ変換する
 * 表示文言への変換は、保存後にアプリ側で行う
 *
 * @param action - 変換するアクションID
 * @param count - アクションの回数
 * @returns カード効果の項目。不正なアクションならnull
 */
function actionIdToBodyEntry(action: enums.ActionIdType, count: number): SimpleActionBodyEntry | null {
  if (!VALID_ACTION_IDS.has(action)) return null
  return {
    [enums.SupportCardFieldKeyType.Key]: enums.EffectTemplateKeyType.SimpleEffectCount,
    [enums.SupportCardFieldKeyType.ActionId]: action,
    [enums.SupportCardFieldKeyType.Count]: count,
  }
}

/** バリデーションエラー */
export interface FormValidation {
  /** カード名エラー */
  nameError?: data.FormErrorType
  /** アビリティエラー */
  abilityError?: data.FormErrorType
  /** Pアイテム操作回数エラー */
  pItemBodyCountError?: data.FormErrorType
  /** Pアイテム発動条件エラー */
  pItemTriggerError?: data.FormErrorType
}

/**
 * ユーザー定義サポートのフォーム状態管理フック
 *
 * @param editingCard - 編集時の元サポート（新規作成時は undefined）
 * @param existingNames - 既存サポート名の集合（重複チェック用）
 * @returns フォーム状態・更新関数・入力検証・保存用サポートへの変換関数
 */
export function useUserCardForm(editingCard?: SupportCard, existingNames?: Set<string>) {
  const { t } = useTranslation()
  const [form, setForm] = useState<UserCardFormState>(
    editingCard ? () => cardToFormState(editingCard) : createInitialState,
  )

  // フィールド更新ヘルパー
  const updateField = useCallback(<K extends keyof UserCardFormState>(key: K, value: UserCardFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  // レアリティ変更時にイベント構成を自動調整する
  const setRarity = useCallback((rarity: enums.RarityType) => {
    setForm((prev) => {
      const paramType = prev.parameterType
      // レアリティ変更時はアビリティをリセット（選択可能アビリティが変わるため）
      const abilities = createDefaultAbilities()
      if (rarity === enums.RarityType.R) {
        // R: パラメータ上昇 + Pポイント獲得（PItem/SkillCard なし）
        return {
          ...prev,
          rarity,
          abilities,
          hasPItem: false,
          hasSkillCard: false,
          isEventSource: false,
          events: [
            {
              effectType: enums.EventEffectType.ParamBoost,
              paramType,
              paramValue: String(data.EVENT_PARAM_VALUE[rarity]),
              title: '',
            },
            { effectType: enums.EventEffectType.PpGain, paramType, paramValue: '', title: '' },
            emptyEventRow(),
          ],
        }
      }
      // SR/SSR: PItem + ParamBoost + CardEnhance
      return {
        ...prev,
        rarity,
        abilities,
        events: [
          { effectType: enums.EventEffectType.PItem, paramType, paramValue: '', title: '' },
          {
            effectType: enums.EventEffectType.ParamBoost,
            paramType,
            paramValue: String(data.EVENT_PARAM_VALUE[rarity]),
            title: '',
          },
          { effectType: enums.EventEffectType.CardEnhance, paramType, paramValue: '', title: '' },
        ],
        hasPItem: true,
        hasSkillCard: false,
      }
    })
  }, [])

  // タイプ変更時にパラメータ種別を連動させる（既存アビリティ・Pアイテムも更新）
  const setType = useCallback((type: enums.CardType) => {
    setForm((prev) => {
      const parameterType =
        type === enums.CardType.Assist
          ? prev.parameterType
          : isEnumValue(type, enums.ParameterType)
            ? type
            : prev.parameterType
      // 既存アビリティの parameterType も新しいタイプに更新する
      const abilities = prev.abilities.map((row) => (row.parameterType ? { ...row, parameterType } : row))
      return { ...prev, type, parameterType, pItemParamType: parameterType, abilities }
    })
  }, [])

  // イベントSSR変更時にアビリティをリセット（選択可能アビリティが変わるため）
  const setIsEventSource = useCallback((isEventSource: boolean) => {
    setForm((prev) => ({
      ...prev,
      isEventSource,
      abilities: createDefaultAbilities(),
    }))
  }, [])

  // アビリティ操作
  const addAbility = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      abilities: [
        ...prev.abilities,
        {
          nameKey: enums.AbilityNameKeyType.LessonEnd,
          parameterType: prev.parameterType,
          maxCount: '',
        } satisfies AbilityFormRow,
      ],
    }))
  }, [])

  const updateAbility = useCallback((index: number, row: AbilityFormRow) => {
    setForm((prev) => {
      const abilities = [...prev.abilities]
      abilities[index] = row
      return { ...prev, abilities }
    })
  }, [])

  const removeAbility = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      abilities: prev.abilities.filter((_, i) => i !== index),
    }))
  }, [])

  // イベント操作
  const updateEvent = useCallback((index: number, row: EventFormRow) => {
    setForm((prev) => {
      // 3つの固定イベント行を保ったまま、指定された行だけを差し替える
      const events: UserCardFormEvents = [prev.events[0], prev.events[1], prev.events[2]]
      events[index] = row
      return { ...prev, events }
    })
  }, [])

  // バリデーション
  const validation = useMemo<FormValidation>(() => {
    const errors: FormValidation = {}
    if (!form.name.trim()) {
      errors.nameError = data.FormErrorType.NameRequired
    }
    // 編集時は自分自身の名前を除外して重複チェック
    const checkName = form.name.trim()
    if (existingNames) {
      const isOwnName = editingCard?.name === checkName
      if (!isOwnName && existingNames.has(checkName)) {
        errors.nameError = data.FormErrorType.NameDuplicate
      }
    }
    // すべてのアビリティスロットが埋まっている必要がある
    const allFilled = form.abilities.every((row) => row.nameKey !== enums.AbilityFormValueType.None)
    if (!allFilled) {
      errors.abilityError = data.FormErrorType.AbilityRequired
    }
    // Pアイテムの発動条件と効果がある場合は、効果ごとの回数を必須にする
    if (form.hasPItem && form.pItemTrigger !== enums.TriggerKeyType.None && form.pItemEffects.some((e) => !e.count)) {
      errors.pItemBodyCountError = data.FormErrorType.BodyCountRequired
    }
    return errors
  }, [form.name, form.abilities, form.hasPItem, form.pItemEffects, form.pItemTrigger, existingNames, editingCard])

  /** フォーム状態をサポートカードへ変換する */
  const toSupportCard = useCallback((): SupportCard => {
    // 入力済みの行だけをサポートカードのアビリティへ変換する
    // 通常は検証済みの6行が対象
    // 未入力行を無効な値で保存しないよう、
    // フォーム専用の未選択値はここで除外する
    const abilities: Ability[] = form.abilities
      .filter(
        (row): row is AbilityFormRow & { nameKey: enums.AbilityNameKeyType } =>
          row.nameKey !== enums.AbilityFormValueType.None,
      )
      .map((row) => {
        const derived = deriveAbilityConfig(row.nameKey, row.parameterType)
        return {
          [enums.SupportCardFieldKeyType.NameKey]: row.nameKey,
          [enums.SupportCardFieldKeyType.TriggerKey]: derived.triggerKey,
          [enums.SupportCardFieldKeyType.Values]: {},
          ...(row.parameterType && { [enums.SupportCardFieldKeyType.ParameterType]: row.parameterType }),
          ...(row.maxCount && { [enums.SupportCardFieldKeyType.MaxCount]: Number(row.maxCount) }),
          ...(derived.isPercentage && { [enums.AbilityDerivedFlagType.IsPercentage]: true }),
          ...(derived.isParameterBonus && { [enums.AbilityDerivedFlagType.IsParameterBonus]: true }),
          ...(derived.isInitialStat && { [enums.AbilityDerivedFlagType.IsInitialStat]: true }),
          ...(derived.isEventBoost && { [enums.AbilityDerivedFlagType.IsEventBoost]: true }),
          ...(derived.skipCalculation && { [enums.AbilityDerivedFlagType.SkipCalculation]: true }),
        }
      })

    // イベント入力をサポートカードのイベントへ変換する
    // パラメータ上昇値はレアリティから自動で決める
    // 3番目のパラメータ上昇イベントで値がなければ除外する
    const eventParamValue = data.EVENT_PARAM_VALUE[form.rarity]
    const paramType = form.parameterType
    const events: SupportEvent[] = form.events
      .filter((row, i) => {
        // 空のイベント行を除外する
        if (i === 2 && row.effectType === enums.EventEffectType.ParamBoost && !row.paramValue) return false
        // PpGain は空イベント行のデフォルトと同じ扱い
        if (row.effectType === enums.EventEffectType.PpGain) return true
        return true
      })
      .map((row, i) => ({
        [enums.SupportCardFieldKeyType.Release]: [
          enums.ReleaseConditionType.Initial,
          enums.ReleaseConditionType.Lv20,
          enums.ReleaseConditionType.Lv40,
        ][i],
        [enums.SupportCardFieldKeyType.EffectType]: row.effectType,
        [enums.SupportCardFieldKeyType.Title]: row.title,
        ...(row.effectType === enums.EventEffectType.ParamBoost && {
          [enums.SupportCardFieldKeyType.ParamType]: paramType,
          [enums.SupportCardFieldKeyType.ParamValue]: eventParamValue,
        }),
      }))

    // Pアイテムの発動効果と提供アクションを組み立てる
    const effectCount = Number(form.pItemEffectCount) || 0
    // 発動条件が未指定の場合は効果データを作らない
    const isNoneTrigger = form.pItemTrigger === enums.TriggerKeyType.None
    // 発動回数・効果・上昇値のいずれかがある場合だけ効果データを組み立てる
    const pItemValue = Number(form.pItemValue) || 0
    const hasPItemEffect = !isNoneTrigger && (effectCount > 0 || pItemValue > 0 || form.pItemEffects.length > 0)
    // Pアイテムが提供するアクションIDごとの回数表を、各効果から組み立てる
    const providedActionIds: Partial<Record<enums.ActionIdType, number>> = {}
    for (const effect of form.pItemEffects) {
      const count = Number(effect.count) || 1
      providedActionIds[effect.action] = (providedActionIds[effect.action] ?? 0) + count
    }
    const buildPItemEffect = () => {
      // 上昇値、発動時効果の順に、効果の項目を作る
      const body: { key: enums.EffectTemplateKeyType; [k: string]: unknown }[] = []
      if (pItemValue > 0) {
        body.push({
          [enums.SupportCardFieldKeyType.Key]: enums.EffectTemplateKeyType.ParamUp,
          [enums.SupportCardFieldKeyType.Param]: form.pItemParamType,
          [enums.SupportCardFieldKeyType.Value]: pItemValue,
        })
      }
      // 発動時効果を項目へ変換し、同じアクションの回数はまとめる
      const bodyMap = new Map<string, SimpleActionBodyEntry>()
      for (const effect of form.pItemEffects) {
        const count = Number(effect.count) || 1
        const entry = actionIdToBodyEntry(effect.action, count)
        if (!entry) continue
        // 同じ種類・アクションの項目を1つにまとめられるキーを作る
        const mapKey = `${entry[enums.SupportCardFieldKeyType.Key]}:${entry[enums.SupportCardFieldKeyType.ActionId]}`
        const existing = bodyMap.get(mapKey)
        if (existing) {
          existing[enums.SupportCardFieldKeyType.Count] += entry[enums.SupportCardFieldKeyType.Count]
        } else {
          bodyMap.set(mapKey, { ...entry })
        }
      }
      for (const entry of bodyMap.values()) body.push(entry)
      return {
        [enums.SupportCardFieldKeyType.Trigger]: resolveEffectTrigger(form.pItemTrigger),
        [enums.SupportCardFieldKeyType.Body]: body,
        ...(effectCount > 0 && {
          [enums.SupportCardFieldKeyType.Limit]: {
            [enums.SupportCardFieldKeyType.Key]: enums.EffectTemplateKeyType.PerProduce,
            [enums.SupportCardFieldKeyType.Count]: effectCount,
          },
        }),
      }
    }
    const pItem = form.hasPItem
      ? {
          [enums.SupportCardFieldKeyType.Name]: t('user_support.pitem_name_suffix', { name: form.name }),
          [enums.SupportCardFieldKeyType.Rarity]:
            form.rarity === enums.RarityType.SSR ? enums.PItemRarityType.SSR : enums.PItemRarityType.SR,
          [enums.SupportCardFieldKeyType.Memory]: enums.PItemMemoryType.NonMemorizable,
          ...(!isNoneTrigger && { [enums.SupportCardFieldKeyType.TriggerKey]: form.pItemTrigger }),
          ...(!isNoneTrigger && {
            [enums.SupportCardFieldKeyType.Boost]: {
              [enums.SupportCardFieldKeyType.TriggerKey]: form.pItemTrigger,
              [enums.SupportCardFieldKeyType.ParameterType]: form.pItemParamType,
              [enums.SupportCardFieldKeyType.Value]: Number(form.pItemValue) || 0,
              ...(effectCount > 0 && { [enums.SupportCardFieldKeyType.MaxCount]: effectCount }),
            },
          }),
          ...(!isNoneTrigger &&
            form.pItemEffects.length > 0 && { [enums.SupportCardFieldKeyType.ProvidedActionIds]: providedActionIds }),
          ...(hasPItemEffect && { [enums.SupportCardFieldKeyType.Effect]: buildPItemEffect() }),
        }
      : null

    // スキルカード（簡易版）
    const skillCard: SkillCardInfo | null = form.hasSkillCard
      ? {
          [enums.SupportCardFieldKeyType.Name]: t('user_support.skillcard_name_suffix', { name: form.name }),
          [enums.SupportCardFieldKeyType.Rarity]: form.skillCardRarity,
          [enums.SupportCardFieldKeyType.Type]: form.skillCardType,
          [enums.SupportCardFieldKeyType.LessonLimit]: 0,
          [enums.SupportCardFieldKeyType.NoDuplicate]: false,
          [enums.SupportCardFieldKeyType.Effects]: [],
          [enums.SupportCardFieldKeyType.CustomCap]: 0,
          [enums.SupportCardFieldKeyType.CustomSlot]: [],
        }
      : null

    const today = new Date()
    const releaseDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`

    return {
      [enums.SupportCardFieldKeyType.Name]: form.name.trim(),
      [enums.SupportCardFieldKeyType.Rarity]: form.rarity,
      [enums.SupportCardFieldKeyType.Type]: form.type,
      [enums.SupportCardFieldKeyType.Plan]: form.plan,
      [enums.SupportCardFieldKeyType.ParameterType]: form.parameterType,
      [enums.SupportCardFieldKeyType.Source]: enums.SourceType.User,
      ...(form.isEventSource && { [enums.SupportCardFieldKeyType.IsEventSource]: true }),
      [enums.SupportCardFieldKeyType.ReleaseDate]: editingCard?.release_date ?? releaseDate,
      [enums.SupportCardFieldKeyType.Abilities]: abilities,
      [enums.SupportCardFieldKeyType.Events]: events,
      [enums.SupportCardFieldKeyType.PItem]: pItem,
      [enums.SupportCardFieldKeyType.SkillCard]: skillCard,
    }
  }, [form, editingCard, t])

  const isValid =
    !validation.nameError &&
    !validation.abilityError &&
    !validation.pItemBodyCountError &&
    !validation.pItemTriggerError

  return {
    form,
    updateField,
    setRarity,
    setType,
    setIsEventSource,
    addAbility,
    updateAbility,
    removeAbility,
    updateEvent,
    validation,
    isValid,
    toSupportCard,
  }
}

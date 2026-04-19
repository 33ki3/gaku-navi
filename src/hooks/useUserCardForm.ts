/**
 * ユーザー定義サポートフォームの状態管理フック
 *
 * サポート追加・編集モーダルの入力状態、バリデーション、
 * SupportCard への変換ロジックを提供する。
 */
import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupportCard, Ability, SupportEvent, SkillCardInfo } from '../types/card'
import * as enums from '../types/enums'
import * as data from '../data'
import type { TranslationKey } from '../i18n'
import { emptyEventRow, createDefaultAbilities, createInitialState, cardToFormState } from './formHelpers'
import type { AbilityFormRow, EventFormRow, UserCardFormState } from './formHelpers'
import { deriveAbilityConfig } from '../utils/abilityDeriver'
import { resolveEffectTrigger } from '../utils/pItemResolver'

/** 有効な ActionIdType のセット（存在チェック用） */
const VALID_ACTION_IDS = new Set<string>(data.PITEM_EFFECT_OPTIONS.map((opt) => opt.value))

/** ActionIdType → effect.body エントリに変換する（表示用）。action_id を保存し i18n 解決はアプリ側で行う */
function actionIdToBodyEntry(
  action: enums.ActionIdType,
  count: number,
): { key: enums.EffectTemplateKeyType; [k: string]: unknown } | null {
  if (!VALID_ACTION_IDS.has(action)) return null
  return { key: enums.EffectTemplateKeyType.SimpleEffectCount, action_id: action, count }
}

/** バリデーションエラー */
export interface FormValidation {
  /** カード名エラーメッセージの i18n キー */
  nameError?: TranslationKey
  /** アビリティエラーメッセージの i18n キー */
  abilityError?: TranslationKey
  /** Pアイテム操作回数エラー */
  pItemBodyCountError?: TranslationKey
  /** Pアイテム発動条件エラー */
  pItemTriggerError?: TranslationKey
}

/**
 * ユーザー定義サポートのフォーム状態管理フック
 *
 * @param editingCard - 編集時の元サポート（新規作成時は undefined）
 * @param existingNames - 既存サポート名の Set（重複チェック用）
 * @returns フォーム状態・更新関数・バリデーション・SupportCard 変換関数
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
        type === enums.CardType.Assist ? prev.parameterType : (type as unknown as enums.ParameterType)
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
      const events = [...prev.events] as [EventFormRow, EventFormRow, EventFormRow]
      events[index] = row
      return { ...prev, events }
    })
  }, [])

  // バリデーション
  const validation = useMemo<FormValidation>(() => {
    const errors: FormValidation = {}
    if (!form.name.trim()) {
      errors.nameError = 'userSupport.validation_name_required'
    }
    // 編集時は自分自身の名前を除外して重複チェック
    const checkName = form.name.trim()
    if (existingNames) {
      const isOwnName = editingCard?.name === checkName
      if (!isOwnName && existingNames.has(checkName)) {
        errors.nameError = 'userSupport.validation_name_duplicate'
      }
    }
    // すべてのアビリティスロットが埋まっている必要がある
    const allFilled = form.abilities.every((row) => (row.nameKey as string) !== '')
    if (!allFilled) {
      errors.abilityError = 'userSupport.validation_ability_required'
    }
    // Pアイテム: 発動時効果ありで回数未入力の効果がある場合（発動条件なし時は効果設定不要）
    if (form.hasPItem && form.pItemTrigger !== enums.TriggerKeyType.None && form.pItemEffects.some((e) => !e.count)) {
      errors.pItemBodyCountError = 'userSupport.validation_body_count_required'
    }
    return errors
  }, [form.name, form.abilities, form.hasPItem, form.pItemEffects, form.pItemTrigger, existingNames, editingCard])

  /** フォーム状態を SupportCard に変換する */
  const toSupportCard = useCallback((): SupportCard => {
    // 全スロットを保持してAbility型に変換する（空スロットは位置情報を維持するため残す）
    const abilities: Ability[] = form.abilities.map((row) => {
      if ((row.nameKey as string) === '') {
        return {
          name_key: '' as enums.AbilityNameKeyType,
          trigger_key: '' as enums.TriggerKeyType,
          values: {},
        }
      }
      const derived = deriveAbilityConfig(row.nameKey, row.parameterType)
      return {
        name_key: row.nameKey,
        trigger_key: derived.triggerKey,
        values: {},
        ...(row.parameterType && { parameter_type: row.parameterType }),
        ...(row.maxCount && { max_count: Number(row.maxCount) }),
        ...(derived.isPercentage && { is_percentage: true }),
        ...(derived.isParameterBonus && { is_parameter_bonus: true }),
        ...(derived.isInitialStat && { is_initial_stat: true }),
        ...(derived.isEventBoost && { is_event_boost: true }),
        ...(derived.skipCalculation && { skip_calculation: true }),
      }
    })

    // イベントを SupportEvent 型に変換する（パラメータ上昇値はレアリティから自動導出）
    // paramType はカードのタイプから自動決定
    // 空のイベント（3番目がParamBoostで値なし）は除外する
    const eventParamValue = data.EVENT_PARAM_VALUE[form.rarity]
    const paramType = form.parameterType
    const events: SupportEvent[] = form.events
      .filter((row, i) => {
        // 空イベント除外
        if (i === 2 && row.effectType === enums.EventEffectType.ParamBoost && !row.paramValue) return false
        // PpGain は空イベント行のデフォルトと同じ扱い
        if (row.effectType === enums.EventEffectType.PpGain) return true
        return true
      })
      .map((row, i) => ({
        release: [enums.ReleaseConditionType.Initial, enums.ReleaseConditionType.Lv20, enums.ReleaseConditionType.Lv40][
          i
        ],
        effect_type: row.effectType,
        title: row.title,
        ...(row.effectType === enums.EventEffectType.ParamBoost && {
          param_type: paramType,
          param_value: eventParamValue,
        }),
      }))

    // Pアイテム（ブースト情報 + アクション）
    const effectCount = Number(form.pItemEffectCount) || 0
    // 発動条件が None の場合は effect を生成しない
    const isNoneTrigger = form.pItemTrigger === enums.TriggerKeyType.None
    // effectを生成: 発動回数・効果・上昇値のいずれかがある場合にeffect構造を構築する
    const pItemValue = Number(form.pItemValue) || 0
    const hasPItemEffect = !isNoneTrigger && (effectCount > 0 || pItemValue > 0 || form.pItemEffects.length > 0)
    // provided_action_ids: 各効果のActionIDと回数をマップとして構築する
    const providedActionIds: Partial<Record<enums.ActionIdType, number>> = {}
    for (const effect of form.pItemEffects) {
      const count = Number(effect.count) || 1
      providedActionIds[effect.action] = (providedActionIds[effect.action] ?? 0) + count
    }
    const buildPItemEffect = () => {
      // body: 上昇値→発動時効果の順で body エントリを生成する
      const body: { key: enums.EffectTemplateKeyType; [k: string]: unknown }[] = []
      if (pItemValue > 0) {
        body.push({
          key: enums.EffectTemplateKeyType.ParamUp,
          param: form.pItemParamType,
          value: pItemValue,
        })
      }
      // 発動時効果からbodyエントリを生成する（同一アクションは回数を集約）
      const bodyMap = new Map<string, { key: enums.EffectTemplateKeyType; [k: string]: unknown }>()
      for (const effect of form.pItemEffects) {
        const count = Number(effect.count) || 1
        const entry = actionIdToBodyEntry(effect.action, count)
        if (!entry) continue
        // テンプレートキー + action_id で一意にする（汎用テンプレートは action_id で区別）
        const mapKey = entry.action_id ? `${entry.key}:${entry.action_id as string}` : entry.key
        const existing = bodyMap.get(mapKey)
        if (existing && 'count' in existing && 'count' in entry) {
          existing.count = (existing.count as number) + (entry.count as number)
        } else {
          bodyMap.set(mapKey, { ...entry })
        }
      }
      for (const entry of bodyMap.values()) body.push(entry)
      return {
        trigger: resolveEffectTrigger(form.pItemTrigger),
        body,
        ...(effectCount > 0 && { limit: { key: enums.EffectTemplateKeyType.PerProduce, count: effectCount } }),
      }
    }
    const pItem = form.hasPItem
      ? {
          name: t('userSupport.pitem_name_suffix', { name: form.name }),
          rarity: form.rarity === enums.RarityType.SSR ? enums.PItemRarityType.SSR : enums.PItemRarityType.SR,
          memory: enums.PItemMemoryType.NonMemorizable,
          ...(!isNoneTrigger && { trigger_key: form.pItemTrigger }),
          ...(!isNoneTrigger && {
            boost: {
              trigger_key: form.pItemTrigger,
              parameter_type: form.pItemParamType,
              value: Number(form.pItemValue) || 0,
              ...(effectCount > 0 && { max_count: effectCount }),
            },
          }),
          ...(!isNoneTrigger && form.pItemEffects.length > 0 && { provided_action_ids: providedActionIds }),
          ...(hasPItemEffect && { effect: buildPItemEffect() }),
        }
      : null

    // スキルカード（簡易版）
    const skillCard: SkillCardInfo | null = form.hasSkillCard
      ? {
          name: t('userSupport.skillcard_name_suffix', { name: form.name }),
          rarity: form.skillCardRarity,
          type: form.skillCardType,
          lesson_limit: 0,
          no_duplicate: false,
          effects: [],
          custom_cap: 0,
          custom_slot: [],
        }
      : null

    const today = new Date()
    const releaseDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`

    return {
      name: form.name.trim(),
      rarity: form.rarity,
      type: form.type,
      plan: form.plan,
      parameter_type: form.parameterType,
      source: enums.SourceType.User,
      ...(form.isEventSource && { is_event_source: true }),
      release_date: editingCard?.release_date ?? releaseDate,
      abilities,
      events,
      p_item: pItem,
      skill_card: skillCard,
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

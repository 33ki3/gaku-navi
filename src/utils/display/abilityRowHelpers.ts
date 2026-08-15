/**
 * AbilityRow の表示テキスト生成ヘルパー
 *
 * アビリティ名の翻訳・値埋め込みと、Pアイテム効果説明の構築ロジックを
 * AbilityRow コンポーネントから分離したユーティリティ。
 */

import type { TFunction } from 'i18next'
import * as data from '../../data'
import type { CardCalculationResult } from '../../types/card'
import { EffectSectionType } from '../../types/enums'
import { getEffectLabelKey, getPItemEffectLabel } from './effectLabels'

/** アビリティ詳細データの型エイリアス */
type AbilityDetail = CardCalculationResult['allAbilityDetails'][number]

/**
 * アビリティの表示名を生成する
 *
 * i18n テンプレートからアビリティ名を翻訳し、
 * {{param}}/{{count}}/{{value}} を i18next の名前付き補間で埋め込む。
 * 例: "初期{{param}}上昇+{{value}}" → "初期Vo上昇+10"
 *
 * @param ab - アビリティ詳細データ
 * @param t - i18next の翻訳関数
 * @returns 表示用アビリティ名
 */
export function getAbilityDisplayName(ab: AbilityDetail, t: TFunction): string {
  const rawName = ab.nameKey
    ? t(getEffectLabelKey(EffectSectionType.AbilityName, ab.nameKey), {
        param: ab.parameterType ? t(data.getParamLabel(ab.parameterType)) : '',
        count: ab.maxCount ?? 0,
        value: ab.valuePerTrigger,
      })
    : (ab.displayName ?? '')
  return rawName
}

/**
 * Pアイテムの効果説明テキストを生成する
 *
 * 通常アビリティ（displayName がない）は undefined を返す。
 * effectData がある場合はPアイテム効果の全文テキストを生成し、
 * なければ triggerKey から翻訳→アクションラベルの順でフォールバックする。
 * 例: 「レッスン5回ごとにVo+5」「レッスン」「おでかけ」
 *
 * @param ab - アビリティ詳細データ
 * @param t - i18next の翻訳関数
 * @returns 効果説明テキスト。通常アビリティの場合は undefined
 */
export function getEffectDescription(ab: AbilityDetail, t: TFunction): string | undefined {
  // 通常アビリティはdisplayNameを持たない（Pアイテム由来のアビリティのみ持つ）
  if (!ab.displayName) return undefined

  // effectData がある場合はPアイテム効果の全文テキストを生成
  if (ab.effectData) {
    return getPItemEffectLabel(ab.effectData, t)
  }

  return undefined
}

/**
 * 最適編成結果の localStorage 永続化と復元。
 *
 * カード本体は保存せず名前だけを保持し、復元時に最新のカードマスタへ
 * 差し替える。削除済みカードや不正なキャッシュがあれば結果全体を破棄する
 */
import * as constant from '../constant'
import type { SupportCard } from '../types/card'
import type { UnitResult } from '../types/unit'
import { isStoredUnitResult } from './unitResultStorageValidation'

/** 保存結果の復元状態 */
interface LoadedUnitResult {
  /** 復元できた結果。未保存または復元失敗時は null */
  result: UnitResult | null
  /** 過去に有効な計算結果が保存されていたか */
  hasCalculated: boolean
}

const EMPTY_PARAMETER_VALUES = { vocal: 0, dance: 0, visual: 0 }
const EMPTY_LOADED_RESULT: LoadedUnitResult = {
  result: null,
  hasCalculated: false,
}

/**
 * 計算結果を localStorage に保存する
 *
 * @param result - 保存する最適編成結果
 * @returns 戻り値なし
 */
export function saveUnitResult(result: UnitResult): void {
  const serializable = {
    members: result.members.map((member) => ({
      cardName: member.card.name,
      uncap: member.uncap,
      isRental: member.isRental,
      result: member.result,
      supportSynergy: member.supportSynergy,
      supportSynergyDetail: member.supportSynergyDetail,
      synergyProviders: member.synergyProviders,
      paramBonusPercent: member.paramBonusPercent,
    })),
    totalScore: result.totalScore,
    totalParamBonusPercent: result.totalParamBonusPercent,
    parameterBonus: result.parameterBonus,
    parameterBonusBase: result.parameterBonusBase,
    outsideParamBonusPercent: result.outsideParamBonusPercent,
  }

  try {
    localStorage.setItem(constant.UNIT_RESULT_STORAGE_KEY, JSON.stringify(serializable))
  } catch {
    /** localStorage が使えない環境でも計算結果の画面表示は続ける */
  }
}

/**
 * localStorage から計算結果を復元する
 *
 * @param cardByName - 現在利用できるサポート名とカードの対応表
 * @returns 復元結果と計算済み状態
 */
export function loadUnitResult(cardByName: Map<string, SupportCard>): LoadedUnitResult {
  try {
    const raw = localStorage.getItem(constant.UNIT_RESULT_STORAGE_KEY)
    if (raw === null) return EMPTY_LOADED_RESULT

    const parsed: unknown = JSON.parse(raw)
    if (!isStoredUnitResult(parsed)) return EMPTY_LOADED_RESULT

    const members: UnitResult['members'] = []
    for (const storedMember of parsed.members) {
      const card = cardByName.get(storedMember.cardName)
      if (card === undefined) return EMPTY_LOADED_RESULT

      members.push({
        card,
        uncap: storedMember.uncap,
        isRental: storedMember.isRental,
        result: storedMember.result,
        supportSynergy: storedMember.supportSynergy,
        supportSynergyDetail: storedMember.supportSynergyDetail ?? {},
        synergyProviders: storedMember.synergyProviders ?? [],
        paramBonusPercent: storedMember.paramBonusPercent ?? EMPTY_PARAMETER_VALUES,
      })
    }

    return {
      result: {
        members,
        totalScore: parsed.totalScore,
        totalParamBonusPercent: parsed.totalParamBonusPercent,
        parameterBonus: parsed.parameterBonus,
        parameterBonusBase: parsed.parameterBonusBase ?? EMPTY_PARAMETER_VALUES,
        outsideParamBonusPercent: parsed.outsideParamBonusPercent ?? EMPTY_PARAMETER_VALUES,
      },
      hasCalculated: true,
    }
  } catch {
    return EMPTY_LOADED_RESULT
  }
}

/**
 * 授業マスタデータ。
 *
 * シナリオ×難易度×週番号ごとの授業パラメータ上昇量を定義する。
 */
import { ScenarioType, DifficultyType, ActivityIdType, ParameterType } from '../../types/enums'
import type { ParameterValues } from '../../types/unit'

/** 週番号 → パラメータ上昇量 */
type WeekMap = Record<string, number>

/** 難易度 → 週マップ */
type DifficultyMap = Partial<Record<DifficultyType, WeekMap>>

const data: Record<ScenarioType, DifficultyMap> = {
  [ScenarioType.Hajime]: {
    [DifficultyType.Regular]: {},
    [DifficultyType.Pro]: {},
    [DifficultyType.Master]: {},
    [DifficultyType.Legend]: {
      '1': 100,
      '2': 100,
      '6': 150,
      '15': 200,
    },
  },
  [ScenarioType.Hif]: {
    // HIF は難易度の概念がないため None キーのみ使用する
    [DifficultyType.None]: {
      '3': 120,
      '6': 120,
      '10': 150,
      '17': 150,
      '21': 180,
      '24': 180,
    },
  },
  [ScenarioType.Nia]: {
    [DifficultyType.None]: {},
  },
  [ScenarioType.Custom]: {
    [DifficultyType.None]: {},
  },
}

/** 授業活動IDから上昇対象パラメータを判定するマップ */
const CLASS_PARAM_MAP: Partial<Record<ActivityIdType, ParameterType>> = {
  [ActivityIdType.ClassVo]: ParameterType.Vocal,
  [ActivityIdType.ClassDa]: ParameterType.Dance,
  [ActivityIdType.ClassVi]: ParameterType.Visual,
}

/** 授業週ごとの内訳 */
interface ClassBreakdownRow {
  week: number
  attribute: ParameterType
  values: ParameterValues
}

/**
 * getClassParameterTotal はスケジュール選択に基づく授業のVoDaVi上昇量を返す。
 *
 * HIFのように授業属性を選ぶシナリオでは、選んだ属性に値を加算する。
 * 従来シナリオの `class` は属性指定がないため 0 として扱う。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @param scheduleSelections - 各週の選択活動ID
 * @returns 授業のVoDaVi上昇量
 */
export function getClassParameterTotal(
  scenario: ScenarioType,
  difficulty: DifficultyType,
  scheduleSelections: Record<number, ActivityIdType>,
): ParameterValues {
  const total: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  for (const row of getClassBreakdown(scenario, difficulty, scheduleSelections)) {
    total.vocal += row.values.vocal
    total.dance += row.values.dance
    total.visual += row.values.visual
  }
  return total
}

/**
 * getClassBreakdown は授業週ごとの上昇内訳を返す。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @param scheduleSelections - 各週の選択活動ID
 * @returns 授業週ごとの内訳配列
 */
export function getClassBreakdown(
  scenario: ScenarioType,
  difficulty: DifficultyType,
  scheduleSelections: Record<number, ActivityIdType>,
): ClassBreakdownRow[] {
  const weekMap = data[scenario][difficulty] ?? {}
  const rows: ClassBreakdownRow[] = []

  for (const [weekStr, value] of Object.entries(weekMap)) {
    const week = Number(weekStr)
    const selection = scheduleSelections[week]
    const targetParam = selection ? CLASS_PARAM_MAP[selection] : undefined
    if (!targetParam) continue

    rows.push({
      week,
      attribute: targetParam,
      values: {
        vocal: targetParam === ParameterType.Vocal ? value : 0,
        dance: targetParam === ParameterType.Dance ? value : 0,
        visual: targetParam === ParameterType.Visual ? value : 0,
      },
    })
  }

  return rows
}

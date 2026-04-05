/**
 * 授業マスタデータ。
 *
 * シナリオ×難易度×週番号ごとの授業パラメータ上昇量を定義する。
 * 授業は「選択パラ」を上昇させるため、VoDaVi 分離ではなく単一値で管理する。
 */
import { ScenarioType, DifficultyType, ActivityIdType } from '../../types/enums'

/** 週番号 → パラメータ上昇量 */
type WeekMap = Record<string, number>

/** 難易度 → 週マップ */
type DifficultyMap = Record<DifficultyType, WeekMap>

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
  [ScenarioType.Nia]: {
    [DifficultyType.Regular]: {},
    [DifficultyType.Pro]: {},
    [DifficultyType.Master]: {},
    [DifficultyType.Legend]: {},
  },
}

/**
 * getClassTotal はスケジュール選択に基づく授業パラメータ上昇量の合計を返す。
 *
 * 授業は「選択パラ」のため VoDaVi 別ではなく単一の合計値を返す。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @param scheduleSelections - 各週の選択活動ID
 * @returns 授業パラメータ上昇量の合計
 */
export function getClassTotal(
  scenario: ScenarioType,
  difficulty: DifficultyType,
  scheduleSelections: Record<number, ActivityIdType>,
): number {
  const weekMap = data[scenario][difficulty]
  let total = 0

  for (const [weekStr, value] of Object.entries(weekMap)) {
    const week = Number(weekStr)
    const selection = scheduleSelections[week]
    // 授業が選択されている週のみカウントする
    if (selection === ActivityIdType.Class) {
      total += value
    }
  }

  return total
}

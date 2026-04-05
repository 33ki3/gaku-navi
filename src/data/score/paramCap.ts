/**
 * パラメータ上限マスタデータ。
 *
 * シナリオ×難易度ごとの VoDaVi 各軸パラメータ上限を定義する。
 * null の場合は上限なし。
 */
import { ScenarioType, DifficultyType } from '../../types/enums'

/** 難易度→上限（null = 上限なし） */
type DifficultyMap = Record<DifficultyType, number | null>

const data: Record<ScenarioType, DifficultyMap> = {
  [ScenarioType.Hajime]: {
    [DifficultyType.Regular]: null,
    [DifficultyType.Pro]: null,
    [DifficultyType.Master]: null,
    [DifficultyType.Legend]: 2800,
  },
  [ScenarioType.Nia]: {
    [DifficultyType.Regular]: null,
    [DifficultyType.Pro]: null,
    [DifficultyType.Master]: null,
    [DifficultyType.Legend]: null,
  },
}

/**
 * getParamCap はシナリオ×難易度のパラメータ軸上限を返す。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @returns 各軸の上限値（null の場合は上限なし）
 */
export function getParamCap(scenario: ScenarioType, difficulty: DifficultyType): number | null {
  return data[scenario][difficulty]
}

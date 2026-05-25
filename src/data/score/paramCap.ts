/**
 * パラメータ上限マスタデータ。
 *
 * シナリオ×難易度ごとの VoDaVi 各軸パラメータ上限を定義する。
 * null の場合は上限なし。
 */
import { ScenarioType, DifficultyType } from '../../types/enums'

/** 難易度→上限（null = 上限なし） */
type DifficultyMap = Partial<Record<DifficultyType, number | null>>

const data: Record<ScenarioType, DifficultyMap> = {
  [ScenarioType.Hajime]: {
    [DifficultyType.Regular]: null,
    [DifficultyType.Pro]: null,
    [DifficultyType.Master]: null,
    [DifficultyType.Legend]: 3000,
  },
  // HIF は難易度の概念がないため None キーのみ使用する
  [ScenarioType.Hif]: {
    [DifficultyType.None]: 3200,
  },
  [ScenarioType.Nia]: {
    [DifficultyType.Regular]: null,
    [DifficultyType.Pro]: null,
    [DifficultyType.Master]: null,
    [DifficultyType.Legend]: null,
  },
  // Custom は難易度の概念がないため None キーのみ使用する
  [ScenarioType.Custom]: {
    [DifficultyType.None]: 3200,
  },
}

/**
 * getParamCap はシナリオ×難易度のパラメータ軸上限を返す。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @returns 各軸の上限値（null の場合は上限なし）
 */
function getParamCap(scenario: ScenarioType, difficulty: DifficultyType): number | null {
  return data[scenario][difficulty] ?? null
}

/**
 * resolveParamCap はユーザー設定を考慮した最終的なパラメータ上限を返す。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @param override - ユーザー指定の上限値（null/undefined の場合は既定値）
 * @returns 各軸の上限値（null の場合は上限なし）
 */
export function resolveParamCap(
  scenario: ScenarioType,
  difficulty: DifficultyType,
  override?: number | null,
): number | null {
  if (
    (scenario === ScenarioType.Custom || scenario === ScenarioType.Hif) &&
    override !== undefined &&
    override !== null
  )
    return override
  return getParamCap(scenario, difficulty)
}

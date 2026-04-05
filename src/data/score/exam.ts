/**
 * 試験パラメータ上昇量マスタ。
 *
 * シナリオ×難易度ごとの中間試験・最終試験で得られる
 * パラメータ上昇量（Vo/Da/Vi）を定義する。
 */
import { DifficultyType, ScenarioType } from '../../types/enums'
import type { ParameterValues } from '../../types/unit'

/** 試験1回分の上昇量 */
interface ExamEntry {
  /** 中間試験のパラメータ上昇量（Vo/Da/Vi） */
  mid: ParameterValues
  /** 最終試験のパラメータ上昇量（Vo/Da/Vi） */
  final: ParameterValues
}

/** 難易度→試験データ */
type DifficultyMap = Record<DifficultyType, ExamEntry>

const data: Record<ScenarioType, DifficultyMap> = {
  [ScenarioType.Hajime]: {
    [DifficultyType.Regular]: { mid: { vocal: 0, dance: 0, visual: 0 }, final: { vocal: 0, dance: 0, visual: 0 } },
    [DifficultyType.Pro]: { mid: { vocal: 0, dance: 0, visual: 0 }, final: { vocal: 0, dance: 0, visual: 0 } },
    [DifficultyType.Master]: { mid: { vocal: 0, dance: 0, visual: 0 }, final: { vocal: 0, dance: 0, visual: 0 } },
    [DifficultyType.Legend]: {
      mid: { vocal: 80, dance: 80, visual: 80 },
      final: { vocal: 120, dance: 120, visual: 120 },
    },
  },
  [ScenarioType.Nia]: {
    [DifficultyType.Regular]: { mid: { vocal: 0, dance: 0, visual: 0 }, final: { vocal: 0, dance: 0, visual: 0 } },
    [DifficultyType.Pro]: { mid: { vocal: 0, dance: 0, visual: 0 }, final: { vocal: 0, dance: 0, visual: 0 } },
    [DifficultyType.Master]: { mid: { vocal: 0, dance: 0, visual: 0 }, final: { vocal: 0, dance: 0, visual: 0 } },
    [DifficultyType.Legend]: { mid: { vocal: 0, dance: 0, visual: 0 }, final: { vocal: 0, dance: 0, visual: 0 } },
  },
}

/**
 * getExamData はシナリオ×難易度の試験上昇量を返す。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @returns 中間・最終の各パラメータ上昇量
 */
export function getExamData(scenario: ScenarioType, difficulty: DifficultyType): ExamEntry {
  return data[scenario][difficulty]
}

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
type DifficultyMap = Partial<Record<DifficultyType, ExamEntry>>

/** HIF選抜試験1回分の構成値（基礎値・配分値） */
interface HifSelectionExamGain {
  base: number
  allocation: number
}

/** HIF選抜試験3回分の暫定定義 */
const HIF_SELECTION_EXAMS: readonly HifSelectionExamGain[] = [
  { base: 20, allocation: 80 },
  { base: 80, allocation: 200 },
  { base: 100, allocation: 220 },
]

/** 試験上昇量ゼロ値（試験のないシナリオで使用） */
const ZERO_EXAM_ENTRY: ExamEntry = {
  mid: { vocal: 0, dance: 0, visual: 0 },
  final: { vocal: 0, dance: 0, visual: 0 },
}

// 試験マスタは Hajime 専用（HIF は選抜試験で別途計算、Nia/Custom は試験なし）
const data: Partial<Record<ScenarioType, DifficultyMap>> = {
  [ScenarioType.Hajime]: {
    [DifficultyType.Regular]: { mid: { vocal: 0, dance: 0, visual: 0 }, final: { vocal: 0, dance: 0, visual: 0 } },
    [DifficultyType.Pro]: { mid: { vocal: 0, dance: 0, visual: 0 }, final: { vocal: 0, dance: 0, visual: 0 } },
    [DifficultyType.Master]: { mid: { vocal: 0, dance: 0, visual: 0 }, final: { vocal: 0, dance: 0, visual: 0 } },
    [DifficultyType.Legend]: {
      mid: { vocal: 80, dance: 80, visual: 80 },
      final: { vocal: 120, dance: 120, visual: 120 },
    },
  },
}

/**
 * 合計値を比率でVo/Da/Viに分配する。
 *
 * @param total - 分配する合計値
 * @param ratio - 比率（x:y:z）
 * @returns 分配後のVo/Da/Vi
 */
function allocateByRatio(total: number, ratio: ParameterValues): ParameterValues {
  const ratioSum = ratio.vocal + ratio.dance + ratio.visual
  // 全比率0の場合は均等分配（3等分、端数は visual に加算）
  if (ratioSum <= 0) {
    const each = Math.floor(total / 3)
    return { vocal: each, dance: each, visual: total - each * 2 }
  }

  const vocal = Math.floor((total * ratio.vocal) / ratioSum)
  const dance = Math.floor((total * ratio.dance) / ratioSum)
  const visual = Math.floor((total * ratio.visual) / ratioSum)
  // 端数（最大1）を最大比率の属性に加算する（比率0の属性には入れない）
  const remainder = total - vocal - dance - visual
  if (remainder > 0) {
    if (ratio.vocal >= ratio.dance && ratio.vocal >= ratio.visual) {
      return { vocal: vocal + remainder, dance, visual }
    } else if (ratio.dance >= ratio.visual) {
      return { vocal, dance: dance + remainder, visual }
    } else {
      return { vocal, dance, visual: visual + remainder }
    }
  }
  return { vocal, dance, visual }
}

/**
 * 2つのVo/Da/Vi値を加算する。
 *
 * @param a - 1つ目
 * @param b - 2つ目
 * @returns 加算結果
 */
function sumParameterValues(a: ParameterValues, b: ParameterValues): ParameterValues {
  return {
    vocal: a.vocal + b.vocal,
    dance: a.dance + b.dance,
    visual: a.visual + b.visual,
  }
}

/**
 * getHifSelectionExamData はHIF選抜試験3回分の上昇量を返す。
 *
 * @param hifExamRatios - HIF選抜試験3回分の比率（x:y:z）
 * @returns 選抜試験1〜3のVoDaVi上昇量
 */
export function getHifSelectionExamData(hifExamRatios?: ParameterValues[]): ParameterValues[] {
  const defaultRatio: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  return HIF_SELECTION_EXAMS.map((exam, index) => {
    // 基礎値は全属性に均等付与し、配分値のみ比率で分配する
    const allocated = allocateByRatio(exam.allocation, hifExamRatios?.[index] ?? defaultRatio)
    return {
      vocal: exam.base + allocated.vocal,
      dance: exam.base + allocated.dance,
      visual: exam.base + allocated.visual,
    }
  })
}

/**
 * getHifExamTotalData はHIF選抜試験3回分の合計上昇量を返す。
 *
 * @param hifExamRatios - HIF選抜試験3回分の比率（x:y:z）
 * @returns 中間+最終の合計パラメータ上昇量
 */
export function getHifExamTotalData(hifExamRatios?: ParameterValues[]): ParameterValues {
  const selectionExams = getHifSelectionExamData(hifExamRatios)
  return sumParameterValues(sumParameterValues(selectionExams[0], selectionExams[1]), selectionExams[2])
}

/**
 * getExamData はシナリオ×難易度の試験上昇量を返す。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @returns 中間・最終の各パラメータ上昇量
 */
export function getExamData(scenario: ScenarioType, difficulty: DifficultyType): ExamEntry {
  return data[scenario]?.[difficulty] ?? ZERO_EXAM_ENTRY
}

/**
 * getExamTotalData はシナリオ×難易度の試験合計上昇量を返す。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @returns 中間+最終の合計パラメータ上昇量
 */
export function getExamTotalData(scenario: ScenarioType, difficulty: DifficultyType): ParameterValues {
  const examData = getExamData(scenario, difficulty)
  return {
    vocal: examData.mid.vocal + examData.final.vocal,
    dance: examData.mid.dance + examData.final.dance,
    visual: examData.mid.visual + examData.final.visual,
  }
}

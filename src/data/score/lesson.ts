/**
 * レッスンマスタデータ。
 *
 * シナリオ×難易度×週番号ごとのレッスン情報（SP / 追い込み）を定義する。
 * 通常レッスンは計算に不要のため含まない。
 */
import rawData from './lesson.json'
import { type LessonType, type DifficultyType, type ScenarioType } from '../../types/enums'

/** 1レッスンのデータ */
interface LessonEntry {
  type: LessonType
  main: number
  sub: number
}

/** 週ごとのレッスン集合 */
type WeekMap = Record<string, LessonEntry[]>

/** 難易度→週マップ */
type DifficultyMap = Record<string, WeekMap>

const data = rawData as Record<string, DifficultyMap>

/** 1週分のレッスン情報（コンパイル済み構造） */
interface LessonData {
  week: number
  lessonTypes: LessonEntry[]
}

/**
 * シナリオ × 難易度 → レッスン一覧を取得する。
 *
 * @param scenario - シナリオ種別
 * @param difficulty - 難易度
 * @returns LessonData の配列
 */
export function getLessonData(scenario: ScenarioType, difficulty: DifficultyType): LessonData[] {
  const weekMap = data[scenario][difficulty]

  // 週番号を数値化し、各週のレッスン情報を配列として返す
  return Object.entries(weekMap).map(([weekStr, entries]) => ({
    week: Number(weekStr),
    lessonTypes: entries,
  }))
}

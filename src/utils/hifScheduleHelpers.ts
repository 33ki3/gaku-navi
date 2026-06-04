/**
 * HIFスケジュール操作のヘルパー関数群。
 *
 * コンポーネントから独立した pure な変換ロジックをまとめる。
 * `t` を引数として受け取ることで i18n キーの翻訳も扱える。
 */
import type { TFunction } from 'i18next'
import * as enums from '../types/enums'
import type { ParameterValues } from '../types/card'
import type { ScheduleWeekData } from '../data'
import { HIF_EXAM_LABEL_KEYS } from '../data'
import { HIF_LESSON_DEFAULT_PAIR_MAP, HIF_LESSON_PAIR_MAP } from '../data/score/hifScheduleMaster'

const HIF_LESSON_ACTIVITY_BY_PAIR_KEY = new Map<string, enums.ActivityIdType>(
  Object.entries(HIF_LESSON_PAIR_MAP).map(([activityId, pair]) => [
    `${pair?.main}:${pair?.sub}`,
    activityId as enums.ActivityIdType,
  ]),
)

/**
 * 活動ID（HIF公開レッスン）をメイン/サブに分解する。
 *
 * @param activityId - 解決対象の活動ID
 * @returns main/sub ペア。HIF公開レッスン以外の場合は null
 */
export function resolveHifLessonPair(
  activityId: enums.ActivityIdType,
): { main: enums.ActivityIdType; sub: enums.ActivityIdType } | null {
  return HIF_LESSON_PAIR_MAP[activityId] ?? null
}

/**
 * メイン/サブの属性選択から HIF公開レッスンの活動IDを解決する。
 *
 * @param main - メイン属性の活動ID
 * @param sub - サブ属性の活動ID
 * @returns 対応する HIF公開レッスンの活動ID
 */
export function resolveHifLessonActivity(main: enums.ActivityIdType, sub: enums.ActivityIdType): enums.ActivityIdType {
  const resolved = HIF_LESSON_ACTIVITY_BY_PAIR_KEY.get(`${main}:${sub}`)
  return resolved ?? enums.ActivityIdType.VoLessonDa
}

/**
 * 非半分モード用に HIF公開レッスン活動IDを正規化する。
 *
 * MainのみID（Vo/Da/Vi）が保存されている場合は、既定のSubを補った複合IDへ変換する。
 *
 * @param activityId - 正規化対象の活動ID
 * @returns 非半分モードで扱える活動ID
 */
export function normalizeHifLessonActivityForPairMode(activityId: enums.ActivityIdType): enums.ActivityIdType {
  return HIF_LESSON_DEFAULT_PAIR_MAP[activityId] ?? activityId
}

/**
 * スケジュールデータから HIF選抜試験の週番号一覧を抽出する。
 *
 * @param scheduleData - スケジュールデータ全件
 * @returns HIF選抜試験1〜3の週番号の配列
 */
export function getHifExamWeeks(scheduleData: ScheduleWeekData[]): number[] {
  return scheduleData
    .filter(
      (w) =>
        w.stage === enums.HifStage.Selection &&
        w.fixed &&
        w.activities.some((a) => a.id === enums.ActivityIdType.MidExam || a.id === enums.ActivityIdType.FinalExam),
    )
    .map((w) => w.week)
}

/**
 * HIF選抜試験の比率配列の特定インデックス・属性を更新した新しい配列を返す。
 *
 * @param ratios - 正規化済み比率配列（長さ3）
 * @param examIndex - 更新対象の試験インデックス（0〜2）
 * @param key - 更新対象のパラメータ種別
 * @param value - 新しい値（0未満は0にクランプ）
 * @returns 更新後の比率配列
 */
export function updateHifExamRatio(
  ratios: ParameterValues[],
  examIndex: number,
  key: enums.ParameterType,
  value: number,
): ParameterValues[] {
  const normalizedRatios =
    ratios.length === 3
      ? ratios
      : [
          ratios[0] ?? { vocal: 0, dance: 0, visual: 0 },
          ratios[1] ?? { vocal: 0, dance: 0, visual: 0 },
          ratios[2] ?? { vocal: 0, dance: 0, visual: 0 },
        ]

  return normalizedRatios.map((row, idx) => {
    if (idx !== examIndex) return row
    return { ...row, [key]: Math.max(0, value) }
  })
}

/**
 * `stage` フィールドを持つ配列から指定ステージの要素だけを返す。
 *
 * @param items - フィルタ対象の配列
 * @param stage - 抽出するステージ
 * @returns 指定ステージに一致する要素の配列
 */
export function filterByStage<T extends { stage?: enums.HifStage }>(items: T[], stage: enums.HifStage): T[] {
  return items.filter((item) => item.stage === stage)
}

/**
 * HIF週行の固定ラベルを返す。
 *
 * 試験週はexamIndexに対応したラベル、weekLabelがあればそれ、
 * それ以外は最初の活動のラベルを使う。
 *
 * @param t - 翻訳関数
 * @param week - 週データ
 * @param examIndex - 試験インデックス（-1 なら試験週でない）
 * @returns 翻訳済みラベル文字列
 */
export function getHifFixedLabel(t: TFunction, week: ScheduleWeekData, examIndex: number): string {
  if (examIndex >= 0 && examIndex <= 2) return t(HIF_EXAM_LABEL_KEYS[examIndex])
  if (week.weekLabel) return t(week.weekLabel)
  return t(week.activities[0].label)
}

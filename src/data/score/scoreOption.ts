/**
 * スコアオプションマスタ。
 *
 * プロデュースの難易度・シナリオのラベルと選択肢を管理する。
 */
import { DifficultyType, ScenarioType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'
import { hasScheduleDifficulty } from './schedule'

/** スコアオプションマスタの1行分 */
interface ScoreOptionEntry<T extends string> {
  value: T
  label: TranslationKey
}

/** 難易度ラベルマスタ（有効/無効はシナリオ別に解決する） */
const DIFFICULTY_OPTION_BASE: readonly ScoreOptionEntry<DifficultyType>[] = [
  { value: DifficultyType.Regular, label: 'score.difficulty.regular' },
  { value: DifficultyType.Pro, label: 'score.difficulty.pro' },
  { value: DifficultyType.Master, label: 'score.difficulty.master' },
  { value: DifficultyType.Legend, label: 'score.difficulty.legend' },
]

/**
 * 難易度選択肢を返す。
 *
 * シナリオごとのスケジュール定義に存在する難易度だけを返す。
 *
 * @param scenario シナリオ種別
 * @returns 難易度選択肢
 */
export const getDifficultyOptionList = (scenario: ScenarioType): readonly ScoreOptionEntry<DifficultyType>[] => {
  return DIFFICULTY_OPTION_BASE.filter((option) => hasScheduleDifficulty(scenario, option.value))
}

/** シナリオラベルのベース定義。 */
const SCENARIO_OPTION_BASE: readonly ScoreOptionEntry<ScenarioType>[] = [
  { value: ScenarioType.Custom, label: 'score.scenario.custom' },
  { value: ScenarioType.Hajime, label: 'score.scenario.hajime' },
  { value: ScenarioType.Nia, label: 'score.scenario.nia' },
  { value: ScenarioType.Hif, label: 'score.scenario.hif' },
]

/** シナリオ選択肢マスタ。enabled判定は呼び出し側で行う。 */
export const ScenarioOptionList: readonly ScoreOptionEntry<ScenarioType>[] = SCENARIO_OPTION_BASE

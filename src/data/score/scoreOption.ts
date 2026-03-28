/**
 * スコアオプションマスタ。
 *
 * プロデュースの難易度・シナリオのラベルと選択肢を管理する。
 */
import { DifficultyType, ScenarioType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** スコアオプションマスタの1行分 */
interface ScoreOptionEntry<T extends string> {
  value: T
  label: TranslationKey
  enabled: boolean
}

/** 難易度選択肢マスタ */
export const DifficultyOptionList: readonly ScoreOptionEntry<DifficultyType>[] = [
  { value: DifficultyType.Regular, label: 'score.difficulty.regular', enabled: false },
  { value: DifficultyType.Pro, label: 'score.difficulty.pro', enabled: false },
  { value: DifficultyType.Master, label: 'score.difficulty.master', enabled: false },
  { value: DifficultyType.Legend, label: 'score.difficulty.legend', enabled: true },
]

/** シナリオ選択肢マスタ */
export const ScenarioOptionList: readonly ScoreOptionEntry<ScenarioType>[] = [
  { value: ScenarioType.Hajime, label: 'score.scenario.hajime', enabled: true },
  { value: ScenarioType.Nia, label: 'score.scenario.nia', enabled: false },
]

/**
 * スコアオプションマスタ。
 *
 * プロデュースの難易度・シナリオのラベルと選択肢を管理する。
 */
import { type DifficultyType, type ScenarioType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** スコアオプションマスタの1行分 */
interface ScoreOptionEntry<T extends string> {
  value: T
  label: TranslationKey
  enabled: boolean
}

/** 難易度選択肢マスタ */
export const DifficultyOptionList: readonly ScoreOptionEntry<DifficultyType>[] = [
  { value: 'regular', label: 'score.difficulty.regular', enabled: false },
  { value: 'pro', label: 'score.difficulty.pro', enabled: false },
  { value: 'master', label: 'score.difficulty.master', enabled: false },
  { value: 'legend', label: 'score.difficulty.legend', enabled: true },
]

/** シナリオ選択肢マスタ */
export const ScenarioOptionList: readonly ScoreOptionEntry<ScenarioType>[] = [
  { value: 'hajime', label: 'score.scenario.hajime', enabled: true },
  { value: 'nia', label: 'score.scenario.nia', enabled: false },
]

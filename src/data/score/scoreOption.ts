/**
 * スコアオプションマスタ。
 *
 * プロデュースの難易度・シナリオのラベルと選択肢を管理する。
 */
import rawData from '../json/scoreOption.json'
import { type DifficultyType, type ScenarioType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** スコアオプションマスタの1行分 */
interface ScoreOptionEntry<T extends string> {
  value: T
  label: TranslationKey
  enabled: boolean
}

/** 難易度選択肢マスタ */
export const DifficultyOptionList: readonly ScoreOptionEntry<DifficultyType>[] =
  rawData.difficulty as ScoreOptionEntry<DifficultyType>[]

/** シナリオ選択肢マスタ */
export const ScenarioOptionList: readonly ScoreOptionEntry<ScenarioType>[] =
  rawData.scenario as ScoreOptionEntry<ScenarioType>[]

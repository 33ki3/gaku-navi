/**
 * アビリティ値マスタ。
 *
 * スケジュール（凸数→段階番号）と効果段階（段階番号→効果値）を
 * プロパティアクセスで引けるようにする。
 */

import { RarityTierType, AbilityNameKeyType } from '../../types/enums'

// スケジュールデータ（凸数→段階番号マッピング）
const scheduleData = {
  [RarityTierType.SSR]: [
    [1, 2, 3, 4, 5],
    [1, 1, 2, 2, 2],
    [1, 2, 3, 4, 5],
    [1, 1, 1, 2, 2],
    [1, 1, 1, 1, 2],
    [1, 2, 2, 2, 3],
  ],
  [RarityTierType.EventSSR]: [
    [1, 2, 3, 4, 5],
    [1, 1, 2, 2, 2],
    [1, 2, 3, 4, 5],
    [1, 1, 1, 1, 2],
    [1, 1, 1, 2, 2],
    [1, 2, 2, 2, 3],
  ],
  [RarityTierType.SR]: [
    [1, 2, 3, 4, 5],
    [1, 2, 2, 2, 2],
    [1, 2, 3, 4, 5],
    [1, 1, 1, 1, 2],
    [1, 1, 1, 2, 2],
    [1, 1, 2, 2, 3],
  ],
  [RarityTierType.R]: [
    [1, 2, 3, 4, 5],
    [1, 1, 1, 1, 1],
    [1, 2, 3, 4, 5],
    [1, 1, 1, 1, 2],
    [1, 1, 2, 2, 2],
    [0, 1, 1, 2, 3],
  ],
}

// 効果段階データ（段階番号→効果値マッピング）
const stageData = {
  [RarityTierType.SSR]: {
    [AbilityNameKeyType.ASkillAcquire]: ['2', '3'],
    [AbilityNameKeyType.ASkillDelete]: ['17', '22'],
    [AbilityNameKeyType.ASkillEnhance]: ['7', '9'],
    [AbilityNameKeyType.Change]: ['16', '21'],
    [AbilityNameKeyType.ClassWorkEnd]: ['5', '7'],
    [AbilityNameKeyType.ConcentrationCardAcquire]: ['3', '4'],
    [AbilityNameKeyType.Consult]: ['14', '18'],
    [AbilityNameKeyType.Customize]: ['8', '11'],
    [AbilityNameKeyType.Delete]: ['8', '11'],
    [AbilityNameKeyType.EventBoost]: ['50%', '75%', '100%'],
    [AbilityNameKeyType.EventRecoveryBoost]: ['50%', '75%', '100%'],
    [AbilityNameKeyType.ExamEnd]: ['17', '22'],
    [AbilityNameKeyType.ExamHp]: ['6', '8'],
    [AbilityNameKeyType.GoodConditionCardAcquire]: ['3', '4'],
    [AbilityNameKeyType.GoodImpressionCardAcquire]: ['3', '4'],
    [AbilityNameKeyType.InitialPp]: ['30', '40'],
    [AbilityNameKeyType.InitialStat]: ['52', '55', '59', '62', '65'],
    [AbilityNameKeyType.LessonEnd]: ['4', '6'],
    [AbilityNameKeyType.LessonPpBoost]: ['16.5%', '22%'],
    [AbilityNameKeyType.MSkillAcquire]: ['2', '3'],
    [AbilityNameKeyType.MSkillDelete]: ['17', '22'],
    [AbilityNameKeyType.MSkillEnhance]: ['7', '9'],
    [AbilityNameKeyType.MaxHp]: ['6', '7', '8', '9', '9'],
    [AbilityNameKeyType.Outing]: ['11', '15'],
    [AbilityNameKeyType.PDrinkAcquire]: ['4', '5'],
    [AbilityNameKeyType.PDrinkExchange]: ['8', '11'],
    [AbilityNameKeyType.PItemAcquire]: ['11', '15'],
    [AbilityNameKeyType.ParameterBonus]: ['6.5%', '7.0%', '7.5%', '8.0%', '8.5%'],
    [AbilityNameKeyType.ReserveCardAcquire]: ['3', '4'],
    [AbilityNameKeyType.Rest]: ['17', '22'],
    [AbilityNameKeyType.SkillEnhance]: ['3', '4'],
    [AbilityNameKeyType.SpLesson20]: ['15', '21'],
    [AbilityNameKeyType.SpLessonEnd]: ['13', '17'],
    [AbilityNameKeyType.SpLessonHp]: ['5', '7'],
    [AbilityNameKeyType.SpLessonHpAll]: ['3', '4'],
    [AbilityNameKeyType.SpLessonPp]: ['33%', '45%'],
    [AbilityNameKeyType.SpLessonRate]: ['21%', '28%'],
    [AbilityNameKeyType.SpLessonRateAll]: ['10.5%', '14%'],
    [AbilityNameKeyType.SsrCardAcquire]: ['5', '6'],
    [AbilityNameKeyType.ActivitySupplyGift]: ['12', '17'],
    [AbilityNameKeyType.SupportRate]: ['66.1%', '74.6%', '83.1%', '91.5%', '100%'],
    [AbilityNameKeyType.VitalityCardAcquire]: ['3', '4'],
  },
  [RarityTierType.EventSSR]: {
    [AbilityNameKeyType.ASkillAcquire]: ['1', '2'],
    [AbilityNameKeyType.ASkillEnhance]: ['5', '7'],
    [AbilityNameKeyType.ClassWorkEnd]: ['4', '5'],
    [AbilityNameKeyType.Consult]: ['9', '14'],
    [AbilityNameKeyType.Delete]: ['6', '8'],
    [AbilityNameKeyType.EventBoost]: ['50%', '75%', '100%'],
    [AbilityNameKeyType.ExamEnd]: ['11', '17'],
    [AbilityNameKeyType.ExamHp]: ['4', '6'],
    [AbilityNameKeyType.InitialPp]: ['20', '30'],
    [AbilityNameKeyType.InitialStat]: ['52', '55', '59', '62', '65'],
    [AbilityNameKeyType.LessonEnd]: ['3', '4'],
    [AbilityNameKeyType.MSkillAcquire]: ['1', '2'],
    [AbilityNameKeyType.MSkillEnhance]: ['5', '7'],
    [AbilityNameKeyType.Outing]: ['8', '11'],
    [AbilityNameKeyType.PItemAcquire]: ['8', '11'],
    [AbilityNameKeyType.ParameterBonus]: ['6.5%', '7.0%', '7.5%', '8.0%', '8.5%'],
    [AbilityNameKeyType.SpLesson20]: ['15', '21'],
    [AbilityNameKeyType.SpLessonEnd]: ['9', '13'],
    [AbilityNameKeyType.SpLessonHp]: ['4', '5'],
    [AbilityNameKeyType.SpLessonHpAll]: ['3', '4'],
    [AbilityNameKeyType.SpLessonPp]: ['22%', '33%'],
    [AbilityNameKeyType.SpLessonRate]: ['14%', '21%'],
    [AbilityNameKeyType.SsrCardAcquire]: ['3', '5'],
    [AbilityNameKeyType.ActivitySupplyGift]: ['9', '12'],
    [AbilityNameKeyType.ActivitySupplyGiftHp]: ['3', '4'],
    [AbilityNameKeyType.SupportRate]: ['66.1%', '74.6%', '83.1%', '91.5%', '100%'],
    [AbilityNameKeyType.VitalityCardAcquire]: ['2', '3'],
  },
  [RarityTierType.SR]: {
    [AbilityNameKeyType.Change]: ['8', '16'],
    [AbilityNameKeyType.ClassWorkEnd]: ['3', '5'],
    [AbilityNameKeyType.ConcentrationCardAcquire]: ['2', '3'],
    [AbilityNameKeyType.Consult]: ['7', '14'],
    [AbilityNameKeyType.Customize]: ['5', '8'],
    [AbilityNameKeyType.Delete]: ['4', '8'],
    [AbilityNameKeyType.Discount]: ['7.9%', '15.8%'],
    [AbilityNameKeyType.EventBoost]: ['50%', '75%', '100%'],
    [AbilityNameKeyType.EventPpBoost]: ['50%', '75%', '100%'],
    [AbilityNameKeyType.ExamEnd]: ['9', '17'],
    [AbilityNameKeyType.GoodImpressionCardAcquire]: ['2', '3'],
    [AbilityNameKeyType.InitialPp]: ['65', '71', '76', '81', '86'],
    [AbilityNameKeyType.InitialStat]: ['37', '40', '43', '46', '49'],
    [AbilityNameKeyType.LessonEnd]: ['2', '4'],
    [AbilityNameKeyType.LessonPpBoost]: ['8.3%', '16.5%'],
    [AbilityNameKeyType.MSkillDelete]: ['8', '16'],
    [AbilityNameKeyType.MSkillEnhance]: ['4', '6'],
    [AbilityNameKeyType.MaxHp]: ['2', '3'],
    [AbilityNameKeyType.MotivationCardAcquire]: ['2', '3'],
    [AbilityNameKeyType.NormalLessonEnd]: ['7', '13'],
    [AbilityNameKeyType.Outing]: ['5', '10'],
    [AbilityNameKeyType.PDrinkExchange]: ['4', '8'],
    [AbilityNameKeyType.PItemAcquire]: ['6', '11'],
    [AbilityNameKeyType.ParameterBonus]: ['4.4%', '4.9%', '5.4%', '5.9%', '6.4%'],
    [AbilityNameKeyType.ReserveCardAcquire]: ['2', '3'],
    [AbilityNameKeyType.Rest]: ['9', '17'],
    [AbilityNameKeyType.SkillAcquire]: ['1', '2'],
    [AbilityNameKeyType.SkillEnhance]: ['2', '3'],
    [AbilityNameKeyType.SpLesson20]: ['8', '15'],
    [AbilityNameKeyType.SpLessonEnd]: ['7', '13'],
    [AbilityNameKeyType.SpLessonHp]: ['3', '5'],
    [AbilityNameKeyType.SpLessonRate]: ['10.5%', '21%'],
    [AbilityNameKeyType.SpLessonRateAll]: ['5.2%', '10.5%'],
    [AbilityNameKeyType.SpecialTraining]: ['9', '18'],
    [AbilityNameKeyType.SsrCardAcquire]: ['3', '5'],
    [AbilityNameKeyType.ActivitySupplyGift]: ['6', '11'],
    [AbilityNameKeyType.SupportRate]: ['59.2%', '69.4%', '79.6%', '89.8%', '100%'],
  },
  [RarityTierType.R]: {
    [AbilityNameKeyType.ClassWorkEnd]: ['2', '3'],
    [AbilityNameKeyType.EventBoost]: ['50%', '75%', '100%'],
    [AbilityNameKeyType.InitialPp]: ['20'],
    [AbilityNameKeyType.InitialStat]: ['23', '26', '28', '31', '33'],
    [AbilityNameKeyType.LessonEnd]: ['1', '3'],
    [AbilityNameKeyType.NormalLessonEnd]: ['5', '9'],
    [AbilityNameKeyType.Outing]: ['4', '7'],
    [AbilityNameKeyType.ParameterBonus]: ['2.8%', '3.2%', '3.6%', '4.0%', '4.3%'],
    [AbilityNameKeyType.Rest]: ['6', '11'],
    [AbilityNameKeyType.SpecialTraining]: ['7', '13'],
    [AbilityNameKeyType.ActivitySupplyGift]: ['4', '8'],
    [AbilityNameKeyType.SupportRate]: ['48.7%', '61.5%', '74.4%', '87.2%', '100%'],
  },
}

const schedules: Record<RarityTierType, number[][]> = scheduleData
const stages: Record<RarityTierType, Partial<Record<AbilityNameKeyType, string[]>>> = stageData

/**
 * スロット段階スケジュールを取得する。
 *
 * @param rarityTier - レアリティ階層
 * @param slot - スロット番号（1-based）
 * @returns 凸数→段階番号の配列
 */
export function getSchedule(rarityTier: RarityTierType, slot: number): readonly number[] {
  return schedules[rarityTier][slot - 1]
}

/**
 * アビリティの段階別効果値を取得する。
 *
 * @param rarityTier - レアリティ階層
 * @param nameKey - アビリティ名キー
 * @returns 段階別効果値配列
 */
export function getStages(rarityTier: RarityTierType, nameKey: AbilityNameKeyType): readonly string[] {
  return stages[rarityTier][nameKey]!
}

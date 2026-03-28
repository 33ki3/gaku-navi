/**
 * アクション回数カテゴリのマスタデータ。
 *
 * 点数計算の「アクション回数設定」セクションに表示する
 * 全アクションの一覧・グループ分類・グループラベルを統合的に定義する。
 */
import { ActionIdType, ActionGroupType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** アクション回数カテゴリの型 */
interface ActionCountCategory {
  id: ActionIdType
  label: TranslationKey
  summaryLabel?: TranslationKey
}

/** グループエントリの型 */
interface ActionGroupEntry {
  id: ActionGroupType
  label: TranslationKey
  categories: ActionCountCategory[]
}

const data: ActionGroupEntry[] = [
  {
      id: ActionGroupType.Activity,
      label: 'score.action_group.activity',
      categories: [
        { id: ActionIdType.SpLessonVo, label: 'score.action.sp_lesson_vo' },
        { id: ActionIdType.SpLessonDa, label: 'score.action.sp_lesson_da' },
        { id: ActionIdType.SpLessonVi, label: 'score.action.sp_lesson_vi' },
        { id: ActionIdType.ClassWork, label: 'score.action.class_work' },
        { id: ActionIdType.Outing, label: 'score.action.outing', summaryLabel: 'score.summary.outing' },
        { id: ActionIdType.Rest, label: 'score.action.rest', summaryLabel: 'score.summary.rest' },
        { id: ActionIdType.Consult, label: 'score.action.consult', summaryLabel: 'score.summary.consult' },
        { id: ActionIdType.ActivitySupplyGift, label: 'score.action.supply', summaryLabel: 'score.summary.supply' },
        { id: ActionIdType.SpecialTraining, label: 'score.action.special', summaryLabel: 'score.summary.special' },
        { id: ActionIdType.ExamEnd, label: 'score.action.exam', summaryLabel: 'score.summary.exam' },
        { id: ActionIdType.ExamPItemAcquire, label: 'score.action.exam_p_item', summaryLabel: 'score.summary.exam_p_item' },
        { id: ActionIdType.LessonVo, label: 'score.action.lesson_vo' },
        { id: ActionIdType.LessonDa, label: 'score.action.lesson_da' },
        { id: ActionIdType.LessonVi, label: 'score.action.lesson_vi' },
        { id: ActionIdType.NormalLessonVo, label: 'score.action.normal_lesson_vo' },
        { id: ActionIdType.NormalLessonDa, label: 'score.action.normal_lesson_da' },
        { id: ActionIdType.NormalLessonVi, label: 'score.action.normal_lesson_vi' },
        { id: ActionIdType.SpLesson20, label: 'score.action.sp_lesson_20' },
      ],
    },
    {
      id: ActionGroupType.SkillAcquire,
      label: 'score.action_group.skill_acquire',
      categories: [
        { id: ActionIdType.SkillAcquire, label: 'score.action.skill_acquire' },
        { id: ActionIdType.ASkillAcquire, label: 'score.action.active_acquire' },
        { id: ActionIdType.MSkillAcquire, label: 'score.action.mental_acquire' },
        { id: ActionIdType.SsrCardAcquire, label: 'score.action.ssr_acquire' },
        { id: ActionIdType.DrowsyAcquire, label: 'score.action.drowsy_acquire' },
        { id: ActionIdType.VitalityCardAcquire, label: 'score.action.vitality_acquire' },
        { id: ActionIdType.GoodConditionCardAcquire, label: 'score.action.good_condition_acquire' },
        { id: ActionIdType.ConcentrationCardAcquire, label: 'score.action.concentration_acquire' },
        { id: ActionIdType.GoodImpressionCardAcquire, label: 'score.action.good_impression_acquire' },
        { id: ActionIdType.MotivationCardAcquire, label: 'score.action.motivation_acquire' },
        { id: ActionIdType.AggressiveCardAcquire, label: 'score.action.aggressive_acquire' },
        { id: ActionIdType.ReserveCardAcquire, label: 'score.action.reserve_acquire' },
        { id: ActionIdType.FullPowerCardAcquire, label: 'score.action.full_power_acquire' },
      ],
    },
    {
      id: ActionGroupType.SkillEnhance,
      label: 'score.action_group.skill_enhance',
      categories: [
        { id: ActionIdType.SkillEnhance, label: 'score.action.skill_enhance' },
        { id: ActionIdType.ASkillEnhance, label: 'score.action.active_enhance' },
        { id: ActionIdType.MSkillEnhance, label: 'score.action.mental_enhance' },
      ],
    },
    {
      id: ActionGroupType.SkillDelete,
      label: 'score.action_group.skill_delete',
      categories: [
        { id: ActionIdType.Delete, label: 'score.action.skill_delete' },
        { id: ActionIdType.ASkillDelete, label: 'score.action.active_delete' },
        { id: ActionIdType.MSkillDelete, label: 'score.action.mental_delete' },
        { id: ActionIdType.TroubleDelete, label: 'score.action.trouble_delete' },
      ],
    },
    {
      id: ActionGroupType.PDrink,
      label: 'score.action_group.p_drink',
      categories: [
        { id: ActionIdType.PDrinkAcquire, label: 'score.action.p_drink_acquire' },
        { id: ActionIdType.PDrinkExchange, label: 'score.action.p_drink_exchange' },
      ],
    },
    {
      id: ActionGroupType.Other,
      label: 'score.action_group.other',
      categories: [
        { id: ActionIdType.Change, label: 'score.action.change' },
        { id: ActionIdType.Customize, label: 'score.action.customize' },
        { id: ActionIdType.PItemAcquire, label: 'score.action.p_item' },
      ],
    },
]

/** 全カテゴリのフラット配列（表示順を保持） */
export const ActionCategoryList: readonly ActionCountCategory[] = data.flatMap((g) => g.categories)

/** グループ別に分類された辞書 */
export const ActionGroups: Record<string, ActionCountCategory[]> = Object.fromEntries(
  data.map((g) => [g.id, g.categories]),
)

/**
 * アクショングループの表示ラベル（i18n キー）を返す。
 *
 * @param group - アクショングループ
 * @returns i18n キー
 */
export function getActionGroupLabel(group: ActionGroupType): TranslationKey {
  return data.find((g) => g.id === group)!.label
}

/** サマリ表示用のアクション一覧（summaryLabel を持つカテゴリのみ抽出） */
export const ActionSummaryList = ActionCategoryList.filter(
  (c): c is ActionCountCategory & { summaryLabel: TranslationKey } => c.summaryLabel != null,
)

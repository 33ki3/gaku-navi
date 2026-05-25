/**
 * HIF関連のマスタ定義。
 */
import * as enums from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** HIF公開レッスン選択肢の属性ラベルマスタ（VoLesson/DaLesson/ViLesson をキーに持つ）。 */
export const HIF_LESSON_OPTION_LABELS: Partial<Record<enums.ActivityIdType, TranslationKey>> = {
  [enums.ActivityIdType.VoLesson]: 'ui.settings.attr_vo',
  [enums.ActivityIdType.DaLesson]: 'ui.settings.attr_da',
  [enums.ActivityIdType.ViLesson]: 'ui.settings.attr_vi',
}

/** HIF公開レッスンのメイン/サブ属性の候補一覧（HIF_LESSON_OPTION_LABELS のキーと同一）。 */
export const HIF_LESSON_BASE_OPTIONS = Object.keys(HIF_LESSON_OPTION_LABELS) as enums.ActivityIdType[]

/** 活動IDからメインパラメータを判定するマスタ。 */
export const LESSON_MAIN_PARAM_MAP: Partial<Record<enums.ActivityIdType, enums.ParameterType>> = {
  [enums.ActivityIdType.VoLesson]: enums.ParameterType.Vocal,
  [enums.ActivityIdType.DaLesson]: enums.ParameterType.Dance,
  [enums.ActivityIdType.ViLesson]: enums.ParameterType.Visual,
  [enums.ActivityIdType.VoLessonDa]: enums.ParameterType.Vocal,
  [enums.ActivityIdType.VoLessonVi]: enums.ParameterType.Vocal,
  [enums.ActivityIdType.DaLessonVo]: enums.ParameterType.Dance,
  [enums.ActivityIdType.DaLessonVi]: enums.ParameterType.Dance,
  [enums.ActivityIdType.ViLessonVo]: enums.ParameterType.Visual,
  [enums.ActivityIdType.ViLessonDa]: enums.ParameterType.Visual,
}

/** 活動IDからサブパラメータを判定するマスタ（未指定時は2軸同時扱い）。 */
export const LESSON_SUB_PARAM_MAP: Partial<Record<enums.ActivityIdType, enums.ParameterType>> = {
  [enums.ActivityIdType.VoLessonDa]: enums.ParameterType.Dance,
  [enums.ActivityIdType.VoLessonVi]: enums.ParameterType.Visual,
  [enums.ActivityIdType.DaLessonVo]: enums.ParameterType.Vocal,
  [enums.ActivityIdType.DaLessonVi]: enums.ParameterType.Visual,
  [enums.ActivityIdType.ViLessonVo]: enums.ParameterType.Vocal,
  [enums.ActivityIdType.ViLessonDa]: enums.ParameterType.Dance,
}

/** HIF公開レッスン複合IDと main/sub ペアの対応マスタ。 */
export const HIF_LESSON_PAIR_MAP: Partial<
  Record<enums.ActivityIdType, { main: enums.ActivityIdType; sub: enums.ActivityIdType }>
> = {
  [enums.ActivityIdType.VoLessonDa]: { main: enums.ActivityIdType.VoLesson, sub: enums.ActivityIdType.DaLesson },
  [enums.ActivityIdType.VoLessonVi]: { main: enums.ActivityIdType.VoLesson, sub: enums.ActivityIdType.ViLesson },
  [enums.ActivityIdType.DaLessonVo]: { main: enums.ActivityIdType.DaLesson, sub: enums.ActivityIdType.VoLesson },
  [enums.ActivityIdType.DaLessonVi]: { main: enums.ActivityIdType.DaLesson, sub: enums.ActivityIdType.ViLesson },
  [enums.ActivityIdType.ViLessonVo]: { main: enums.ActivityIdType.ViLesson, sub: enums.ActivityIdType.VoLesson },
  [enums.ActivityIdType.ViLessonDa]: { main: enums.ActivityIdType.ViLesson, sub: enums.ActivityIdType.DaLesson },
}

/** MainのみID（Vo/Da/Vi）から既定の複合IDへ正規化する対応表。 */
export const HIF_LESSON_DEFAULT_PAIR_MAP: Partial<Record<enums.ActivityIdType, enums.ActivityIdType>> = {
  [enums.ActivityIdType.VoLesson]: enums.ActivityIdType.VoLessonDa,
  [enums.ActivityIdType.DaLesson]: enums.ActivityIdType.DaLessonVo,
  [enums.ActivityIdType.ViLesson]: enums.ActivityIdType.ViLessonVo,
}

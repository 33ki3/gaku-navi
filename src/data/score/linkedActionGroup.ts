/**
 * 連動アクショングループマスタ。
 *
 * 同一ソース（削除イベント/Pアイテム等）から提供される複数のアクションIDをグループ化する。
 * selfTrigger カウント調整で1つを変更したら、同グループ内の他も連動して変更する。
 * 各グループの先頭が汎用（親）アクション、以降がサブタイプ。
 */
import { ActionIdType } from '../../types/enums'

/** 連動アクショングループ一覧（先頭が親アクション） */
export const LinkedActionGroups: ActionIdType[][] = [
  [ActionIdType.SkillEnhance, ActionIdType.MSkillEnhance, ActionIdType.ASkillEnhance],
  [ActionIdType.Delete, ActionIdType.MSkillDelete, ActionIdType.ASkillDelete],
  [ActionIdType.SkillAcquire, ActionIdType.MSkillAcquire, ActionIdType.ASkillAcquire],
]

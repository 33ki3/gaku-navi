/**
 * 同じイベントやPアイテムから提供される複数のアクションをひとまとめにする定義
 *
 * 回数調整で1つの回数を変更したとき、同じグループの他の回数も連動させる
 * 各グループの先頭が全体の回数、以降が属性別の回数
 */
import { ActionIdType } from '../../types/enums'

/** 連動アクショングループ一覧（先頭が親アクション） */
export const LinkedActionGroups: ActionIdType[][] = [
  [ActionIdType.SkillEnhance, ActionIdType.MSkillEnhance, ActionIdType.ASkillEnhance],
  [ActionIdType.Delete, ActionIdType.MSkillDelete, ActionIdType.ASkillDelete],
  [ActionIdType.SkillAcquire, ActionIdType.MSkillAcquire, ActionIdType.ASkillAcquire],
]

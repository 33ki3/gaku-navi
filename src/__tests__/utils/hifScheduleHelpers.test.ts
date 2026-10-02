import { describe, expect, it } from 'vitest'
import * as data from '../../data'
import * as enums from '../../types/enums'

describe('HIFレッスン活動の表示モード変換', () => {
  it('半分モードでは複合IDをメイン属性IDへ変換する', () => {
    expect(data.getScheduleActivityForMode(enums.ActivityIdType.VoLessonDa, enums.ScenarioType.Hif, true)).toBe(
      enums.ActivityIdType.VoLesson,
    )
    expect(data.getScheduleActivityForMode(enums.ActivityIdType.DaLessonVi, enums.ScenarioType.Hif, true)).toBe(
      enums.ActivityIdType.DaLesson,
    )
    expect(data.getScheduleActivityForMode(enums.ActivityIdType.Rest, enums.ScenarioType.Hif, true)).toBe(
      enums.ActivityIdType.Rest,
    )
  })

  it('ペアモードではメイン属性IDを既定の複合IDへ変換する', () => {
    expect(data.getScheduleActivityForMode(enums.ActivityIdType.VoLesson, enums.ScenarioType.Hif, false)).toBe(
      enums.ActivityIdType.VoLessonDa,
    )
    expect(data.getScheduleActivityForMode(enums.ActivityIdType.DaLesson, enums.ScenarioType.Hif, false)).toBe(
      enums.ActivityIdType.DaLessonVo,
    )
    expect(data.getScheduleActivityForMode(enums.ActivityIdType.Rest, enums.ScenarioType.Hif, false)).toBe(
      enums.ActivityIdType.Rest,
    )
  })
})

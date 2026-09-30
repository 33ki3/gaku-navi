import { describe, expect, it } from 'vitest'
import * as enums from '../../types/enums'
import {
  normalizeHifLessonActivityForMainMode,
  normalizeHifLessonActivityForPairMode,
} from '../../utils/hifScheduleHelpers'

describe('HIFレッスン活動の表示モード変換', () => {
  it('半分モードでは複合IDをメイン属性IDへ変換する', () => {
    expect(normalizeHifLessonActivityForMainMode(enums.ActivityIdType.VoLessonDa)).toBe(enums.ActivityIdType.VoLesson)
    expect(normalizeHifLessonActivityForMainMode(enums.ActivityIdType.DaLessonVi)).toBe(enums.ActivityIdType.DaLesson)
    expect(normalizeHifLessonActivityForMainMode(enums.ActivityIdType.Rest)).toBe(enums.ActivityIdType.Rest)
  })

  it('ペアモードではメイン属性IDを既定の複合IDへ変換する', () => {
    expect(normalizeHifLessonActivityForPairMode(enums.ActivityIdType.VoLesson)).toBe(enums.ActivityIdType.VoLessonDa)
    expect(normalizeHifLessonActivityForPairMode(enums.ActivityIdType.DaLesson)).toBe(enums.ActivityIdType.DaLessonVo)
    expect(normalizeHifLessonActivityForPairMode(enums.ActivityIdType.Rest)).toBe(enums.ActivityIdType.Rest)
  })
})

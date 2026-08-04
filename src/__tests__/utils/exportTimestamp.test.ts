import { describe, expect, it } from 'vitest'
import { formatExportFileTimestamp, formatExportedAt } from '../../utils/exportTimestamp'

// UTCからJSTへの変換と、用途ごとの出力形式を確認する
describe('export timestamp formatting', () => {
  it('JSON用日時をJSTへ変換する', () => {
    // UTCの日付がJSTでは翌日になる境界を再現する
    const date = new Date('2026-08-04T16:03:24.673Z')

    // JSONにはミリ秒と+09:00を含むISO 8601形式を記録する
    expect(formatExportedAt(date)).toBe('2026-08-05T01:03:24.673+09:00')
  })

  it('ファイル名用の日時をJSTへ変換する', () => {
    // UTCの日付がJSTでは翌日になる境界を再現する
    const date = new Date('2026-08-04T16:03:24.673Z')

    // 既存のファイル名形式を保ったまま、JSTの日付へ変換する
    expect(formatExportFileTimestamp(date)).toBe('20260805T010324')
  })
})

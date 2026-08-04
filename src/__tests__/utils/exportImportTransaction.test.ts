/**
 * インポート時の localStorage 更新失敗に関するテスト
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as constant from '../../constant'
import { importUserDataText } from '../../utils/exportImport'

/**
 * テスト用のエクスポートJSONを作る
 *
 * @param data - localStorage キーと保存文字列
 * @returns インポートへ渡すJSON文字列
 */
function makeImportData(data: Record<string, unknown>): string {
  return JSON.stringify({
    version: constant.EXPORT_VERSION,
    exportedAt: '2026-07-30T00:00:00.000Z',
    data,
  })
}

// localStorageの退避・反映途中で失敗した場合に、変更前の値へロールバックできることを確認する
describe('インポートのストレージ更新', () => {
  beforeEach(() => {
    // 各ケースを空のlocalStorageから開始し、前のインポート結果を混ぜない
    localStorage.clear()
  })

  afterEach(() => {
    // setItem/getItemのspyを解除し、通常のStorage実装へ戻す
    vi.restoreAllMocks()
  })

  it('現在値の退避に失敗した場合は書き込みを始めない', () => {
    // 既存値の退避に使う読み取りを失敗させ、書き込み開始前のエラーを再現する
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    const result = importUserDataText(
      makeImportData({
        [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ 新しいカード: 4 }),
      }),
    )

    // インポートは失敗し、安全な退避ができない旨を表示する
    expect(result.success).toBe(false)
    expect(result.message).toContain('安全に退避できなかった')
    // 退避に失敗した時点で、データを変更するsetItemは一度も呼ばれない
    expect(setItemSpy).not.toHaveBeenCalled()
  })

  it('保存途中で失敗した場合は、それまでに変更した値を元へ戻す', () => {
    // 2つの既存値を用意し、2回目の書き込みだけを quota exceeded にする
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ 既存カード: 2 }))
    localStorage.setItem(constant.SETTINGS_PINNED_KEY, JSON.stringify(false))
    const nativeSetItem = Storage.prototype.setItem
    let writeCount = 0
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      writeCount += 1
      if (writeCount === 2) throw new Error('quota exceeded')
      nativeSetItem.call(localStorage, key, value)
    })

    const result = importUserDataText(
      makeImportData({
        [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ 新しいカード: 4 }),
        [constant.SETTINGS_PINNED_KEY]: JSON.stringify(true),
      }),
    )

    // 途中で失敗したインポートは成功扱いにならない
    expect(result.success).toBe(false)
    // 1回目の書き込みで変わった凸数も、トランザクションのロールバックで元へ戻る
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(JSON.stringify({ 既存カード: 2 }))
    // 2回目の書き込み対象も、元のfalseを維持する
    expect(localStorage.getItem(constant.SETTINGS_PINNED_KEY)).toBe(JSON.stringify(false))
  })
})

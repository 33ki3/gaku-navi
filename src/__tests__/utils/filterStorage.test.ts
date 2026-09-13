/**
 * 一覧フィルターの保存形式を検証する。
 * 除外状態フィルターを複数選択配列として保存・復元できることを確認する。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import { loadFilterState } from '../../utils/filterStorage'

describe('filterStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('未対応の単一値を無視し、除外状態フィルターを未選択として扱う', () => {
    localStorage.setItem(
      constant.FILTER_STORAGE_KEY,
      JSON.stringify({ cardExclusionFilter: enums.CardExclusionFilterType.Excluded }),
    )

    expect(loadFilterState()?.cardExclusionFilters).toEqual([])
  })

  it('cardExclusionFilters配列から除外中と未除外の有効値を復元する', () => {
    localStorage.setItem(
      constant.FILTER_STORAGE_KEY,
      JSON.stringify({
        cardExclusionFilters: [
          enums.CardExclusionFilterType.Excluded,
          enums.CardExclusionFilterType.NotExcluded,
          'invalid',
        ],
      }),
    )

    expect(loadFilterState()?.cardExclusionFilters).toEqual([
      enums.CardExclusionFilterType.Excluded,
      enums.CardExclusionFilterType.NotExcluded,
    ])
  })
})

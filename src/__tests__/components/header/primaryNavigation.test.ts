/**
 * PCとスマホで異なる主要ナビゲーションの表示順を検証する。
 *
 * 表示ラベルではなく、enumで管理するキーの順序を確認してマスタの変更を検知する
 */
import { describe, expect, it, vi } from 'vitest'
import { createPrimaryNavigationItems } from '../../../components/header/navigationItems'
import { MOBILE_PRIMARY_NAVIGATION_ORDER } from '../../../data/ui/primaryNavigation'
import { PrimaryNavigationKey } from '../../../types/enums'

const actions = {
  uncap: { label: '凸数', action: vi.fn(), active: false },
  simulator: { label: '最適編成', action: vi.fn(), active: true },
  scoreSettings: { label: '点数設定', action: vi.fn(), active: false },
}

/** PCの標準順と、最適編成を中央に置くスマホ順のキー配列を検証する */
describe('primary navigation definitions', () => {
  it('PCの標準順で主要操作を生成する', () => {
    // 順序指定を省略した場合はPC用の凸数→最適編成→点数設定になる
    const items = createPrimaryNavigationItems(actions)

    // 表示ラベルではなくenumのキーで、ナビゲーションの並びを検証する
    expect(items.map((item) => item.key)).toEqual([
      PrimaryNavigationKey.Uncap,
      PrimaryNavigationKey.Simulator,
      PrimaryNavigationKey.ScoreSettings,
    ])
  })

  it('スマホ下部メニューでは最適編成を中央に置く', () => {
    // スマホ専用順を渡すと、最適編成が最後の項目として返る定義を確認する
    const items = createPrimaryNavigationItems(actions, MOBILE_PRIMARY_NAVIGATION_ORDER)

    // 下部メニューの順序と、最適編成の表示ラベルが一致することを確認する
    expect(items.map((item) => item.key)).toEqual([
      PrimaryNavigationKey.Uncap,
      PrimaryNavigationKey.ScoreSettings,
      PrimaryNavigationKey.Simulator,
    ])
    expect(items[2]?.label).toBe('最適編成')
  })
})

import { Suspense } from 'react'
import * as lazyModules from '../../utils/lazyModules'
import { createPreloadedComponent } from '../../utils/preloadedComponent'
import type { MoreMenuItemsProps } from './MoreMenuItems'

const MoreMenuItems = createPreloadedComponent(lazyModules.loadMoreMenuItems)

/**
 * その他メニューの遅延コンポーネントを共通のSuspense境界で表示する。
 */
export function DeferredMoreMenuItems(props: MoreMenuItemsProps) {
  return (
    <Suspense fallback={null}>
      {/* 共通のその他メニュー項目 */}
      <MoreMenuItems {...props} />
    </Suspense>
  )
}

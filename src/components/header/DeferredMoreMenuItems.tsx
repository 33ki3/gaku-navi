import { Suspense, lazy } from 'react'
import type { MoreMenuItemsProps } from './MoreMenuItems'

const MoreMenuItems = lazy(() =>
  import('./MoreMenuItems').then(({ MoreMenuItems: Component }) => ({ default: Component })),
)
/**
 * 初回表示では使わない「その他」の項目を、メニューを開いた時だけ読み込む。
 * 親メニューのレイアウトは各ナビゲーション側に残し、共通項目だけを
 * 遅延境界に入れる
 */
export function DeferredMoreMenuItems(props: MoreMenuItemsProps) {
  // 「その他」は初回表示に必須ではないため、操作時のチャンクへ分ける
  return (
    <Suspense fallback={null}>
      {/* 共通のその他メニュー項目 */}
      <MoreMenuItems {...props} />
    </Suspense>
  )
}

/**
 * ナビゲーション状態に応じたクラスを組み立てるユーティリティ。
 *
 * Tailwindクラスの定数はヘッダー機能に残し、状態分岐だけをコンポーネント外へ置く
 */
import * as navigationStyles from '../components/header/navigationStyles'
import * as constant from '../constant'

/**
 * モバイル下部ナビゲーションの項目クラスを返す。状態クラスの組み立てを
 * 各描画側で重複させない
 */
export function getMobileNavigationItemClass(active: boolean): string {
  const stateClass = active ? constant.NAV_ITEM_ACTIVE : navigationStyles.INACTIVE_MOBILE_ITEM_CLASS
  return `${navigationStyles.MOBILE_NAV_BUTTON_CLASS} ${stateClass}`
}

/** スマホヘッダーメニューの項目クラスを返す */
export function getMobileHeaderMenuItemClass(active: boolean): string {
  const stateClass = active ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
  return `${navigationStyles.MOBILE_HEADER_MENU_ITEM_CLASS} ${stateClass}`
}

/** PCヘッダータイルのクラスを返す */
export function getHeaderTileClass(active: boolean, inactiveClass: string): string {
  const stateClass = active ? constant.NAV_ITEM_ACTIVE : inactiveClass
  return `${navigationStyles.HEADER_TILE_CLASS} ${stateClass}`
}

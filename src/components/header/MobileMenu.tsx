/**
 * スマホヘッダーと下部ナビゲーションの状態をまとめるコンテナ。
 *
 * 個々の表示は専用コンポーネントへ分け、このファイルでは
 * メニュー間で共有する開閉状態と自動非表示だけを管理する。
 */
import { useCallback, useEffect, useState } from 'react'
import { useCardUIContext } from '../../contexts/CardContext'
import { useEscapeClose } from '../../hooks/useEscapeClose'
import { useMobileNavigationVisibility } from '../../hooks/useMobileNavigationVisibility'
import { MobileBottomNavigation } from './MobileBottomNavigation'
import { MobileHeaderMenu } from './MobileHeaderMenu'
import { MobileMoreMenu } from './MobileMoreMenu'
import type {
  MobileBottomNavigationPreferences,
  MobileFilterNavigation,
  MobilePanelNavigation,
  MoreMenuActions,
} from './navigationTypes'

interface MobileMenuProps {
  /** 点数設定・最適編成パネルの状態と操作 */
  panels: MobilePanelNavigation
  /** 凸数編集を切り替える */
  onToggleUncapEdit: () => void
  /** 絞り込み・並び替えの状態と操作 */
  filter: MobileFilterNavigation
  /** 「その他」内の操作 */
  moreMenuActions: MoreMenuActions
  /** 下部ナビゲーションの表示設定 */
  bottomNavigation: MobileBottomNavigationPreferences
  /** 外部操作から下部ナビを表示し直す関数を登録する */
  registerMobileNavigationShow?: (handler: (() => void) | null) => void
}

/**
 * スマホ向けの右上メニューと下部ナビゲーションを連携させる。
 *
 * @param props - パネル、絞り込み、「その他」、下部ナビゲーションの設定
 * @returns スマホ向けヘッダーメニューと下部ナビゲーション
 */
export function MobileMenu({
  panels,
  onToggleUncapEdit,
  filter,
  moreMenuActions,
  bottomNavigation,
  registerMobileNavigationShow,
}: MobileMenuProps) {
  const { uncapEditMode } = useCardUIContext()
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const anyMenuOpen = headerMenuOpen || moreMenuOpen

  const closeMenus = useCallback(() => {
    setHeaderMenuOpen(false)
    setMoreMenuOpen(false)
  }, [])

  useEscapeClose(anyMenuOpen, closeMenus)

  const mobileNavigation = useMobileNavigationVisibility({
    keepFixed: bottomNavigation.keepFixed,
    preventHiding: anyMenuOpen,
  })

  useEffect(() => {
    // 選択完了など、メニュー外の操作からも同じ表示復元処理を呼べるようにする
    registerMobileNavigationShow?.(mobileNavigation.show)
    return () => registerMobileNavigationShow?.(null)
  }, [mobileNavigation.show, registerMobileNavigationShow])

  return (
    <>
      {/* 右上ヘッダーメニュー */}
      <MobileHeaderMenu
        open={headerMenuOpen}
        uncapEditMode={uncapEditMode}
        panels={panels}
        onToggleUncapEdit={onToggleUncapEdit}
        moreMenuActions={moreMenuActions}
        onOpenChange={setHeaderMenuOpen}
        onShowBottomNavigation={mobileNavigation.show}
      />
      {/* 下部ナビ */}
      {bottomNavigation.show && (
        <MobileBottomNavigation
          hidden={mobileNavigation.hidden}
          uncapEditMode={uncapEditMode}
          panels={panels}
          filter={filter}
          moreMenuOpen={moreMenuOpen}
          onToggleUncapEdit={onToggleUncapEdit}
          onOpenMoreMenu={() => setMoreMenuOpen(true)}
          onShow={mobileNavigation.show}
        />
      )}

      {/* その他の操作ボトムシート */}
      <MobileMoreMenu open={moreMenuOpen} actions={moreMenuActions} onClose={() => setMoreMenuOpen(false)} />
    </>
  )
}

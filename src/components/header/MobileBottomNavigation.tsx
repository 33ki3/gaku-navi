/**
 * スマホ画面下部に固定表示する主要ナビゲーション
 */
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { MOBILE_PRIMARY_NAVIGATION_ORDER } from '../../data/ui/primaryNavigation'
import { PrimaryNavigationKey } from '../../types/enums'
import * as navigationStyleUtils from '../../utils/navigationStyles'
import { FilterCountBadge } from '../ui/FilterCountBadge'
import { MenuIcon, SortIcon } from '../ui/icons'
import { NavigationActionButton } from './NavigationActionButton'
import { createPrimaryNavigationItems } from './navigationItems'
import type { MobileFilterNavigation, MobilePanelNavigation } from './navigationTypes'

interface MobileBottomNavigationProps {
  /** 下部ナビゲーションを画面外へ隠すか */
  hidden: boolean
  /** 凸数編集が有効か */
  uncapEditMode: boolean
  /** 点数設定・最適編成パネルの状態と操作 */
  panels: MobilePanelNavigation
  /** 絞り込み・並び替えの状態と操作 */
  filter: MobileFilterNavigation
  /** 「その他」メニューが開いているか */
  moreMenuOpen: boolean
  /** 凸数編集を切り替える */
  onToggleUncapEdit: () => void
  /** 「その他」メニューを開く */
  onOpenMoreMenu: () => void
  /** 下部ナビゲーションを再表示する */
  onShow: () => void
}

/**
 * 凸数・点数設定・最適編成・絞り込み・その他の主要操作を画面下部へ表示する
 *
 * @param props - 各項目の状態、操作、ナビゲーションの表示状態
 * @returns document.bodyへポータル表示するスマホ下部ナビゲーション
 */
export function MobileBottomNavigation({
  hidden,
  uncapEditMode,
  panels,
  filter,
  moreMenuOpen,
  onToggleUncapEdit,
  onOpenMoreMenu,
  onShow,
}: MobileBottomNavigationProps) {
  const { t } = useTranslation()
  const panelActive = panels.scoreSettings.active || panels.simulator.active
  // ラベル・操作は現在の状態から組み立て、アイコンと表示順は
  // ナビゲーション定義へ委譲する
  const primaryItems = createPrimaryNavigationItems(
    {
      uncap: { label: t('ui.navigation.uncap'), action: onToggleUncapEdit, active: uncapEditMode },
      simulator: {
        label: t('ui.navigation.simulator'),
        action: panels.simulator.open,
        active: panels.simulator.active,
      },
      scoreSettings: {
        label: t('ui.navigation.score'),
        action: panels.scoreSettings.open,
        active: panels.scoreSettings.active,
      },
    },
    MOBILE_PRIMARY_NAVIGATION_ORDER,
  )
  const runPrimaryAction = (action: () => void) => {
    onShow()
    action()
  }

  return createPortal(
    <nav
      aria-label={t('ui.accessibility.main_actions')}
      className={`fixed inset-x-0 bottom-0 z-40 min-h-[calc(3.8rem+env(safe-area-inset-bottom))] border-t border-slate-200/80 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 transition-transform duration-200 ease-out md:hidden ${
        panelActive ? 'bg-white shadow-none' : 'bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl'
      } ${hidden ? 'pointer-events-none translate-y-full' : 'translate-y-0'}`}
    >
      <div className="mx-auto flex max-w-md items-center gap-1">
        {/* 主要ナビゲーション項目 */}
        {primaryItems.map((item) => (
          <NavigationActionButton
            key={item.key}
            icon={item.icon}
            label={item.label}
            onClick={() => runPrimaryAction(item.action)}
            className={navigationStyleUtils.getMobileNavigationItemClass(item.active)}
            iconClassName="h-5 w-5"
            ariaPressed={item.key === PrimaryNavigationKey.Uncap ? item.active : undefined}
          />
        ))}
        {/* 絞り込み・並び順操作 */}
        <button onClick={filter.open} className={navigationStyleUtils.getMobileNavigationItemClass(filter.count > 0)}>
          <span className="relative">
            <SortIcon className="h-5 w-5" ascending={filter.sortReverse} />
            {/* 適用中の絞り込み件数 */}
            <FilterCountBadge count={filter.count} className="absolute -right-2.5 -top-1.5" />
          </span>
          <span className="max-w-full truncate">{filter.label}</span>
        </button>
        {/* その他の操作ボタン */}
        <button
          onClick={onOpenMoreMenu}
          className={navigationStyleUtils.getMobileNavigationItemClass(moreMenuOpen)}
          aria-expanded={moreMenuOpen}
        >
          <MenuIcon className="h-5 w-5" isOpen={moreMenuOpen} />
          <span className="truncate">{t('ui.navigation.more')}</span>
        </button>
      </div>
    </nav>,
    document.body,
  )
}

/**
 * スマホヘッダー右上に表示するドロップダウンメニュー
 */
import { useTranslation } from 'react-i18next'
import * as navigationStyleUtils from '../../utils/navigationStyles'
import { MenuIcon } from '../ui/icons'
import { DeferredMoreMenuItems } from './DeferredMoreMenuItems'
import { NavigationActionButton } from './NavigationActionButton'
import { createPrimaryNavigationItems } from './navigationItems'
import type { MobilePanelNavigation, MoreMenuActions } from './navigationTypes'

interface MobileHeaderMenuProps {
  /** メニューが開いているか */
  open: boolean
  /** 凸数編集が有効か */
  uncapEditMode: boolean
  /** 点数設定・最適編成パネルの状態と操作 */
  panels: MobilePanelNavigation
  /** 凸数編集を切り替える */
  onToggleUncapEdit: () => void
  /** 「その他」内の操作 */
  moreMenuActions: MoreMenuActions
  /** メニューの開閉状態を更新する */
  onOpenChange: (open: boolean) => void
  /** 下部ナビゲーションを再表示する */
  onShowBottomNavigation: () => void
}

/**
 * スマホヘッダーの主要操作と「その他」をまとめたメニューを表示する
 *
 * @param props - メニュー状態、パネル状態、各操作
 * @returns スマホヘッダー右上のメニューボタンとドロップダウン
 */
export function MobileHeaderMenu({
  open,
  uncapEditMode,
  panels,
  onToggleUncapEdit,
  moreMenuActions,
  onOpenChange,
  onShowBottomNavigation,
}: MobileHeaderMenuProps) {
  const { t } = useTranslation()
  const close = () => onOpenChange(false)

  const runPrimaryAction = (action: () => void) => {
    onShowBottomNavigation()
    action()
    close()
  }

  // ラベル・操作は現在の状態から組み立て、アイコンと識別子は共通定義を利用する
  const primaryItems = createPrimaryNavigationItems({
    uncap: { label: t('ui.settings.uncap_settings'), action: onToggleUncapEdit, active: uncapEditMode },
    simulator: {
      label: t('ui.settings.unit_simulator'),
      action: panels.simulator.open,
      active: panels.simulator.pinned,
    },
    scoreSettings: {
      label: t('ui.settings.score_settings'),
      action: panels.scoreSettings.open,
      active: panels.scoreSettings.pinned,
    },
  })

  return (
    <div className="relative md:hidden">
      {/* 右上メニューの開閉ボタン */}
      <button
        onClick={() => onOpenChange(!open)}
        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 md:hidden"
        aria-label={t('ui.accessibility.menu')}
        aria-expanded={open}
      >
        <MenuIcon className="h-5 w-5" isOpen={open} />
      </button>

      {/* 背景クリックで閉じる透明レイヤーと操作項目のポップオーバー */}
      {open && (
        <>
          {/* 背景クリックでメニューを閉じる透明レイヤー */}
          <div className="fixed inset-0 z-20" onClick={close} aria-hidden="true" />
          {/* 主要操作とその他項目のポップオーバー */}
          <div className="absolute right-0 top-full z-[80] mt-1 w-48 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
            {/* 主要ナビゲーション項目 */}
            {primaryItems.map((item) => (
              <NavigationActionButton
                key={item.key}
                icon={item.icon}
                label={item.label}
                onClick={() => runPrimaryAction(item.action)}
                className={navigationStyleUtils.getMobileHeaderMenuItemClass(item.active)}
                iconClassName="h-4 w-4"
                labelClassName="truncate"
              />
            ))}
            <div className="my-1 border-t border-slate-100" />
            {/* その他のメニュー項目 */}
            <DeferredMoreMenuItems actions={moreMenuActions} onAfterAction={close} />
          </div>
        </>
      )}
    </div>
  )
}

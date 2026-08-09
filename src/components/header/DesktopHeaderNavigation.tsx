/**
 * PC・タブレット向けのヘッダーナビゲーション
 */
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as uiData from '../../data/ui'
import { useEscapeClose } from '../../hooks/useEscapeClose'
import * as enums from '../../types/enums'
import * as navigationStyleUtils from '../../utils/navigationStyles'
import { MenuIcon } from '../ui/icons'
import { DeferredMoreMenuItems } from './DeferredMoreMenuItems'
import { NavigationActionButton } from './NavigationActionButton'
import { createPrimaryNavigationItems } from './navigationItems'
import * as navigationStyles from './navigationStyles'
import type { MoreMenuActions } from './navigationTypes'

interface HeaderAction {
  /** 選択状態か */
  active: boolean
  /** 選択時の処理 */
  select: () => void
}

interface DesktopHeaderNavigationProps {
  /** 凸数設定の状態と操作 */
  uncap: HeaderAction
  /** 最適編成の状態と操作 */
  simulator: HeaderAction
  /** 点数設定の状態と操作 */
  scoreSettings: HeaderAction
  /** 「その他」内の操作 */
  moreMenuActions: MoreMenuActions
}

/**
 * PC・タブレットの主要操作を、幅を抑えたタイル型ボタンで表示する
 *
 * @param props - 各主要操作の状態と「その他」メニューの操作
 * @returns PC・タブレット向けヘッダーナビゲーション
 */
export function DesktopHeaderNavigation({
  uncap,
  simulator,
  scoreSettings,
  moreMenuActions,
}: DesktopHeaderNavigationProps) {
  const { t } = useTranslation()
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const closeMoreMenu = useCallback(() => setMoreMenuOpen(false), [])
  useEscapeClose(moreMenuOpen, closeMoreMenu)

  const inactiveClass = uiData.getFilterButtonStyle(enums.FilterButtonCategory.Inactive)
  // ラベル・操作は現在の状態から組み立て、アイコンと表示順は共通定義を利用する
  const primaryItems = createPrimaryNavigationItems({
    uncap: { label: t('ui.settings.uncap_settings'), action: uncap.select, active: uncap.active },
    simulator: { label: t('ui.settings.unit_simulator'), action: simulator.select, active: simulator.active },
    scoreSettings: {
      label: t('ui.settings.score_settings'),
      action: scoreSettings.select,
      active: scoreSettings.active,
    },
  })

  return (
    <nav aria-label={t('ui.accessibility.main_actions')} className="hidden min-w-0 items-center gap-0.5 md:flex">
      {/* 主要ナビゲーション項目 */}
      {primaryItems.map((item) => (
        <NavigationActionButton
          key={item.key}
          icon={item.icon}
          label={item.label}
          onClick={item.action}
          className={navigationStyleUtils.getHeaderTileClass(item.active, inactiveClass)}
          iconClassName={navigationStyles.HEADER_TILE_ICON_CLASS}
          labelClassName="max-w-full truncate leading-tight"
        />
      ))}
      {/* その他操作ボタンとポップオーバー */}
      <div className="relative">
        <button
          onClick={() => setMoreMenuOpen((open) => !open)}
          className={navigationStyleUtils.getHeaderTileClass(moreMenuOpen, inactiveClass)}
          aria-expanded={moreMenuOpen}
        >
          <MenuIcon className={navigationStyles.HEADER_TILE_ICON_CLASS} isOpen={moreMenuOpen} />
          <span className="max-w-full truncate leading-tight">{t('ui.navigation.more')}</span>
        </button>
        {moreMenuOpen && (
          <>
            {/* 背景クリックでその他メニューを閉じる透明レイヤー */}
            <div className="fixed inset-0 z-20" onClick={closeMoreMenu} aria-hidden="true" />
            {/* その他のメニュー項目 */}
            <div className="absolute right-0 top-full z-[80] mt-1 w-52 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
              <DeferredMoreMenuItems actions={moreMenuActions} onAfterAction={closeMoreMenu} />
            </div>
          </>
        )}
      </div>
    </nav>
  )
}

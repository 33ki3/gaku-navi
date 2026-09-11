/**
 * PCヘッダー、スマホヘッダー、スマホ下部ナビで共用する補助メニュー。
 * 各親メニューの開閉状態は持たず、渡された操作を実行して親へ完了を通知する
 */
import { useTranslation } from 'react-i18next'
import { GearIcon, InfoIcon, PlusIcon, QuestionIcon, UploadIcon } from '../ui/icons'
import * as navigationStyles from './navigationStyles'
import type { MoreMenuActions } from './navigationTypes'

/** 「その他」メニューへ渡す操作と、実行後の後処理 */
export interface MoreMenuItemsProps {
  /** メニューから実行できる操作 */
  actions: MoreMenuActions
  /** 操作後に親メニューを閉じる処理 */
  onAfterAction?: () => void
}

/**
 * PC・右上メニュー・スマホ下部で共用する「その他」の項目
 *
 * @param props - 各メニュー項目の操作と、操作後に親メニューを閉じる処理
 * @returns 共通化された補助メニュー項目
 */
export function MoreMenuItems({ actions, onAfterAction }: MoreMenuItemsProps) {
  const { t } = useTranslation()

  const runAction = (action: () => void) => {
    action()
    onAfterAction?.()
  }

  return (
    <>
      {/* サポート追加操作 */}
      <button onClick={() => runAction(actions.openUserCardForm)} className={navigationStyles.MORE_MENU_ITEM_CLASS}>
        <PlusIcon className="h-4 w-4" />
        {t('user_support.add_button')}
      </button>
      <div className="my-1 border-t border-slate-100" />
      {/* データ管理操作 */}
      <button onClick={() => runAction(actions.openDataManagement)} className={navigationStyles.MORE_MENU_ITEM_CLASS}>
        <UploadIcon className="h-4 w-4" />
        {t('ui.data_management.title')}
      </button>
      {/* オプション操作 */}
      <button onClick={() => runAction(actions.openOptions)} className={navigationStyles.MORE_MENU_ITEM_CLASS}>
        <GearIcon className="h-4 w-4" />
        {t('ui.options.title')}
      </button>
      <div className="my-1 border-t border-slate-100" />
      {/* ヘルプとAboutの操作 */}
      <button onClick={() => runAction(actions.openHelp)} className={navigationStyles.MORE_MENU_ITEM_CLASS}>
        <QuestionIcon className="h-4 w-4" />
        {t('ui.help.title')}
      </button>
      <button onClick={() => runAction(actions.openAbout)} className={navigationStyles.MORE_MENU_ITEM_CLASS}>
        <InfoIcon className="h-4 w-4" />
        {t('ui.about.title')}
      </button>
    </>
  )
}

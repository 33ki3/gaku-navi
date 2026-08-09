/**
 * スマホ下部ナビゲーションから開く「その他」メニュー
 */
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { MenuIcon } from '../ui/icons'
import { DeferredMoreMenuItems } from './DeferredMoreMenuItems'
import type { MoreMenuActions } from './navigationTypes'

interface MobileMoreMenuProps {
  /** メニューが開いているか */
  open: boolean
  /** 「その他」内の操作 */
  actions: MoreMenuActions
  /** メニューを閉じる */
  onClose: () => void
}

/**
 * 補助操作をまとめたボトムシートをdocument.bodyへ表示する
 *
 * @param props - 開閉状態、「その他」の操作、閉じる処理
 * @returns 開いている場合はボトムシート、閉じている場合はnull
 */
export function MobileMoreMenu({ open, actions, onClose }: MobileMoreMenuProps) {
  const { t } = useTranslation()
  if (!open) return null

  // ヘッダーや下部ナビの親要素にあるoverflow・z-indexの影響を避けるため、document.body直下へ表示する
  return createPortal(
    <>
      {/* ボトムシートの背景レイヤー */}
      <div
        className="fixed inset-0 z-[60] bg-slate-950/25 backdrop-blur-[2px] md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* その他の操作をまとめたボトムシート */}
      <div
        role="dialog"
        aria-modal={false}
        aria-label={t('ui.navigation.more')}
        className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl md:hidden"
      >
        <div className="mb-1 flex items-center justify-between px-2 py-1.5">
          <p className="text-xs font-black text-slate-900">{t('ui.navigation.more')}</p>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={t('ui.accessibility.close')}
          >
            {/* ボトムシートを閉じるアイコン */}
            <MenuIcon className="h-4 w-4" isOpen />
          </button>
        </div>
        {/* 共通のその他メニュー項目 */}
        <DeferredMoreMenuItems actions={actions} onAfterAction={onClose} />
      </div>
    </>,
    document.body,
  )
}

/**
 * サポート一覧の操作モードに応じた完了操作バー。
 *
 * モード分岐は呼び出し側で行い、共通の表示部分だけを共有する。
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import type { TranslationKey } from '../../i18n'

interface CardListModeCompletionBarContentProps {
  /** 操作内容のラベル */
  label: TranslationKey
  /** 完了操作のラベル */
  doneLabel: TranslationKey
  /** 完了操作 */
  onDone: () => void
  /** スマホ下部ナビゲーション分の余白を確保するか */
  showMobileBottomNav: boolean
}

/** サポート一覧の操作モードに対応する完了操作バーを表示する */
export function CardListModeCompletionBarContent({
  label,
  doneLabel,
  onDone,
  showMobileBottomNav,
}: CardListModeCompletionBarContentProps) {
  const { t } = useTranslation()

  return (
    <div
      className={`${constant.MANUAL_SELECTION_BAR} ${
        showMobileBottomNav ? constant.MANUAL_SELECTION_WITH_NAV : constant.MANUAL_SELECTION_WITHOUT_NAV
      }`}
    >
      <span className="text-xs font-bold">{t(label)}</span>
      <button
        type="button"
        onClick={onDone}
        className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-50"
      >
        {t(doneLabel)}
      </button>
    </div>
  )
}

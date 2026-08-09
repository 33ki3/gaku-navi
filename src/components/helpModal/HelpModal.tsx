/**
 * ヘルプモーダルコンポーネント
 *
 * アプリの使い方ガイドを表示するモーダル。
 * 各機能の説明を折りたたみセクション形式で表示し、
 * セクションの開閉状態とモーダル全体の配置を管理する。
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import { useAccordionState } from '../../hooks'
import * as enums from '../../types/enums'
import CloseButton from '../ui/CloseButton'
import ModalOverlay from '../ui/ModalOverlay'
import { HelpSections } from './HelpSections'

/** HelpModal コンポーネントに渡すプロパティ */
interface HelpModalProps {
  /** モーダルを閉じる関数 */
  onClose: () => void
}

/** 各セクションの初期開閉状態（すべて閉じた状態） */
const initialSections: Record<enums.HelpSectionKey, boolean> = {
  [enums.HelpSectionKey.Filter]: false,
  [enums.HelpSectionKey.CardList]: false,
  [enums.HelpSectionKey.Score]: false,
  [enums.HelpSectionKey.CountTarget]: false,
  [enums.HelpSectionKey.Uncap]: false,
  [enums.HelpSectionKey.Data]: false,
  [enums.HelpSectionKey.UnitSimulator]: false,
  [enums.HelpSectionKey.UserSupport]: false,
}

/**
 * 機能別の説明を折りたたみ形式で表示する。
 *
 * @param props - モーダルを閉じる操作
 * @returns ヘルプセクションを含むモーダル
 */
export default function HelpModal({ onClose }: HelpModalProps) {
  const { t } = useTranslation()
  const { state: sections, toggle } = useAccordionState(initialSections)

  return (
    <ModalOverlay onClose={onClose} panelClassName={constant.MODAL_PANEL_DETAIL}>
      {/* ヘルプモーダルのヘッダー */}
      <div className="sticky top-0 bg-white z-10 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-800">{t('ui.help.title')}</h2>
        {/* ヘルプモーダルを閉じるボタン */}
        <CloseButton onClick={onClose} size={enums.ButtonSizeType.Sm} />
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* 機能別のヘルプセクション */}
        <HelpSections sections={sections} onToggle={toggle} />
      </div>
    </ModalOverlay>
  )
}

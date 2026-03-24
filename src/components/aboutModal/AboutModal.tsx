/**
 * Aboutモーダルコンポーネント
 *
 * アプリの概要・使い方・免責事項を表示するモーダル。
 * コンテンツ部分は AboutContent に分離しており、
 * 将来ルーター導入時にそのままページコンポーネントに移植可能。
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import { ButtonSizeType } from '../../types/enums'
import ModalOverlay from '../ui/ModalOverlay'
import CloseButton from '../ui/CloseButton'
import AboutContent from './AboutContent'

/** AboutModal コンポーネントに渡すプロパティ */
interface AboutModalProps {
  /** モーダルを閉じる関数 */
  onClose: () => void
  /** 点数設定パネルがピン留めされているか */
  settingsPinned: boolean
}

/** アプリの概要・使い方・免責事項を表示するモーダル */
export default function AboutModal({ onClose, settingsPinned }: AboutModalProps) {
  const { t } = useTranslation()

  return (
    <ModalOverlay onClose={onClose} panelClassName={constant.MODAL_PANEL_DETAIL} className={settingsPinned ? 'md:right-96' : ''}>
      {/* ヘッダー */}
      <div className="sticky top-0 bg-white z-10 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-800">{t('ui.about.title')}</h2>
        <CloseButton onClick={onClose} size={ButtonSizeType.Sm} />
      </div>

      <div className="px-5 py-4">
        <AboutContent />
      </div>
    </ModalOverlay>
  )
}

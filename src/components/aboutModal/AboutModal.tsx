/**
 * Aboutモーダルコンポーネント
 *
 * アプリの概要・使い方・免責事項を表示するモーダル。
 * コンテンツ部分は AboutContent に分離しており、
 * 将来ルーター導入時にそのままページコンポーネントに移植可能。
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import CloseButton from '../ui/CloseButton'
import ModalOverlay from '../ui/ModalOverlay'
import AboutContent from './AboutContent'

/** AboutModal コンポーネントに渡すプロパティ */
interface AboutModalProps {
  /** モーダルを閉じる関数 */
  onClose: () => void
}

/**
 * アプリの概要・使い方・免責事項を表示する。
 *
 * @param props - モーダルを閉じる操作
 * @returns Aboutコンテンツを含むモーダル
 */
export default function AboutModal({ onClose }: AboutModalProps) {
  const { t } = useTranslation()

  return (
    <ModalOverlay onClose={onClose} panelClassName={constant.MODAL_PANEL_DETAIL}>
      {/* Aboutモーダルのヘッダー */}
      <div className="sticky top-0 bg-white z-10 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-800">{t('ui.about.title')}</h2>
        {/* Aboutモーダルを閉じるボタン */}
        <CloseButton onClick={onClose} size={enums.ButtonSizeType.Sm} />
      </div>

      <div className="px-5 py-4">
        {/* アプリ概要と免責事項 */}
        <AboutContent />
      </div>
    </ModalOverlay>
  )
}

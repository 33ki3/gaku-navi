/**
 * 折りたたみセクション
 *
 * タイトルをクリックすると、中身の表示/非表示を切り替える。
 * サポート詳細モーダルやスコア設定パネルで使われる。
 * タイトルの左に ▶ アイコンがあり、開くと ▼ に回転する。
 */
import type { ReactNode } from 'react'
import { getCollapsibleVariantClass } from '../../data/ui'
import type { CollapsibleVariantType } from '../../types/enums'
import { CollapsibleVariantType as CollapsibleVariantEnum } from '../../types/enums'
import { ChevronRightIcon } from './icons'

/** CollapsibleSection コンポーネントに渡すプロパティ */
interface CollapsibleSectionProps {
  /** セクションのタイトル（常に表示される） */
  title: ReactNode
  /** 中身が開いている（見えている）かどうか */
  isOpen: boolean
  /** タイトルをクリックした時に呼ばれる関数 */
  onToggle: () => void
  /** 見た目のバリアント（modal / settings）。デフォルトは modal */
  variant?: CollapsibleVariantType
  /** 展開操作とは独立した一括操作など、見出し右側の操作 */
  headerActions?: ReactNode
  /** 閉じている時も表示する進捗など、見出し直下の内容 */
  headerContent?: ReactNode
  /** ページ内のカードなど、外枠の表示クラス */
  className?: string
  /** 見出しの余白や文字サイズを画面に合わせる場合のクラス */
  headerClassName?: string
  /** セクションの中身（開いている時だけ表示される） */
  children: React.ReactNode
}

/** 折りたたみ可能なセクションを描画する */
export default function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  variant = CollapsibleVariantEnum.Modal,
  children,
  headerActions,
  headerContent,
  className,
  headerClassName,
}: CollapsibleSectionProps) {
  return (
    <div className={className}>
      <div className={headerActions ? 'flex items-center gap-2' : undefined}>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onToggle()
            }
          }}
          className={headerClassName ?? getCollapsibleVariantClass(variant)}
        >
          <ChevronRightIcon className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          {title}
        </div>
        {headerActions}
      </div>
      {headerContent}
      {isOpen && children}
    </div>
  )
}

/**
 * 折りたたみセクション
 *
 * タイトルをクリックすると、中身の表示/非表示を切り替える。
 * サポート詳細モーダルやスコア設定パネルで使われる。
 * タイトルの左に ▶ アイコンがあり、開くと ▼ に回転する。
 */
import type { ReactNode } from 'react'
import type { CollapsibleVariantType } from '../../types/enums'
import { CollapsibleVariantType as CollapsibleVariantEnum } from '../../types/enums'
import { getCollapsibleVariantClass } from '../../data/ui'

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
}: CollapsibleSectionProps) {
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        className={getCollapsibleVariantClass(variant)}
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
        {title}
      </div>
      {isOpen && children}
    </div>
  )
}

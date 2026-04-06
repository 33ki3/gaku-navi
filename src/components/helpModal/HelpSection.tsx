/**
 * ヘルプセクションコンポーネント
 *
 * ヘルプモーダル内の折りたたみセクション。
 * CollapsibleSection に似ているが、ヘルプモーダル専用のスタイルを使う。
 */

import { ChevronRightIcon } from '../ui/icons'

/** HelpSection コンポーネントに渡すプロパティ */
interface HelpSectionProps {
  /** セクションタイトル */
  title: string
  /** セクションが開いているか */
  isOpen: boolean
  /** 開閉トグル関数 */
  onToggle: () => void
  /** セクション内容 */
  children: React.ReactNode
}

/** ヘルプモーダル用の折りたたみセクション */
export function HelpSection({ title, isOpen, onToggle, children }: HelpSectionProps) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <ChevronRightIcon className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        {title}
      </button>
      {isOpen && <div className="px-3 py-2.5 bg-white">{children}</div>}
    </div>
  )
}

/**
 * 文章だけで機能を説明するヘルプセクション。
 *
 * フィルター例や対応表のような固有表示を持たない説明を、同じ余白・文字組みで表示する。
 */
import { HelpSection } from './HelpSection'

/** DescriptionHelpSection に渡すプロパティ */
interface DescriptionHelpSectionProps {
  /** セクションタイトル */
  title: string
  /** セクション本文 */
  description: string
  /** セクションが開いているか */
  isOpen: boolean
  /** セクションの開閉を切り替える関数 */
  onToggle: () => void
}

/**
 * 文章形式のヘルプセクションを表示する
 *
 * @param props - タイトル、本文、開閉状態と開閉操作
 * @returns 文章形式の折りたたみセクション
 */
export function DescriptionHelpSection({ title, description, isOpen, onToggle }: DescriptionHelpSectionProps) {
  return (
    <HelpSection title={title} isOpen={isOpen} onToggle={onToggle}>
      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{description}</p>
    </HelpSection>
  )
}

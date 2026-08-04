import type { IconProps } from './types'

/**
 * 右矢印（展開切替）アイコンを表示する
 *
 * @param props - アイコンの表示設定
 * @returns 右方向への展開を表す SVG 要素
 */
export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

/**
 * 下向き矢印（展開インジケーター）アイコンを表示する
 *
 * @param props - アイコンの表示設定
 * @returns 下方向への展開を表す SVG 要素
 */
export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

/**
 * ハンバーガーメニューまたは閉じるアイコンを表示する
 *
 * @param props - アイコンの表示設定
 * @returns メニューの開閉状態を表す SVG 要素
 */
export function MenuIcon({ className, isOpen }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {isOpen ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  )
}

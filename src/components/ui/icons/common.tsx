import type { IconProps } from './types'

/**
 * ×（閉じる・削除）アイコンを表示する
 *
 * @param props - アイコンの表示設定
 * @returns 閉じる操作を表す SVG 要素
 */
export function CloseIcon({ className, title }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      {title && <title>{title}</title>}
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

/**
 * 検索（虫眼鏡）アイコンを表示する
 *
 * @param props - アイコンの表示設定
 * @returns 検索を表す SVG 要素
 */
export function SearchIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

/**
 * プラス（+）アイコンを表示する
 *
 * @param props - アイコンの表示設定
 * @returns 追加操作を表す SVG 要素
 */
export function PlusIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

/**
 * About / 情報（丸い i）アイコンを表示する
 *
 * @param props - アイコンの表示設定
 * @returns 情報を表す SVG 要素
 */
export function InfoIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

/**
 * はてな（ヘルプ）アイコンを表示する
 *
 * @param props - アイコンの表示設定
 * @returns ヘルプを表す SVG 要素
 */
export function QuestionIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01"
      />
    </svg>
  )
}

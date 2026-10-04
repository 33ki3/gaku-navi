import type { IconProps } from './types'

/**
 * 星（凸数設定）アイコンを表示する
 *
 * @param props - アイコンの表示設定
 * @returns 凸数設定を表す SVG 要素
 */
export function StarIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  )
}

/**
 * スコア設定（スライダー3本）アイコンを表示する
 *
 * @param props - アイコンの表示設定
 * @returns スコア設定を表す SVG 要素
 */
export function ScoreSettingsIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
      />
    </svg>
  )
}

/**
 * 電卓（最適編成）アイコンを表示する
 *
 * @param props - アイコンの表示設定
 * @returns 最適編成を表す SVG 要素
 */
export function CalculatorIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  )
}

/** 達成条件のオン・オフを塗り分ける五芒星アイコン */
export function RatingStarIcon({ className, filled }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinejoin="round"
        d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.53l6.22-.9L12 3Z"
      />
    </svg>
  )
}

/** アチーブメントの分類マークを、四隅の三角形・ひし形・星で表す */
export function AchievementIcon({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 2H2v5l5-5Zm10 0h5v5l-5-5ZM2 17v5h5l-5-5Zm20 0v5h-5l5-5ZM12 3l9 9-9 9-9-9 9-9Z"
      />
      <path strokeLinejoin="round" d="m12 8 1.2 2.4 2.6.4-1.9 1.9.4 2.6-2.3-1.2-2.3 1.2.4-2.6-1.9-1.9 2.6-.4L12 8Z" />
    </svg>
  )
}

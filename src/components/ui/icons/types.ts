/** アイコン共通プロパティ */
export interface IconProps {
  /** Tailwind CSS クラス（サイズ・色） */
  className?: string
  /** アクセシビリティ用タイトル */
  title?: string
  /** 開閉状態（MenuIcon 等で使用） */
  isOpen?: boolean
  /** 塗りつぶし状態（LockIcon 等で使用） */
  filled?: boolean
  /** ソート矢印の向き（true: 上、false: 下） */
  ascending?: boolean
}

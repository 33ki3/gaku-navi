/**
 * 複数のモーダルやパネルが重なっても、最後の1枚が閉じるまで
 * 背景スクロールを再開しないための共有ロック
 */
let lockCount = 0
let previousOverflow = ''

/**
 * bodyのスクロールを止め、重複呼び出しを考慮した解除関数を返す
 *
 * @returns この呼び出しで取得したロックだけを解除する関数
 */
export function lockBodyScroll(): () => void {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount++

  let released = false
  return () => {
    if (released) return
    released = true
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount === 0) {
      document.body.style.overflow = previousOverflow
    }
  }
}

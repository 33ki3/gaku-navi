import { afterEach, describe, expect, it } from 'vitest'
import { lockBodyScroll } from '../../utils/bodyScrollLock'

/** モーダルが重なった場合も参照カウントで背景ロックを維持することを確認する */
describe('lockBodyScroll', () => {
  afterEach(() => {
    // 各テストで変更したbodyのスタイルを戻し、次のテストへロック状態を持ち越さない
    document.body.style.overflow = ''
  })

  it('ロック中は背景スクロールを止め、解除時に元の値へ戻す', () => {
    document.body.style.overflow = 'auto'

    // ロック開始時は元の値を保存し、背景スクロールをhiddenへ変更する
    const unlock = lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')

    // 最後の解除で、ロック前のautoへ復元される
    unlock()
    expect(document.body.style.overflow).toBe('auto')
  })

  it('複数画面が重なった場合は、最後の画面が閉じるまで解除しない', () => {
    // パネルとモーダルが同時にロックを取得した状態を作る
    const unlockPanel = lockBodyScroll()
    const unlockModal = lockBodyScroll()

    unlockModal()
    // 一方だけ解除しても、もう一方が保持しているためhiddenが続く
    expect(document.body.style.overflow).toBe('hidden')

    unlockPanel()
    // すべての利用者が解除した時点で、初期値の空文字列へ戻る
    expect(document.body.style.overflow).toBe('')
  })
})

/**
 * 固定パネルから参照するヘッダー高をCSS変数へ同期するフック
 */
import { type RefObject, useEffect } from 'react'
import * as constant from '../constant'

/**
 * ヘッダーの実測高をCSS変数へ反映し、サイズ変更にも追従する
 *
 * @param headerRef - 高さを監視するヘッダー要素の参照
 * @returns 戻り値なし
 */
export function useHeaderHeightCssVariable(headerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    const updateHeaderHeight = () => {
      // 実測値を使うことで、折り返しが発生するタブレット幅でもパネルをずらさない
      document.documentElement.style.setProperty(constant.APP_HEADER_HEIGHT_PROPERTY, `${header.offsetHeight}px`)
    }

    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)

    // ResizeObserverがある場合は、フォントやメニュー開閉による高さ変更も検知する
    // ResizeObserverが利用できるブラウザでは、折り返しによる高さ変更も検知する
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateHeaderHeight)
    observer?.observe(header)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateHeaderHeight)
      document.documentElement.style.removeProperty(constant.APP_HEADER_HEIGHT_PROPERTY)
    }
  }, [headerRef])
}

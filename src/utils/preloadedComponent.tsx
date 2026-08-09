/**
 * 先読み済みのdynamic importを、初回表示時だけ同期的に利用するための補助。
 *
 * モジュール自体はdynamic importの別チャンクに残る。先読みが完了していれば
 * React.lazyの内部状態を経由せずに表示し、未完了ならPromiseをSuspenseへ渡す。
 */
import { type ComponentType, createElement } from 'react'
import type { LazyModuleLoader } from './lazyPreload'

interface DefaultComponentModule<P extends object> {
  default: ComponentType<P>
}

/** 先読み完了時の同期表示と、未完了時のSuspenseを共通化する */
export function createPreloadedComponent<P extends object>(
  loader: LazyModuleLoader<DefaultComponentModule<P>>,
): ComponentType<P> {
  return function PreloadedComponent(props: P) {
    const module = loader.getResolved()
    if (!module) throw loader()
    return createElement(module.default, props)
  }
}

/**
 * 遅延importの共有ローダーと起動時先読み。
 *
 * 実際に表示する処理と先読みで同じPromiseを使い、同一チャンクの二重取得を避ける。
 */

/** 先読み完了状態を表示側から参照できる遅延モジュールローダー */
export type LazyModuleLoader<T> = (() => Promise<T>) & {
  getResolved: () => T | undefined
}

/** 遅延importのPromiseを共有するローダーを作成する */
export function createLazyModuleLoader<T>(importer: () => Promise<T>): LazyModuleLoader<T> {
  let promise: Promise<T> | undefined
  let resolved: T | undefined
  const load = (() => {
    if (!promise) {
      // 先読み失敗時はPromiseを破棄し、ユーザー操作で再試行できるようにする
      promise = importer()
        .then((module) => {
          resolved = module
          return module
        })
        .catch((error: unknown) => {
          promise = undefined
          resolved = undefined
          throw error
        })
    }
    return promise
  }) as LazyModuleLoader<T>
  load.getResolved = () => resolved
  return load
}

/**
 * 登録済みの遅延モジュールを起動直後にまとめて取得・評価する。
 *
 * Promiseを待たずに呼び出せるため、Reactのroot作成と並行して進む。
 * dynamic importのチャンク構成は維持し、メインJSへは結合しない。
 */
export function preloadAllLazyModules(loaders: readonly (() => Promise<unknown>)[]): Promise<void> {
  return Promise.all(loaders.map((loader) => loader().catch(() => undefined))).then(() => undefined)
}

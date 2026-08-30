/**
 * 遅延importの共有ローダー。
 *
 * 実際に表示する処理で同じPromiseを使い、同一チャンクの二重取得を避ける。
 */

/** 読み込み済み状態を表示側から参照できる遅延モジュールローダー */
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

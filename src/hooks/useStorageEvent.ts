/** 保存領域の変更を、対象キーだけ購読する低レベルhook */
import { useEffect, useRef } from 'react'
import * as constant from '../constant'

/** 購読する保存キー。複数指定時はどれか一つに一致すれば通知する */
type StorageEventKey = string | readonly string[]

/**
 * 保存領域の変更を購読する
 *
 * `event.key === null` は保存領域全体の削除なので、対象キーに関係なく通知する
 *
 * @param keys 購読対象の保存キー
 * @param onStorage 保存領域の変更時に呼び出す関数
 */
export function useStorageEvent(keys: StorageEventKey, onStorage: (event: StorageEvent) => void): void {
  // 購読を張り直さず、常に最新のコールバックを呼ぶための参照
  const onStorageRef = useRef(onStorage)
  const keySignature = typeof keys === 'string' ? keys : keys.join('\u0000')

  useEffect(() => {
    onStorageRef.current = onStorage
  }, [onStorage])

  useEffect(() => {
    const keyList = keySignature === '' ? [] : keySignature.split('\u0000')
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && !keyList.includes(event.key)) return
      onStorageRef.current(event)
    }
    window.addEventListener(constant.STORAGE_EVENT_NAME, handleStorage)
    return () => window.removeEventListener(constant.STORAGE_EVENT_NAME, handleStorage)
  }, [keySignature])
}

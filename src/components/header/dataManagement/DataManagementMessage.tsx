/**
 * データ管理で実行した操作の結果メッセージ
 */
import * as enums from '../../../types/enums'
import type { DataManagementMessage as DataManagementMessageValue } from './types'

/** 操作結果メッセージに渡すプロパティ */
interface DataManagementMessageProps {
  /** 表示する操作結果 */
  message: DataManagementMessageValue
}

/**
 * データ管理の成功・失敗メッセージを表示する
 *
 * @param props - 表示する操作結果
 * @returns 結果種別に応じて色分けされたメッセージ
 */
export default function DataManagementMessage({ message }: DataManagementMessageProps) {
  const colorClass = message.type === enums.DataManagementMessageType.Success ? 'text-green-600' : 'text-red-600'

  return (
    <div className="mt-3 min-w-0">
      <p className={`max-w-full whitespace-pre-line break-words text-[11px] font-medium leading-relaxed ${colorClass}`}>
        {message.text}
      </p>
    </div>
  )
}

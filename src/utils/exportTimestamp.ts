/** エクスポートファイル名とJSONへ記録する日時を日本標準時へ整形する */
import * as constant from '../constant'
import * as enums from '../types/enums'

const JST_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: constant.EXPORT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** 指定日時をJSTの年月日時分秒へ分解する */
function getJstDateParts(date: Date): Record<enums.ExportDatePartType, string> {
  const parts = JST_DATE_FORMATTER.formatToParts(date)
  const values: Partial<Record<enums.ExportDatePartType, string>> = {}

  for (const type of Object.values(enums.ExportDatePartType)) {
    const part = parts.find((candidate) => candidate.type === type)
    if (part) values[type] = part.value
  }

  const { year, month, day, hour, minute, second } = values
  if (!year || !month || !day || !hour || !minute || !second) {
    throw new Error('Missing export date part')
  }

  return { year, month, day, hour, minute, second }
}

/** JSONへ保存するエクスポート日時をJSTのISO 8601形式へ変換する */
export function formatExportedAt(date: Date): string {
  const parts = getJstDateParts(date)
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0')
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${milliseconds}${constant.EXPORT_TIME_ZONE_OFFSET}`
}

/** ダウンロードファイル名用のJSTタイムスタンプを作る */
export function formatExportFileTimestamp(date: Date): string {
  const parts = getJstDateParts(date)
  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`
}

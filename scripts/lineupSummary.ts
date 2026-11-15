/** 最適編成のカード一覧をMarkdown表にする */

type JsonRecord = Record<string, unknown>

/** 表示名とカードデータ内の属性キーの対応 */
export const parameterTypeLabels = {
  vocal: 'Vo',
  dance: 'Da',
  visual: 'Vi',
} as const

const parameterTypeSortOrder: Record<string, number> = { vocal: 0, dance: 1, visual: 2 }

/** JSON由来の値が名前付きプロパティを持つオブジェクトか判定する */
function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** JSON由来の値から有限数を取り出す */
function firstNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** サポートタイプを表の表示名へ変換する */
export function parameterTypeLabel(value: unknown): string {
  return typeof value === 'string' && Object.hasOwn(parameterTypeLabels, value)
    ? parameterTypeLabels[value as keyof typeof parameterTypeLabels]
    : ''
}

/** Markdown表のセルとして表示できるよう値の特殊文字を置き換える */
export function escapeLineupCell(value: unknown): string {
  return String(value)
    .replaceAll('|', '\\|')
    .replace(/[\r\n]/g, ' ')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/** 凸数を表示用の日本語へ変換する */
export function uncapLabel(value: unknown): string {
  if (value === -1) return '未所持'
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 4) return `${value}凸`
  return '不明'
}

/** カード名・凸数・カード点を同じ列構成の編成表へ変換する */
export function renderLineupTable(value: unknown, totalScore?: number): string {
  if (!Array.isArray(value)) return '編成データがありません。'
  const members = value.filter(isRecord)
  if (members.length === 0) return '編成データがありません。'

  const sortedMembers = [...members].sort((left, right) => {
    const leftTypeOrder = typeof left.parameterType === 'string' ? (parameterTypeSortOrder[left.parameterType] ?? 3) : 3
    const rightTypeOrder =
      typeof right.parameterType === 'string' ? (parameterTypeSortOrder[right.parameterType] ?? 3) : 3
    if (leftTypeOrder !== rightTypeOrder) return leftTypeOrder - rightTypeOrder
    const leftName = typeof left.name === 'string' ? left.name : '名称不明'
    const rightName = typeof right.name === 'string' ? right.name : '名称不明'
    return leftName.localeCompare(rightName, 'ja')
  })
  const cardScores = sortedMembers.map((member) => firstNumber(member.cardScore))
  const cardScoreTotal = cardScores.every((score): score is number => score !== undefined)
    ? cardScores.reduce((total, score) => total + score, 0)
    : undefined

  return [
    '| タイプ | カード | 凸数 | カード点（連携込み） |',
    '| --- | --- | ---: | ---: |',
    ...sortedMembers.map((member) => {
      const type = parameterTypeLabel(member.parameterType) || '—'
      const name = typeof member.name === 'string' ? member.name : '名称不明'
      const rentalLabel = member.isRental === true ? '（レンタル）' : ''
      const cardScore = firstNumber(member.cardScore)
      return `| ${type} | ${escapeLineupCell(name)} | ${uncapLabel(member.uncap)}${rentalLabel} | ${cardScore ?? '—'} |`
    }),
    `|  | カード点合計 |  | ${cardScoreTotal ?? '未集計'} |`,
    `|  | 総合点 |  | ${totalScore ?? '未確定'} |`,
  ].join('\n')
}

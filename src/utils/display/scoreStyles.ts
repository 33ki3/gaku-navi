/**
 * スコア内訳表示用のスタイルヘルパー。
 *
 * スコア内訳モーダルの行ごとに、値がゼロかどうかで
 * 背景色・テキスト色を切り替える。
 *
 * @param value - スコア値
 * @returns 行背景・テキスト色・サブテキスト色・スコア数値色のCSSクラス
 */
export function getScoreStyles(value: number) {
  const isZero = value === 0
  return {
    rowBackground: isZero ? 'bg-slate-50' : 'bg-blue-50',
    textColor: isZero ? 'text-slate-500' : 'text-slate-700',
    subTextColor: isZero ? 'text-slate-400' : 'text-slate-500',
    scoreColor: isZero ? 'text-slate-400' : 'text-blue-800',
  }
}

/**
 * 遅延読み込み中に内容の配置を示す共通スケルトン
 * @returns 支援技術の読み上げ対象から除外した配置用スケルトン
 */
export function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-5" aria-hidden="true">
      <div className="h-5 w-2/5 animate-pulse rounded bg-slate-300" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-100 ring-1 ring-slate-200" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-10 animate-pulse rounded-lg bg-slate-100 ring-1 ring-slate-200" />
        <div className="h-10 animate-pulse rounded-lg bg-slate-100 ring-1 ring-slate-200" />
      </div>
      <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
    </div>
  )
}

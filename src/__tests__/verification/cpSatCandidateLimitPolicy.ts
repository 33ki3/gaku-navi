/** CP-SAT matrix の既知回帰条件とランダムケースの候補上限再試行を定義する */

export type OptimizerCaseKind = 'all-four-control' | 'randomized'

export const expandedCandidateLimit = 45

/** run #199で候補不足が出た条件。期待スコアは固定せず、最新カードデータから毎回計算する */
export const historicalCandidateLimitRegressions = [
  { variant: 'Vo5_授業Da', plan: 'Sense' },
  { variant: 'Vo5_授業Da', plan: 'Anomaly' },
  { variant: 'Vo5_授業Vi', plan: 'Sense' },
  { variant: 'Vo5_授業Vi', plan: 'Anomaly' },
] as const

const historicalRegressionKeys = new Set(
  historicalCandidateLimitRegressions.map(({ variant, plan }) => `${variant}:${plan}`),
)

export function getInitialCandidateLimit(
  kind: OptimizerCaseKind,
  scenario: string,
  variant: string,
  plan: string,
  configuredLimit: number,
): number {
  if (kind !== 'all-four-control' || scenario !== 'hajime' || !historicalRegressionKeys.has(`${variant}:${plan}`)) {
    return configuredLimit
  }
  return Math.max(configuredLimit, expandedCandidateLimit)
}

export function getCandidateRetryLimit(
  kind: OptimizerCaseKind,
  candidateLimit: number,
  candidateScore: number,
  bestKnownScore: unknown,
): number | undefined {
  if (
    kind !== 'randomized' ||
    candidateLimit >= expandedCandidateLimit ||
    typeof bestKnownScore !== 'number' ||
    !Number.isFinite(bestKnownScore) ||
    bestKnownScore <= candidateScore
  ) {
    return undefined
  }
  return expandedCandidateLimit
}

/** ランダムケースの不一致・未証明は記録するが、必須チェックを止めない */
export function isNonBlockingRandomizedResult(kind: OptimizerCaseKind, status: string): boolean {
  return kind === 'randomized' && (status === 'non_optimal' || status === 'unknown')
}

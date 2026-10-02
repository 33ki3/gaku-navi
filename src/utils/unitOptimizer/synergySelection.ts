/**
 * 単体点と、他カードへ与える・他カードから受ける連携の見込み点で探索候補を選ぶ。
 * 最大6枚の仮編成で連携を見積もり、SP条件とタイプ別最低候補数を確保して上限まで絞る。
 * 見込み点は候補選定にだけ使い、選ばれた6枚の確定点は編成の評価器で計算する。
 */
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import type { UnitSimulatorSettings } from '../../types/unit'
import { getLockedRentalCardName } from '../unitCardSelection'
import type { CandidateCard } from './candidatePreparation'
import { getSynergyExtraCount } from './synergyScore'

/** 候補ごとの制約判定で共用し、評価のたびに属性一覧を作り直さない */
const PARAMETER_TYPES = Object.values(enums.ParameterType)

/** 固定枠を起点に、通常・レンタル候補との連携を見積もるための条件 */
interface SynergySelectionContext {
  /** 未指定なら枚数・同名重複・レンタル枠の制約のみ適用する */
  settings?: UnitSimulatorSettings
  /** 選択済みのカード。見込み点を計算する仮編成にも必ず含める */
  fixedCandidates?: readonly CandidateCard[]
  /** 通常枠の連携相手。未指定なら順位付けの対象候補を使う */
  normalCandidates?: readonly CandidateCard[]
  /** レンタル枠の連携相手。通常枠とは別の凸数・計算結果を持つ */
  rentalCandidates?: readonly CandidateCard[]
  /** 順位付けの対象自身がレンタル枠を使うか */
  rentalSelection?: boolean
}

/** 仮編成のメンバー。通常枠とレンタル枠を区別して同時採用の可否を判定する */
interface SynergyMember {
  /** 得点・提供回数を事前計算したカード */
  candidate: CandidateCard
  /** trueなら編成内で1枚だけ採用できるレンタル枠を使う */
  rental: boolean
}

/** 候補や連携相手によらず共通の条件を、順位付けの前に一度だけ準備する */
interface PotentialContext {
  /** タイプ上下限とSP条件。未指定なら枠数・同名重複・レンタル1枚の制約を確認する */
  settings?: UnitSimulatorSettings
  /** 対象と同時採用する通常・レンタル候補 */
  partners: readonly SynergyMember[]
  /** 仮編成にも必ず含める固定カードと採用方法 */
  fixedMembers: readonly SynergyMember[]
  /** 順位付けの対象自身がレンタル枠を使うか */
  rentalSelection: boolean
  /** 複数属性のSP不足を1枚で補える候補があるか */
  hasAllSp: boolean
}

/**
 * 単体点の降順で比較し、同点はカード名の昇順で決定する。
 * 候補準備と連携評価で共用し、同点時の候補順を揃える。
 *
 * @param a - 比較元の候補
 * @param b - 比較先の候補
 * @returns aを先に並べる場合は負、bを先に並べる場合は正、同順位なら0
 */
export function compareCandidateBaseScores(a: CandidateCard, b: CandidateCard): number {
  return b.baseScore - a.baseScore || (a.card.name < b.card.name ? -1 : a.card.name > b.card.name ? 1 : 0)
}

/**
 * 仮編成への追加が枠数・重複・タイプ上限に違反せず、下限制約を満たす余地があるか判定する。
 * 残り候補で編成を完成できるかの厳密な探索は行わず、必要枠数による事前判定に留める。
 *
 * @param members - 固定枠を含む現在の仮編成
 * @param next - 追加する候補と通常・レンタル枠の区分
 * @param context - 編成制約と事前計算済みのAllSP候補の有無
 * @returns 追加後も制約を満たす余地があればtrue
 */
function canAddMember(members: readonly SynergyMember[], next: SynergyMember, context: PotentialContext): boolean {
  // 6枠・同名禁止・レンタル1枚は、設定の有無にかかわらず仮編成でも守る
  if (members.length >= constant.UNIT_SIZE) return false
  if (members.some((member) => member.candidate.card.name === next.candidate.card.name)) return false
  if (next.rental && members.some((member) => member.rental)) return false
  const settings = context.settings
  if (!settings) return true

  const candidates = [...members.map((member) => member.candidate), next.candidate]
  const slots = constant.UNIT_SIZE - candidates.length
  // 上限超過を除外しつつ、タイプ・SPの不足を残り枠で補えるか確認する
  let missingTypes = 0
  let missingSp = 0
  let largestMissingSp = 0
  for (const type of PARAMETER_TYPES) {
    const typeCount = candidates.filter((candidate) => candidate.card.type === type).length
    if (typeCount > settings.typeCountMax[type]) return false
    missingTypes += Math.max(0, settings.typeCountMin[type] - typeCount)
    const spCount = candidates.filter(
      (candidate) => candidate.spCategory === type || candidate.spCategory === enums.SpCategoryType.All,
    ).length
    const deficit = Math.max(0, settings.spConstraint[type] - spCount)
    missingSp += deficit
    largestMissingSp = Math.max(largestMissingSp, deficit)
  }
  // AllSPは複数属性の不足を同時に補えるため、残り枠の必要数を過大評価しない
  return missingTypes <= slots && (context.hasAllSp ? largestMissingSp : missingSp) <= slots
}

/**
 * 他のメンバーが提供するアクション回数から、受け手に加わる連携点を計算する。
 * 自身の提供分は単体点に含まれるため除外し、発動上限の残り回数と評価器と同じ端数処理を適用する。
 *
 * @param receiver - 連携による加点を受けるカード
 * @param providers - アクション回数の提供元。受け手自身が含まれていても、その提供分は除外する
 * @returns 単体点に含まれない、他のカードの提供分による追加点
 */
function receiverGain(receiver: CandidateCard, providers: readonly CandidateCard[]): number {
  let score = 0
  for (const ability of receiver.synergyAbilities) {
    if (ability.parsedValue <= 0) continue
    // 受け手以外の提供回数だけを足し、単体点で計算済みの自身の回数を重ねない
    const count = providers.reduce(
      (total, provider) =>
        total + (provider.card.name === receiver.card.name ? 0 : provider.providedActionsVec[ability.actionIdx]),
      0,
    )
    // 単体点で使った発動回数を差し引いた上限まで、他カードの提供分を加点する
    const available = getSynergyExtraCount(ability, count)
    score += Math.floor(ability.parsedValue * available)
  }
  return score
}

/**
 * 固定枠・レンタル区分・AllSP候補の有無を準備し、連携相手を試す際の再計算を省く
 *
 * @param candidates - 順位付けの対象。通常候補未指定時は連携相手にも使う
 * @param context - 固定カード、通常・レンタル候補と編成制約
 * @returns 仮編成の制約判定と見込み点の計算に共用する条件
 */
function preparePotentialContext(
  candidates: readonly CandidateCard[],
  context: SynergySelectionContext,
): PotentialContext {
  const isAllSp = (candidate: CandidateCard) => candidate.spCategory === enums.SpCategoryType.All
  const fixedRentalName = context.settings ? getLockedRentalCardName(context.settings) : null
  return {
    settings: context.settings,
    partners: [
      ...(context.normalCandidates ?? candidates).map((candidate) => ({ candidate, rental: false })),
      ...(context.rentalCandidates ?? []).map((candidate) => ({ candidate, rental: true })),
    ],
    fixedMembers: (context.fixedCandidates ?? []).map((candidate) => ({
      candidate,
      rental: candidate.card.name === fixedRentalName,
    })),
    rentalSelection: context.rentalSelection ?? false,
    hasAllSp: (context.normalCandidates ?? []).some(isAllSp) || (context.rentalCandidates ?? []).some(isAllSp),
  }
}

/**
 * 対象と固定枠を含む仮編成へ、連携点の増分が最大の相手を順に追加して見込み点を求める。
 * 貪欲に相手を選ぶ近似であり、最終編成の最大点を保証する計算ではない。
 *
 * @param candidate - 候補に残す価値を評価するカード
 * @param context - 事前計算済みの固定枠と編成制約
 * @param receiving - trueなら対象が受ける点、falseなら対象が他のメンバーに与える点
 * @returns 対象の単体点に含まれない連携の見込み点
 */
function calculatePotential(candidate: CandidateCard, context: PotentialContext, receiving: boolean): number {
  // 対象が固定枠と共存できなければ、連携相手を探す必要はない
  if (receiving ? candidate.synergyAbilities.length === 0 : candidate.providedActionEntries.length === 0) return 0
  const members = [...context.fixedMembers]
  const target = { candidate, rental: context.rentalSelection }
  if (!canAddMember(members, target, context)) return 0
  members.push(target)
  // 受ける点は対象自身への加点、与える点は対象の提供分を除いた編成との差分で求める
  const gain = (group: readonly SynergyMember[]) => {
    const providers = group.map((member) => member.candidate)
    if (receiving) return receiverGain(candidate, providers)
    // 他の提供元だけで上限へ達する分は、対象が与える点として重ねて評価しない
    const withoutCandidate = providers.filter((provider) => provider.card.name !== candidate.card.name)
    return providers.reduce(
      (total, receiver) => total + receiverGain(receiver, providers) - receiverGain(receiver, withoutCandidate),
      0,
    )
  }
  let score = gain(members)

  // アクションごとに別の最大供給を合算せず、同じ最大6枚・レンタル1枚の仮編成で見積もる
  while (members.length < constant.UNIT_SIZE) {
    let best: SynergyMember | undefined
    let bestGain = 0
    // 追加可能な相手を比較し、この段階で連携点が最も増える1枚を選ぶ
    for (const partner of context.partners) {
      if (!canAddMember(members, partner, context)) continue
      const extra = gain([...members, partner]) - score
      if (
        extra > bestGain ||
        (extra > 0 && extra === bestGain && best && compareCandidateBaseScores(partner.candidate, best.candidate) < 0)
      ) {
        best = partner
        bestGain = extra
      }
    }
    // 加点が増える相手がいなければ、残り枠を埋めても見込み点は増やさない
    if (!best) break
    members.push(best)
    score += bestGain
  }
  return score
}

/** 候補を残すための評価結果。見込み点はCandidateCardの単体点へ書き戻さない */
interface RankedCandidate {
  candidate: CandidateCard
  /** 他のメンバーへ与える連携点の見込み */
  providedScore: number
  /** 他のメンバーから受ける連携点の見込み */
  receivedScore: number
  /** 単体点と両方向の見込み点を合算した候補選定専用の点 */
  selectionScore: number
}

/**
 * 単体点と連携の両方向の見込み点を合算する。見込み点は候補選定専用で、最終点へ加算しない。
 *
 * @param candidates - 適格な候補集合
 * @param context - 固定枠、通常枠、レンタル枠と編成制約
 * @returns 共通評価点、単体点、カード名の順で並べた候補
 */
export function rankSynergyCandidates(
  candidates: readonly CandidateCard[],
  context: SynergySelectionContext = {},
): RankedCandidate[] {
  // 固定枠の条件を共用し、通常枠とレンタル枠の連携相手を区別して用意する
  return rankPreparedCandidates(candidates, preparePotentialContext(candidates, context))
}

/** 準備済みの固定枠・制約を使い、順位付けと候補選出の両方から同じ評価を呼ぶ */
function rankPreparedCandidates(
  candidates: readonly CandidateCard[],
  potentialContext: PotentialContext,
): RankedCandidate[] {
  return (
    candidates
      .map((candidate) => {
        // 両方向はそれぞれ相手を選んで見積もるため、同じ仮編成の確定点を表すものではない
        const providedScore = calculatePotential(candidate, potentialContext, false)
        const receivedScore = calculatePotential(candidate, potentialContext, true)
        return {
          candidate,
          providedScore,
          receivedScore,
          selectionScore: candidate.baseScore + providedScore + receivedScore,
        }
      })
      // 連携込みで比較し、同点なら単体点・カード名で候補順を安定させる
      .sort((a, b) => b.selectionScore - a.selectionScore || compareCandidateBaseScores(a.candidate, b.candidate))
  )
}

/**
 * 各カードを「単体点＋与える連携点＋受ける連携点」で順位付けする。
 * その順位から各タイプの最低候補数とSP必要数を確保し、残りを全体順位から上限まで埋める。
 * 確保するのは探索候補であり、最終編成のタイプ配分を強制しない。
 *
 * @param candidates - 固定枠を除いた候補集合
 * @param candidateLimit - 候補上限
 * @param context - 連携相手と編成制約
 * @returns 重複のない候補一覧
 */
export function selectSynergyCandidates(
  candidates: readonly CandidateCard[],
  candidateLimit: number,
  context: SynergySelectionContext = {},
): CandidateCard[] {
  if (candidateLimit <= 0) return []
  const potentialContext = preparePotentialContext(candidates, context)
  const fixed = potentialContext.fixedMembers
  // 固定枠と同時採用できないカードは、タイプ別の最低候補数にも含めない
  const ranked = rankPreparedCandidates(candidates, potentialContext).filter(({ candidate }) =>
    canAddMember(fixed, { candidate, rental: potentialContext.rentalSelection }, potentialContext),
  )
  // SP・タイプの両条件に合うカードも、候補上限では1枚として数える
  const selected = new Map<string, CandidateCard>()
  const add = (candidate: CandidateCard) => {
    if (selected.size < candidateLimit) selected.set(candidate.card.name, candidate)
  }
  // SP候補とタイプ候補は重なるため、確保済みの枚数を差し引いて追加する
  const reserve = (matches: (candidate: CandidateCard) => boolean, minimum: number) => {
    let count = [...selected.values()].filter(matches).length
    for (const { candidate } of ranked) {
      if (count >= minimum || selected.size >= candidateLimit) break
      if (selected.has(candidate.card.name) || !matches(candidate)) continue
      add(candidate)
      count++
    }
  }

  // SP必要候補も共通評価点で確保し、候補上限内に収める
  for (const type of PARAMETER_TYPES) {
    const matchesSp = (candidate: CandidateCard) =>
      candidate.spCategory === type || candidate.spCategory === enums.SpCategoryType.All
    const fixedSp = fixed.filter(({ candidate }) => matchesSp(candidate)).length
    const needed = Math.max(0, (context.settings?.spConstraint[type] ?? 0) - fixedSp)
    reserve(matchesSp, needed)
  }

  // 15枚未満の既存上限ではタイプ確保数を均等に縮める
  const typeMinimum = Math.min(constant.CANDIDATE_TYPE_MINIMUM, Math.floor(candidateLimit / PARAMETER_TYPES.length))
  for (const type of PARAMETER_TYPES) {
    const fixedType = fixed.filter(({ candidate }) => candidate.card.type === type).length
    const needed = Math.max(typeMinimum, (context.settings?.typeCountMin[type] ?? 0) - fixedType)
    reserve((candidate) => candidate.card.type === type, needed)
  }
  // 先に確保した候補を保持し、空きだけを共通評価点の上位から埋める
  for (const { candidate } of ranked) add(candidate)
  // 確保した順ではなく共通評価点の順で返し、探索側の候補順を揃える
  return ranked.filter(({ candidate }) => selected.has(candidate.card.name)).map(({ candidate }) => candidate)
}

/**
 * 同じ計算条件を基準に、カード点数を比較する問い合わせ処理
 *
 * 問い合わせ開始時点の条件をコピーして比較中に設定変更が混ざらないようにし、
 * 現在の条件が変わった場合は古い結果として返す
 */
import * as constant from '../../constant'
import {
  ApplicationDomain,
  ApplicationOperationStatus,
  type ApplicationOperationStatusType,
  type DomainDigest,
  DomainIssueCode,
  type DomainRevision,
} from '../../types/application'
import type {
  CalculationRevision,
  CalculationSnapshot,
  CalculationSnapshotEnvelope,
  CalculationVariantPatch,
} from '../../types/calculation'
import type { CardCalculationResult, SupportCard } from '../../types/card'
import * as enums from '../../types/enums'
import { applyCalculationVariant, createCalculationSnapshot } from '../../utils/calculationSnapshot'
import { calculateCardWithSettings } from '../../utils/calculator/calculateCardScores'
import { createDomainDigest } from '../../utils/domainRevision'

/** 計算問い合わせの終了状態 */
export type CalculationQueryStatus = Exclude<
  ApplicationOperationStatusType,
  typeof ApplicationOperationStatus.Cancelled
>

/** 問い合わせ開始時の条件を確認するための設定 */
export interface CalculationQueryFactoryOptions {
  /** 問い合わせ開始時点の状態番号。入力からも指定できる */
  revision?: DomainRevision
  /** 問い合わせ開始時点の内容印。省略時は入力から作る */
  digest?: DomainDigest
  /** 現在の状態番号または状態番号付きの内容印を返す関数 */
  getCurrentRevision?: () => DomainRevision | CalculationRevision
  /** 状態番号を使わず、現在の内容印だけを返す関数 */
  getCurrentDigest?: () => DomainDigest
}

/** 問い合わせ実行時のキャンセル設定 */
export interface CalculationQueryRunOptions {
  /** WebMCPや画面操作から渡される中断通知 */
  signal?: AbortSignal
}

/** カード点数比較の1条件 */
export interface CalculationCardVariant {
  /** 結果へ表示する任意のラベル */
  label?: string
  /** 基準条件へ適用する一時差分 */
  patch: CalculationVariantPatch
}

/** 比較条件ごとのカード点数結果 */
interface CalculationVariantResult<T> {
  /** 入力配列内の位置 */
  index: number
  /** 入力で指定されたラベル */
  label?: string
  /** 計算可能な比較条件か */
  valid: boolean
  /** 比較条件の計算結果。不正な条件ではundefined */
  value?: T
  /** 計算に使った条件。不正な条件ではundefined */
  snapshot?: CalculationSnapshot
  /** 不正理由。詳細な表示文言への変換は利用側が担当する */
  error?: typeof DomainIssueCode.InvalidVariant
}

/** 共通の問い合わせ結果情報 */
export interface CalculationQueryExecutionState extends CalculationRevision {
  /** 問い合わせの終了状態 */
  status: CalculationQueryStatus
  /** 条件を固定した後に現在の設定が変わったか */
  stale: boolean
}

/** カード点数比較結果 */
interface CalculationCardComparisonResult extends CalculationQueryExecutionState {
  /** 問い合わせ対象カード。存在しない場合はnull */
  card: SupportCard | null
  /** 基準条件での点数結果。カード未所持または計算対象外ならnull */
  current: CardCalculationResult | null
  /** 各比較条件の結果。中断・古い結果の場合は含めない */
  variants: CalculationVariantResult<CardCalculationResult | null>[]
}

/** 問い合わせ開始時点の条件を使うカード点数問い合わせ */
interface CalculationQuery {
  /** 問い合わせ開始時点で固定した基準条件 */
  readonly baseline: CalculationSnapshotEnvelope
  /**
   * 現在の設定と基準条件を比較し、古い結果かを返す
   *
   * @param options - 中断通知
   * @returns 現在状態との比較結果
   */
  getState(options?: CalculationQueryRunOptions): CalculationQueryExecutionState
  /**
   * 基準条件から比較用の一時条件を作る
   *
   * @param patch - 基準条件へ適用する一時差分
   * @returns 比較用の一時条件。不正な差分ならnull
   */
  applyVariant(patch: CalculationVariantPatch): CalculationSnapshot | null
  /**
   * 複数条件を同じ基準条件から独立して計算する
   *
   * @param cardName - 点数を問い合わせるカード名
   * @param variants - 基準条件へ順番に適用する比較条件
   * @param options - 中断通知
   * @returns カード点数の比較結果
   */
  compareCardScores(
    cardName: string,
    variants: readonly CalculationCardVariant[],
    options?: CalculationQueryRunOptions,
  ): CalculationCardComparisonResult
}

/** 問い合わせの基準条件として受け取れる計算条件 */
/**
 * 計算条件を問い合わせ開始時点の基準条件へ固定する
 *
 * @param input - 問い合わせ開始時点の計算条件
 * @param options - 現在の設定が途中で変わっていないか確認する方法
 * @returns 条件と確認用の情報をまとめた基準条件
 */
export function createCalculationQuery(
  input: CalculationSnapshot,
  options: CalculationQueryFactoryOptions = {},
): CalculationQuery {
  const baselineSnapshot = createCalculationSnapshot(input)
  const baselineDigest = options.digest ?? createCalculationDigest(baselineSnapshot)
  const baseline: CalculationSnapshotEnvelope = {
    snapshot: baselineSnapshot,
    // 状態番号を受け取らない単体利用では、同じ条件から安定した番号を作る
    revision: options.revision ?? `${ApplicationDomain.Calculation}:${baselineDigest}`,
    digest: baselineDigest,
  }

  /**
   * 問い合わせ時点の現在の状態番号と内容印を取得する
   *
   * @returns 現在状態の識別情報
   */
  const getCurrentState = (): CalculationRevision => {
    if (options.getCurrentRevision) {
      const current = options.getCurrentRevision()
      if (typeof current === 'string') return { revision: current, digest: '' }
      return {
        revision: current.revision,
        digest: current.digest,
      }
    }
    if (options.getCurrentDigest) return { revision: baseline.revision, digest: options.getCurrentDigest() }
    return baseline
  }

  /**
   * 基準条件と現在の設定が異なるか判定する
   *
   * @returns 基準条件が古くなっていればtrue
   */
  const isStale = (): boolean => {
    const current = getCurrentState()
    return current.revision !== baseline.revision || (current.digest !== '' && current.digest !== baseline.digest)
  }

  /**
   * 基準条件が使える状態か、中断されたかを返す
   *
   * @param runOptions - 中断通知
   * @returns 問い合わせの実行状態
   */
  const getState = (runOptions: CalculationQueryRunOptions = {}): CalculationQueryExecutionState => {
    const aborted = runOptions.signal?.aborted ?? false
    const stale = !aborted && isStale()
    return {
      revision: baseline.revision,
      digest: baseline.digest,
      status: aborted
        ? ApplicationOperationStatus.Aborted
        : stale
          ? ApplicationOperationStatus.Stale
          : ApplicationOperationStatus.Complete,
      stale,
    }
  }

  /**
   * 基準条件へ一時差分を適用する
   *
   * @param patch - 基準条件へ適用する一時差分
   * @returns 比較用の一時条件。不正な差分ならnull
   */
  const applyVariant = (patch: CalculationVariantPatch): CalculationSnapshot | null =>
    applyCalculationVariant(baseline.snapshot, patch)

  /**
   * 基準条件からカード点数を条件ごとに計算する
   *
   * @param cardName - 点数を問い合わせるカード名
   * @param variants - 基準条件へ順番に適用する比較条件
   * @param runOptions - 中断通知
   * @returns カード点数の比較結果
   */
  const compareCardScores = (
    cardName: string,
    variants: readonly CalculationCardVariant[],
    runOptions: CalculationQueryRunOptions = {},
  ): CalculationCardComparisonResult => {
    // 計算開始時点の状態と対象カードを一度だけ確定する
    const initialState = getState(runOptions)
    const card = baseline.snapshot.cardByName.get(cardName) ?? null
    const emptyResult = {
      ...initialState,
      card,
      current: null,
      variants: [],
    }
    if (initialState.status !== ApplicationOperationStatus.Complete || card === null) return emptyResult

    // まず基準条件のカード点数を計算し、各比較条件の基準値にする
    const current = calculateCardForSnapshot(baseline.snapshot, card)
    const results: CalculationVariantResult<CardCalculationResult | null>[] = []
    for (const [index, variant] of variants.entries()) {
      const state = getState(runOptions)
      // 比較中に画面の設定が変わったら、混ざった結果を返さず中断する
      if (state.status !== ApplicationOperationStatus.Complete) {
        return { ...state, card, current, variants: [] }
      }

      // 各比較条件は同じ基準から作り、前の比較条件の変更を引き継がない
      const snapshot = applyVariant(variant.patch)
      if (snapshot === null) {
        results.push({ index, label: variant.label, valid: false, error: DomainIssueCode.InvalidVariant })
        continue
      }
      const variantCard = snapshot.cardByName.get(cardName)
      if (!variantCard) {
        results.push({ index, label: variant.label, valid: false, error: DomainIssueCode.InvalidVariant })
        continue
      }
      results.push({
        index,
        label: variant.label,
        valid: true,
        value: calculateCardForSnapshot(snapshot, variantCard),
        snapshot,
      })
    }

    // 最後にも状態を確認し、計算中の変更を古い結果として扱う
    const finalState = getState(runOptions)
    return { ...finalState, card, current, variants: results }
  }

  return { baseline, getState, applyVariant, compareCardScores }
}

/**
 * 計算条件の内容から、同じ入力に対して同じ比較用の印を作る
 *
 * 暗号学的な署名ではない
 * 非同期計算の結果を現在の状態へ適用できるか確認するための識別子
 *
 * @param snapshot - 比較用の印を作る計算条件
 * @returns 条件の内容を表す安定した印
 */
export function createCalculationDigest(snapshot: CalculationSnapshot): DomainDigest {
  return createDomainDigest({
    scoreSettings: snapshot.scoreSettings,
    unitSettings: snapshot.unitSettings,
    cardUncaps: snapshot.cardUncaps,
    cardCountCustom: snapshot.cardCountCustom,
    allCards: snapshot.allCards,
    cardNames: [...snapshot.cardByName.keys()].sort(),
  })
}

/**
 * 計算条件からカード1枚分の計算結果を作る
 *
 * @param snapshot - 点数計算に使う条件
 * @param card - 計算対象のカード
 * @returns カードの計算結果、対象外ならnull
 */
function calculateCardForSnapshot(snapshot: CalculationSnapshot, card: SupportCard): CardCalculationResult | null {
  const uncap = snapshot.scoreSettings.useFixedUncap
    ? constant.DEFAULT_UNCAP
    : (snapshot.cardUncaps[card.name] ?? constant.DEFAULT_UNCAP)
  if (!snapshot.scoreSettings.useFixedUncap && uncap === enums.UncapType.NotOwned) return null
  return calculateCardWithSettings(card, uncap, snapshot.scoreSettings, snapshot.cardCountCustom[card.name]) ?? null
}

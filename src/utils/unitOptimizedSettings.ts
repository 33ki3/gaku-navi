/**
 * 最適化結果を編成設定へ反映するための純粋関数。
 *
 * レンタル枠の表示順と、通常ロック・レンタルロック間の引き継ぎ規則を
 * React の状態更新から分離し、条件分岐を単体で追えるようにする
 */
import type { UnitResult, UnitSimulatorSettings } from '../types/unit'

/**
 * 編成一覧を UI 表示順（レンタルを末尾）に並べる
 *
 * @param members - 最適編成結果のメンバー
 * @returns manualCards に設定するカード名配列
 */
export function toOrderedUnitMemberNames(members: UnitResult['members']): string[] {
  const rentalMember = members.find((member) => member.isRental)
  if (rentalMember === undefined) {
    return members.map((member) => member.card.name)
  }

  const ownedNames = members.filter((member) => !member.isRental).map((member) => member.card.name)
  return [...ownedNames, rentalMember.card.name]
}

/**
 * 総当たり最適化へ渡す設定を作る
 *
 * @param settings - 現在の編成設定
 * @returns 空きスロットを除き、自動レンタル条件を正規化した設定
 */
export function createExhaustiveOptimizationSettings(settings: UnitSimulatorSettings): UnitSimulatorSettings {
  return {
    ...settings,
    manualCards: settings.manualCards.filter((cardName): cardName is string => cardName !== null),
    ...(settings.manualRental ? {} : { manualRental: false, rentalCardName: null }),
  }
}

/** 元のレンタルロックを、最適化後のレンタル配置へ引き継ぐ */
function resolveOriginalRentalLock(
  settings: UnitSimulatorSettings,
  orderedNames: string[],
  rentalName: string | null,
): UnitSimulatorSettings {
  const originalRentalName = settings.rentalCardName
  if (!settings.manualRental || originalRentalName === null) {
    return settings
  }

  if (rentalName === originalRentalName) {
    return {
      ...settings,
      manualCards: orderedNames,
      rentalCardName: originalRentalName,
    }
  }

  const allLockedNames = new Set([originalRentalName, ...settings.lockedCards])
  if (rentalName !== null && allLockedNames.has(rentalName)) {
    return {
      ...settings,
      manualCards: orderedNames,
      manualRental: true,
      rentalCardName: rentalName,
      lockedCards: [...settings.lockedCards.filter((cardName) => cardName !== rentalName), originalRentalName],
    }
  }

  return {
    ...settings,
    manualCards: orderedNames,
    manualRental: false,
    rentalCardName: rentalName,
    lockedCards: Array.from(allLockedNames),
  }
}

/**
 * 最適化結果に合わせて手動編成とロック設定を同期する
 *
 * @param settings - 最適化開始時点の最新設定
 * @param optimized - 適用する最適化結果
 * @returns 最適化結果を反映した次の設定
 */
export function resolveSettingsAfterOptimization(
  settings: UnitSimulatorSettings,
  optimized: UnitResult,
): UnitSimulatorSettings {
  const rentalMember = optimized.members.find((member) => member.isRental)
  const rentalName = rentalMember?.card.name ?? null
  const orderedNames = toOrderedUnitMemberNames(optimized.members)

  if (!settings.unifyRentalLock) {
    return {
      ...settings,
      manualCards: orderedNames,
      rentalCardName: rentalName,
    }
  }

  if (settings.manualRental && settings.rentalCardName !== null) {
    return resolveOriginalRentalLock(settings, orderedNames, rentalName)
  }

  if (rentalName !== null && settings.lockedCards.includes(rentalName)) {
    return {
      ...settings,
      manualCards: orderedNames,
      manualRental: true,
      rentalCardName: rentalName,
      lockedCards: settings.lockedCards.filter((cardName) => cardName !== rentalName),
    }
  }

  return {
    ...settings,
    manualCards: orderedNames,
    rentalCardName: rentalName,
  }
}

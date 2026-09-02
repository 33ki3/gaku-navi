/**
 * ユーザーが変更できる設定の既定値を、保存・読み込み処理から分離して管理する。
 * 型はtypes、読み書きはutilsに置き、このファイルには初期値だけを置く
 */
import type { AppPreferences } from '../types/app'
import { CardType, ParameterType, PlanType } from '../types/enums'
import type { UnitSimulatorSettings } from '../types/unit'
import { EXHAUSTIVE_CANDIDATE_LIMIT, TYPE_COUNT_MAX_DEFAULT, TYPE_COUNT_MIN_DEFAULT } from './common'

/** アプリ表示設定の既定値 */
export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  showMobileBottomNav: true,
  keepMobileBottomNavFixed: false,
}

/** 最適編成設定の既定値 */
export const DEFAULT_UNIT_SIMULATOR_SETTINGS: UnitSimulatorSettings = {
  plan: PlanType.Sense,
  allowedTypes: [CardType.Vocal, CardType.Dance, CardType.Visual, CardType.Assist],
  spConstraint: { vocal: 0, dance: 0, visual: 0 },
  typeCountMin: {
    [ParameterType.Vocal]: TYPE_COUNT_MIN_DEFAULT,
    [ParameterType.Dance]: TYPE_COUNT_MIN_DEFAULT,
    [ParameterType.Visual]: TYPE_COUNT_MIN_DEFAULT,
  },
  typeCountMax: {
    [ParameterType.Vocal]: TYPE_COUNT_MAX_DEFAULT,
    [ParameterType.Dance]: TYPE_COUNT_MAX_DEFAULT,
    [ParameterType.Visual]: TYPE_COUNT_MAX_DEFAULT,
  },
  paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
  manualRental: false,
  rentalCardName: null,
  lockedCards: [],
  manualCards: [],
  excludedCardNames: [],
  initialParams: { vocal: 0, dance: 0, visual: 0 },
  paramCapOverride: null,
  unifyRentalLock: false,
  excludeContestSkillCards: false,
  excludeContestPItems: false,
  ignoreCardExclusions: false,
  exhaustiveCandidateLimit: EXHAUSTIVE_CANDIDATE_LIMIT,
}

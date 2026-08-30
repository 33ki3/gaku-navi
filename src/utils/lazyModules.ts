/** 遅延表示する画面のimportを一か所へ集約し、表示処理と先読みで共有する */
import { createLazyModuleLoader } from './lazyPreload'

/** フィルター・ソートモーダルの共有ローダー */
export const loadFilterSortModal = createLazyModuleLoader(() => import('../components/filterBar/FilterSortModal'))

/** カード詳細モーダルの共有ローダー */
export const loadCardDetailModal = createLazyModuleLoader(() => import('../components/cardDetailModal/CardDetailModal'))

/** 点数詳細モーダルの共有ローダー */
export const loadScoreDetailModal = createLazyModuleLoader(
  () => import('../components/scoreDetailModal/ScoreDetailModal'),
)

/** ユーザー追加カードフォームの共有ローダー */
export const loadUserCardFormModal = createLazyModuleLoader(
  () => import('../components/userCardForm/UserCardFormModal'),
)

/** オプションモーダルの共有ローダー */
export const loadOptionsModal = createLazyModuleLoader(() => import('../components/optionsModal/OptionsModal'))

/** ヘルプモーダルの共有ローダー */
export const loadHelpModal = createLazyModuleLoader(() => import('../components/helpModal/HelpModal'))

/** Aboutモーダルの共有ローダー */
export const loadAboutModal = createLazyModuleLoader(() => import('../components/aboutModal/AboutModal'))

/** データ管理モーダルの共有ローダー */
export const loadDataManagementModal = createLazyModuleLoader(
  () => import('../components/header/dataManagement/DataManagementModal'),
)

/** その他メニュー項目の共有ローダー */
export const loadMoreMenuItems = createLazyModuleLoader(() =>
  import('../components/header/MoreMenuItems').then(({ MoreMenuItems }) => ({ default: MoreMenuItems })),
)

/** 点数設定パネルの共有ローダー */
export const loadScoreSettingsPanel = createLazyModuleLoader(
  () => import('../components/scoreSettingsPanel/ScoreSettingsPanel'),
)

/** 最適編成パネルの共有ローダー */
export const loadUnitSimulatorPanel = createLazyModuleLoader(
  () => import('../components/unitSimulator/UnitSimulatorPanel'),
)

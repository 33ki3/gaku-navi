/** 学マスのアチーブメントとアイドルへの道で得られるプロデューサーEXPを集計する */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as data from '../../data'
import { useAchievementCalculatorSummary } from '../../hooks/useAchievementCalculatorSummary'
import type { AchievementCalculatorControls } from '../../types/achievementCalculator'
import * as enums from '../../types/enums'

import { CheckboxField } from '../ui/CheckboxField'
import { HelpTooltip } from '../ui/HelpTooltip'
import { ChevronRightIcon } from '../ui/icons'
import { NumberInput } from '../ui/NumberInput'
import { ProgressBar } from '../ui/ProgressBar'
import { IdolAchievementSelector } from './IdolAchievementSelector'
import { IdolAchievementsTab } from './IdolAchievementsTab'
import { OtherExperienceTab } from './OtherExperienceTab'
import { ProductionAchievementsTab } from './ProductionAchievementsTab'

/** 共通の達成記録とページ遷移をルートから受け取り、計算機の表示・入力へ接続する */
interface AchievementCalculatorPageProps {
  /** 達成記録を保持したままサポート一覧へ戻る */
  onBack: () => void
  /** ページを閉じている間もWebMCPと共有する達成記録・更新操作 */
  controls: AchievementCalculatorControls
  /** 画面とWebMCPの省略時の読み取り対象を揃える選択アイドル */
  selectedIdolId: string
  /** ページを移動しても選択アイドルを保持する */
  onSelectIdol: (id: string) => void
}

/**
 * EXP入力とPLv・次の報酬をまとめた独立ページ
 * @param props ページ遷移・入力操作・選択アイドルを共有する接続情報
 * @returns 集計カード、入力オプションと3カテゴリのタブを持つ計算機ページ
 */
export default function AchievementCalculatorPage({
  onBack,
  controls,
  selectedIdolId,
  onSelectIdol,
}: AchievementCalculatorPageProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<enums.CalculatorTab>(enums.CalculatorTab.Idol)
  const { progress, setTargetProducerLevel, setOtherExp, setOneStepSpinner } = controls
  // 0には符号を保存できないため、入力前に選んだマイナスだけを画面内で保持する
  const [isZeroOtherExpNegative, setIsZeroOtherExpNegative] = useState(false)
  const oneStepSpinner = progress.oneStepSpinner
  const isOtherExpNegative = progress.otherExp < 0 || (progress.otherExp === 0 && isZeroOtherExpNegative)
  const setOtherExpDirection = (isNegative: boolean) => {
    setIsZeroOtherExpNegative(isNegative)
    setOtherExp(isNegative ? -Math.abs(progress.otherExp) : Math.abs(progress.otherExp))
  }

  const summary = useAchievementCalculatorSummary(progress, selectedIdolId)
  const { totalEarnedExp, totalAvailableExp, currentProducerLevel, levelProgress, idolSelectorItems } = summary
  const currentLevel = currentProducerLevel.currentLevel
  const currentLevelLabel = t('achievement_calculator.summary.current_level', { level: currentLevel })
  const nextLevelRangeLabel = t('achievement_calculator.summary.current_and_next_level', {
    current: currentLevel,
    next: currentLevel + 1,
  })
  const activeTabIndex = data.ACHIEVEMENT_CALCULATOR_TABS.findIndex((tab) => tab.id === activeTab)

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          {/* 一覧への戻り操作とページ名を同じ中心線で配置する */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <ChevronRightIcon className="h-4 w-4 rotate-180" />
              {t('achievement_calculator.form.back_to_list')}
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-black text-slate-900 max-[360px]:text-base sm:text-xl">
                {t('achievement_calculator.title')}
              </h1>
            </div>
          </div>

          {/* 全カテゴリを合算したEXPと目標PLvまでの進捗 */}
          <section
            className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"
            aria-label={t('achievement_calculator.summary.earned')}
          >
            {/* 全カテゴリの報酬と手入力の補正を合算した獲得済み経験値 */}
            <div className="rounded-xl bg-sky-50 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <p className="text-[10px] leading-tight font-bold text-sky-700">
                  {t('achievement_calculator.summary.earned')}
                </p>
                <p className="text-right text-[10px] leading-tight font-bold tabular-nums text-sky-700">
                  {currentLevelLabel}
                </p>
              </div>
              <p className="mt-0.5 text-lg font-black tabular-nums text-sky-950">
                {totalEarnedExp.toLocaleString()}{' '}
                <span className="text-xs">{t('achievement_calculator.form.exp')}</span>
              </p>
              <ProgressBar
                label={t('achievement_calculator.summary.earned')}
                value={totalEarnedExp}
                max={totalAvailableExp}
                className="mt-2"
                trackClassName="bg-sky-100"
              />
            </div>
            {/* 現在のPLvから次のPLvに必要な残りEXP */}
            <div className="rounded-xl bg-amber-50 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <p className="text-[10px] leading-tight font-bold text-amber-700">
                  {t('achievement_calculator.summary.next_level')}
                </p>
                <p className="text-right text-[10px] leading-tight font-bold tabular-nums text-amber-700">
                  {nextLevelRangeLabel}
                </p>
              </div>
              <p className="mt-0.5 text-lg font-black tabular-nums text-amber-950">
                {levelProgress.nextLevelRemainingExp.toLocaleString()}{' '}
                <span className="text-xs">{t('achievement_calculator.form.exp')}</span>
              </p>
              <ProgressBar
                label={t('achievement_calculator.summary.next_level')}
                value={levelProgress.nextLevelEarnedExp}
                max={levelProgress.nextLevelRequiredExp}
                className="mt-2"
                trackClassName="bg-amber-100"
                fillClassName="bg-amber-500"
                percentClassName="text-xs font-bold text-amber-900"
              />
            </div>
            {/* 現在PLvと入力した目標を累計EXPで比較する。スマホでは2列分を使う */}
            <div className="col-span-2 rounded-xl bg-emerald-50 px-3 py-2.5 sm:col-span-1">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <p className="text-[10px] font-bold text-emerald-700">
                  {t('achievement_calculator.summary.target_remaining')}
                </p>
                <p className="text-[10px] font-bold tabular-nums text-emerald-950">
                  {t('achievement_calculator.summary.current_and_target_level', {
                    current: currentProducerLevel.currentLevel,
                    target: progress.producerLevel,
                  })}
                </p>
              </div>
              <p className="mt-0.5 text-lg font-black tabular-nums text-emerald-950">
                {levelProgress.expToTargetLevel.toLocaleString()}{' '}
                <span className="text-xs">{t('achievement_calculator.form.exp')}</span>
              </p>
              <ProgressBar
                label={t('achievement_calculator.summary.target_remaining')}
                value={levelProgress.targetProgressPercent}
                max={100}
                className="mt-2"
                trackClassName="bg-emerald-100"
                fillClassName="bg-emerald-500"
                percentClassName="text-xs font-black text-emerald-900"
              />
            </div>
          </section>

          {/* 入力途中の不正値は計算へ反映せず、フォーカスを外した時に範囲内へ丸める */}
          <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
            <label className="grid min-w-0 gap-1 text-[11px] font-bold text-slate-600">
              <span className="flex items-center gap-1">
                {t('achievement_calculator.settings.target_level')}
                <HelpTooltip text={t('achievement_calculator.settings.target_level_tip')} />
              </span>
              <NumberInput
                min={1}
                max={constant.PRODUCER_LEVEL_TARGET_MAX}
                inputMode="numeric"
                value={progress.producerLevel}
                onChange={setTargetProducerLevel}
                clampOnBlur
                inputClassName="min-h-10 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-bold tabular-nums text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <div className="grid min-w-0 content-start gap-1 text-[11px] font-bold text-slate-600">
              <div className="flex items-center gap-1">
                <span>{t('achievement_calculator.settings.other_exp')}</span>
                <HelpTooltip text={t('achievement_calculator.settings.other_exp_tip')} />
              </div>
              <div className="flex min-w-0 items-center gap-1">
                {/* 補正方向を左、入力値を右に置き、狭い欄でも符号を切り替えやすくする */}
                <fieldset className="m-0 flex h-10 w-8 shrink-0 rounded-lg border border-slate-300 bg-white p-0.5">
                  <legend className="sr-only">{t('achievement_calculator.settings.other_exp_direction')}</legend>
                  <button
                    type="button"
                    aria-label={`${t('achievement_calculator.settings.other_exp_direction')}: ${t(
                      isOtherExpNegative
                        ? 'achievement_calculator.settings.other_exp_subtract'
                        : 'achievement_calculator.settings.other_exp_add',
                    )}`}
                    aria-pressed={isOtherExpNegative}
                    onClick={() => setOtherExpDirection(!isOtherExpNegative)}
                    className="relative flex min-h-0 flex-1 cursor-pointer flex-col rounded-md border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-500"
                  >
                    {/* 選択背景を上下へ滑らせ、補正方向の切替を見せる */}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-md bg-sky-100 transition-transform duration-300 ease-out motion-reduce:transition-none ${
                        isOtherExpNegative ? 'translate-y-full' : ''
                      }`}
                    />
                    <span
                      className={`relative z-10 flex w-full flex-1 items-center justify-center rounded-md text-[9px] font-bold whitespace-nowrap transition-colors sm:text-[10px] ${
                        isOtherExpNegative ? 'text-slate-600' : 'text-sky-800'
                      }`}
                    >
                      <span aria-hidden="true">{t('ui.symbol.plus')}</span>
                    </span>
                    <span
                      className={`relative z-10 flex w-full flex-1 items-center justify-center rounded-md text-[9px] font-bold whitespace-nowrap transition-colors sm:text-[10px] ${
                        isOtherExpNegative ? 'text-sky-800' : 'text-slate-600'
                      }`}
                    >
                      <span aria-hidden="true">{t('ui.symbol.minus')}</span>
                    </span>
                  </button>
                </fieldset>
                <NumberInput
                  min={0}
                  max={Number.MAX_SAFE_INTEGER}
                  inputMode="numeric"
                  aria-label={t('achievement_calculator.settings.other_exp')}
                  value={Math.abs(progress.otherExp)}
                  onChange={(value) => {
                    setIsZeroOtherExpNegative(isOtherExpNegative)
                    setOtherExp(isOtherExpNegative ? -value : value)
                  }}
                  clampOnBlur
                  inputClassName="min-h-10 min-w-0 w-full flex-1 rounded-lg border border-slate-300 bg-white px-1 text-xs font-bold tabular-nums text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:px-2 sm:text-sm"
                />
              </div>
            </div>
            <div className="grid min-w-0 content-start gap-1 text-[11px] font-bold text-slate-600">
              <div className="flex items-center gap-1 whitespace-nowrap">
                <span>{t('achievement_calculator.settings.one_step_spinner_heading')}</span>
                <HelpTooltip text={t('achievement_calculator.settings.one_step_spinner_tip')} />
              </div>
              <div className="flex h-10 items-center">
                <CheckboxField
                  label={t('achievement_calculator.settings.one_step_spinner')}
                  checked={oneStepSpinner}
                  onChange={setOneStepSpinner}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* タブとアイドル選択を一緒に固定し、スクロール中も入力対象を切り替えられるようにする */}
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-slate-100 shadow-sm">
          {/* アイドル・プロデュース・その他の入力タブ */}
          <nav
            className="relative mx-auto grid max-w-7xl grid-cols-3 gap-1 border-b border-slate-200 bg-slate-100 p-2"
            role="tablist"
            aria-label={t('achievement_calculator.form.input_tabs')}
          >
            {/* 選択背景を移動させ、タブの切り替えを連続した動きで示す */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2 left-2 top-2 rounded-lg border border-slate-200 bg-white shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none"
              style={{
                width: `calc((100% - 1rem - ${(data.ACHIEVEMENT_CALCULATOR_TABS.length - 1) * 0.25}rem) / ${data.ACHIEVEMENT_CALCULATOR_TABS.length})`,
                transform: `translateX(calc(${activeTabIndex} * (100% + 0.25rem)))`,
              }}
            />
            {data.ACHIEVEMENT_CALCULATOR_TABS.map((tab) => {
              const selected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  id={`achievement-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`achievement-panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative z-10 min-h-10 rounded-lg px-2 py-1.5 text-xs font-black transition-colors motion-reduce:transition-none ${
                    selected ? 'text-sky-800' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t(tab.labelKey)}
                </button>
              )
            })}
          </nav>
          {/* アイドルタブで編集する対象を選ぶ横スクロールのボタン列 */}
          {activeTab === enums.CalculatorTab.Idol && (
            <IdolAchievementSelector selectedId={selectedIdolId} onSelect={onSelectIdol} items={idolSelectorItems} />
          )}
        </div>

        {/* 選択中の入力カテゴリだけ描画し、達成記録はページ共通の状態に保持する */}
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          {/* 選択アイドルのTrue End・基本・Pアイドルの入力 */}
          {activeTab === enums.CalculatorTab.Idol && (
            <IdolAchievementsTab summary={summary} controls={controls} oneStepSpinner={oneStepSpinner} />
          )}

          {/* アイドルを問わないプロデュース全体のアチーブ入力 */}
          {activeTab === enums.CalculatorTab.Production && (
            <ProductionAchievementsTab summary={summary} controls={controls} oneStepSpinner={oneStepSpinner} />
          )}

          {/* プロデュース報酬・課題・パネル・アイドルへの道の入力 */}
          {activeTab === enums.CalculatorTab.Other && (
            <OtherExperienceTab summary={summary} controls={controls} oneStepSpinner={oneStepSpinner} />
          )}
        </div>
      </main>
    </div>
  )
}

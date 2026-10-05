/** 計算機のcommandとqueryをReactへ接続し、UIとWebMCPへ同じ更新・保存の入口を公開する */
import { useMemo, useState } from 'react'
import { createAchievementCalculatorCommand } from '../application/command'
import { createAchievementCalculatorQuery } from '../application/query/achievementCalculatorQuery'
import * as constant from '../constant'
import type { AchievementCalculatorProgress } from '../types/achievementCalculator'
import type { CommandResult } from '../types/application'
import { ApplicationDomain } from '../types/application'
import type { IdolAchievementMetric, PIdolCardAchievementId, ProductionRunRewardAdjustmentId } from '../types/enums'
import { createAchievementCalculatorProgress } from '../utils/achievementCalculatorProgress'
import { useCommandStatePort } from './useCommandStatePort'
import { useStorageEvent } from './useStorageEvent'

/** JSON破損やストレージへのアクセス拒否があっても、初期状態で計算を開始する */
function readSavedProgress(): AchievementCalculatorProgress {
  try {
    const saved = window.localStorage.getItem(constant.ACHIEVEMENT_CALCULATOR_STORAGE_KEY)
    return createAchievementCalculatorProgress(saved ? JSON.parse(saved) : undefined)
  } catch {
    return createAchievementCalculatorProgress()
  }
}

/**
 * commandの更新を画面へ反映し、通常UIの操作を共通の保存経路へ接続する
 * @returns 現在の達成記録、UI用の操作と、WebMCPへ渡せるcommand・query
 */
export function useAchievementCalculatorProgress() {
  const [progress, setProgress] = useState(readSavedProgress)
  const state = useCommandStatePort(ApplicationDomain.Achievement, progress, setProgress)
  // 状態管理先が変わる場合だけ保存commandを作り直す
  const commands = useMemo(() => createAchievementCalculatorCommand(state), [state])
  // 更新commandと同じ状態管理先から集計を読み取る
  const query = useMemo(() => createAchievementCalculatorQuery(state), [state])

  // データ管理でのインポートや別タブの変更を反映し、command側のrevisionにも同期する
  useStorageEvent(constant.ACHIEVEMENT_CALCULATOR_STORAGE_KEY, () => setProgress(readSavedProgress()))

  // 通常UIはReactの表示同期を待たず、外部操作はcommandの既定動作で反映完了を確認できる
  const handlers = useMemo(() => {
    // サポート一覧と同じく失敗通知で操作を遮らず、外部操作にはcommandの結果をそのまま返す
    const run = (result: Promise<CommandResult<AchievementCalculatorProgress>>) => {
      void result.catch(() => undefined)
    }
    const options = { waitForStateSync: false }
    return {
      setProductionValue: (id: string, value: number) => run(commands.setProductionValue(id, value, options)),
      setIdolValue: (id: string, metric: IdolAchievementMetric, value: number) =>
        run(commands.setIdolValue(id, metric, value, options)),
      setOtherTaskValue: (id: string, value: number) => run(commands.setOtherTaskValue(id, value, options)),
      setProductionRewardAdjustment: (id: ProductionRunRewardAdjustmentId, value: number) =>
        run(commands.setProductionRewardAdjustment(id, value, options)),
      setIdolRoadStageStars: (id: string, index: number, value: number) =>
        run(commands.setIdolRoadStageStars(id, index, value, options)),
      setIdolRoadStageStar: (id: string, stageIndex: number, starIndex: number, completed: boolean) =>
        run(commands.setIdolRoadStageStar(id, stageIndex, starIndex, completed, options)),
      setIdolRoadStars: (id: string, completed: boolean) => run(commands.setIdolRoadStars(id, completed, options)),
      setPIdolCardAchievement: (id: string, achievement: PIdolCardAchievementId, completed: boolean) =>
        run(commands.setPIdolCardAchievement(id, achievement, completed, options)),
      setPIdolCardAchievements: (id: string, completed: boolean) =>
        run(commands.setPIdolCardAchievements(id, completed, options)),
      setTargetProducerLevel: (value: number) => run(commands.setTargetProducerLevel(value, options)),
      setOtherExp: (value: number) => run(commands.setOtherExp(value, options)),
      setOneStepSpinner: (value: boolean) => run(commands.setOneStepSpinner(value, options)),
    }
  }, [commands])
  return { progress, commands, query, ...handlers }
}

/**
 * イベントブーストセクションコンポーネント
 *
 * スコア内訳の「サポートイベント」セクション。
 * イベント基礎値 + ボーナス値率 + 最終ブースト值を表示する。
 */
import { useTranslation } from 'react-i18next'
import type { CardCalculationResult } from '../../types/card'
import * as constant from '../../constant'

/** イベントブーストセクション */
export function EventBoostSection({ result }: { result: CardCalculationResult }) {
  const { t } = useTranslation()

  return (
    <div>
      <h4 className={constant.SECTION_HEADING_SM_PX}>{t('ui.header.support_events')}</h4>
      <div className="space-y-0.5">
        <div className="flex items-center text-xs bg-blue-50 px-2 py-1 rounded">
          {/* イベント名 + 基礎上昇値（例: サポートイベント+15） */}
          <span className="flex-1 mr-2 leading-snug break-words text-slate-700">
            {t('ui.settings.event_boost')}
            {t('ui.symbol.plus')}
            {result.eventBoostBase}
          </span>
          {/* イベントボーナス率 */}
          <span className="text-[10px] shrink-0 text-right mr-2 text-slate-400 min-w-[3.5rem]">
            {t('ui.symbol.plus')}
            {result.eventBoostPercent}
            {t('ui.symbol.percent')}
          </span>
          {/* 最終イベントブースト値（基礎値 + ボーナス適用後） */}
          <span className="text-blue-800 shrink-0 text-right min-w-[3rem]">
            {t('ui.symbol.plus')}
            {result.eventBoost}
          </span>
        </div>
      </div>
    </div>
  )
}

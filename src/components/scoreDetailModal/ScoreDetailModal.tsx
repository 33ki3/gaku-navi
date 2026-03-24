/**
 * スコア内訳モーダルコンポーネント
 *
 * カードグリッドでスコアをクリックしたときに開くモーダル。
 * イベントブースト・アビリティ・パラメータボーナス・Pアイテムの
 * 内訳を表示し、右側に合計スコアを表示する。
 */
import { useTranslation } from 'react-i18next'
import type { SupportCard, CardCalculationResult } from '../../types/card'
import * as data from '../../data'
import * as constant from '../../constant'
import CloseButton from '../ui/CloseButton'
import ModalOverlay from '../ui/ModalOverlay'
import { AbilityBreakdownList } from './AbilityBreakdownList'

/** ScoreDetailModal コンポーネントに渡すプロパティ */
interface ScoreDetailModalProps {
  /** サポートカードデータ */
  card: SupportCard
  /** スコア計算結果 */
  result: CardCalculationResult
  /** モーダルを閉じる関数 */
  onClose: () => void
}

/** スコア内訳モーダル */
export default function ScoreDetailModal({ card, result, onClose }: ScoreDetailModalProps) {
  const { t } = useTranslation()
  const typeEntry = data.getTypeEntry(card.type)

  return (
    <ModalOverlay onClose={onClose} panelClassName={constant.MODAL_PANEL_SCORE}>
      {/* ヘッダー: カード名 + 閉じるボタン */}
      <div className={`${typeEntry.bg} border-b ${typeEntry.border} rounded-t-2xl px-5 py-3`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">{card.name}</h3>
          <CloseButton onClick={onClose} />
        </div>
      </div>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* 左: カテゴリ別内訳リスト */}
          <div className="flex-1 overflow-y-auto p-4">
            <AbilityBreakdownList result={result} />
          </div>

          {/* 右: 合計スコア表示 */}
          <div
            className={`flex flex-row sm:flex-col items-center justify-center px-4 py-2 sm:py-0 border-t sm:border-t-0 sm:border-l ${typeEntry.border} ${typeEntry.bg}`}
          >
            {/* 「合計」ラベル */}
            <span className="text-[10px] font-bold text-slate-400 sm:mb-1 mr-2 sm:mr-0">{t('ui.settings.total')}</span>
            {/* 合計スコア値 */}
            <span className={`text-2xl font-black ${typeEntry.text} mr-2 sm:mr-0`}>{result.totalIncrease}</span>
            {/* 「点」単位 */}
            <span className="text-[10px] font-bold text-slate-400">{t('ui.unit.score')}</span>
          </div>
        </div>
    </ModalOverlay>
  )
}

/**
 * サポートアビリティ一覧コンポーネント
 *
 * サポート詳細モーダル内でサポートアビリティを番号付きで一覧表示する。
 * アビリティ名に {v} がある場合、凸数に対応する値を埋め込む。
 */
import { useTranslation } from 'react-i18next'
import type { SupportCard } from '../../types/card'
import type { UncapType } from '../../types/enums'
import type { TypeDisplayEntry } from '../../data'
import * as data from '../../data'
import { resolveAbilityValue, getAbilityNameLabelKey } from '../../utils/display/effectLabels'

/** SupportAbilityList コンポーネントに渡すプロパティ */
interface SupportAbilityListProps {
  /** サポートカードデータ */
  card: SupportCard
  /** タイプ別の色設定 */
  colors: TypeDisplayEntry
  /** 現在の凸数 */
  uncap: UncapType
}

/** サポートアビリティ一覧 */
export function SupportAbilityList({ card, colors, uncap }: SupportAbilityListProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      {card.abilities.map((ability, i) => {
        // パラメータ名を翻訳してからテンプレートに埋め込む
        // 例: parameter_type="vocal" → param="ボーカル"、name_key="vitality" → "元気{v}ボーカル"
        const param = ability.parameter_type ? t(data.getParamLabel(ability.parameter_type)) : ''
        const template = t(getAbilityNameLabelKey(ability.name_key), {
          param,
          count: ability.max_count ?? 0,
        })
        // 翻訳済みテンプレートの {v} を凸数に対応する値で置換
        // 例: "元気{v}ボーカル" + uncap=4 + values={"4":"3"} → "元気3ボーカル"
        const displayName = resolveAbilityValue(template, uncap, ability.values)
        return (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span
              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${colors.dot}`}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 leading-snug">{displayName}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

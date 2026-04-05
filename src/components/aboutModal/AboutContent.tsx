/**
 * Aboutコンテンツコンポーネント
 *
 * アプリの概要・使い方・免責事項などを表示するコンテンツ部分。
 * モーダルから分離しており、将来ルーター導入時に
 * そのままページコンポーネントに組み込める設計。
 */
import { useTranslation } from 'react-i18next'
import { MARSHMALLOW_URL, GITHUB_URL } from '../../constant'

/** アプリの概要・免責事項を表示するコンテンツ */
export default function AboutContent() {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      {/* 概要 */}
      <section>
        <h3 className="text-xs font-black text-slate-800 mb-1.5">{t('ui.about.overview_title')}</h3>
        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{t('ui.about.overview_desc')}</p>
      </section>

      {/* 免責事項 */}
      <section>
        <h3 className="text-xs font-black text-slate-800 mb-1.5">{t('ui.about.disclaimer_title')}</h3>
        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{t('ui.about.disclaimer_desc')}</p>
      </section>

      {/* アクセス解析 */}
      <section>
        <h3 className="text-xs font-black text-slate-800 mb-1.5">{t('ui.about.analytics_title')}</h3>
        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{t('ui.about.analytics_desc')}</p>
      </section>

      {/* ご意見・ご要望 */}
      <section>
        <h3 className="text-xs font-black text-slate-800 mb-1.5">{t('ui.about.feedback_title')}</h3>
        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{t('ui.about.feedback_desc')}</p>
        <div className="mt-2 flex gap-3">
          <a
            href={MARSHMALLOW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-orange-600 hover:text-orange-700 underline"
          >
            {t('ui.about.link_marshmallow')}
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-orange-600 hover:text-orange-700 underline"
          >
            {t('ui.about.link_github')}
          </a>
        </div>
      </section>
    </div>
  )
}

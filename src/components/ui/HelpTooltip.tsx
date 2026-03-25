/**
 * ヘルプツールチップコンポーネント
 *
 * 小さな「?」アイコンを表示し、hover（PC）またはタップ（モバイル）で
 * 説明テキストをポップアップ表示する汎用コンポーネント。
 * フィルターバーや設定パネルの横に配置して、機能のヒントを提供する。
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/** HelpTooltip コンポーネントに渡すプロパティ */
interface HelpTooltipProps {
  /** ツールチップに表示するテキスト */
  text: string
  /** 追加のCSSクラス（?アイコンのコンテナに適用） */
  className?: string
}

/** hover/タップで説明テキストを表示するヘルプツールチップ */
export function HelpTooltip({ text, className = '' }: HelpTooltipProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  /** ツールチップ外をクリックしたら閉じる */
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, handleClickOutside])

  // ツールチップが画面外にはみ出ないよう位置を補正する
  useEffect(() => {
    if (!open || !tooltipRef.current || !ref.current) return
    const tooltip = tooltipRef.current
    const trigger = ref.current.getBoundingClientRect()
    const rect = tooltip.getBoundingClientRect()
    const pad = 8

    // 水平方向: 画面幅内にクランプ
    let left = trigger.left
    if (left + rect.width > window.innerWidth - pad) {
      left = window.innerWidth - pad - rect.width
    }
    if (left < pad) left = pad
    tooltip.style.left = `${left}px`

    // 垂直方向: デフォルトは上、入らなければ下
    const above = trigger.top - rect.height - 6
    if (above >= pad) {
      tooltip.style.top = `${above}px`
    } else {
      tooltip.style.top = `${trigger.bottom + 6}px`
    }
  }, [open])

  return (
    <div ref={ref} className={`relative inline-flex items-center ${className}`}>
      {/* ?アイコンボタン */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="relative w-4 h-4 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 transition-colors cursor-help select-none"
        aria-label={t('ui.accessibility.help')}
      >
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black font-sans leading-none tracking-normal">{t('ui.symbol.help')}</span>
      </button>
      {/* ツールチップ本体（fixed で画面内にクランプ） */}
      {open && (
        <div
          ref={tooltipRef}
          className="fixed px-2.5 py-1.5 bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg shadow-lg whitespace-pre-line max-w-[220px] w-max z-50 pointer-events-none"
        >
          {text}
        </div>
      )}
    </div>
  )
}

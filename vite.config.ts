/// <reference types="vitest" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GA4 gtagスニペットを<head>に挿入するプラグイン
// ページ読み込み後に遅延ロードしてメインスレッドのブロックを回避する
function gtagPlugin(gaId: string): Plugin {
  return {
    name: 'gtag',
    transformIndexHtml(html) {
      if (!gaId) return html
      const snippet = [
        '    <script>',
        '      window.addEventListener("load", function() {',
        '        setTimeout(function() {',
        `          var s = document.createElement("script");`,
        `          s.src = "https://www.googletagmanager.com/gtag/js?id=${gaId}";`,
        '          s.async = true;',
        '          document.head.appendChild(s);',
        '          window.dataLayer = window.dataLayer || [];',
        '          function gtag(){dataLayer.push(arguments);}',
        "          gtag('js', new Date());",
        `          gtag('config', '${gaId}');`,
        '        }, 0);',
        '      });',
        '    </script>',
      ].join('\n')
      return html.replace('</head>', `${snippet}\n    </head>`)
    },
  }
}

// 遅延チャンクをビルド時に <link rel="prefetch"> として注入するプラグイン
function prefetchLazyChunks(basePath: string): Plugin {
  return {
    name: 'prefetch-lazy-chunks',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return []
        return Object.entries(ctx.bundle)
          .filter(([, chunk]) => chunk.type === 'chunk' && !chunk.isEntry && chunk.isDynamicEntry)
          .map(([fileName]) => ({
            tag: 'link',
            attrs: { rel: 'prefetch', href: `${basePath}${fileName}` },
            injectTo: 'head' as const,
          }))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const basePath = env.VITE_BASE_PATH || '/gaku-navi/'

  return {
    base: basePath,
    plugins: [
      react(),
      gtagPlugin(env.VITE_GA_ID || ''),
      prefetchLazyChunks(basePath),
      VitePWA({
        manifest: false,
        scope: basePath,
        registerType: 'autoUpdate',
        injectRegister: 'script-defer',
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          navigateFallbackDenylist: [/\/(sitemap\.xml|robots\.txt)$/],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // React / React DOM（react-dom/client 含む）を vendor チャンクに分離
            if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/')) {
              return 'vendor'
            }
            // i18next ランタイムを別チャンクに分離
            if (id.includes('node_modules/i18next/') || id.includes('node_modules/react-i18next/')) {
              return 'i18n'
            }
            // 仮想スクロールライブラリを別チャンクに分離
            if (id.includes('node_modules/@tanstack/')) {
              return 'virtual'
            }
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['src/__tests__/**/*.test.ts'],
    },
  }
})

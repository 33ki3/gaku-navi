/// <reference types="vitest" />
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { type Plugin, defineConfig, loadEnv } from 'vite'
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

/**
 * cards.jsonとja.jsonをJavaScriptへ結合せず、ハッシュ付きJSON assetとして出力する。
 * データ更新時もアプリ本体のJS・vendor・一覧画面用JSを再取得しない。
 */
function jsonAssetPlugin(basePath: string): Plugin {
  const cardJsonPath = resolve(process.cwd(), 'src/data/json/cards.json')
  const localeJsonPath = resolve(process.cwd(), 'src/i18n/locales/ja.json')
  const readJsonAsset = (filePath: string) => JSON.stringify(JSON.parse(readFileSync(filePath, 'utf8')))
  const cardJson = readJsonAsset(cardJsonPath)
  const localeJson = readJsonAsset(localeJsonPath)
  const cardAssetFileName = `assets/cards-${createHash('sha256').update(cardJson).digest('hex').slice(0, 8)}.json`
  const localeAssetFileName = `assets/ja-${createHash('sha256').update(localeJson).digest('hex').slice(0, 8)}.json`

  return {
    name: 'json-assets',
    configureServer(server) {
      server.watcher.add([cardJsonPath, localeJsonPath])
      server.middlewares.use((request, response, next) => {
        const pathname = request.url?.split('?')[0]
        if (request.method !== 'GET') {
          next()
          return
        }

        const assetPath =
          pathname?.endsWith(cardAssetFileName) || pathname?.endsWith('/cards.json')
            ? cardJsonPath
            : pathname?.endsWith(localeAssetFileName) || pathname?.endsWith('/ja.json')
              ? localeJsonPath
              : undefined
        if (assetPath === undefined) {
          next()
          return
        }

        try {
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.setHeader('Cache-Control', 'no-store')
          response.end(readJsonAsset(assetPath))
        } catch (error) {
          next(error)
        }
      })
    },
    hotUpdate({ file }) {
      if (file !== cardJsonPath && file !== localeJsonPath) return

      try {
        readJsonAsset(file)
      } catch {
        return []
      }

      if (this.environment.name === 'client') {
        this.environment.hot.send({ type: 'full-reload' })
      }
      return []
    },
    transformIndexHtml: (html) =>
      html
        .replace('__CARD_ASSET_URL__', `${basePath}${cardAssetFileName}`)
        .replace('__LOCALE_ASSET_URL__', `${basePath}${localeAssetFileName}`),
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: cardAssetFileName,
        source: cardJson,
      })
      this.emitFile({
        type: 'asset',
        fileName: localeAssetFileName,
        source: localeJson,
      })
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
      jsonAssetPlugin(basePath),
      gtagPlugin(env.VITE_GA_ID || ''),
      VitePWA({
        manifest: false,
        scope: basePath,
        registerType: 'autoUpdate',
        injectRegister: null,
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
          codeSplitting: {
            // 指定したアプリ・vendorだけをまとめ、起動用の動的import補助はentry側に残す
            includeDependenciesRecursively: false,
            groups: [
              {
                name: 'vendor',
                test: /[\\/]node_modules[\\/]/,
                priority: 1,
              },
              {
                name: 'app-list',
                test: (id) =>
                  (!id.endsWith('/src/main.tsx') && id.includes('/src/')) ||
                  id.includes('virtual:pwa-register') ||
                  id.includes('workbox'),
              },
            ],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['src/__tests__/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/__tests__/setup.ts'],
    },
  }
})

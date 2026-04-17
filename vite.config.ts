/// <reference types="vitest" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GA4 gtagスニペットを<head>に挿入するプラグイン
function gtagPlugin(gaId: string): Plugin {
  return {
    name: 'gtag',
    transformIndexHtml(html) {
      if (!gaId) return html
      const snippet = [
        `  <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>`,
        '    <script>',
        '      window.dataLayer = window.dataLayer || [];',
        '      function gtag(){dataLayer.push(arguments);}',
        "      gtag('js', new Date());",
        `      gtag('config', '${gaId}');`,
        '    </script>',
      ].join('\n')
      return html.replace('</head>', `${snippet}\n    </head>`)
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
          manualChunks: {
            vendor: ['react', 'react-dom'],
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

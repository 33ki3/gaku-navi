/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const basePath = env.VITE_BASE_PATH || '/gaku-navi/'

  return {
    base: basePath,
    plugins: [
      react(),
      VitePWA({
        manifest: false,
        scope: basePath,
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

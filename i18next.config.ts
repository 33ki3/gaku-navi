import { defineConfig } from 'i18next-cli'
import { collectRuntimeTranslationKeys } from './src/i18n/runtimeTranslationKeys'

export default defineConfig({
  locales: ['ja'],
  extract: {
    input: ['src/**/*.{ts,tsx}'],
    ignore: ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    output: 'src/i18n/locales/{{language}}.json',
    // ja.jsonはnamespaceを分けず、ルート直下に全キーを持つ形式に合わせる。
    defaultNS: false,
    // { count } は補間値として使っており、i18nextの複数形キーは使わない。
    disablePlurals: true,
    mergeNamespaces: true,
    sort: false,
    removeUnusedKeys: false,
    extractFromComments: false,
    preservePatterns: collectRuntimeTranslationKeys(),
  },
})

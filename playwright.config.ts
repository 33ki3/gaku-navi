import { defineConfig, devices } from '@playwright/test'

const iphone = devices['iPhone 17']
const android = devices['Pixel 9']
const appBasePath = process.env.E2E_BASE_PATH ?? '/gaku-navi/'
const appUrl = `http://127.0.0.1:4173${appBasePath}`
const baseScreenshotDirectory = process.env.REGRESSION_BASE_SCREENSHOT_DIR ?? 'tmp/regression-results/baselines'
// regression runnerは端末別の観測JSONとは別に、Playwrightの件数サマリーを固定パスから読む
const playwrightReportPath = 'tmp/test-results/e2e/report.json'

if (!iphone || !android) {
  throw new Error('Playwright device presets iPhone 17 and Pixel 9 are required')
}

/** PR前後の観測で同じviewport、locale、timezoneを使う */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  snapshotPathTemplate: `${baseScreenshotDirectory}/{projectName}/{arg}{ext}`,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['json', { outputFile: playwrightReportPath }]]
    : [['list'], ['json', { outputFile: playwrightReportPath }]],
  outputDir: 'tmp/test-results/e2e',
  use: {
    baseURL: appUrl,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'iphone',
      use: {
        ...iphone,
        browserName: 'webkit',
      },
    },
    {
      name: 'android',
      use: {
        ...android,
        browserName: 'chromium',
      },
    },
  ],
  webServer: {
    command:
      process.env.E2E_PREVIEW === '1'
        ? 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort'
        : 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: appUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

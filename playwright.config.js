import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['./reporters/carrowmont-reporter.js']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://carrowmont.com',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    acceptDownloads: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  outputDir: 'test-results',
  projects: [
    {
      name: 'chrome-desktop',
      use: {
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'edge-desktop',
      use: {
        channel: 'msedge',
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7']
      }
    }
  ]
});

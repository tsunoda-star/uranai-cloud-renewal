import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

/**
 * Playwright configuration for docker-test-loop
 *
 * Features:
 * - Video recording on all tests
 * - Screenshot on failure
 * - Full trace recording
 * - HAR network capture
 * - Console log collection
 * - storageState session persistence (auth.setup.ts)
 * - Shard-based parallel execution with blob reporter
 */

// Log directory for current run
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logDir = path.join(process.cwd(), '.test-logs', timestamp);

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Output directory for test artifacts
  outputDir: path.join(logDir, 'browser'),

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Fully parallel execution
  fullyParallel: true,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // CI: 2 workers per shard, local: auto
  workers: process.env.CI ? 2 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: path.join(logDir, 'reports', 'html') }],
    ['json', { outputFile: path.join(logDir, 'tests', 'e2e-results.json') }],
    ['blob', { outputDir: path.join(logDir, 'blob-report') }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for relative navigation.
    // dev サーバは 3100（next dev -p 3100）。dev/AWS は BASE_URL で上書き。
    baseURL: process.env.BASE_URL || 'http://localhost:3100',

    // Collect trace when retrying the failed test
    trace: 'on',

    // Record video for all tests
    video: 'on',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Timeout for each action
    actionTimeout: 10000,

    // Timeout for navigation
    navigationTimeout: 30000,
  },

  // Configure projects for major browsers.
  //
  // 本アプリは dev 認証（cookie `dev_role`）を使うため、メール/パスワードの
  // storageState セットアップは行わない。認証が必要なテストは各自で
  // context.addCookies({ name: 'dev_role', ... }) を使う（fixtures 参照）。
  projects: [
    {
      name: 'chromium',
      testMatch: /.*\.pw\.ts/,
      testIgnore: /.*\.test\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        serviceWorkers: 'block',
        viewport: { width: 1280, height: 720 },
      },
    },

    // Mobile viewport（レスポンシブ AC-A1-6 / RWD-3 用, 任意実行）。
    {
      name: 'Mobile Chrome',
      testMatch: /.*\.pw\.ts/,
      testIgnore: /.*\.test\.ts/,
      use: {
        ...devices['Pixel 5'],
        serviceWorkers: 'block',
      },
    },
  ],

  // Run the local dev server before starting the tests (port 3100, dev auth).
  webServer: process.env.NO_SERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      AUTH_PROVIDER: 'dev',
      DEV_AUTH_DEFAULT_ROLE: 'GENERAL',
    },
  },

  // Global setup (log dirs). teardown は不要（未使用）。
  globalSetup: './tests/e2e/global-setup.ts',

  // Test timeout
  timeout: 60 * 1000,

  // Expect timeout
  expect: {
    timeout: 10 * 1000,
  },

  // Metadata for reports
  metadata: {
    project: process.env.PROJECT_NAME || 'CCAGI Project',
    environment: process.env.NODE_ENV || 'test',
    timestamp: timestamp,
  },
});

// Export log directory for use in tests
export const TEST_LOG_DIR = logDir;

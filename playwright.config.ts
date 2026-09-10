import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// server.ts loads .env via dotenv on its own, but the Playwright test-runner
// process (this file, and everything under tests/e2e/) does NOT get that for
// free — without the import above, tests/e2e/helpers.ts's
// `process.env.TEST_RESET_TOKEN` would silently read as undefined, sending
// an empty header that the server's /api/test/reset correctly rejects
// (403) — and since that rejection was never checked, every test's
// "reset" would silently no-op, leaking state (e.g. a holiday marked by one
// test) into the next one.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      testIgnore: /responsive\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    env: {
      PORT: '4173',
      // Each test logs in once via resetAppState() (see tests/e2e/helpers.ts) —
      // well above the strict production default, which exists to blunt
      // brute-forcing the single shared clinic password over the internet.
      LOGIN_RATE_LIMIT: '500',
    },
  },
});

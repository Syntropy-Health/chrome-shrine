/**
 * Playwright Configuration for Chrome Extension E2E Testing
 *
 * Uses persistent browser context with --load-extension to test
 * the Chrome extension against real sites.
 *
 * Usage:
 *   npx playwright test                    # Run E2E tests
 *   npx playwright test --project=capture  # Capture fixtures only
 */

import { defineConfig } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, 'dist');

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1, // Chrome extension testing requires sequential execution

  use: {
    headless: false, // Chrome extensions require headed mode
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'e2e',
      testMatch: '**/*.e2e.ts',
      use: {
        launchOptions: {
          args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`,
            '--no-first-run',
            '--disable-default-apps',
          ],
        },
      },
    },
    {
      name: 'capture',
      testMatch: '**/capture-fixtures.e2e.ts',
      use: {
        launchOptions: {
          args: [
            '--no-first-run',
            '--disable-default-apps',
          ],
        },
      },
    },
  ],

  outputDir: 'tests/e2e/results',
});

/**
 * Fixture Capture Script
 *
 * Uses Playwright to navigate to target sites and capture rendered HTML
 * and HAR files for offline testing. Run via:
 *
 *   npx tsx scripts/capture-fixtures.ts
 *
 * Or via npm script:
 *   npm run fixtures:capture
 *
 * Captures:
 *   - Rendered HTML (post-JavaScript execution)
 *   - HAR network recordings
 *   - Screenshots for visual reference
 */

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const FIXTURES_DIR = resolve(__dirname, '../tests/fixtures');
const HTML_DIR = resolve(FIXTURES_DIR, 'html');
const HAR_DIR = resolve(FIXTURES_DIR, 'har');
const SCREENSHOTS_DIR = resolve(FIXTURES_DIR, 'screenshots');

interface CaptureTarget {
  name: string;
  url: string;
  waitForSelector?: string;
  waitMs?: number;
}

/**
 * Target sites and pages to capture
 * Update URLs as needed for your testing scenarios
 */
const TARGETS: CaptureTarget[] = [
  {
    name: 'amazon-supplement',
    url: 'https://www.amazon.com/s?k=vitamin+d+supplement&i=hpc',
    waitForSelector: '[data-component-type="s-search-result"]',
    waitMs: 3000,
  },
  {
    name: 'wholefoods-product',
    url: 'https://www.amazon.com/s?k=365+whole+foods+organic&i=wholefoods',
    waitForSelector: '[data-asin]',
    waitMs: 3000,
  },
  {
    name: 'cookunity-meals',
    url: 'https://www.cookunity.com/meals',
    waitForSelector: '.meal-card, [class*="MealCard"]',
    waitMs: 5000,
  },
  {
    name: 'doordash-store',
    url: 'https://www.doordash.com/store/sweetgreen-new-york-21648/',
    waitForSelector: '[data-testid="MenuItemCard"], [class*="MenuItem"]',
    waitMs: 5000,
  },
  {
    name: 'shopify-supplement',
    url: 'https://www.athleticgreens.com/en/products',
    waitForSelector: '.product-card, [class*="Product"]',
    waitMs: 5000,
  },
];

async function captureFixtures() {
  // Ensure directories exist
  mkdirSync(HTML_DIR, { recursive: true });
  mkdirSync(HAR_DIR, { recursive: true });
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: false, // Some sites block headless browsers
    args: ['--no-first-run', '--disable-default-apps'],
  });

  console.log(`Capturing fixtures for ${TARGETS.length} targets...\n`);

  for (const target of TARGETS) {
    console.log(`[${target.name}] Navigating to ${target.url}...`);

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      recordHar: {
        path: resolve(HAR_DIR, `${target.name}.har`),
        mode: 'minimal',
      },
    });

    const page = await context.newPage();

    try {
      await page.goto(target.url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for content to render
      if (target.waitForSelector) {
        try {
          await page.waitForSelector(target.waitForSelector, { timeout: 10000 });
        } catch {
          console.warn(`  [WARN] Selector "${target.waitForSelector}" not found, continuing...`);
        }
      }

      if (target.waitMs) {
        await page.waitForTimeout(target.waitMs);
      }

      // Capture rendered HTML
      const html = await page.content();
      writeFileSync(resolve(HTML_DIR, `${target.name}.html`), html, 'utf-8');
      console.log(`  [OK] HTML saved (${(html.length / 1024).toFixed(1)} KB)`);

      // Capture screenshot
      await page.screenshot({
        path: resolve(SCREENSHOTS_DIR, `${target.name}.png`),
        fullPage: false,
      });
      console.log(`  [OK] Screenshot saved`);

    } catch (error) {
      console.error(`  [ERROR] Failed to capture ${target.name}:`, error);
    } finally {
      await context.close();
    }

    console.log('');
  }

  await browser.close();
  console.log('Fixture capture complete.');
}

// Run if executed directly
captureFixtures().catch(console.error);

/**
 * Scraper Module Tests
 *
 * Tests for web scraping functionality including site-specific scrapers
 * and product extraction logic.
 */

import { AmazonFreshScraper } from '../src/modules/scraper/amazon-fresh';
import { CookUnityScraper } from '../src/modules/scraper/cookunity';
import { GenericScraper } from '../src/modules/scraper/generic';
import { ScraperManager } from '../src/modules/scraper';
import type { FoodProduct } from '../src/types';

/**
 * Mock DOM for testing
 */
function createMockDocument(html: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

describe('AmazonFreshScraper', () => {
  let scraper: AmazonFreshScraper;

  beforeEach(() => {
    scraper = new AmazonFreshScraper();
  });

  test('should detect Amazon Fresh pages', () => {
    const doc = createMockDocument(`
      <html>
        <body>
          <div data-component-type="s-search-result" data-asin="B001234567"></div>
        </body>
      </html>
    `);

    // Mock location
    Object.defineProperty(doc, 'location', {
      value: { href: 'https://www.amazon.com/alm/storefront/fresh/' },
      writable: true,
    });

    expect(scraper.isSupported(doc)).toBe(true);
  });

  test('should extract product from search result', async () => {
    const html = `
      <div data-component-type="s-search-result" data-asin="B001234567">
        <h2><span>Organic Bananas</span></h2>
        <span class="a-size-base-plus">Dole</span>
        <img src="https://example.com/banana.jpg" />
      </div>
    `;

    const doc = createMockDocument(html);
    const element = doc.querySelector('[data-asin]')!;
    const product = await scraper.extractProductFromElement(element);

    expect(product).not.toBeNull();
    expect(product?.name).toBe('Organic Bananas');
    expect(product?.brand).toBe('Dole');
    expect(product?.id).toContain('amazon-');
  });

  test('should handle missing data gracefully', async () => {
    const html = `<div data-asin="B001234567"></div>`;
    const doc = createMockDocument(html);
    const element = doc.querySelector('[data-asin]')!;
    const product = await scraper.extractProductFromElement(element);

    expect(product).toBeNull();
  });
});

describe('CookUnityScraper', () => {
  let scraper: CookUnityScraper;

  beforeEach(() => {
    scraper = new CookUnityScraper();
  });

  test('should detect CookUnity pages', () => {
    const doc = createMockDocument(`
      <html>
        <body>
          <div class="meal-card"></div>
        </body>
      </html>
    `);

    Object.defineProperty(doc, 'location', {
      value: { href: 'https://www.cookunity.com/meals/' },
      writable: true,
    });

    expect(scraper.isSupported(doc)).toBe(true);
  });

  test('should extract meal from card', async () => {
    const html = `
      <article class="meal-card">
        <h2>Grilled Chicken Bowl</h2>
        <div class="chef-name">Chef Mario</div>
        <p class="description">Delicious grilled chicken with vegetables</p>
        <img src="https://example.com/chicken.jpg" />
      </article>
    `;

    const doc = createMockDocument(html);
    const element = doc.querySelector('.meal-card')!;
    const product = await scraper.extractProductFromElement(element);

    expect(product).not.toBeNull();
    expect(product?.name).toBe('Grilled Chicken Bowl');
    expect(product?.brand).toContain('Chef Mario');
  });
});

describe('GenericScraper', () => {
  let scraper: GenericScraper;

  beforeEach(() => {
    scraper = new GenericScraper();
  });

  test('should detect food pages by keywords', () => {
    const doc = createMockDocument(`
      <html>
        <head><title>Organic Food Store - Fresh Ingredients</title></head>
        <body></body>
      </html>
    `);

    expect(scraper.isSupported(doc)).toBe(true);
  });

  test('should detect food pages by nutrition facts', () => {
    const doc = createMockDocument(`
      <html>
        <head><title>Product Page</title></head>
        <body>
          <div>
            <h3>Nutrition Facts</h3>
            <p>Serving Size: 100g</p>
          </div>
        </body>
      </html>
    `);

    expect(scraper.isSupported(doc)).toBe(true);
  });

  test('should not detect non-food pages', () => {
    const doc = createMockDocument(`
      <html>
        <head><title>Electronics Store</title></head>
        <body><p>Buy phones and laptops</p></body>
      </html>
    `);

    expect(scraper.isSupported(doc)).toBe(false);
  });
});

describe('ScraperManager', () => {
  let manager: ScraperManager;

  beforeEach(() => {
    manager = ScraperManager.getInstance();
  });

  test('should select correct scraper for Amazon', () => {
    const doc = createMockDocument('<div data-asin="B001234567"></div>');
    Object.defineProperty(doc, 'location', {
      value: { href: 'https://www.amazon.com/alm/storefront/fresh/' },
      writable: true,
    });

    const detected = manager.detectScraper(doc);
    expect(detected).toBe(true);

    const scraper = manager.getCurrentScraper();
    expect(scraper?.name).toBe('Amazon Fresh');
  });

  test('should fall back to generic scraper', () => {
    const doc = createMockDocument(`
      <html>
        <head><title>Food Store</title></head>
        <body></body>
      </html>
    `);

    const detected = manager.detectScraper(doc);
    expect(detected).toBe(true);

    const scraper = manager.getCurrentScraper();
    expect(scraper?.name).toBe('Generic Food');
  });
});

/**
 * Manual test runner for browser environment
 * Run this in the browser console on actual pages
 */
export async function runManualScraperTests() {
  console.log('🧪 Running Manual Scraper Tests...\n');

  const manager = ScraperManager.getInstance();

  // Test 1: Detect current page
  console.log('Test 1: Page Detection');
  const isSupported = manager.isFoodPage(document);
  console.log(`✓ Page is ${isSupported ? '' : 'not '}food-related`);

  if (isSupported) {
    const scraper = manager.getCurrentScraper();
    console.log(`✓ Using scraper: ${scraper?.name}\n`);

    // Test 2: Extract products
    console.log('Test 2: Product Extraction');
    const products = await manager.extractProducts(document);
    console.log(`✓ Found ${products.length} products`);

    if (products.length > 0) {
      console.log('\nFirst product:');
      console.log(JSON.stringify(products[0], null, 2));
    }
  }

  console.log('\n✅ Manual tests complete!');
}

/**
 * Shopify Supplement Scraper Tests (Fixture-Based)
 *
 * Tests Shopify supplement scraper against realistic product page fixture.
 * Includes user profile scenarios for supplement stack conflicts.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { ShopifySupplementScraper } from '../../src/modules/scraper/shopify-supplement';
import { ScraperManager } from '../../src/modules/scraper';
import { loadFixture } from '../fixtures/load-fixture';

describe('Shopify Supplement Scraper (Fixture)', () => {
  let scraper: ShopifySupplementScraper;

  beforeEach(() => {
    scraper = new ShopifySupplementScraper();
  });

  test('should detect Shopify supplement store', () => {
    const doc = loadFixture(
      'shopify-supplement',
      'https://athleticgreens.com/products/magnesium-glycinate',
    );
    expect(scraper.isSupported(doc)).toBe(true);
  });

  test('should not detect non-Shopify pages', () => {
    const doc = loadFixture(
      'doordash-store',
      'https://www.doordash.com/store/sweetgreen/',
    );
    expect(scraper.isSupported(doc)).toBe(false);
  });

  test('should extract product from detail page', async () => {
    const doc = loadFixture(
      'shopify-supplement',
      'https://athleticgreens.com/products/magnesium-glycinate',
    );
    const products = await scraper.extractProducts(doc);
    expect(products.length).toBeGreaterThanOrEqual(1);

    const product = products[0];
    expect(product.name).toContain('Magnesium Glycinate');
    expect(product.brand).toContain('Athletic Greens');
    expect(product.source).toBe('shopify');
  });

  test('should extract product cards with names and brands', async () => {
    const doc = loadFixture(
      'shopify-supplement',
      'https://athleticgreens.com/products/magnesium-glycinate',
    );
    const products = await scraper.extractProducts(doc);

    // Product cards are found first (before detail page)
    expect(products.length).toBeGreaterThanOrEqual(1);
    const magProduct = products.find((p) => p.name.includes('Magnesium'));
    expect(magProduct).toBeDefined();
    expect(magProduct?.brand).toContain('Athletic Greens');
  });

  test('should extract product IDs from data attributes', async () => {
    const doc = loadFixture(
      'shopify-supplement',
      'https://athleticgreens.com/collections/supplements',
    );
    const products = await scraper.extractProducts(doc);

    // Product cards have data-product-id attributes
    expect(products.length).toBeGreaterThanOrEqual(1);
    expect(products[0].id).toContain('shopify-sp-');
  });

  test('should extract products from collection page', async () => {
    const doc = loadFixture(
      'shopify-supplement',
      'https://athleticgreens.com/collections/supplements',
    );
    const products = await scraper.extractProducts(doc);
    expect(products.length).toBeGreaterThanOrEqual(1);
  });

  // User Profile Scenario: Supplement stack conflict detection by product name
  test('should detect supplement stack conflicts by product name', async () => {
    const doc = loadFixture(
      'shopify-supplement',
      'https://athleticgreens.com/products/magnesium-glycinate',
    );
    const products = await scraper.extractProducts(doc);
    const product = products.find((p) => p.name.toLowerCase().includes('magnesium'));

    expect(product).toBeDefined();

    // Simulate Syntropy Health user with existing supplement stack
    const userSupplementStack = ['Calcium Citrate 1000mg', 'Iron 65mg', 'Magnesium Oxide 400mg'];

    // Check for duplicate nutrients by product name (since ingredients may not be on card)
    const productName = product!.name.toLowerCase();
    const duplicateNutrients = userSupplementStack.filter((supp) => {
      const suppName = supp.toLowerCase();
      // Both contain "magnesium"
      return suppName.includes('magnesium') && productName.includes('magnesium');
    });

    // Should detect magnesium overlap
    expect(duplicateNutrients.length).toBeGreaterThan(0);
  });

  // User Profile Scenario: Condition conflict (hemochromatosis + iron)
  test('should support condition conflict checking by product name', async () => {
    const doc = loadFixture(
      'shopify-supplement',
      'https://athleticgreens.com/products/magnesium-glycinate',
    );
    const products = await scraper.extractProducts(doc);
    const product = products.find((p) => p.name.toLowerCase().includes('magnesium'));

    expect(product).toBeDefined();

    // User with hemochromatosis should avoid iron supplements
    const conditionConflicts: Record<string, string[]> = {
      hemochromatosis: ['iron'],
    };

    const productName = product!.name.toLowerCase();
    const conflicts = Object.entries(conditionConflicts).flatMap(([, nutrients]) =>
      nutrients.filter((nutrient) => productName.includes(nutrient)),
    );

    // Magnesium product should NOT conflict with hemochromatosis
    expect(conflicts.length).toBe(0);
  });

  // ScraperManager integration
  test('ScraperManager should select Shopify scraper for supplement stores', () => {
    (ScraperManager as any).instance = null;
    const manager = ScraperManager.getInstance();
    const doc = loadFixture(
      'shopify-supplement',
      'https://athleticgreens.com/products/magnesium-glycinate',
    );

    const detected = manager.detectScraper(doc);
    expect(detected).toBe(true);
    expect(manager.getCurrentScraper()?.name).toBe('Shopify Supplement');
  });
});

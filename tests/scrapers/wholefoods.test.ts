/**
 * Whole Foods Scraper Tests (Fixture-Based)
 *
 * Tests Amazon Fresh scraper against Whole Foods product fixture.
 * Whole Foods products use Amazon's DOM structure.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { AmazonFreshScraper } from '../../src/modules/scraper/amazon-fresh';
import { loadFixture } from '../fixtures/load-fixture';

describe('Whole Foods Scraper (Fixture)', () => {
  let scraper: AmazonFreshScraper;

  beforeEach(() => {
    scraper = new AmazonFreshScraper();
  });

  test('should detect Whole Foods product page', () => {
    const doc = loadFixture(
      'wholefoods-product',
      'https://www.amazon.com/alm/storefront/fresh/',
    );
    expect(scraper.isSupported(doc)).toBe(true);
  });

  test('should extract Whole Foods products from search results', async () => {
    const doc = loadFixture(
      'wholefoods-product',
      'https://www.amazon.com/alm/storefront/fresh/',
    );
    const products = await scraper.extractProducts(doc);
    expect(products.length).toBeGreaterThanOrEqual(2);
  });

  test('should extract 365 brand products', async () => {
    const doc = loadFixture(
      'wholefoods-product',
      'https://www.amazon.com/alm/storefront/fresh/',
    );
    const products = await scraper.extractProducts(doc);
    const oliveOil = products.find((p) => p.name.includes('Olive Oil'));

    expect(oliveOil).toBeDefined();
    expect(oliveOil?.brand).toBe('365 by Whole Foods Market');
  });

  test('should extract products from combined fixture', async () => {
    const doc = loadFixture(
      'wholefoods-product',
      'https://www.amazon.com/dp/B074H5GZH7',
    );
    const products = await scraper.extractProducts(doc);
    expect(products.length).toBeGreaterThanOrEqual(1);

    // Products extracted from search result cards in the fixture
    const oliveOilProduct = products.find((p) => p.name.includes('Olive Oil'));
    expect(oliveOilProduct).toBeDefined();
    expect(oliveOilProduct?.source).toBe('amazon-fresh');
  });

  // User Profile Scenario: Health goal alignment
  test('should allow health goal checking for organic products', async () => {
    const doc = loadFixture(
      'wholefoods-product',
      'https://www.amazon.com/dp/B074H5GZH7',
    );
    const products = await scraper.extractProducts(doc);
    const product = products[0];

    // Simulate Syntropy Health user health goals check
    const userGoals = ['weight loss', 'heart health'];
    const productText = `${product.name} ${product.description || ''}`.toLowerCase();
    const isRelevant = productText.includes('olive oil'); // Heart-healthy fat
    expect(isRelevant).toBe(true);
  });
});

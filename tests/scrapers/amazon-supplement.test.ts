/**
 * Amazon Supplement Scraper Tests (Fixture-Based)
 *
 * Tests Amazon Fresh scraper against realistic supplement product page fixture.
 * Includes user profile scenarios for Syntropy Health.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { AmazonFreshScraper } from '../../src/modules/scraper/amazon-fresh';
import { ScraperManager } from '../../src/modules/scraper';
import { loadFixture } from '../fixtures/load-fixture';

describe('Amazon Supplement Scraper (Fixture)', () => {
  let scraper: AmazonFreshScraper;

  beforeEach(() => {
    scraper = new AmazonFreshScraper();
  });

  test('should detect Amazon supplement page', () => {
    const doc = loadFixture(
      'amazon-supplement',
      'https://www.amazon.com/s?k=vitamin+d+supplement',
    );
    expect(scraper.isSupported(doc)).toBe(true);
  });

  test('should extract multiple supplement products from search results', async () => {
    const doc = loadFixture(
      'amazon-supplement',
      'https://www.amazon.com/s?k=vitamin+d+supplement',
    );
    const products = await scraper.extractProducts(doc);
    expect(products.length).toBeGreaterThanOrEqual(3);
  });

  test('should extract product name and brand from search result', async () => {
    const doc = loadFixture(
      'amazon-supplement',
      'https://www.amazon.com/s?k=supplements',
    );
    const products = await scraper.extractProducts(doc);
    const vitaminD = products.find((p) => p.name.includes('Vitamin D-3'));

    expect(vitaminD).toBeDefined();
    expect(vitaminD?.brand).toBe('NOW Foods');
    expect(vitaminD?.id).toContain('amazon-B0032BH76O');
  });

  test('should extract product from detail page', async () => {
    const doc = loadFixture(
      'amazon-supplement',
      'https://www.amazon.com/dp/B0032BH76O',
    );
    const products = await scraper.extractProducts(doc);
    expect(products.length).toBeGreaterThanOrEqual(1);

    const product = products[0];
    expect(product.name).toContain('Vitamin D-3');
    expect(product.source).toBe('amazon-fresh');
  });

  test('search result products have empty ingredients (populated on detail page)', async () => {
    const doc = loadFixture(
      'amazon-supplement',
      'https://www.amazon.com/s?k=supplements',
    );
    const products = await scraper.extractProducts(doc);
    // Search result cards don't include ingredient lists - those come from detail pages
    expect(products.length).toBeGreaterThan(0);
    // Ingredients are empty on search result cards (expected)
    expect(products[0].ingredients).toEqual([]);
  });

  // User Profile Scenario: Allergen detection by product name/description
  test('should allow profile-based product filtering from search results', async () => {
    const doc = loadFixture(
      'amazon-supplement',
      'https://www.amazon.com/s?k=supplements',
    );
    const products = await scraper.extractProducts(doc);

    // Simulate Syntropy Health user profile check by product name
    const userAllergens = ['fish', 'shellfish'];
    const safeProducts = products.filter((p) => {
      const text = `${p.name} ${p.description || ''}`.toLowerCase();
      return !userAllergens.some((a) => text.includes(a));
    });

    expect(safeProducts.length).toBeGreaterThanOrEqual(1);
  });

  // ScraperManager integration
  test('ScraperManager should select Amazon scraper for supplement pages', () => {
    (ScraperManager as any).instance = null;
    const manager = ScraperManager.getInstance();
    const doc = loadFixture(
      'amazon-supplement',
      'https://www.amazon.com/s?k=supplements',
    );

    const detected = manager.detectScraper(doc);
    expect(detected).toBe(true);
    expect(manager.getCurrentScraper()?.name).toBe('Amazon Fresh');
  });
});

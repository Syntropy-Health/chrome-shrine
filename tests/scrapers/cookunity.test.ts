/**
 * CookUnity Scraper Tests (Fixture-Based)
 *
 * Tests CookUnity scraper against realistic meal listing fixture.
 * Includes user profile scenarios for dietary preferences.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CookUnityScraper } from '../../src/modules/scraper/cookunity';
import { loadFixture } from '../fixtures/load-fixture';

describe('CookUnity Scraper (Fixture)', () => {
  let scraper: CookUnityScraper;

  beforeEach(() => {
    scraper = new CookUnityScraper();
  });

  test('should detect CookUnity meal page', () => {
    const doc = loadFixture(
      'cookunity-meals',
      'https://www.cookunity.com/meals/',
    );
    expect(scraper.isSupported(doc)).toBe(true);
  });

  test('should extract multiple meals from listing', async () => {
    const doc = loadFixture(
      'cookunity-meals',
      'https://www.cookunity.com/meals/',
    );
    const products = await scraper.extractProducts(doc);
    expect(products.length).toBe(3);
  });

  test('should extract meal details correctly', async () => {
    const doc = loadFixture(
      'cookunity-meals',
      'https://www.cookunity.com/meals/',
    );
    const products = await scraper.extractProducts(doc);
    const salmon = products.find((p) => p.name.includes('Salmon'));

    expect(salmon).toBeDefined();
    expect(salmon?.brand).toContain('Chef Maria');
    expect(salmon?.description).toContain('quinoa');
    expect(salmon?.id).toContain('cookunity-cu-1001');
  });

  test('should extract meal URLs', async () => {
    const doc = loadFixture(
      'cookunity-meals',
      'https://www.cookunity.com/meals/',
    );
    const products = await scraper.extractProducts(doc);
    const salmon = products.find((p) => p.name.includes('Salmon'));

    expect(salmon?.url).toContain('/meals/grilled-salmon-bowl');
  });

  // User Profile Scenario: Dietary preference (vegan)
  test('should identify vegan-compatible meals', async () => {
    const doc = loadFixture(
      'cookunity-meals',
      'https://www.cookunity.com/meals/',
    );
    const products = await scraper.extractProducts(doc);

    // Simulate Syntropy Health user dietary preference check
    const userDiet = 'vegan';
    const veganMeals = products.filter((p) => {
      const text = `${p.name} ${p.description || ''}`.toLowerCase();
      return text.includes('vegan') || text.includes('plant-based');
    });

    expect(veganMeals.length).toBeGreaterThanOrEqual(1);
    expect(veganMeals[0].name).toContain('Vegan Buddha Bowl');
  });

  // User Profile Scenario: Macro compatibility (high protein)
  test('should support macro filtering for high-protein diets', async () => {
    const doc = loadFixture(
      'cookunity-meals',
      'https://www.cookunity.com/meals/',
    );
    const products = await scraper.extractProducts(doc);

    // Products should have metadata.calories for macro filtering
    const withCalories = products.filter((p) => p.metadata?.calories);
    expect(withCalories.length).toBeGreaterThan(0);
  });
});

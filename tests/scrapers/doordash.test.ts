/**
 * DoorDash Scraper Tests (Fixture-Based)
 *
 * Tests DoorDash scraper against realistic restaurant menu fixture.
 * Includes user profile scenarios for allergen detection.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { DoorDashScraper } from '../../src/modules/scraper/doordash';
import { ScraperManager } from '../../src/modules/scraper';
import { loadFixture } from '../fixtures/load-fixture';

describe('DoorDash Scraper (Fixture)', () => {
  let scraper: DoorDashScraper;

  beforeEach(() => {
    scraper = new DoorDashScraper();
  });

  test('should detect DoorDash store page', () => {
    const doc = loadFixture(
      'doordash-store',
      'https://www.doordash.com/store/sweetgreen/',
    );
    expect(scraper.isSupported(doc)).toBe(true);
  });

  test('should not detect non-DoorDash pages', () => {
    const doc = loadFixture(
      'amazon-supplement',
      'https://www.amazon.com/s?k=supplements',
    );
    expect(scraper.isSupported(doc)).toBe(false);
  });

  test('should extract menu items from store page', async () => {
    const doc = loadFixture(
      'doordash-store',
      'https://www.doordash.com/store/sweetgreen/',
    );
    const products = await scraper.extractProducts(doc);
    expect(products.length).toBe(4);
  });

  test('should extract menu item details', async () => {
    const doc = loadFixture(
      'doordash-store',
      'https://www.doordash.com/store/sweetgreen/',
    );
    const products = await scraper.extractProducts(doc);
    const harvestBowl = products.find((p) => p.name === 'Harvest Bowl');

    expect(harvestBowl).toBeDefined();
    expect(harvestBowl?.brand).toBe('Sweetgreen');
    expect(harvestBowl?.source).toBe('doordash');
    expect(harvestBowl?.metadata?.price).toBe('$14.95');
    expect(harvestBowl?.id).toContain('doordash-dd-5001');
  });

  test('should extract restaurant name from page context', async () => {
    const doc = loadFixture(
      'doordash-store',
      'https://www.doordash.com/store/sweetgreen/',
    );
    const products = await scraper.extractProducts(doc);

    products.forEach((p) => {
      expect(p.brand).toBe('Sweetgreen');
    });
  });

  // User Profile Scenario: Allergen detection from descriptions
  test('should detect allergens from item descriptions', async () => {
    const doc = loadFixture(
      'doordash-store',
      'https://www.doordash.com/store/sweetgreen/',
    );
    const products = await scraper.extractProducts(doc);

    // Simulate Syntropy Health user allergen check
    const userAllergens = ['dairy', 'gluten', 'tree nuts'];
    const flaggedProducts = products.filter((p) => {
      const desc = (p.description || '').toLowerCase();
      return userAllergens.some((allergen) => desc.includes(allergen));
    });

    // Harvest Bowl has dairy + tree nuts, Guacamole Greens has gluten, Kale Caesar has dairy + gluten
    expect(flaggedProducts.length).toBeGreaterThanOrEqual(3);
  });

  // User Profile Scenario: Condition-specific filtering
  test('should support condition-based menu filtering', async () => {
    const doc = loadFixture(
      'doordash-store',
      'https://www.doordash.com/store/sweetgreen/',
    );
    const products = await scraper.extractProducts(doc);

    // Simulate user with celiac disease - must avoid gluten
    const glutenFreeItems = products.filter((p) => {
      const desc = (p.description || '').toLowerCase();
      return !desc.includes('gluten');
    });

    // Harvest Bowl (tree nuts, dairy) and Miso Sweet Potatoes (soy) are gluten-free
    // Guacamole Greens and Kale Caesar contain gluten
    expect(glutenFreeItems.length).toBeGreaterThan(0);
    expect(glutenFreeItems.some((p) => p.name === 'Harvest Bowl')).toBe(true);
    expect(glutenFreeItems.some((p) => p.name === 'Guacamole Greens')).toBe(false);
  });

  // ScraperManager integration
  test('ScraperManager should select DoorDash scraper', () => {
    (ScraperManager as any).instance = null;
    const manager = ScraperManager.getInstance();
    const doc = loadFixture(
      'doordash-store',
      'https://www.doordash.com/store/sweetgreen/',
    );

    const detected = manager.detectScraper(doc);
    expect(detected).toBe(true);
    expect(manager.getCurrentScraper()?.name).toBe('DoorDash');
  });
});

/**
 * Scraper Module - Main Entry Point
 *
 * Orchestrates scraping across different food websites.
 * Automatically detects the current site and uses the appropriate scraper.
 *
 * @module scraper
 */

import type { IScraper, FoodProduct } from '@types';
import { AmazonFreshScraper } from './amazon-fresh';
import { CookUnityScraper } from './cookunity';
import { DoorDashScraper } from './doordash';
import { ShopifySupplementScraper } from './shopify-supplement';
import { GenericScraper } from './generic';

/**
 * Registry of all available scrapers
 */
const SCRAPERS: IScraper[] = [
  new AmazonFreshScraper(),
  new CookUnityScraper(),
  new DoorDashScraper(),
  new ShopifySupplementScraper(),
  new GenericScraper(), // Fallback scraper
];

/**
 * Scraper manager class
 * Handles scraper selection and product extraction
 */
export class ScraperManager {
  private static instance: ScraperManager;
  private currentScraper: IScraper | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ScraperManager {
    if (!ScraperManager.instance) {
      ScraperManager.instance = new ScraperManager();
    }
    return ScraperManager.instance;
  }

  /**
   * Detect and set the appropriate scraper for the current page
   * @param document - Current document
   * @returns true if a suitable scraper was found
   */
  detectScraper(document: Document): boolean {
    for (const scraper of SCRAPERS) {
      if (scraper.isSupported(document)) {
        this.currentScraper = scraper;
        console.log(`[ScraperManager] Using ${scraper.name} scraper`);
        return true;
      }
    }

    console.warn('[ScraperManager] No suitable scraper found');
    return false;
  }

  /**
   * Get the current active scraper
   * @returns Current scraper or null
   */
  getCurrentScraper(): IScraper | null {
    return this.currentScraper;
  }

  /**
   * Extract products from the current page
   * @param document - Current document
   * @returns Array of extracted products
   */
  async extractProducts(document: Document): Promise<FoodProduct[]> {
    if (!this.currentScraper) {
      this.detectScraper(document);
    }

    if (!this.currentScraper) {
      console.warn('[ScraperManager] No scraper available');
      return [];
    }

    try {
      const products = await this.currentScraper.extractProducts(document);
      console.log(`[ScraperManager] Extracted ${products.length} products`);
      return products;
    } catch (error) {
      console.error('[ScraperManager] Error extracting products:', error);
      return [];
    }
  }

  /**
   * Extract product from a specific element
   * @param element - DOM element
   * @returns Extracted product or null
   */
  async extractProductFromElement(element: Element): Promise<FoodProduct | null> {
    if (!this.currentScraper) {
      return null;
    }

    try {
      return await this.currentScraper.extractProductFromElement(element);
    } catch (error) {
      console.error('[ScraperManager] Error extracting product from element:', error);
      return null;
    }
  }

  /**
   * Check if the current page is a food-related page
   * @param document - Current document
   * @returns true if page is food-related
   */
  isFoodPage(document: Document): boolean {
    if (!this.currentScraper) {
      this.detectScraper(document);
    }
    return this.currentScraper !== null;
  }

  /**
   * Reset scraper (useful for SPA navigation)
   */
  reset(): void {
    this.currentScraper = null;
  }
}

// Export scrapers for direct use if needed
export { AmazonFreshScraper, CookUnityScraper, DoorDashScraper, ShopifySupplementScraper, GenericScraper };

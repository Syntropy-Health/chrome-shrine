/**
 * DoorDash Scraper
 *
 * Specialized scraper for DoorDash food delivery pages.
 * Handles menu item extraction, restaurant info, and ingredient parsing
 * from DoorDash's specific DOM structure.
 *
 * @module scraper/doordash
 */

import type { IScraper, FoodProduct, Ingredient, NutritionInfo } from '@types';
import { getTextContent, getAttribute, queryElements } from '@utils/dom-utils';
import { extractImages } from '@utils/image-utils';

/**
 * DoorDash scraper implementation
 */
export class DoorDashScraper implements IScraper {
  name = 'DoorDash';
  domains = ['www.doordash.com', 'doordash.com'];

  /**
   * Check if the current page is DoorDash
   * @param document - Current document
   * @returns true if page is DoorDash
   */
  isSupported(document: Document): boolean {
    const url = document.location.href;

    if (!url.includes('doordash.com')) {
      return false;
    }

    // Check for DoorDash store/restaurant pages
    const indicators = [
      '[data-testid="MenuItemCard"]',
      '[data-testid="StoreMenuItem"]',
      '[class*="MenuItemCard"]',
      '[class*="StoreMenu"]',
      '[data-anchor-id*="MenuItem"]',
    ];

    return indicators.some((selector) =>
      document.querySelector(selector) !== null
    );
  }

  /**
   * Extract all menu items from the page
   * @param document - Current document
   * @returns Array of food products (menu items)
   */
  async extractProducts(document: Document): Promise<FoodProduct[]> {
    const products: FoodProduct[] = [];

    // Menu item cards
    const menuItems = queryElements(document, [
      '[data-testid="MenuItemCard"]',
      '[data-testid="StoreMenuItem"]',
      '[class*="MenuItemCard"]',
      '[data-anchor-id*="MenuItem"]',
      'button[class*="MenuItem"]',
    ].join(', '));

    for (const item of menuItems) {
      const product = await this.extractProductFromElement(item);
      if (product) {
        products.push(product);
      }
    }

    // Item detail modal
    if (products.length === 0 && this.isItemDetailView(document)) {
      const detailProduct = await this.extractFromDetailView(document);
      if (detailProduct) {
        products.push(detailProduct);
      }
    }

    return products;
  }

  /**
   * Extract menu item from a card element
   * @param element - Menu item card element
   * @returns Food product or null
   */
  async extractProductFromElement(element: Element): Promise<FoodProduct | null> {
    try {
      // Extract item name
      const name = getTextContent(element, [
        '[data-testid="MenuItemName"]',
        'span[class*="ItemName"]',
        'h3',
        'h2',
        'span[class*="Text"]',
      ].join(', '));

      if (!name) {
        return null;
      }

      // Extract description
      const description = getTextContent(element, [
        '[data-testid="MenuItemDescription"]',
        'span[class*="Description"]',
        'p',
      ].join(', '));

      // Extract price
      const price = getTextContent(element, [
        '[data-testid="MenuItemPrice"]',
        'span[class*="Price"]',
      ].join(', '));

      // Extract restaurant name from page context
      const restaurant = this.extractRestaurantName(element);

      // Extract images
      const images = await extractImages(element);

      // Generate item ID
      const itemId = this.extractItemId(element, name);

      return {
        id: itemId,
        name: name.trim(),
        brand: restaurant?.trim() || 'DoorDash',
        description: description?.trim(),
        ingredients: this.parseIngredientsFromDescription(description || ''),
        images,
        url: document.location.href,
        source: 'doordash',
        element,
        metadata: {
          restaurant: restaurant?.trim(),
          price: price || undefined,
        },
      };
    } catch (error) {
      console.error('[DoorDashScraper] Error extracting menu item:', error);
      return null;
    }
  }

  /**
   * Check if current view is an item detail modal/page
   */
  private isItemDetailView(document: Document): boolean {
    return (
      document.querySelector('[data-testid="ItemDetail"]') !== null ||
      document.querySelector('[class*="ItemModal"]') !== null ||
      document.location.pathname.includes('/items/')
    );
  }

  /**
   * Extract item from detail view
   */
  private async extractFromDetailView(document: Document): Promise<FoodProduct | null> {
    try {
      const name = getTextContent(document, [
        '[data-testid="ItemDetailName"]',
        '[class*="ItemDetail"] h1',
        'h1',
      ].join(', '));

      if (!name) {
        return null;
      }

      const description = getTextContent(document, [
        '[data-testid="ItemDetailDescription"]',
        '[class*="ItemDetail"] p',
      ].join(', '));

      const restaurant = this.extractRestaurantName(document.body);
      const images = await extractImages(document.body, { maxImages: 5 });
      const nutrition = this.extractNutritionInfo(document);
      const itemId = this.extractItemId(document.body, name);

      return {
        id: itemId,
        name: name.trim(),
        brand: restaurant?.trim() || 'DoorDash',
        description: description?.trim(),
        ingredients: this.parseIngredientsFromDescription(description || ''),
        nutrition,
        images,
        url: document.location.href,
        source: 'doordash',
        metadata: {
          restaurant: restaurant?.trim(),
        },
      };
    } catch (error) {
      console.error('[DoorDashScraper] Error extracting detail view:', error);
      return null;
    }
  }

  /**
   * Extract restaurant name from page context
   */
  private extractRestaurantName(element: Element): string | null {
    return getTextContent(element.ownerDocument, [
      '[data-testid="StoreName"]',
      '[class*="StoreName"]',
      'h1[class*="Restaurant"]',
      '[data-testid="StoreHeader"] h1',
    ].join(', ')) || null;
  }

  /**
   * Parse ingredients from menu item description text
   */
  private parseIngredientsFromDescription(description: string): Ingredient[] {
    if (!description) return [];

    const ingredients: Ingredient[] = [];

    // Common patterns: "served with X, Y, and Z" or "includes: X, Y, Z"
    const patterns = [
      /(?:includes?|contains?|made with|served with|topped with|features?)\s*:?\s*(.+)/i,
      /ingredients?\s*:?\s*(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        const parts = match[1].split(/,|and\s/i).map((s) => s.trim());
        for (const part of parts) {
          if (part && part.length > 1 && part.length < 100) {
            ingredients.push({ name: part.replace(/\.$/, '') });
          }
        }
        break;
      }
    }

    return ingredients;
  }

  /**
   * Extract nutrition info if available
   */
  private extractNutritionInfo(document: Document): NutritionInfo | undefined {
    const nutritionSection = document.querySelector([
      '[data-testid="NutritionInfo"]',
      '[class*="NutritionFacts"]',
      '[class*="calorie"]',
    ].join(', '));

    if (!nutritionSection) return undefined;

    const text = getTextContent(nutritionSection);
    const nutrition: NutritionInfo = {};

    const calorieMatch = text.match(/(\d+)\s*(?:cal|kcal|calories)/i);
    if (calorieMatch) {
      nutrition.calories = parseInt(calorieMatch[1]);
    }

    return Object.keys(nutrition).length > 0 ? nutrition : undefined;
  }

  /**
   * Extract or generate item ID
   */
  private extractItemId(element: Element, name: string): string {
    const dataId = getAttribute(element, 'data-item-id') ||
      getAttribute(element, 'data-anchor-id');

    if (dataId) {
      return `doordash-${dataId}`;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
    return `doordash-${slug}-${Date.now()}`;
  }
}

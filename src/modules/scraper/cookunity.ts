/**
 * CookUnity Scraper
 *
 * Specialized scraper for CookUnity meal kit pages.
 * Handles meal extraction, ingredient parsing, chef information,
 * and nutritional data from CookUnity's specific structure.
 *
 * @module scraper/cookunity
 */

import type { IScraper, FoodProduct, Ingredient, NutritionInfo } from '@types';
import { getTextContent, getAttribute, queryElements } from '@utils/dom-utils';
import { extractImages } from '@utils/image-utils';

/**
 * CookUnity scraper implementation
 */
export class CookUnityScraper implements IScraper {
  name = 'CookUnity';
  domains = ['www.cookunity.com', 'cookunity.com'];

  /**
   * Check if the current page is CookUnity
   * @param document - Current document
   * @returns true if page is CookUnity
   */
  isSupported(document: Document): boolean {
    const url = document.location.href;

    // Check domain
    if (!url.includes('cookunity.com')) {
      return false;
    }

    // Check for CookUnity specific elements
    const indicators = [
      '[data-testid*="meal"]',
      '.meal-card',
      '[class*="MealCard"]',
      '[class*="meal-item"]',
    ];

    return indicators.some((selector) =>
      document.querySelector(selector) !== null
    );
  }

  /**
   * Extract all meals from the page
   * @param document - Current document
   * @returns Array of food products (meals)
   */
  async extractProducts(document: Document): Promise<FoodProduct[]> {
    const products: FoodProduct[] = [];

    // Meal listing page
    const mealCards = queryElements(document, [
      '[data-testid*="meal-card"]',
      '.meal-card',
      '[class*="MealCard"]',
      'article[class*="meal"]',
    ].join(', '));

    for (const card of mealCards) {
      const product = await this.extractProductFromElement(card);
      if (product) {
        products.push(product);
      }
    }

    // Meal detail page
    if (products.length === 0 && this.isMealDetailPage(document)) {
      const detailProduct = await this.extractFromDetailPage(document);
      if (detailProduct) {
        products.push(detailProduct);
      }
    }

    return products;
  }

  /**
   * Extract meal from a meal card element
   * @param element - Meal card element
   * @returns Food product or null
   */
  async extractProductFromElement(element: Element): Promise<FoodProduct | null> {
    try {
      // Extract meal name
      const name = getTextContent(element, [
        'h2',
        'h3',
        '[class*="meal-name"]',
        '[class*="MealName"]',
        '[data-testid*="meal-name"]',
      ].join(', '));

      if (!name) {
        return null;
      }

      // Extract chef/brand
      const chef = getTextContent(element, [
        '[class*="chef"]',
        '[data-testid*="chef"]',
        '.by-line',
      ].join(', '));

      // Extract description
      const description = getTextContent(element, [
        'p[class*="description"]',
        '[class*="meal-description"]',
        '[data-testid*="description"]',
      ].join(', '));

      // Extract meal URL
      const linkEl = element.querySelector('a[href*="/meals/"]');
      const mealUrl = linkEl
        ? new URL(linkEl.getAttribute('href') || '', 'https://www.cookunity.com').href
        : '';

      // Extract meal ID from URL or data attribute
      const mealId = this.extractMealId(element, mealUrl);

      // Extract images
      const images = await extractImages(element);

      // Extract nutrition info if available on card
      const calories = getTextContent(element, '[class*="calories"], [data-testid*="calories"]');

      return {
        id: mealId,
        name: name.trim(),
        brand: chef?.trim() || 'CookUnity',
        description: description?.trim(),
        ingredients: [], // Will be populated from detail page
        images,
        url: mealUrl || document.location.href,
        source: 'cookunity',
        element,
        metadata: {
          chef: chef?.trim(),
          calories: calories || undefined,
        },
      };
    } catch (error) {
      console.error('[CookUnityScraper] Error extracting meal:', error);
      return null;
    }
  }

  /**
   * Check if current page is a meal detail page
   * @param document - Current document
   * @returns true if detail page
   */
  private isMealDetailPage(document: Document): boolean {
    return (
      document.location.pathname.includes('/meals/') ||
      document.querySelector('[class*="MealDetail"]') !== null
    );
  }

  /**
   * Extract meal from detail page
   * @param document - Current document
   * @returns Food product or null
   */
  private async extractFromDetailPage(document: Document): Promise<FoodProduct | null> {
    try {
      // Extract meal name
      const name = getTextContent(document, [
        'h1',
        '[class*="meal-title"]',
        '[data-testid*="meal-title"]',
      ].join(', '));

      if (!name) {
        return null;
      }

      // Extract chef
      const chef = getTextContent(document, [
        '[class*="chef-name"]',
        '[data-testid*="chef"]',
        'a[href*="/chefs/"]',
      ].join(', '));

      // Extract description
      const description = getTextContent(document.body, [
        '[class*="meal-description"]',
        '[data-testid*="description"]',
        'meta[name="description"]',
      ].join(', '));

      // Extract ingredients
      const ingredients = this.extractIngredients(document);

      // Extract nutrition info
      const nutrition = this.extractNutritionInfo(document);

      // Extract images
      const imageContainer = document.querySelector(
        '[class*="meal-images"], [class*="gallery"], main'
      ) || document.body;
      const images = await extractImages(imageContainer, { maxImages: 5 });

      // Extract meal ID
      const mealId = this.extractMealId(document.body, document.location.href);

      return {
        id: mealId,
        name: name.trim(),
        brand: chef?.trim() || 'CookUnity',
        description: description?.trim(),
        ingredients,
        nutrition,
        images,
        url: document.location.href,
        source: 'cookunity',
        metadata: {
          chef: chef?.trim(),
        },
      };
    } catch (error) {
      console.error('[CookUnityScraper] Error extracting detail page:', error);
      return null;
    }
  }

  /**
   * Extract ingredients from page
   * @param document - Current document
   * @returns Array of ingredients
   */
  private extractIngredients(document: Document): Ingredient[] {
    const ingredients: Ingredient[] = [];

    // Look for ingredients section
    const ingredientSelectors = [
      '[class*="ingredients"]',
      '[data-testid*="ingredients"]',
      '[id*="ingredients"]',
    ];

    for (const selector of ingredientSelectors) {
      const section = document.querySelector(selector);
      if (section) {
        // Try to find list items
        const listItems = queryElements(section, 'li, [class*="ingredient-item"]');

        if (listItems.length > 0) {
          listItems.forEach((item) => {
            const text = getTextContent(item).trim();
            if (text) {
              ingredients.push({ name: text });
            }
          });
        } else {
          // Fall back to text parsing
          const text = getTextContent(section);
          const parts = text.split(/,|;|\n/).map((s) => s.trim());

          parts.forEach((part) => {
            if (part && part.length > 2) {
              ingredients.push({ name: part });
            }
          });
        }

        if (ingredients.length > 0) {
          break;
        }
      }
    }

    return ingredients;
  }

  /**
   * Extract nutrition information
   * @param document - Current document
   * @returns Nutrition info or undefined
   */
  private extractNutritionInfo(document: Document): NutritionInfo | undefined {
    const nutritionSection = document.querySelector([
      '[class*="nutrition"]',
      '[data-testid*="nutrition"]',
      '[id*="nutrition"]',
    ].join(', '));

    if (!nutritionSection) {
      return undefined;
    }

    const nutrition: NutritionInfo = {};

    // Helper to extract nutrition value
    const extractValue = (labels: string[]): string | undefined => {
      for (const label of labels) {
        const regex = new RegExp(label + '\\s*:?\\s*([\\d.]+\\s*\\w+)', 'i');
        const text = getTextContent(nutritionSection);
        const match = text.match(regex);
        if (match) {
          return match[1];
        }
      }
      return undefined;
    };

    // Extract common nutrition facts
    const caloriesText = extractValue(['calories', 'cal']);
    if (caloriesText) {
      const caloriesNum = parseInt(caloriesText);
      if (!isNaN(caloriesNum)) {
        nutrition.calories = caloriesNum;
      }
    }

    nutrition.totalFat = extractValue(['total fat', 'fat']);
    nutrition.saturatedFat = extractValue(['saturated fat']);
    nutrition.cholesterol = extractValue(['cholesterol']);
    nutrition.sodium = extractValue(['sodium']);
    nutrition.totalCarbohydrates = extractValue(['total carbohydrate', 'carbohydrates', 'carbs']);
    nutrition.dietaryFiber = extractValue(['dietary fiber', 'fiber']);
    nutrition.sugars = extractValue(['sugars', 'sugar']);
    nutrition.protein = extractValue(['protein']);

    return Object.keys(nutrition).length > 0 ? nutrition : undefined;
  }

  /**
   * Extract meal ID from element or URL
   * @param element - DOM element
   * @param url - Meal URL
   * @returns Meal ID
   */
  private extractMealId(element: Element, url: string): string {
    // Try data attributes
    const dataId = element.getAttribute('data-meal-id') ||
      element.getAttribute('data-id') ||
      element.querySelector('[data-meal-id]')?.getAttribute('data-meal-id');

    if (dataId) {
      return `cookunity-${dataId}`;
    }

    // Extract from URL
    const urlMatch = url.match(/\/meals\/([^/?]+)/);
    if (urlMatch) {
      return `cookunity-${urlMatch[1]}`;
    }

    // Generate from name
    const name = getTextContent(element);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
    return `cookunity-${slug}-${Date.now()}`;
  }
}

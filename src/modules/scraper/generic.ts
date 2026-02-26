/**
 * Generic Food Scraper
 *
 * Fallback scraper for generic food-related websites.
 * Uses heuristics to detect food content and extract basic product information.
 *
 * @module scraper/generic
 */

import type { IScraper, FoodProduct } from '@types';
import { getTextContent, queryElements } from '@utils/dom-utils';
import { extractImages } from '@utils/image-utils';

/**
 * Generic scraper implementation
 * Acts as a fallback for non-specialized sites
 */
export class GenericScraper implements IScraper {
  name = 'Generic Food';
  domains = ['*']; // Matches all domains

  /**
   * Food-related keywords to detect food pages
   */
  private readonly FOOD_KEYWORDS = [
    'ingredient', 'ingredients', 'nutrition', 'recipe', 'meal',
    'food', 'grocery', 'calories', 'protein', 'carbs', 'diet',
    'organic', 'fresh', 'produce', 'snack', 'beverage', 'drink',
  ];

  /**
   * Product container selectors (common patterns)
   */
  private readonly PRODUCT_SELECTORS = [
    'article',
    '[class*="product"]',
    '[class*="item"]',
    '[class*="card"]',
    '[data-product]',
    '.grid-item',
  ];

  /**
   * Check if page appears to be food-related
   * Uses keyword matching and DOM structure heuristics
   *
   * @param document - Current document
   * @returns true if page appears to be food-related
   */
  isSupported(document: Document): boolean {
    // Check page title and meta
    const title = document.title.toLowerCase();
    const metaDescription = document.querySelector('meta[name="description"]')
      ?.getAttribute('content')?.toLowerCase() || '';

    const hasKeywordInMeta = this.FOOD_KEYWORDS.some(
      (keyword) => title.includes(keyword) || metaDescription.includes(keyword)
    );

    if (hasKeywordInMeta) {
      return true;
    }

    // Check for food-related schema.org markup
    const schemaScripts = queryElements(document, 'script[type="application/ld+json"]');
    for (const script of schemaScripts) {
      const content = script.textContent || '';
      if (
        content.includes('"@type":"Recipe"') ||
        content.includes('"@type":"FoodEstablishment"') ||
        content.includes('"@type":"Product"') && this.FOOD_KEYWORDS.some(k => content.includes(k))
      ) {
        return true;
      }
    }

    // Check for nutrition facts or ingredient lists
    const bodyText = document.body.textContent?.toLowerCase() || '';
    const hasNutritionFacts = bodyText.includes('nutrition facts') ||
      bodyText.includes('serving size');
    const hasIngredients = /ingredients?:/i.test(bodyText);

    return hasNutritionFacts || hasIngredients;
  }

  /**
   * Extract products from page using generic patterns
   * @param document - Current document
   * @returns Array of food products
   */
  async extractProducts(document: Document): Promise<FoodProduct[]> {
    const products: FoodProduct[] = [];

    // Try to find product containers
    const containers = this.findProductContainers(document);

    for (const container of containers.slice(0, 20)) { // Limit to 20 products
      const product = await this.extractProductFromElement(container);
      if (product) {
        products.push(product);
      }
    }

    // If no products found, treat entire page as a single product
    if (products.length === 0) {
      const singleProduct = await this.extractSingleProduct(document);
      if (singleProduct) {
        products.push(singleProduct);
      }
    }

    return products;
  }

  /**
   * Extract product from element
   * @param element - Product container element
   * @returns Food product or null
   */
  async extractProductFromElement(element: Element): Promise<FoodProduct | null> {
    try {
      // Try to extract product name
      const name = this.extractProductName(element);
      if (!name) {
        return null;
      }

      // Extract other fields
      const description = this.extractDescription(element);
      const brand = this.extractBrand(element);
      const images = await extractImages(element, { maxImages: 2 });

      // Generate product ID
      const id = this.generateProductId(name);

      return {
        id,
        name: name.trim(),
        brand: brand?.trim(),
        description: description?.trim(),
        ingredients: [],
        images,
        url: document.location.href,
        source: 'generic',
        element,
      };
    } catch (error) {
      console.error('[GenericScraper] Error extracting product:', error);
      return null;
    }
  }

  /**
   * Find product containers on the page
   * @param document - Current document
   * @returns Array of potential product containers
   */
  private findProductContainers(document: Document): Element[] {
    const containers: Element[] = [];

    for (const selector of this.PRODUCT_SELECTORS) {
      const elements = queryElements(document, selector);

      // Filter elements that likely contain products
      const filtered = elements.filter((el) => {
        const text = getTextContent(el);
        return (
          text.length > 20 && // Has substantial content
          text.length < 1000 && // But not too much
          el.querySelector('img') !== null // Has an image
        );
      });

      containers.push(...filtered);

      if (containers.length > 0) {
        break;
      }
    }

    return containers;
  }

  /**
   * Extract product name from element
   * @param element - Product element
   * @returns Product name or null
   */
  private extractProductName(element: Element): string | null {
    // Try common heading selectors
    const headingSelectors = [
      'h1', 'h2', 'h3', 'h4',
      '[class*="title"]',
      '[class*="name"]',
      '[class*="product"]',
    ];

    for (const selector of headingSelectors) {
      const text = getTextContent(element, selector);
      if (text && text.length > 3 && text.length < 200) {
        return text;
      }
    }

    return null;
  }

  /**
   * Extract description from element
   * @param element - Product element
   * @returns Description or null
   */
  private extractDescription(element: Element): string | null {
    const descriptionSelectors = [
      'p[class*="description"]',
      '[class*="desc"]',
      'p',
    ];

    for (const selector of descriptionSelectors) {
      const text = getTextContent(element, selector);
      if (text && text.length > 20 && text.length < 500) {
        return text;
      }
    }

    return null;
  }

  /**
   * Extract brand from element
   * @param element - Product element
   * @returns Brand name or null
   */
  private extractBrand(element: Element): string | null {
    const brandSelectors = [
      '[class*="brand"]',
      '[class*="manufacturer"]',
      '[itemprop="brand"]',
    ];

    for (const selector of brandSelectors) {
      const text = getTextContent(element, selector);
      if (text && text.length > 2 && text.length < 50) {
        return text;
      }
    }

    return null;
  }

  /**
   * Extract single product from entire page
   * Used when no product containers are found
   *
   * @param document - Current document
   * @returns Food product or null
   */
  private async extractSingleProduct(document: Document): Promise<FoodProduct | null> {
    try {
      const name = getTextContent(document.body, 'h1') || document.title;

      if (!name) {
        return null;
      }

      const description = getTextContent(
        document.body,
        'meta[name="description"]'
      ) || getTextContent(document.body, 'main p');

      const images = await extractImages(document.body, { maxImages: 3 });

      return {
        id: this.generateProductId(name),
        name: name.trim(),
        description: description?.trim(),
        ingredients: [],
        images,
        url: document.location.href,
        source: 'generic',
      };
    } catch (error) {
      console.error('[GenericScraper] Error extracting single product:', error);
      return null;
    }
  }

  /**
   * Generate product ID from name
   * @param name - Product name
   * @returns Product ID
   */
  private generateProductId(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    return `generic-${slug}-${Date.now()}`;
  }
}

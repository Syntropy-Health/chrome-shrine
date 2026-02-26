/**
 * Amazon Fresh Scraper
 *
 * Specialized scraper for Amazon Fresh grocery pages.
 * Handles product extraction, ingredient parsing, and image collection
 * from Amazon's specific DOM structure.
 *
 * @module scraper/amazon-fresh
 */

import type { IScraper, FoodProduct, Ingredient } from '@types';
import { getTextContent, getAttribute, queryElements } from '@utils/dom-utils';
import { extractImages } from '@utils/image-utils';

/**
 * Amazon Fresh scraper implementation
 */
export class AmazonFreshScraper implements IScraper {
  name = 'Amazon Fresh';
  domains = ['www.amazon.com', 'amazon.com'];

  /**
   * Check if the current page is Amazon Fresh
   * @param document - Current document
   * @returns true if page is Amazon Fresh
   */
  isSupported(document: Document): boolean {
    const url = document.location.href;

    // Check for Amazon Fresh specific URLs
    if (url.includes('amazon.com/alm/storefront/fresh') ||
        url.includes('amazon.com/s?') && url.includes('fresh')) {
      return true;
    }

    // Check for Amazon Fresh branding elements
    const freshIndicators = [
      'div[data-component-type="s-search-result"]',
      '[data-asin]',
      '#almBrandId',
    ];

    return freshIndicators.some((selector) =>
      document.querySelector(selector) !== null
    );
  }

  /**
   * Extract all products from the page
   * @param document - Current document
   * @returns Array of food products
   */
  async extractProducts(document: Document): Promise<FoodProduct[]> {
    const products: FoodProduct[] = [];

    // Search results page
    const searchResults = queryElements(
      document,
      'div[data-component-type="s-search-result"]'
    );

    for (const result of searchResults) {
      const product = await this.extractProductFromElement(result);
      if (product) {
        products.push(product);
      }
    }

    // Product detail page
    if (products.length === 0 && this.isProductDetailPage(document)) {
      const detailProduct = await this.extractFromDetailPage(document);
      if (detailProduct) {
        products.push(detailProduct);
      }
    }

    return products;
  }

  /**
   * Extract product from a search result element
   * @param element - Product container element
   * @returns Food product or null
   */
  async extractProductFromElement(element: Element): Promise<FoodProduct | null> {
    try {
      const asin = element.getAttribute('data-asin');
      if (!asin) {
        return null;
      }

      // Extract product name
      const name = getTextContent(element, 'h2 span, .s-title-instructions-style span');
      if (!name) {
        return null;
      }

      // Extract brand
      const brand = getTextContent(element, '.a-size-base-plus, [data-cel-widget*="BRAND"]');

      // Extract price
      const price = getTextContent(element, '.a-price .a-offscreen, .a-price-whole');

      // Extract product link
      const linkEl = element.querySelector('h2 a, .s-product-image-container a');
      const productUrl = linkEl
        ? new URL(linkEl.getAttribute('href') || '', 'https://www.amazon.com').href
        : document.location.href;

      // Extract images
      const images = await extractImages(element);

      // Create product object
      const product: FoodProduct = {
        id: `amazon-${asin}`,
        name: name.trim(),
        brand: brand?.trim(),
        description: getTextContent(element, '.a-size-base.a-color-secondary'),
        ingredients: [], // Will be populated from detail page
        images,
        url: productUrl,
        source: 'amazon-fresh',
        element,
        metadata: {
          asin,
          price,
        },
      };

      return product;
    } catch (error) {
      console.error('[AmazonFreshScraper] Error extracting product:', error);
      return null;
    }
  }

  /**
   * Check if current page is a product detail page
   * @param document - Current document
   * @returns true if detail page
   */
  private isProductDetailPage(document: Document): boolean {
    return (
      document.querySelector('#dp, #productDetails') !== null ||
      document.location.pathname.includes('/dp/')
    );
  }

  /**
   * Extract product from detail page
   * @param document - Current document
   * @returns Food product or null
   */
  private async extractFromDetailPage(document: Document): Promise<FoodProduct | null> {
    try {
      // Extract ASIN from URL or page
      const asinMatch = document.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
      const asin = asinMatch?.[1] ||
        document.querySelector('[data-asin]')?.getAttribute('data-asin');

      if (!asin) {
        return null;
      }

      // Extract product name
      const name = getTextContent(document, '#productTitle, #title');
      if (!name) {
        return null;
      }

      // Extract brand
      const brand = getTextContent(
        document,
        '#bylineInfo, .po-brand .po-break-word, a#brand'
      );

      // Extract description
      const description = getTextContent(
        document,
        '#feature-bullets, #productDescription'
      );

      // Extract ingredients
      const ingredients = this.extractIngredients(document);

      // Extract images from detail page
      const imageContainer = document.querySelector('#imageBlock, #altImages') || document;
      const images = await extractImages(imageContainer, { maxImages: 5 });

      // Extract nutrition info
      const nutrition = this.extractNutritionInfo(document);

      return {
        id: `amazon-${asin}`,
        name: name.trim(),
        brand: brand?.trim(),
        description: description?.trim(),
        ingredients,
        nutrition,
        images,
        url: document.location.href,
        source: 'amazon-fresh',
        metadata: {
          asin,
        },
      };
    } catch (error) {
      console.error('[AmazonFreshScraper] Error extracting detail page:', error);
      return null;
    }
  }

  /**
   * Extract ingredients from product detail page
   * @param document - Current document
   * @returns Array of ingredients
   */
  private extractIngredients(document: Document): Ingredient[] {
    const ingredients: Ingredient[] = [];

    // Look for ingredient sections
    const ingredientSelectors = [
      '#important-information .content, #important-information .a-section',
      '[data-feature-name="ingredients"]',
      '.ingredients-content',
      '#ingredientList',
    ];

    for (const selector of ingredientSelectors) {
      const section = document.querySelector(selector);
      if (section) {
        const text = getTextContent(section);

        // Parse ingredients text
        // Common formats: "Ingredient1, Ingredient2, Ingredient3"
        // or "Ingredients: Ingredient1, Ingredient2"
        const ingredientMatch = text.match(/ingredients?:?\s*(.+)/i);
        const ingredientText = ingredientMatch?.[1] || text;

        if (ingredientText) {
          const parts = ingredientText.split(/,|;/).map((s) => s.trim());

          parts.forEach((part) => {
            if (part && part.length > 0) {
              ingredients.push({
                name: part,
              });
            }
          });

          if (ingredients.length > 0) {
            break;
          }
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
  private extractNutritionInfo(document: Document) {
    const nutritionSection = document.querySelector(
      '#productDetails_feature_div, .nutrition-facts, [data-feature-name="nutrition"]'
    );

    if (!nutritionSection) {
      return undefined;
    }

    // This is a simplified extraction - could be enhanced
    const getText = (selector: string) => getTextContent(nutritionSection, selector);

    return {
      servingSize: getText('.serving-size') || undefined,
      // Additional fields can be extracted based on Amazon's structure
    };
  }
}

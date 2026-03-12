/**
 * Shopify Supplement Scraper
 *
 * Specialized scraper for Shopify-based supplement stores.
 * Handles product extraction, supplement facts parsing, and image collection
 * from Shopify's common product page templates.
 *
 * @module scraper/shopify-supplement
 */

import type { IScraper, FoodProduct, Ingredient, NutritionInfo } from '@types';
import { getTextContent, getAttribute, queryElements } from '@utils/dom-utils';
import { extractImages } from '@utils/image-utils';

/**
 * Shopify supplement scraper implementation
 */
export class ShopifySupplementScraper implements IScraper {
  name = 'Shopify Supplement';
  domains = ['*']; // Shopify stores use custom domains

  /**
   * Supplement-related keywords for detection
   */
  private readonly SUPPLEMENT_KEYWORDS = [
    'supplement', 'vitamin', 'mineral', 'probiotic', 'protein',
    'collagen', 'omega', 'magnesium', 'zinc', 'ashwagandha',
    'capsule', 'tablet', 'softgel', 'powder', 'gummy',
    'serving size', 'supplement facts', 'daily value',
  ];

  /**
   * Check if the current page is a Shopify supplement product
   * @param document - Current document
   * @returns true if page is a Shopify supplement product
   */
  isSupported(document: Document): boolean {
    // Check for Shopify markers
    const isShopify = this.isShopifySite(document);
    if (!isShopify) return false;

    // Check for supplement content
    const bodyText = (document.body.textContent || '').toLowerCase();
    return this.SUPPLEMENT_KEYWORDS.some((keyword) => bodyText.includes(keyword));
  }

  /**
   * Detect Shopify platform markers
   */
  private isShopifySite(document: Document): boolean {
    // Shopify meta tag
    const shopifyMeta = document.querySelector('meta[name="shopify-checkout-api-token"]');
    if (shopifyMeta) return true;

    // Shopify CDN in scripts/stylesheets
    const links = queryElements(document, 'link[href*="cdn.shopify.com"], script[src*="cdn.shopify.com"]');
    if (links.length > 0) return true;

    // Shopify-specific global variables
    const scripts = queryElements(document, 'script');
    for (const script of scripts) {
      const text = script.textContent || '';
      if (text.includes('Shopify.') || text.includes('window.ShopifyAnalytics')) {
        return true;
      }
    }

    // URL pattern for myshopify.com
    if (document.location.href.includes('myshopify.com')) return true;

    return false;
  }

  /**
   * Extract products from page
   * @param document - Current document
   * @returns Array of food products (supplements)
   */
  async extractProducts(document: Document): Promise<FoodProduct[]> {
    const products: FoodProduct[] = [];

    // Product listing page
    const productCards = queryElements(document, [
      '.product-card',
      '[class*="ProductCard"]',
      '.grid-product',
      '.product-item',
      '.collection-product',
    ].join(', '));

    for (const card of productCards) {
      const product = await this.extractProductFromElement(card);
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
   * Extract product from a card element
   * @param element - Product card element
   * @returns Food product or null
   */
  async extractProductFromElement(element: Element): Promise<FoodProduct | null> {
    try {
      const name = getTextContent(element, [
        '.product-card__title',
        '[class*="ProductTitle"]',
        'h2',
        'h3',
        'a[class*="title"]',
      ].join(', '));

      if (!name) return null;

      const brand = getTextContent(element, [
        '.product-card__vendor',
        '[class*="vendor"]',
        '[class*="brand"]',
      ].join(', '));

      const price = getTextContent(element, [
        '.product-card__price',
        '[class*="Price"]',
        '.price',
      ].join(', '));

      const linkEl = element.querySelector('a[href*="/products/"]');
      const productUrl = linkEl
        ? new URL(linkEl.getAttribute('href') || '', document.location.origin).href
        : '';

      const images = await extractImages(element);
      const productId = this.extractProductId(element, productUrl, name);

      return {
        id: productId,
        name: name.trim(),
        brand: brand?.trim(),
        description: getTextContent(element, 'p')?.trim(),
        ingredients: [],
        images,
        url: productUrl || document.location.href,
        source: 'shopify',
        element,
        metadata: { price },
      };
    } catch (error) {
      console.error('[ShopifySupplementScraper] Error extracting product:', error);
      return null;
    }
  }

  /**
   * Check if current page is a product detail page
   */
  private isProductDetailPage(document: Document): boolean {
    return (
      document.location.pathname.includes('/products/') ||
      document.querySelector('.product-single, [class*="ProductDetail"], [itemtype*="schema.org/Product"]') !== null
    );
  }

  /**
   * Extract product from detail page
   */
  private async extractFromDetailPage(document: Document): Promise<FoodProduct | null> {
    try {
      const name = getTextContent(document, [
        '.product-single__title',
        '[class*="ProductTitle"]',
        'h1[itemprop="name"]',
        'h1',
      ].join(', '));

      if (!name) return null;

      const brand = getTextContent(document, [
        '[itemprop="brand"]',
        '.product-single__vendor',
        '[class*="vendor"]',
      ].join(', '));

      const description = getTextContent(document, [
        '.product-single__description',
        '[itemprop="description"]',
        '.product-description',
        '#product-description',
      ].join(', '));

      const ingredients = this.extractIngredients(document);
      const nutrition = this.extractSupplementFacts(document);
      const images = await extractImages(
        document.querySelector('.product-single__photos, [class*="ProductImage"], main') || document.body,
        { maxImages: 5 },
      );

      const productId = this.extractProductId(document.body, document.location.href, name);

      // Try to extract from schema.org structured data
      const schemaProduct = this.extractSchemaProduct(document);

      return {
        id: productId,
        name: (schemaProduct?.name || name).trim(),
        brand: (schemaProduct?.brand || brand)?.trim(),
        description: (schemaProduct?.description || description)?.trim(),
        ingredients,
        nutrition,
        images,
        url: document.location.href,
        source: 'shopify',
        metadata: {
          price: schemaProduct?.price,
          sku: schemaProduct?.sku,
        },
      };
    } catch (error) {
      console.error('[ShopifySupplementScraper] Error extracting detail page:', error);
      return null;
    }
  }

  /**
   * Extract ingredients from supplement product page
   */
  private extractIngredients(document: Document): Ingredient[] {
    const ingredients: Ingredient[] = [];

    const selectors = [
      '[class*="ingredient"]',
      '#ingredients',
      '[data-ingredient]',
    ];

    for (const selector of selectors) {
      const section = document.querySelector(selector);
      if (!section) continue;

      const items = queryElements(section, 'li, tr, [class*="ingredient-item"]');
      if (items.length > 0) {
        for (const item of items) {
          const text = getTextContent(item).trim();
          if (text && text.length > 1) {
            ingredients.push({ name: text });
          }
        }
      } else {
        const text = getTextContent(section);
        const parts = text.split(/,|;/).map((s) => s.trim());
        for (const part of parts) {
          if (part && part.length > 1) {
            ingredients.push({ name: part });
          }
        }
      }

      if (ingredients.length > 0) break;
    }

    // Fallback: parse from description
    if (ingredients.length === 0) {
      const desc = getTextContent(document, '.product-description, [itemprop="description"]');
      const match = desc.match(/ingredients?\s*:?\s*(.+?)(?:\.|supplement facts|$)/i);
      if (match) {
        const parts = match[1].split(/,/).map((s) => s.trim());
        for (const part of parts) {
          if (part && part.length > 1) {
            ingredients.push({ name: part });
          }
        }
      }
    }

    return ingredients;
  }

  /**
   * Extract supplement facts (nutrition info) from product page
   */
  private extractSupplementFacts(document: Document): NutritionInfo | undefined {
    const section = document.querySelector([
      '[class*="supplement-facts"]',
      '[class*="SupplementFacts"]',
      '#supplement-facts',
      'table[class*="nutrition"]',
    ].join(', '));

    if (!section) {
      // Try parsing from description text
      const descText = getTextContent(document, '.product-description, [itemprop="description"]');
      return this.parseSupplementFactsFromText(descText);
    }

    const nutrition: NutritionInfo = {};
    const text = getTextContent(section);

    const servingSizeMatch = text.match(/serving size\s*:?\s*(.+?)(?:\n|serving|$)/i);
    if (servingSizeMatch) nutrition.servingSize = servingSizeMatch[1].trim();

    const caloriesMatch = text.match(/calories\s*:?\s*(\d+)/i);
    if (caloriesMatch) nutrition.calories = parseInt(caloriesMatch[1]);

    const proteinMatch = text.match(/protein\s*:?\s*([\d.]+\s*g)/i);
    if (proteinMatch) nutrition.protein = proteinMatch[1];

    const carbsMatch = text.match(/(?:total\s+)?carbohydrate\s*:?\s*([\d.]+\s*g)/i);
    if (carbsMatch) nutrition.totalCarbohydrates = carbsMatch[1];

    const fatMatch = text.match(/(?:total\s+)?fat\s*:?\s*([\d.]+\s*g)/i);
    if (fatMatch) nutrition.totalFat = fatMatch[1];

    return Object.keys(nutrition).length > 0 ? nutrition : undefined;
  }

  /**
   * Parse supplement facts from free-form text
   */
  private parseSupplementFactsFromText(text: string): NutritionInfo | undefined {
    if (!text) return undefined;

    const nutrition: NutritionInfo = {};
    const lower = text.toLowerCase();

    if (!lower.includes('supplement facts') && !lower.includes('nutrition facts')) {
      return undefined;
    }

    const servingMatch = text.match(/serving size\s*:?\s*(.+?)(?:\n|$)/i);
    if (servingMatch) nutrition.servingSize = servingMatch[1].trim();

    const caloriesMatch = text.match(/calories\s*:?\s*(\d+)/i);
    if (caloriesMatch) nutrition.calories = parseInt(caloriesMatch[1]);

    return Object.keys(nutrition).length > 0 ? nutrition : undefined;
  }

  /**
   * Extract product data from schema.org JSON-LD
   */
  private extractSchemaProduct(document: Document): {
    name?: string;
    brand?: string;
    description?: string;
    price?: string;
    sku?: string;
  } | null {
    const scripts = queryElements(document, 'script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        const product = data['@type'] === 'Product' ? data :
          Array.isArray(data['@graph']) ? data['@graph'].find((i: any) => i['@type'] === 'Product') :
          null;

        if (product) {
          return {
            name: product.name,
            brand: typeof product.brand === 'string' ? product.brand : product.brand?.name,
            description: product.description,
            price: product.offers?.price || product.offers?.[0]?.price,
            sku: product.sku,
          };
        }
      } catch {
        // Invalid JSON, skip
      }
    }
    return null;
  }

  /**
   * Extract or generate product ID
   */
  private extractProductId(element: Element, url: string, name: string): string {
    // From Shopify data attributes
    const dataId = getAttribute(element, 'data-product-id') ||
      getAttribute(element, 'data-id');
    if (dataId) return `shopify-${dataId}`;

    // From URL slug
    const urlMatch = url.match(/\/products\/([^/?]+)/);
    if (urlMatch) return `shopify-${urlMatch[1]}`;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
    return `shopify-${slug}-${Date.now()}`;
  }
}

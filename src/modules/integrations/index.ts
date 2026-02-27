/**
 * Integrations Module - Main Entry Point
 *
 * Manages external data source integrations for food safety information.
 * Currently supports FDA and USDA recall databases.
 *
 * @module integrations
 */

import type { IIntegration, FoodRecall } from '@types';
import { FDAIntegration } from './fda-recalls';
import { USDAIntegration } from './usda-recalls';
import { CacheManager } from '@utils/storage';

/**
 * Integration manager class
 * Coordinates multiple data sources for comprehensive recall information
 */
export class IntegrationManager {
  private static instance: IntegrationManager;
  private integrations: IIntegration[];

  private constructor() {
    this.integrations = [
      new FDAIntegration(),
      new USDAIntegration(),
    ];
  }

  /**
   * Get singleton instance
   */
  static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  /**
   * Search for recalls across all integrations
   * @param query - Product name or keyword
   * @param useCache - Whether to use cached results (default: true)
   * @returns Array of matching recalls from all sources
   */
  async searchRecalls(query: string, useCache = true): Promise<FoodRecall[]> {
    try {
      // Check cache first
      if (useCache) {
        const cached = await CacheManager.getRecalls();
        if (cached) {
          return this.filterRecalls(cached, query);
        }
      }

      // Fetch from all integrations in parallel
      const results = await Promise.allSettled(
        this.integrations.map((integration) => integration.searchRecalls(query))
      );

      // Combine successful results
      const recalls: FoodRecall[] = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          recalls.push(...result.value);
        } else {
          console.error(
            `[IntegrationManager] Error from ${this.integrations[index].name}:`,
            result.reason
          );
        }
      });

      return this.deduplicateRecalls(recalls);
    } catch (error) {
      console.error('[IntegrationManager] Error searching recalls:', error);
      return [];
    }
  }

  /**
   * Get recent recalls from all sources
   * @param limit - Maximum number of recalls per source
   * @param useCache - Whether to use cached results (default: true)
   * @returns Array of recent recalls
   */
  async getRecentRecalls(limit = 10, useCache = true): Promise<FoodRecall[]> {
    try {
      // Check cache first
      if (useCache) {
        const cached = await CacheManager.getRecalls();
        if (cached) {
          return cached.slice(0, limit * this.integrations.length);
        }
      }

      // Fetch from all integrations in parallel
      const results = await Promise.allSettled(
        this.integrations.map((integration) => integration.getRecentRecalls(limit))
      );

      // Combine successful results
      const recalls: FoodRecall[] = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          recalls.push(...result.value);
        } else {
          console.error(
            `[IntegrationManager] Error from ${this.integrations[index].name}:`,
            result.reason
          );
        }
      });

      // Sort by date (most recent first)
      const sorted = recalls.sort((a, b) =>
        b.recallDate.getTime() - a.recallDate.getTime()
      );

      // Cache the results
      await CacheManager.setRecalls(sorted);

      return sorted;
    } catch (error) {
      console.error('[IntegrationManager] Error getting recent recalls:', error);
      return [];
    }
  }

  /**
   * Check if a product matches any recalls
   * @param productName - Product name to check
   * @param brand - Optional brand name
   * @returns Array of matching recalls
   */
  async checkProduct(productName: string, brand?: string): Promise<FoodRecall[]> {
    const query = brand ? `${brand} ${productName}` : productName;
    const allRecalls = await this.searchRecalls(query);

    // Filter recalls that closely match the product
    return allRecalls.filter((recall) => {
      const recallText = `${recall.productName} ${recall.company}`.toLowerCase();
      const productText = query.toLowerCase();

      // Check for keyword matches
      const keywords = productText.split(/\s+/).filter((w) => w.length > 3);
      return keywords.some((keyword) => recallText.includes(keyword));
    });
  }

  /**
   * Filter cached recalls by query
   * @param recalls - Recalls array
   * @param query - Search query
   * @returns Filtered recalls
   */
  private filterRecalls(recalls: FoodRecall[], query: string): FoodRecall[] {
    const lowerQuery = query.toLowerCase();
    const keywords = lowerQuery.split(/\s+/).filter((w) => w.length > 2);

    return recalls.filter((recall) => {
      const searchText = `${recall.productName} ${recall.company} ${recall.reason}`.toLowerCase();

      return keywords.some((keyword) => searchText.includes(keyword));
    });
  }

  /**
   * Remove duplicate recalls
   * @param recalls - Recalls array
   * @returns Deduplicated recalls
   */
  private deduplicateRecalls(recalls: FoodRecall[]): FoodRecall[] {
    const seen = new Set<string>();
    const unique: FoodRecall[] = [];

    recalls.forEach((recall) => {
      // Create a unique key
      const key = `${recall.source}-${recall.id}-${recall.productName}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(recall);
      }
    });

    return unique;
  }

  /**
   * Refresh recall cache
   * Forces a fresh fetch from all integrations
   */
  async refreshCache(): Promise<void> {
    try {
      const recalls = await this.getRecentRecalls(50, false);
      await CacheManager.setRecalls(recalls);
      console.log(`[IntegrationManager] Cache refreshed with ${recalls.length} recalls`);
    } catch (error) {
      console.error('[IntegrationManager] Error refreshing cache:', error);
      throw error;
    }
  }
}

// Export integrations for direct use if needed
export { FDAIntegration, USDAIntegration };
export { DietApiClient } from './diet-api';

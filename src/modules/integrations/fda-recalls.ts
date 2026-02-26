/**
 * FDA Recalls Integration
 *
 * Integrates with the FDA's openFDA API to fetch food recall data.
 * Provides search and recent recall retrieval functionality.
 *
 * @see https://open.fda.gov/apis/food/enforcement/
 * @module integrations/fda-recalls
 */

import type { IIntegration, FoodRecall } from '@types';
import { API_ENDPOINTS } from '@/config/config';

/**
 * FDA API response interface
 */
interface FDARecallResult {
  results?: Array<{
    recall_number: string;
    product_description: string;
    recalling_firm: string;
    reason_for_recall: string;
    classification: string;
    recall_initiation_date: string;
    product_type: string;
    status: string;
    distribution_pattern?: string;
    code_info?: string;
  }>;
  meta?: {
    results: {
      total: number;
      limit: number;
      skip: number;
    };
  };
}

/**
 * FDA Integration implementation
 */
export class FDAIntegration implements IIntegration {
  name = 'FDA';
  private baseUrl = API_ENDPOINTS.FDA_RECALLS;

  /**
   * Search for recalls by keyword
   * @param query - Search query (product name, company, etc.)
   * @returns Array of matching food recalls
   */
  async searchRecalls(query: string): Promise<FoodRecall[]> {
    try {
      // Build search query
      const searchQuery = this.buildSearchQuery(query);
      const url = `${this.baseUrl}?search=${encodeURIComponent(searchQuery)}&limit=50`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`FDA API error: ${response.status}`);
      }

      const data: FDARecallResult = await response.json();

      if (!data.results || data.results.length === 0) {
        return [];
      }

      return data.results
        .filter((result) => result.product_type === 'Food')
        .map((result) => this.mapToFoodRecall(result));
    } catch (error) {
      console.error('[FDA Integration] Search error:', error);
      // Return empty array instead of throwing to allow other integrations to work
      return [];
    }
  }

  /**
   * Get recent food recalls
   * @param limit - Maximum number of recalls to return (default: 10)
   * @returns Array of recent recalls
   */
  async getRecentRecalls(limit = 10): Promise<FoodRecall[]> {
    try {
      const url = `${this.baseUrl}?search=product_type:"Food"&sort=recall_initiation_date:desc&limit=${limit}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`FDA API error: ${response.status}`);
      }

      const data: FDARecallResult = await response.json();

      if (!data.results || data.results.length === 0) {
        return [];
      }

      return data.results.map((result) => this.mapToFoodRecall(result));
    } catch (error) {
      console.error('[FDA Integration] Recent recalls error:', error);
      return [];
    }
  }

  /**
   * Get recalls by classification
   * @param classification - Class I, II, or III
   * @param limit - Maximum number of results
   * @returns Array of recalls
   */
  async getRecallsByClassification(
    classification: 'Class I' | 'Class II' | 'Class III',
    limit = 20
  ): Promise<FoodRecall[]> {
    try {
      const url = `${this.baseUrl}?search=classification:"${classification}"+AND+product_type:"Food"&limit=${limit}&sort=recall_initiation_date:desc`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`FDA API error: ${response.status}`);
      }

      const data: FDARecallResult = await response.json();

      if (!data.results || data.results.length === 0) {
        return [];
      }

      return data.results.map((result) => this.mapToFoodRecall(result));
    } catch (error) {
      console.error('[FDA Integration] Classification search error:', error);
      return [];
    }
  }

  /**
   * Build search query for FDA API
   * @param query - User query
   * @returns Formatted search query
   */
  private buildSearchQuery(query: string): string {
    // Split query into keywords
    const keywords = query
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .map((word) => `"${word}"`)
      .join('+');

    // Search across relevant fields
    return `(product_description:${keywords}+OR+recalling_firm:${keywords})+AND+product_type:"Food"`;
  }

  /**
   * Map FDA API result to FoodRecall interface
   * @param result - FDA API result
   * @returns FoodRecall object
   */
  private mapToFoodRecall(result: FDARecallResult['results'][0]): FoodRecall {
    // Parse recall date
    let recallDate: Date;
    try {
      recallDate = new Date(result.recall_initiation_date);
    } catch {
      recallDate = new Date();
    }

    // Determine classification
    let classification: FoodRecall['classification'] = 'Class III';
    if (result.classification?.includes('Class I')) {
      classification = 'Class I';
    } else if (result.classification?.includes('Class II')) {
      classification = 'Class II';
    }

    // Extract products affected
    const productsAffected: string[] = [];
    if (result.code_info) {
      productsAffected.push(result.code_info);
    }
    if (result.distribution_pattern) {
      productsAffected.push(`Distribution: ${result.distribution_pattern}`);
    }

    return {
      id: result.recall_number,
      productName: result.product_description,
      company: result.recalling_firm,
      reason: result.reason_for_recall,
      classification,
      recallDate,
      productsAffected,
      source: 'FDA',
      url: `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`,
    };
  }

  /**
   * Test connection to FDA API
   * @returns true if API is accessible
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}?limit=1`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

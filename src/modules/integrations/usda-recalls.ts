/**
 * USDA Recalls Integration
 *
 * Integrates with USDA FSIS (Food Safety and Inspection Service) API
 * to fetch meat, poultry, and egg product recall data.
 *
 * @see https://www.fsis.usda.gov/fsis/api
 * @module integrations/usda-recalls
 */

import type { IIntegration, FoodRecall } from '@types';
import { API_ENDPOINTS } from '@/config/config';

/**
 * USDA API response interface
 */
interface USDARecallResult {
  RecallID?: number;
  RecallNumber?: string;
  Title?: string;
  Company?: string;
  Problem?: string;
  RecallClass?: string;
  RecallDate?: string;
  Products?: Array<{
    Name?: string;
    Description?: string;
  }>;
  Distribution?: string;
}

/**
 * USDA Integration implementation
 */
export class USDAIntegration implements IIntegration {
  name = 'USDA';
  private baseUrl = API_ENDPOINTS.USDA_RECALLS;

  /**
   * Search for recalls by keyword
   * @param query - Search query
   * @returns Array of matching food recalls
   */
  async searchRecalls(query: string): Promise<FoodRecall[]> {
    try {
      // USDA API endpoint structure (may need adjustment based on actual API)
      const url = `${this.baseUrl}?search=${encodeURIComponent(query)}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`[USDA Integration] API returned ${response.status}`);
        return [];
      }

      const data: USDARecallResult[] = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }

      return data.map((result) => this.mapToFoodRecall(result));
    } catch (error) {
      console.error('[USDA Integration] Search error:', error);
      // Return empty array to allow other integrations to work
      return [];
    }
  }

  /**
   * Get recent recalls
   * @param limit - Maximum number of recalls
   * @returns Array of recent recalls
   */
  async getRecentRecalls(limit = 10): Promise<FoodRecall[]> {
    try {
      const url = `${this.baseUrl}?limit=${limit}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`[USDA Integration] API returned ${response.status}`);
        return [];
      }

      const data: USDARecallResult[] = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }

      return data
        .map((result) => this.mapToFoodRecall(result))
        .sort((a, b) => b.recallDate.getTime() - a.recallDate.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('[USDA Integration] Recent recalls error:', error);
      return [];
    }
  }

  /**
   * Map USDA API result to FoodRecall interface
   * @param result - USDA API result
   * @returns FoodRecall object
   */
  private mapToFoodRecall(result: USDARecallResult): FoodRecall {
    // Parse recall date
    let recallDate: Date;
    try {
      recallDate = result.RecallDate ? new Date(result.RecallDate) : new Date();
    } catch {
      recallDate = new Date();
    }

    // Map USDA classification to standard format
    let classification: FoodRecall['classification'] = 'Class III';
    if (result.RecallClass) {
      const classStr = result.RecallClass.toLowerCase();
      if (classStr.includes('i') && !classStr.includes('ii')) {
        classification = 'Class I';
      } else if (classStr.includes('ii')) {
        classification = 'Class II';
      }
    }

    // Extract products affected
    const productsAffected: string[] = [];
    if (result.Products && Array.isArray(result.Products)) {
      result.Products.forEach((product) => {
        if (product.Name) {
          productsAffected.push(product.Name);
        }
        if (product.Description) {
          productsAffected.push(product.Description);
        }
      });
    }
    if (result.Distribution) {
      productsAffected.push(`Distribution: ${result.Distribution}`);
    }

    return {
      id: result.RecallNumber || `usda-${result.RecallID}` || `usda-${Date.now()}`,
      productName: result.Title || 'Unknown Product',
      company: result.Company || 'Unknown Company',
      reason: result.Problem || 'No reason specified',
      classification,
      recallDate,
      productsAffected,
      source: 'USDA',
      url: `https://www.fsis.usda.gov/recalls`,
    };
  }

  /**
   * Test connection to USDA API
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

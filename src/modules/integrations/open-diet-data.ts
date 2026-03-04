/**
 * Open Diet Data Integration — USDA FoodData Central
 *
 * Queries the USDA FDC API for accurate macronutrient data.
 * Returns NutritionInfo-compatible results for enriching food analysis.
 *
 * @see https://fdc.nal.usda.gov/api-guide.html
 * @module integrations/open-diet-data
 */

import type { NutritionInfo, USDASearchResponse, USDAFoodSearchResult, USDANutrient } from '@types';
import { API_ENDPOINTS, USDA_FDC_API_KEY } from '@/config/config';

// USDA nutrient IDs for common macronutrients
const NUTRIENT_IDS = {
  ENERGY: 1008,
  PROTEIN: 1003,
  TOTAL_FAT: 1004,
  CARBS: 1005,
  FIBER: 1079,
  SUGARS: 2000,
  SAT_FAT: 1258,
  TRANS_FAT: 1257,
  CHOLESTEROL: 1253,
  SODIUM: 1093,
} as const;

const VITAMIN_IDS: Record<number, string> = {
  1106: 'Vitamin A',
  1162: 'Vitamin C',
  1114: 'Vitamin D',
  1109: 'Vitamin E',
  1185: 'Vitamin K',
  1165: 'Vitamin B1',
  1166: 'Vitamin B2',
  1167: 'Vitamin B3',
  1175: 'Vitamin B6',
  1177: 'Vitamin B9',
  1178: 'Vitamin B12',
};

const MINERAL_IDS: Record<number, string> = {
  1087: 'Calcium',
  1089: 'Iron',
  1090: 'Magnesium',
  1091: 'Phosphorus',
  1092: 'Potassium',
  1095: 'Zinc',
};

/**
 * Open Diet Data client for USDA FoodData Central API
 */
export class OpenDietDataClient {
  private static instance: OpenDietDataClient;
  private baseUrl: string;
  private apiKey: string;
  name = 'USDA FDC';

  private constructor() {
    this.baseUrl = API_ENDPOINTS.USDA_FDC;
    this.apiKey = USDA_FDC_API_KEY;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): OpenDietDataClient {
    if (!OpenDietDataClient.instance) {
      OpenDietDataClient.instance = new OpenDietDataClient();
    }
    return OpenDietDataClient.instance;
  }

  /**
   * Search for foods by name
   * @param query - Food name to search for
   * @param pageSize - Maximum number of results (default: 5)
   * @returns Array of matching food search results
   */
  async searchFoods(query: string, pageSize = 5): Promise<USDAFoodSearchResult[]> {
    try {
      const url = `${this.baseUrl}/foods/search?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Survey%20(FNDDS),Branded`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`USDA FDC API error: ${response.status}`);
      }

      const data: USDASearchResponse = await response.json();
      return data.foods || [];
    } catch (error) {
      console.error('[OpenDietData] Search error:', error);
      return [];
    }
  }

  /**
   * Get nutrition info for a food by name (returns first match)
   * @param query - Food name to look up
   * @returns NutritionInfo or null if not found
   */
  async getFoodNutrition(query: string): Promise<NutritionInfo | null> {
    const foods = await this.searchFoods(query, 1);
    if (foods.length === 0) return null;
    return this.mapToNutritionInfo(foods[0]);
  }

  /**
   * Map USDA food data to NutritionInfo
   * @param food - USDA food search result
   * @returns NutritionInfo object
   */
  mapToNutritionInfo(food: USDAFoodSearchResult): NutritionInfo {
    const getNutrient = (id: number): number | undefined => {
      const n = food.foodNutrients.find((nutrient) => nutrient.nutrientId === id);
      return n?.value;
    };

    const formatG = (val?: number): string | undefined =>
      val !== undefined ? `${Math.round(val * 10) / 10}g` : undefined;
    const formatMg = (val?: number): string | undefined =>
      val !== undefined ? `${Math.round(val * 10) / 10}mg` : undefined;

    return {
      servingSize: food.servingSize
        ? `${food.servingSize}${food.servingSizeUnit || 'g'}`
        : undefined,
      calories: getNutrient(NUTRIENT_IDS.ENERGY),
      protein: formatG(getNutrient(NUTRIENT_IDS.PROTEIN)),
      totalFat: formatG(getNutrient(NUTRIENT_IDS.TOTAL_FAT)),
      totalCarbohydrates: formatG(getNutrient(NUTRIENT_IDS.CARBS)),
      dietaryFiber: formatG(getNutrient(NUTRIENT_IDS.FIBER)),
      sugars: formatG(getNutrient(NUTRIENT_IDS.SUGARS)),
      saturatedFat: formatG(getNutrient(NUTRIENT_IDS.SAT_FAT)),
      transFat: formatG(getNutrient(NUTRIENT_IDS.TRANS_FAT)),
      cholesterol: formatMg(getNutrient(NUTRIENT_IDS.CHOLESTEROL)),
      sodium: formatMg(getNutrient(NUTRIENT_IDS.SODIUM)),
      vitamins: this.extractNutrients(food.foodNutrients, VITAMIN_IDS),
      minerals: this.extractNutrients(food.foodNutrients, MINERAL_IDS),
    };
  }

  /**
   * Extract named nutrients from USDA nutrient array
   * @param nutrients - Array of USDA nutrients
   * @param idMap - Mapping of nutrient IDs to display names
   * @returns Record of nutrient name to formatted value
   */
  private extractNutrients(
    nutrients: USDANutrient[],
    idMap: Record<number, string>
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const n of nutrients) {
      if (idMap[n.nutrientId] && n.value > 0) {
        result[idMap[n.nutrientId]] = `${Math.round(n.value * 10) / 10}${n.unitName}`;
      }
    }
    return result;
  }

  /**
   * Test connection to USDA FDC API
   * @returns true if API is accessible
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/foods/search?api_key=${this.apiKey}&query=apple&pageSize=1`
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

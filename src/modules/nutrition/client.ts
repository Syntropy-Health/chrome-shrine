/**
 * OpenNutrition API Client
 *
 * HTTP client for the mcp-opennutrition service deployed as a REST endpoint.
 * Mirrors the MCP tool interface for consistent data access.
 * Falls back to USDA FDC API when the OpenNutrition service is unavailable.
 *
 * @module nutrition/client
 */

import { API_ENDPOINTS } from '@/config/config';
import type { NutritionInfo } from '@types';
import { buildMacroResult, extractMacros } from './calculator';
import type { FullNutritionProfile, MacroResult, OpenNutritionFoodItem } from './types';

const REQUEST_TIMEOUT_MS = 10_000;

export class OpenNutritionClient {
  private static instance: OpenNutritionClient;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = API_ENDPOINTS.OPENNUTRITION_API;
  }

  static getInstance(): OpenNutritionClient {
    if (!OpenNutritionClient.instance) {
      OpenNutritionClient.instance = new OpenNutritionClient();
    }
    return OpenNutritionClient.instance;
  }

  /**
   * Search for foods by name
   */
  async searchFoods(query: string, page = 1, pageSize = 5): Promise<OpenNutritionFoodItem[]> {
    try {
      return await this.request<OpenNutritionFoodItem[]>('/api/foods/search', {
        method: 'POST',
        body: JSON.stringify({ query, page, pageSize }),
      });
    } catch {
      console.warn('[OpenNutrition] Search unavailable, falling back to USDA FDC');
      return [];
    }
  }

  /**
   * Get food by ID
   */
  async getFoodById(id: string): Promise<OpenNutritionFoodItem | null> {
    try {
      return await this.request<OpenNutritionFoodItem>(`/api/foods/${encodeURIComponent(id)}`);
    } catch {
      return null;
    }
  }

  /**
   * Get food by EAN-13 barcode
   */
  async getFoodByBarcode(ean13: string): Promise<OpenNutritionFoodItem | null> {
    try {
      return await this.request<OpenNutritionFoodItem>(`/api/foods/barcode/${encodeURIComponent(ean13)}`);
    } catch {
      return null;
    }
  }

  /**
   * Calculate macros for a food and portion size
   */
  async calculateMacros(query: string, portionGrams = 100): Promise<MacroResult | null> {
    try {
      return await this.request<MacroResult>('/api/nutrition/macros', {
        method: 'POST',
        body: JSON.stringify({ query, portion_grams: portionGrams }),
      });
    } catch {
      return null;
    }
  }

  /**
   * Get full nutrition profile for a food
   */
  async getFullProfile(query: string): Promise<FullNutritionProfile | null> {
    try {
      return await this.request<FullNutritionProfile>('/api/nutrition/profile', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
    } catch {
      return null;
    }
  }

  /**
   * Convert an OpenNutritionFoodItem to NutritionInfo
   */
  static toNutritionInfo(food: OpenNutritionFoodItem): NutritionInfo {
    const n = food.nutrition_100g;
    if (!n) return {};

    const formatG = (val?: number): string | undefined =>
      val !== undefined ? `${Math.round(val * 10) / 10}g` : undefined;
    const formatMg = (val?: number): string | undefined =>
      val !== undefined ? `${Math.round(val * 10) / 10}mg` : undefined;

    return {
      calories: n.calories,
      protein: formatG(n.protein),
      totalFat: formatG(n.total_fat),
      totalCarbohydrates: formatG(n.carbohydrates),
      dietaryFiber: formatG(n.dietary_fiber),
      sugars: formatG(n.total_sugars),
      saturatedFat: formatG(n.saturated_fats),
      sodium: formatMg(n.sodium),
      cholesterol: formatMg(n.cholesterol),
    };
  }

  /**
   * Check if the OpenNutrition service is reachable
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.request('/api/health');
      return true;
    } catch {
      return false;
    }
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> || {}),
    };

    if (init.body) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenNutrition API error: ${response.status}`);
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeout);
    }
  }
}

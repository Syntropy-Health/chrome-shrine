/**
 * Open Diet Data (USDA FoodData Central) Integration Tests
 *
 * Tests for OpenDietDataClient nutrition data client
 */

import { OpenDietDataClient } from '../src/modules/integrations/open-diet-data';

// Mock fetch for tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('OpenDietDataClient', () => {
  let client: OpenDietDataClient;

  beforeEach(() => {
    // Reset singleton for clean test state
    (OpenDietDataClient as any).instance = null;
    client = OpenDietDataClient.getInstance();
    mockFetch.mockClear();
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const a = OpenDietDataClient.getInstance();
      const b = OpenDietDataClient.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('searchFoods', () => {
    it('returns empty array on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const result = await client.searchFoods('chicken');
      expect(result).toEqual([]);
    });

    it('returns empty array on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
      const result = await client.searchFoods('chicken');
      expect(result).toEqual([]);
    });

    it('returns foods on successful response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          foods: [
            {
              fdcId: 123,
              description: 'Chicken breast',
              dataType: 'Survey (FNDDS)',
              foodNutrients: [],
            },
          ],
        }),
      });
      const result = await client.searchFoods('chicken');
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Chicken breast');
    });

    it('returns empty array when no foods in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foods: [] }),
      });
      const result = await client.searchFoods('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('getFoodNutrition', () => {
    it('returns null when no results found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foods: [] }),
      });
      const result = await client.getFoodNutrition('nonexistent food xyz');
      expect(result).toBeNull();
    });

    it('returns NutritionInfo when food is found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          foods: [
            {
              fdcId: 456,
              description: 'Salmon, raw',
              dataType: 'Survey (FNDDS)',
              servingSize: 100,
              servingSizeUnit: 'g',
              foodNutrients: [
                { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '208', unitName: 'kcal', value: 208 },
                { nutrientId: 1003, nutrientName: 'Protein', nutrientNumber: '203', unitName: 'g', value: 20.4 },
              ],
            },
          ],
        }),
      });
      const result = await client.getFoodNutrition('salmon');
      expect(result).not.toBeNull();
      expect(result!.calories).toBe(208);
      expect(result!.protein).toBe('20.4g');
      expect(result!.servingSize).toBe('100g');
    });
  });

  describe('mapToNutritionInfo', () => {
    it('maps USDA nutrients to NutritionInfo', () => {
      const food = {
        fdcId: 1,
        description: 'Test Food',
        dataType: 'Survey',
        foodNutrients: [
          { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '208', unitName: 'kcal', value: 200 },
          { nutrientId: 1003, nutrientName: 'Protein', nutrientNumber: '203', unitName: 'g', value: 25 },
          { nutrientId: 1004, nutrientName: 'Total lipid (fat)', nutrientNumber: '204', unitName: 'g', value: 10 },
          { nutrientId: 1005, nutrientName: 'Carbohydrate', nutrientNumber: '205', unitName: 'g', value: 30 },
          { nutrientId: 1079, nutrientName: 'Fiber', nutrientNumber: '291', unitName: 'g', value: 5 },
          { nutrientId: 2000, nutrientName: 'Sugars', nutrientNumber: '269', unitName: 'g', value: 8 },
          { nutrientId: 1258, nutrientName: 'Saturated fat', nutrientNumber: '606', unitName: 'g', value: 3 },
          { nutrientId: 1253, nutrientName: 'Cholesterol', nutrientNumber: '601', unitName: 'mg', value: 70 },
          { nutrientId: 1093, nutrientName: 'Sodium', nutrientNumber: '307', unitName: 'mg', value: 400 },
        ],
      };
      const result = client.mapToNutritionInfo(food as any);
      expect(result.calories).toBe(200);
      expect(result.protein).toBe('25g');
      expect(result.totalFat).toBe('10g');
      expect(result.totalCarbohydrates).toBe('30g');
      expect(result.dietaryFiber).toBe('5g');
      expect(result.sugars).toBe('8g');
      expect(result.saturatedFat).toBe('3g');
      expect(result.cholesterol).toBe('70mg');
      expect(result.sodium).toBe('400mg');
    });

    it('handles missing nutrients gracefully', () => {
      const food = {
        fdcId: 2,
        description: 'Sparse Food',
        dataType: 'Survey',
        foodNutrients: [
          { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '208', unitName: 'kcal', value: 100 },
        ],
      };
      const result = client.mapToNutritionInfo(food as any);
      expect(result.calories).toBe(100);
      expect(result.protein).toBeUndefined();
      expect(result.totalFat).toBeUndefined();
      expect(result.servingSize).toBeUndefined();
    });

    it('formats serving size correctly', () => {
      const food = {
        fdcId: 3,
        description: 'With Serving',
        dataType: 'Branded',
        servingSize: 240,
        servingSizeUnit: 'ml',
        foodNutrients: [],
      };
      const result = client.mapToNutritionInfo(food as any);
      expect(result.servingSize).toBe('240ml');
    });

    it('extracts vitamins and minerals', () => {
      const food = {
        fdcId: 4,
        description: 'Vitamin Food',
        dataType: 'Survey',
        foodNutrients: [
          { nutrientId: 1162, nutrientName: 'Vitamin C', nutrientNumber: '401', unitName: 'mg', value: 45 },
          { nutrientId: 1087, nutrientName: 'Calcium', nutrientNumber: '301', unitName: 'mg', value: 120 },
          { nutrientId: 1089, nutrientName: 'Iron', nutrientNumber: '303', unitName: 'mg', value: 2.5 },
        ],
      };
      const result = client.mapToNutritionInfo(food as any);
      expect(result.vitamins?.['Vitamin C']).toBe('45mg');
      expect(result.minerals?.['Calcium']).toBe('120mg');
      expect(result.minerals?.['Iron']).toBe('2.5mg');
    });
  });

  describe('testConnection', () => {
    it('returns true on successful response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const result = await client.testConnection();
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fail'));
      const result = await client.testConnection();
      expect(result).toBe(false);
    });

    it('returns false on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });
});

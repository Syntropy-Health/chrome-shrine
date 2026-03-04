/**
 * DietApiClient Tests
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock AuthManager before importing DietApiClient
vi.mock('../src/modules/auth', () => ({
  AuthManager: {
    getInstance: () => ({
      isAuthenticated: () => true,
      getUser: () => ({ id: 'user_123', email: 'test@example.com' }),
      getToken: () => 'mock_token',
    }),
  },
}));

import { DietApiClient } from '../src/modules/integrations/diet-api';
import type { NutritionInfo, JournalHealthProfile } from '../src/types';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeProfile(overrides: Partial<JournalHealthProfile> = {}): JournalHealthProfile {
  return {
    dietary_preferences: { diet_type: 'omnivore' },
    supplement_stack: [],
    health_goals: [],
    conditions: [],
    allergies: [],
    metrics_data: {},
    ...overrides,
  } as JournalHealthProfile;
}

function makeNutrition(overrides: Partial<NutritionInfo> = {}): NutritionInfo {
  return {
    calories: 200,
    protein: '20g',
    totalCarbohydrates: '25g',
    totalFat: '10g',
    ...overrides,
  } as NutritionInfo;
}

describe('DietApiClient', () => {
  let client: DietApiClient;

  beforeEach(() => {
    (DietApiClient as any).instance = null;
    client = DietApiClient.getInstance();
    mockFetch.mockClear();
  });

  describe('singleton', () => {
    it('returns same instance', () => {
      expect(DietApiClient.getInstance()).toBe(client);
    });
  });

  describe('scoreFoodFit', () => {
    it('returns null when no userProfile', async () => {
      const result = await client.scoreFoodFit('apple', null, null);
      expect(result).toBeNull();
    });

    it('calls DIET endpoint on success', async () => {
      const serverScore = {
        score: 8.5,
        label: 'Excellent Fit',
        recommendation: 'Great choice!',
        macroFit: { protein: 'on_track', carbs: 'on_track', fat: 'on_track', calories: 'on_track' },
        warnings: [],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => serverScore,
        text: async () => JSON.stringify(serverScore),
      });

      const result = await client.scoreFoodFit('apple', makeNutrition(), makeProfile());
      expect(result).toEqual(serverScore);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/score-food'),
        expect.anything(),
      );
    });

    it('falls back to client-side heuristic when endpoint fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fail'));

      const profile = makeProfile({ health_goals: ['weight loss'] });
      const result = await client.scoreFoodFit('apple', makeNutrition(), profile);

      expect(result).not.toBeNull();
      expect(result!.score).toBeGreaterThanOrEqual(0);
      expect(result!.score).toBeLessThanOrEqual(10);
      expect(result!.label).toBeDefined();
    });
  });

  describe('computeClientSideFitScore', () => {
    const compute = (foodName: string, nutrition: NutritionInfo | null, profile: JournalHealthProfile) =>
      (client as any).computeClientSideFitScore(foodName, nutrition, profile);

    it('starts with base score 7', () => {
      const result = compute('apple', null, makeProfile());
      expect(result.score).toBe(7);
    });

    it('deducts 4 for allergen match and adds warning', () => {
      const result = compute('peanut butter', null, makeProfile({ allergies: ['peanut'] }));
      expect(result.score).toBe(3);
      expect(result.warnings).toContain('Contains allergen: peanut');
    });

    it('deducts 3 for vegan user + meat product', () => {
      const result = compute('grilled chicken', null, makeProfile({
        dietary_preferences: { diet_type: 'vegan' } as any,
      }));
      expect(result.score).toBe(4);
      expect(result.warnings.some((w: string) => w.includes('vegan'))).toBe(true);
    });

    it('deducts 3 for vegetarian user + meat product', () => {
      const result = compute('beef steak', null, makeProfile({
        dietary_preferences: { diet_type: 'vegetarian' } as any,
      }));
      expect(result.score).toBe(4);
      expect(result.warnings.some((w: string) => w.includes('vegetarian'))).toBe(true);
    });

    it('adds 1 for high protein (>20g)', () => {
      const result = compute('chicken breast', makeNutrition({ protein: '25g' }), makeProfile());
      expect(result.score).toBe(8);
    });

    it('deducts 1 for high carbs (>50g)', () => {
      const result = compute('pasta', makeNutrition({ totalCarbohydrates: '60g' }), makeProfile());
      expect(result.macroFit.carbs).toBe('over');
    });

    it('deducts 1 for high fat (>30g)', () => {
      const result = compute('fried food', makeNutrition({ totalFat: '35g' }), makeProfile());
      expect(result.macroFit.fat).toBe('over');
    });

    it('clamps score to [0, 10]', () => {
      // Multiple allergens + vegan + meat = deeply negative
      const result = compute('peanut chicken dairy', null, makeProfile({
        allergies: ['peanut', 'chicken', 'dairy'],
        dietary_preferences: { diet_type: 'vegan' } as any,
      }));
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('labels: Excellent Fit >= 8', () => {
      const result = compute('apple', makeNutrition({ protein: '25g' }), makeProfile());
      expect(result.label).toBe('Excellent Fit');
    });

    it('labels: Good Fit >= 6', () => {
      const result = compute('rice', null, makeProfile());
      expect(result.label).toBe('Good Fit');
    });

    it('labels: Fair >= 4', () => {
      const result = compute('beef steak', null, makeProfile({
        dietary_preferences: { diet_type: 'vegetarian' } as any,
      }));
      expect(result.label).toBe('Fair');
    });

    it('labels: Poor Fit < 4', () => {
      const result = compute('peanut butter', null, makeProfile({ allergies: ['peanut'] }));
      expect(result.label).toBe('Poor Fit');
    });

    it('goal matching: protein goal + high protein adds 1', () => {
      const result = compute('steak', makeNutrition({ protein: '30g' }), makeProfile({
        health_goals: ['increase protein intake'],
      }));
      // base 7 + 1 (high protein) + 1 (protein goal) = 9
      expect(result.score).toBe(9);
    });

    it('goal matching: low carb goal + low carbs adds 1', () => {
      const result = compute('salad', makeNutrition({ totalCarbohydrates: '5g', protein: '3g' }), makeProfile({
        health_goals: ['low carb diet'],
      }));
      // base 7 + 1 (low carb goal) = 8
      expect(result.score).toBe(8);
    });

    it('handles null nutrition gracefully', () => {
      const result = compute('mystery food', null, makeProfile());
      expect(result.score).toBe(7);
      expect(result.macroFit.protein).toBe('on_track');
    });
  });

  describe('healthCheck', () => {
    it('returns response on success', async () => {
      const healthData = { status: 'healthy', version: '1.0.0' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => healthData,
        text: async () => JSON.stringify(healthData),
      });

      const result = await client.healthCheck();
      expect(result).toEqual(healthData);
    });

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('timeout'));
      const result = await client.healthCheck();
      expect(result).toBeNull();
    });
  });
});

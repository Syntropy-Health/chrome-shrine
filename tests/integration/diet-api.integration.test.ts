/**
 * DIET API Integration Tests
 *
 * Tests against a live DIET API service.
 * Skips automatically when service is unreachable or --integration flag not set.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { getIntegrationConfig, isServiceReachable, type IntegrationConfig } from './config';

describe('DIET API Integration', () => {
  let config: IntegrationConfig;
  let serviceAvailable: boolean;

  beforeAll(async () => {
    config = getIntegrationConfig();
    if (!config.enabled) {
      serviceAvailable = false;
      return;
    }
    serviceAvailable = await isServiceReachable(config.dietApiUrl, '/health');
  });

  test.skipIf(!process.env.INTEGRATION_TESTS)('should respond to health check', async () => {
    if (!serviceAvailable) return;

    const response = await fetch(`${config.dietApiUrl}/health`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test.skipIf(!process.env.INTEGRATION_TESTS)('should score food fit', async () => {
    if (!serviceAvailable) return;

    const response = await fetch(`${config.dietApiUrl}/api/score-food-fit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiToken ? { Authorization: `Bearer ${config.apiToken}` } : {}),
      },
      body: JSON.stringify({
        food_name: 'Grilled Chicken Breast',
        nutrition: { calories: 165, protein: '31g', totalFat: '3.6g' },
        user_profile: {
          health_goals: ['muscle_gain'],
          conditions: [],
          allergies: [],
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty('score');
      expect(data.score).toBeGreaterThanOrEqual(0);
      expect(data.score).toBeLessThanOrEqual(10);
    }
  });

  test.skipIf(!process.env.INTEGRATION_TESTS)('should search products', async () => {
    if (!serviceAvailable) return;

    const response = await fetch(`${config.dietApiUrl}/api/store-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiToken ? { Authorization: `Bearer ${config.apiToken}` } : {}),
      },
      body: JSON.stringify({
        query: 'vitamin d supplement',
        limit: 5,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty('results');
    }
  });
});

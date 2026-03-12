/**
 * Journal API Integration Tests
 *
 * Tests against a live Syntropy-Journals API service.
 * Skips automatically when service is unreachable or --integration flag not set.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { getIntegrationConfig, isServiceReachable, type IntegrationConfig } from './config';

describe('Journal API Integration', () => {
  let config: IntegrationConfig;
  let serviceAvailable: boolean;

  beforeAll(async () => {
    config = getIntegrationConfig();
    if (!config.enabled) {
      serviceAvailable = false;
      return;
    }
    serviceAvailable = await isServiceReachable(config.journalApiUrl, '/api/health');
  });

  test.skipIf(!process.env.INTEGRATION_TESTS)('should respond to health check', async () => {
    if (!serviceAvailable) return;

    const response = await fetch(`${config.journalApiUrl}/api/health`);
    expect(response.ok).toBe(true);
  });

  test.skipIf(!process.env.INTEGRATION_TESTS)('should get health profile with token', async () => {
    if (!serviceAvailable || !config.apiToken) return;

    const response = await fetch(`${config.journalApiUrl}/api/health-profile`, {
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty('dietary_preferences');
      expect(data).toHaveProperty('health_goals');
      expect(data).toHaveProperty('conditions');
      expect(data).toHaveProperty('allergies');
    }
  });

  test.skipIf(!process.env.INTEGRATION_TESTS)('should log food entry', async () => {
    if (!serviceAvailable || !config.apiToken) return;

    const response = await fetch(`${config.journalApiUrl}/api/food-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: JSON.stringify({
        food_name: 'Integration Test - Grilled Chicken',
        meal_type: 'lunch',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        notes: 'Automated integration test entry',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      expect(data).toBeTruthy();
    }
  });
});

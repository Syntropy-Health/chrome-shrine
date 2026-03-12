/**
 * OpenNutrition API Integration Tests
 *
 * Tests against a live OpenNutrition service.
 * Skips automatically when service is unreachable or --integration flag not set.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { getIntegrationConfig, isServiceReachable, type IntegrationConfig } from './config';

describe('OpenNutrition API Integration', () => {
  let config: IntegrationConfig;
  let serviceAvailable: boolean;

  beforeAll(async () => {
    config = getIntegrationConfig();
    if (!config.enabled) {
      serviceAvailable = false;
      return;
    }
    serviceAvailable = await isServiceReachable(config.openNutritionApiUrl, '/api/foods/search?q=test&limit=1');
  });

  test.skipIf(!process.env.INTEGRATION_TESTS)('should search for foods', async () => {
    if (!serviceAvailable) return;

    const response = await fetch(
      `${config.openNutritionApiUrl}/api/foods/search?q=chicken&limit=5`,
    );
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('name');
  });

  test.skipIf(!process.env.INTEGRATION_TESTS)('should calculate macros', async () => {
    if (!serviceAvailable) return;

    const response = await fetch(
      `${config.openNutritionApiUrl}/api/foods/macros?q=rice&portion=200`,
    );
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('macros');
    expect(data.macros).toHaveProperty('calories');
  });

  test.skipIf(!process.env.INTEGRATION_TESTS)('should get full nutrition profile', async () => {
    if (!serviceAvailable) return;

    const response = await fetch(
      `${config.openNutritionApiUrl}/api/foods/profile?q=salmon`,
    );
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('macro_result');
  });
});

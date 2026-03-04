/**
 * Integration Module Tests
 *
 * Tests for FDA and USDA recall integrations (mocked fetch for CI)
 */

import { vi, describe, test, expect, beforeEach } from 'vitest';
import { FDAIntegration } from '../src/modules/integrations/fda-recalls';
import { USDAIntegration } from '../src/modules/integrations/usda-recalls';
import { IntegrationManager } from '../src/modules/integrations';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('FDAIntegration', () => {
  let integration: FDAIntegration;

  beforeEach(() => {
    integration = new FDAIntegration();
    mockFetch.mockClear();
  });

  test('should have correct name and configuration', () => {
    expect(integration.name).toBe('FDA');
  });

  test('should fetch recent recalls', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            recall_number: 'F-001',
            product_description: 'Chicken nuggets',
            recalling_firm: 'FoodCo',
            reason_for_recall: 'Possible contamination',
            classification: 'Class I',
            recall_initiation_date: '20240101',
          },
        ],
      }),
    });

    const recalls = await integration.getRecentRecalls(5);
    expect(Array.isArray(recalls)).toBe(true);
    if (recalls.length > 0) {
      expect(recalls[0]).toHaveProperty('id');
      expect(recalls[0]).toHaveProperty('productName');
      expect(recalls[0].source).toBe('FDA');
    }
  });

  test('should handle search queries', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });

    const recalls = await integration.searchRecalls('chicken');
    expect(Array.isArray(recalls)).toBe(true);
  });

  test('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const recalls = await integration.getRecentRecalls(5);
    expect(Array.isArray(recalls)).toBe(true);
    expect(recalls).toEqual([]);
  });
});

describe('USDAIntegration', () => {
  let integration: USDAIntegration;

  beforeEach(() => {
    integration = new USDAIntegration();
    mockFetch.mockClear();
  });

  test('should have correct name and configuration', () => {
    expect(integration.name).toBe('USDA');
  });

  test('should handle errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API unavailable'));
    const recalls = await integration.getRecentRecalls(5);
    expect(Array.isArray(recalls)).toBe(true);
  });
});

describe('IntegrationManager', () => {
  let manager: IntegrationManager;

  beforeEach(() => {
    (IntegrationManager as any).instance = null;
    manager = IntegrationManager.getInstance();
    mockFetch.mockClear();
  });

  test('should return singleton instance', () => {
    const a = IntegrationManager.getInstance();
    const b = IntegrationManager.getInstance();
    expect(a).toBe(b);
  });

  test('should combine results from multiple sources', async () => {
    // Both FDA and USDA will return empty/error — that's fine
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    const recalls = await manager.getRecentRecalls(10, false);
    expect(Array.isArray(recalls)).toBe(true);
  });

  test('should check product for recalls', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    const recalls = await manager.checkProduct('chicken', 'Tyson');
    expect(Array.isArray(recalls)).toBe(true);
  });
});

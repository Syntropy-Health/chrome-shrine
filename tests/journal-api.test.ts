/**
 * JournalApiClient Tests
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { JournalApiClient } from '../src/modules/integrations/journal-api';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('JournalApiClient', () => {
  let client: JournalApiClient;

  beforeEach(() => {
    (JournalApiClient as any).instance = null;
    client = JournalApiClient.getInstance();
    mockFetch.mockClear();
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockClear();
    (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockClear();
    (chrome.storage.local.remove as ReturnType<typeof vi.fn>).mockClear();
  });

  describe('singleton', () => {
    it('returns the same instance', () => {
      const a = JournalApiClient.getInstance();
      const b = JournalApiClient.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('initialize', () => {
    it('loads API key from chrome.storage.local', async () => {
      (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        syntropy_journal_api_key: 'sh_test_key_123',
      });

      await client.initialize();
      expect(client.isAvailable()).toBe(true);
      expect(client.getApiKey()).toBe('sh_test_key_123');
    });

    it('handles missing key gracefully', async () => {
      (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      await client.initialize();
      expect(client.isAvailable()).toBe(false);
      expect(client.getApiKey()).toBeNull();
    });
  });

  describe('getHealthProfile', () => {
    it('returns null when no API key', async () => {
      const result = await client.getHealthProfile();
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns profile on success', async () => {
      // Set API key
      (client as any).apiKey = 'sh_test';

      const profile = {
        dietary_preferences: { diet_type: 'omnivore' },
        supplement_stack: [],
        health_goals: ['weight loss'],
        conditions: [],
        allergies: ['peanuts'],
        metrics_data: {},
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => profile,
        text: async () => JSON.stringify(profile),
      });

      const result = await client.getHealthProfile();
      expect(result).toEqual(profile);
    });

    it('sends Bearer header', async () => {
      (client as any).apiKey = 'sh_test';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        text: async () => '{}',
      });

      await client.getHealthProfile();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ext/profile'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sh_test',
          }),
        }),
      );
    });

    it('returns null on fetch error', async () => {
      (client as any).apiKey = 'sh_test';
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getHealthProfile();
      expect(result).toBeNull();
    });
  });

  describe('logFood', () => {
    it('returns false when no API key', async () => {
      const result = await client.logFood({
        food_name: 'Apple',
        meal_type: 'snack',
        calories: 95,
      } as any);
      expect(result).toBe(false);
    });

    it('sends correct POST body', async () => {
      (client as any).apiKey = 'sh_test';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        text: async () => '{"success":true}',
      });

      const entry = {
        food_name: 'Apple',
        meal_type: 'snack',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
      };

      const result = await client.logFood(entry as any);
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ext/food-log'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(entry),
        }),
      );
    });

    it('returns false on error', async () => {
      (client as any).apiKey = 'sh_test';
      mockFetch.mockRejectedValueOnce(new Error('fail'));

      const result = await client.logFood({ food_name: 'Apple' } as any);
      expect(result).toBe(false);
    });
  });

  describe('exchangeClerkTokenForApiKey', () => {
    it('stores key in storage and returns it', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, api_key: 'sh_new_key' }),
        text: async () => '{"success":true,"api_key":"sh_new_key"}',
      });

      const key = await client.exchangeClerkTokenForApiKey(
        'clerk_123', 'user@test.com', 'John', 'Doe',
      );
      expect(key).toBe('sh_new_key');
      expect(client.isAvailable()).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        syntropy_journal_api_key: 'sh_new_key',
      });
    });

    it('returns null on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fail'));

      const key = await client.exchangeClerkTokenForApiKey('clerk_123', 'user@test.com');
      expect(key).toBeNull();
    });
  });

  describe('clearApiKey', () => {
    it('removes from storage and clears availability', async () => {
      (client as any).apiKey = 'sh_test';
      expect(client.isAvailable()).toBe(true);

      await client.clearApiKey();
      expect(client.isAvailable()).toBe(false);
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(['syntropy_journal_api_key']);
    });
  });
});

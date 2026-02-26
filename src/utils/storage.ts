/**
 * Storage Utilities Module
 *
 * Provides type-safe storage operations for the extension.
 * Handles caching, data persistence, and storage limits.
 */

import { CACHE_CONFIG } from '@/config/config';
import type { AIAnalysis, FoodRecall, StorageSchema } from '@types';

/**
 * Storage manager for extension data
 */
export class StorageManager {
  /**
   * Get item from storage
   * @param key - Storage key
   * @returns Promise resolving to the value or null
   */
  static async get<K extends keyof StorageSchema>(
    key: K
  ): Promise<StorageSchema[K] | null> {
    try {
      const result = await chrome.storage.local.get(String(key));
      return (result as Record<string, StorageSchema[K]>)[String(key)] || null;
    } catch (error) {
      console.error(`[Storage] Error getting ${String(key)}:`, error);
      return null;
    }
  }

  /**
   * Set item in storage
   * @param key - Storage key
   * @param value - Value to store
   */
  static async set<K extends keyof StorageSchema>(
    key: K,
    value: StorageSchema[K]
  ): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`[Storage] Error setting ${String(key)}:`, error);
      throw error;
    }
  }

  /**
   * Remove item from storage
   * @param key - Storage key
   */
  static async remove<K extends keyof StorageSchema>(key: K): Promise<void> {
    try {
      await chrome.storage.local.remove(String(key));
    } catch (error) {
      console.error(`[Storage] Error removing ${String(key)}:`, error);
      throw error;
    }
  }

  /**
   * Clear all storage
   */
  static async clear(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('[Storage] Error clearing storage:', error);
      throw error;
    }
  }

  /**
   * Get storage usage information
   * @returns Storage usage in bytes
   */
  static async getUsage(): Promise<number> {
    try {
      return await chrome.storage.local.getBytesInUse();
    } catch (error) {
      console.error('[Storage] Error getting usage:', error);
      return 0;
    }
  }
}

/**
 * Cache manager for analysis results
 */
export class CacheManager {
  /**
   * Get cached analysis for a product
   * @param productId - Product identifier
   * @returns Cached analysis or null
   */
  static async getAnalysis(productId: string): Promise<AIAnalysis | null> {
    try {
      const cache = await StorageManager.get('analysisCache');
      if (!cache || !cache[productId]) {
        return null;
      }

      const entry = cache[productId];

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        await this.removeAnalysis(productId);
        return null;
      }

      return entry.analysis;
    } catch (error) {
      console.error('[Cache] Error getting analysis:', error);
      return null;
    }
  }

  /**
   * Cache analysis result
   * @param productId - Product identifier
   * @param analysis - Analysis result
   * @param ttl - Time to live in milliseconds
   */
  static async setAnalysis(
    productId: string,
    analysis: AIAnalysis,
    ttl = CACHE_CONFIG.ANALYSIS_TTL
  ): Promise<void> {
    try {
      const cache = (await StorageManager.get('analysisCache')) || {};

      // Enforce cache size limit
      const entries = Object.entries(cache) as [string, { analysis: AIAnalysis; timestamp: number; expiresAt: number }][];
      if (entries.length >= CACHE_CONFIG.MAX_CACHE_ENTRIES) {
        // Remove oldest entries
        entries
          .sort((a, b) => a[1].timestamp - b[1].timestamp)
          .slice(0, entries.length - CACHE_CONFIG.MAX_CACHE_ENTRIES + 1)
          .forEach(([key]) => delete cache[key]);
      }

      cache[productId] = {
        analysis,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };

      await StorageManager.set('analysisCache', cache);
    } catch (error) {
      console.error('[Cache] Error setting analysis:', error);
      throw error;
    }
  }

  /**
   * Remove cached analysis
   * @param productId - Product identifier
   */
  static async removeAnalysis(productId: string): Promise<void> {
    try {
      const cache = await StorageManager.get('analysisCache');
      if (cache && cache[productId]) {
        delete cache[productId];
        await StorageManager.set('analysisCache', cache);
      }
    } catch (error) {
      console.error('[Cache] Error removing analysis:', error);
    }
  }

  /**
   * Get cached recalls
   * @returns Cached recalls or null
   */
  static async getRecalls(): Promise<FoodRecall[] | null> {
    try {
      const cache = await StorageManager.get('recallsCache');
      if (!cache) {
        return null;
      }

      // Check if expired
      if (Date.now() - cache.timestamp > CACHE_CONFIG.RECALLS_TTL) {
        await StorageManager.remove('recallsCache');
        return null;
      }

      return cache.recalls;
    } catch (error) {
      console.error('[Cache] Error getting recalls:', error);
      return null;
    }
  }

  /**
   * Cache recalls
   * @param recalls - Recalls array
   */
  static async setRecalls(recalls: FoodRecall[]): Promise<void> {
    try {
      await StorageManager.set('recallsCache', {
        recalls,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[Cache] Error setting recalls:', error);
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  static async clearAll(): Promise<void> {
    try {
      await Promise.all([
        StorageManager.remove('analysisCache'),
        StorageManager.remove('recallsCache'),
      ]);
    } catch (error) {
      console.error('[Cache] Error clearing caches:', error);
      throw error;
    }
  }

  /**
   * Clean up expired cache entries
   */
  static async cleanup(): Promise<void> {
    try {
      const cache = await StorageManager.get('analysisCache');
      if (!cache) {
        return;
      }

      const now = Date.now();
      const cleaned: typeof cache = {};

      (Object.entries(cache) as [string, { analysis: AIAnalysis; timestamp: number; expiresAt: number }][]).forEach(([key, value]) => {
        if (now < value.expiresAt) {
          cleaned[key] = value;
        }
      });

      await StorageManager.set('analysisCache', cleaned);
    } catch (error) {
      console.error('[Cache] Error cleaning up:', error);
    }
  }
}

/**
 * User insights storage manager
 */
export class InsightsManager {
  /**
   * Get user insights for a product
   * @param productId - Product identifier
   * @returns User insight or null
   */
  static async get(productId: string) {
    try {
      const insights = await StorageManager.get('userInsights');
      return insights?.find((i) => i.productId === productId) || null;
    } catch (error) {
      console.error('[Insights] Error getting insight:', error);
      return null;
    }
  }

  /**
   * Save user insight
   * @param productId - Product identifier
   * @param notes - User notes
   * @param rating - User rating (1-5)
   */
  static async save(
    productId: string,
    notes: string,
    rating: number
  ): Promise<void> {
    try {
      const insights = (await StorageManager.get('userInsights')) || [];

      // Remove existing insight for this product
      const filtered = insights.filter((i) => i.productId !== productId);

      // Add new insight
      filtered.push({
        productId,
        notes,
        rating,
        timestamp: Date.now(),
      });

      await StorageManager.set('userInsights', filtered);
    } catch (error) {
      console.error('[Insights] Error saving insight:', error);
      throw error;
    }
  }

  /**
   * Get all user insights
   * @returns Array of insights
   */
  static async getAll() {
    try {
      return (await StorageManager.get('userInsights')) || [];
    } catch (error) {
      console.error('[Insights] Error getting all insights:', error);
      return [];
    }
  }

  /**
   * Delete user insight
   * @param productId - Product identifier
   */
  static async delete(productId: string): Promise<void> {
    try {
      const insights = await StorageManager.get('userInsights');
      if (insights) {
        const filtered = insights.filter((i) => i.productId !== productId);
        await StorageManager.set('userInsights', filtered);
      }
    } catch (error) {
      console.error('[Insights] Error deleting insight:', error);
      throw error;
    }
  }
}
